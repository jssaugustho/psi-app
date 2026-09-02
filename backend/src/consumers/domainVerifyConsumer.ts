/**
 * domainVerifyConsumer.ts
 *
 * Consumer RabbitMQ para verificação automática de domínios personalizados.
 *
 * Fluxo:
 *   1. Ao registrar um domínio, uma mensagem é publicada na fila `domain.verify`
 *   2. Este consumer processa a mensagem:
 *      - Consulta a CF API via `checkDomainOnCloudflare`
 *      - Persiste o resultado no banco via `persistDomainStatus`
 *      - Se o domínio NÃO ficou ativo E tentativas < MAX_ATTEMPTS:
 *        republica a mensagem com delay de RETRY_DELAY_MS (3 min)
 *      - Se ficou ativo: emite evento realtime para o frontend atualizar o badge
 *   3. Max attempts evita loop infinito (96 × 3min = 4.8 horas)
 *
 * Rate limiter:
 *   - `checkDomainOnCloudflare` tem rate limit de 15s entre consultas ao mesmo domínio
 *   - A fila adiciona delay mínimo de 3 minutos entre tentativas automáticas
 */

import { getChannel, assertQuorumQueue, publishToQueue, publishRealtime, publishErrorLog, publishAuditLog } from '../shared/queue';
import { checkDomainOnCloudflare, persistDomainStatus } from '../shared/domainVerifier';
import { db } from '../shared/db';
import { workspaceDomains } from '../shared/schema';
import { eq } from 'drizzle-orm';

// ── Configurações ─────────────────────────────────────────────────────────────
const QUEUE_NAME = 'domain.verify';
const ROUTING_KEY = 'domain.verify';
const RETRY_DELAY_MS = 3 * 60 * 1000; // 3 minutos
const MAX_ATTEMPTS = 96; // 96 × 3min = ~4.8 horas máximo

export interface DomainVerifyMessage {
  workspaceId: string;
  domain: string;
  cfHostnameId?: string | null;
  attempts: number;
  scheduledAt: string; // ISO8601
}

// ── Publicar mensagem de verificação na fila ───────────────────────────────────
export async function scheduleDomainVerification(
  workspaceId: string,
  domain: string,
  cfHostnameId?: string | null,
  delayMs = 0,
  attempts = 0
): Promise<void> {
  const message: DomainVerifyMessage = {
    workspaceId,
    domain,
    cfHostnameId,
    attempts,
    scheduledAt: new Date().toISOString(),
  };

  if (delayMs > 0) {
    setTimeout(async () => {
      await publishToQueue(ROUTING_KEY, message);
      console.log(`📬 Domain verify agendado (${delayMs}ms delay): ${domain} [attempt ${attempts + 1}/${MAX_ATTEMPTS}]`);
    }, delayMs);
  } else {
    await publishToQueue(ROUTING_KEY, message);
    console.log(`📬 Domain verify publicado imediatamente: ${domain} [attempt ${attempts + 1}/${MAX_ATTEMPTS}]`);
  }
}

// ── Iniciar consumer ──────────────────────────────────────────────────────────
export async function startDomainVerifyConsumer(): Promise<void> {
  try {
    await assertQuorumQueue(QUEUE_NAME, ROUTING_KEY);
    const channel = await getChannel();

    // Processar 1 mensagem por vez (prefetch = 1)
    await channel.prefetch(1);

    await channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;

      let message: DomainVerifyMessage;
      try {
        message = JSON.parse(msg.content.toString()) as DomainVerifyMessage;
      } catch {
        console.error('❌ Domain verify: mensagem inválida na fila');
        await publishErrorLog({
          name: 'DomainVerifyQueueError',
          message: 'Mensagem inválida recebida na fila domain.verify',
          serviceName: 'domain-verifier',
          severity: 'warning',
          metadata: { rawMessage: msg.content.toString() }
        }).catch(() => {});
        channel.nack(msg, false, false); // Encaminha para DLQ
        return;
      }

      const { workspaceId, domain, cfHostnameId, attempts } = message;

      console.log(`🔍 Verificando domínio: ${domain} [attempt ${attempts + 1}/${MAX_ATTEMPTS}]`);

      try {
        // 1. Consultar Cloudflare
        const result = await checkDomainOnCloudflare(domain, cfHostnameId);

        // 2. Persistir resultado no banco (mesmo que pendente, atualiza os dados)
        if (!result.rateLimited) {
          await persistDomainStatus(workspaceId, domain, result);
          console.log(`💾 Status persistido: ${domain} → ${result.status}`);
        }

        // 3. Domínio verificado com sucesso → notificar frontend via realtime e salvar audit log
        if (result.isActive) {
          console.log(`✅ Domínio ativo: ${domain}`);
          await publishAuditLog({
            action: 'domain.verified',
            category: 'config',
            serviceName: 'domain-verifier',
            status: 'success',
            workspaceId,
            details: { domain, attempts },
          }).catch(() => {});

          await publishRealtime({
            entity: 'domain',
            action: 'verified',
            tenantId: workspaceId,
            data: {
              domain,
              status: 'active',
              dnsRecords: result.dnsRecords,
            },
          });
          channel.ack(msg);
          return;
        }


        // 4. Ainda pendente → agendar próxima tentativa se dentro do limite
        const nextAttempts = attempts + 1;
        if (nextAttempts < MAX_ATTEMPTS) {
          await scheduleDomainVerification(
            workspaceId,
            domain,
            cfHostnameId || result.hostnameId,
            RETRY_DELAY_MS,
            nextAttempts
          );
          console.log(`⏳ ${domain} ainda pendente. Próxima verificação em ${RETRY_DELAY_MS / 60000} min (attempt ${nextAttempts + 1}/${MAX_ATTEMPTS})`);
        } else {
          console.warn(`⚠️ ${domain} atingiu máximo de tentativas (${MAX_ATTEMPTS}). Encerrando verificação automática.`);
          await db.update(workspaceDomains)
            .set({ dnsStatus: 'expired', updatedAt: new Date() })
            .where(eq(workspaceDomains.workspaceId, workspaceId));

          await publishErrorLog({
            name: 'DomainVerifyTimeout',
            message: `Tempo limite de verificação atingido para o domínio ${domain}`,
            serviceName: 'domain-verifier',
            severity: 'warning',
            metadata: { workspaceId, domain, attempts }
          }).catch(() => {});
        }

        channel.ack(msg);
      } catch (err: any) {
        console.error(`❌ Erro ao verificar domínio ${domain}:`, err.message);

        await publishErrorLog({
          name: err.name || 'DomainVerifyError',
          message: err.message || String(err),
          stack: err.stack,
          serviceName: 'domain-verifier',
          severity: 'error',
          metadata: { workspaceId, domain, attempts }
        }).catch(() => {});

        // Requeue apenas se attempts < 3, senão descarta para DLQ (messages.dlq)
        channel.nack(msg, false, attempts < 3);
      }
    });

    console.log(`✅ Consumer [${QUEUE_NAME}] iniciado — verificação automática de domínios ativa.`);
  } catch (err: any) {
    console.warn(`⚠️ Falha ao iniciar consumer de domínios: ${err.message}. Verificação automática indisponível.`);
  }
}

