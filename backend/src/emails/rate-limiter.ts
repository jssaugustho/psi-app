import { db } from '../shared/db';
import { emailLogs } from '../shared/schema';
import { eq, and, gt, count } from 'drizzle-orm';

// ── 1. Cache de Verificação de Domínio no Resend (TTL: 10 Minutos) ───────────
interface CachedDomainStatus {
  isVerified: boolean;
  verifyError: string;
  expiresAt: number;
}

const DOMAIN_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const domainCache = new Map<string, CachedDomainStatus>();

/**
 * Verifica se um domínio está aprovado e ativo no Resend, com suporte a cache em memória.
 * Evita fazer chamadas HTTP repetitivas à API do Resend a cada e-mail disparado.
 */
export async function checkDomainVerifiedCached(
  effectiveFromDomain: string,
  resendApiKey: string
): Promise<{ isVerified: boolean; verifyError: string }> {
  const targetDomain = effectiveFromDomain.toLowerCase();
  const cached = domainCache.get(targetDomain);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return { isVerified: cached.isVerified, verifyError: cached.verifyError };
  }

  let isVerified = false;
  let verifyError = '';

  try {
    const listRes = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${resendApiKey}` },
    });

    if (!listRes.ok) {
      const err = await listRes.json().catch(() => ({}));
      verifyError = `Erro ao listar domínios no Resend: ${(err as any).message || listRes.statusText}`;
    } else {
      const listData = (await listRes.json()) as {
        data?: { id: string; name: string; status: string }[];
      };
      const domainEntry = listData.data?.find((d) => d.name.toLowerCase() === targetDomain);
      if (!domainEntry) {
        verifyError = `Domínio de envio "${effectiveFromDomain}" não encontrado na conta do Resend.`;
      } else if (domainEntry.status !== 'verified') {
        verifyError = `Domínio de envio "${effectiveFromDomain}" não está verificado (status atual: ${domainEntry.status}).`;
      } else {
        isVerified = true;
      }
    }
  } catch (err: any) {
    verifyError = `Falha ao conectar com o Resend para verificar domínio: ${err.message}`;
  }

  // Armazena no cache se verificado (se falhar na API, usa TTL mais curto de 1 min para tentar novamente depois)
  const ttl = isVerified ? DOMAIN_CACHE_TTL_MS : 60 * 1000;
  domainCache.set(targetDomain, {
    isVerified,
    verifyError,
    expiresAt: now + ttl,
  });

  return { isVerified, verifyError };
}

// ── 2. Rate Limiter Global para Resend (Máx 2 requisições por segundo) ────────
const MIN_RESEND_INTERVAL_MS = 500; // Intervalo mínimo de 500ms (2 req/s seguro)
let lastResendCallTimestamp = 0;

/**
 * Executa uma chamada à API do Resend garantindo o espaçamento mínimo global.
 */
export async function executeWithResendRateLimit<T>(task: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const elapsed = now - lastResendCallTimestamp;
  const waitMs = Math.max(0, MIN_RESEND_INTERVAL_MS - elapsed);

  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  lastResendCallTimestamp = Date.now();

  let retries = 0;
  const maxRetries = 3;

  while (retries <= maxRetries) {
    try {
      return await task();
    } catch (err: any) {
      const isRateLimitError =
        err?.status === 429 ||
        err?.statusCode === 429 ||
        (err?.message && String(err.message).includes('429')) ||
        (err?.message && String(err.message).toLowerCase().includes('rate limit'));

      if (isRateLimitError && retries < maxRetries) {
        retries++;
        // Backoff exponencial com jitter: 2s, 4s, 8s + variação aleatória
        const backoffMs = Math.pow(2, retries) * 1000 + Math.floor(Math.random() * 500);
        console.warn(`⚠️ Resend Rate-Limit (429) detectado. Aguardando ${backoffMs}ms antes da tentativa ${retries}/${maxRetries}...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        lastResendCallTimestamp = Date.now();
      } else {
        throw err;
      }
    }
  }

  throw new Error('Número máximo de tentativas de envio no Resend excedido devido a Rate Limit.');
}

// ── 3. Controle Anti-Spam por Destinatário (`to`) ─────────────────────────────

/**
 * Verifica limites anti-spam por destinatário:
 *  1. Máximo 1 e-mail do mesmo template por minuto (60s)
 *  2. Máximo 3 e-mails de qualquer template a cada 5 minutos (300s)
 */
export async function checkRecipientAntiSpamLimit(
  toEmail: string,
  template: string
): Promise<{ allowed: boolean; reason?: string }> {
  const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  // Regra 1: Mesmo template enviado no último minuto
  const recentSameTemplate = await db
    .select({ count: count() })
    .from(emailLogs)
    .where(
      and(
        eq(emailLogs.toEmail, toEmail),
        eq(emailLogs.template, template),
        eq(emailLogs.status, 'sent'),
        gt(emailLogs.createdAt, oneMinuteAgo)
      )
    );

  if ((recentSameTemplate[0]?.count ?? 0) > 0) {
    return {
      allowed: false,
      reason: `Envio bloqueado por limite de taxa (anti-spam). Máximo 1 e-mail do template [${template}] por minuto para ${toEmail}.`,
    };
  }

  // Regra 2: Qualquer template nos últimos 5 minutos (máximo 3)
  const recentTotalSends = await db
    .select({ count: count() })
    .from(emailLogs)
    .where(
      and(
        eq(emailLogs.toEmail, toEmail),
        eq(emailLogs.status, 'sent'),
        gt(emailLogs.createdAt, fiveMinutesAgo)
      )
    );

  if ((recentTotalSends[0]?.count ?? 0) >= 3) {
    return {
      allowed: false,
      reason: `Envio bloqueado por limite de volume (anti-spam). Máximo 3 e-mails a cada 5 minutos para ${toEmail}.`,
    };
  }

  return { allowed: true };
}

// ── 4. Escalonamento Justo por Usuário / Tenant ─────────────────────────────
const MIN_SENDER_INTERVAL_MS = 2000; // Espaçamento de 2s entre e-mails do mesmo remetente (usuário/tenant)
const lastSenderSendTimestamp = new Map<string, number>();

/**
 * Verifica se um remetente (userId / tenantId) precisa aguardar antes de enviar outro e-mail.
 * Retorna os milissegundos restantes a aguardar (0 se pode enviar imediatamente).
 */
export function getSenderThrottleWaitMs(senderKey?: string | null): number {
  if (!senderKey) return 0;
  const lastSend = lastSenderSendTimestamp.get(senderKey);
  if (!lastSend) return 0;

  const elapsed = Date.now() - lastSend;
  const remaining = MIN_SENDER_INTERVAL_MS - elapsed;
  return remaining > 0 ? remaining : 0;
}

/**
 * Registra o timestamp do último envio realizado pelo remetente.
 */
export function recordSenderSend(senderKey?: string | null): void {
  if (!senderKey) return;
  lastSenderSendTimestamp.set(senderKey, Date.now());

  // Limpeza de entradas antigas no mapa para evitar vazamento de memória
  if (lastSenderSendTimestamp.size > 5000) {
    const now = Date.now();
    for (const [k, v] of lastSenderSendTimestamp.entries()) {
      if (now - v > 30 * 60 * 1000) {
        lastSenderSendTimestamp.delete(k);
      }
    }
  }
}
