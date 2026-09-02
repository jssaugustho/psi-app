/**
 * domainVerifier.ts
 *
 * Helper compartilhado para consultar o status de um custom hostname na API
 * do Cloudflare, com rate limiter embutido para evitar spam.
 *
 * Rate limit:
 *   - Mínimo 15 segundos entre consultas para o mesmo domínio (in-process, não distribuído)
 *   - A fila RabbitMQ garante delay de 3 minutos entre tentativas automáticas
 */

import { db } from './db';
import { workspaceDomains, platformSettings } from './schema';
import { eq } from 'drizzle-orm';

// ── Rate Limiter simples em memória ──────────────────────────────────────────
// Mapeia domain → timestamp da última consulta à CF API
const lastCheckTimestamp = new Map<string, number>();
const MIN_CHECK_INTERVAL_MS = 15_000; // 15 segundos entre consultas ao mesmo domínio

export function isRateLimited(domain: string): boolean {
  const last = lastCheckTimestamp.get(domain);
  if (!last) return false;
  return Date.now() - last < MIN_CHECK_INTERVAL_MS;
}

export function markChecked(domain: string): void {
  lastCheckTimestamp.set(domain, Date.now());
}

// ── Tipos ────────────────────────────────────────────────────────────────────
export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  description?: string;
  status?: 'pending' | 'verified' | 'error';
}

export interface CloudflareCheckResult {
  isActive: boolean;
  status: string;       // Ex: 'active', 'pending', 'pending_validation', 'error'
  sslStatus?: string;
  hostnameId?: string;
  dnsRecords: DnsRecord[];
  cnameTarget: string;
  rateLimited: boolean;
}

// ── Função principal de consulta ao Cloudflare ───────────────────────────────
export async function checkDomainOnCloudflare(
  domain: string,
  cfHostnameId?: string | null
): Promise<CloudflareCheckResult> {
  if (isRateLimited(domain)) {
    console.log(`⏱ Rate limited — skip CF check for ${domain}`);
    return {
      isActive: false,
      status: 'rate_limited',
      dnsRecords: [],
      cnameTarget: '',
      rateLimited: true,
    };
  }

  markChecked(domain);

  const settings = await db.query.platformSettings.findFirst();
  const baseDomain = settings?.baseDomain || 'psiapp.com.br';
  const cnameTarget = `custom.${baseDomain}`;

  if (!settings?.cloudflareApiToken || !settings?.cloudflareZoneId) {
    return {
      isActive: false,
      status: 'no_cloudflare',
      dnsRecords: [],
      cnameTarget,
      rateLimited: false,
    };
  }

  const token = settings.cloudflareApiToken;
  const zoneId = settings.cloudflareZoneId;

  try {
    // Usar cf_hostname_id se disponível (mais eficiente), senão buscar por hostname
    const endpoint = cfHostnameId
      ? `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${cfHostnameId}`
      : `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames?hostname=${encodeURIComponent(domain)}`;

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data: any = await res.json().catch(() => ({}));

    // Normalizar resultado (response diferente entre GET by ID vs GET by hostname)
    const cfResult = cfHostnameId
      ? data.result           // GET by ID retorna objeto direto
      : (data.result && data.result.length > 0 ? data.result[0] : null); // GET by hostname retorna array

    if (!cfResult) {
      return {
        isActive: false,
        status: 'not_found',
        dnsRecords: [],
        cnameTarget,
        rateLimited: false,
      };
    }

    const globalStatus: string = cfResult.status || 'pending';
    const sslStatus: string = cfResult.ssl?.status || 'pending';
    const isActive = globalStatus === 'active';

    // Montar registros DNS com status por registro baseado no cfResult
    const dnsRecords: DnsRecord[] = [
      {
        type: 'CNAME',
        name: domain.includes('.') ? domain.split('.')[0] : '@',
        value: cnameTarget,
        description: 'Apontamento CNAME do subdomínio para o servidor da plataforma',
        // CNAME validado quando status global é active ou pending_validation (cname já propagou)
        status: (globalStatus === 'active' || globalStatus === 'pending_validation')
          ? 'verified'
          : 'pending',
      },
    ];

    // Registro de propriedade (ownership_verification)
    if (cfResult.ownership_verification) {
      dnsRecords.push({
        type: (cfResult.ownership_verification.type || 'TXT').toUpperCase(),
        name: cfResult.ownership_verification.name,
        value: cfResult.ownership_verification.value,
        description: 'Validação de propriedade do domínio junto ao Cloudflare',
        status: (globalStatus === 'active' || cfResult.ownership_verification_http?.status === 'active')
          ? 'verified'
          : 'pending',
      });
    }

    // Registros de validação SSL
    if (cfResult.ssl?.validation_records && Array.isArray(cfResult.ssl.validation_records)) {
      const sslVerified = sslStatus === 'active';
      cfResult.ssl.validation_records.forEach((rec: any) => {
        if (rec.txt_name && rec.txt_value) {
          dnsRecords.push({
            type: 'TXT',
            name: rec.txt_name,
            value: rec.txt_value,
            description: 'Validação de emissão do certificado SSL',
            status: sslVerified ? 'verified' : 'pending',
          });
        }
      });
    }

    return {
      isActive,
      status: globalStatus,
      sslStatus,
      hostnameId: cfResult.id,
      dnsRecords,
      cnameTarget,
      rateLimited: false,
    };
  } catch (err: any) {
    console.error(`❌ Erro ao consultar CF para ${domain}:`, err.message);
    return {
      isActive: false,
      status: 'error',
      dnsRecords: [],
      cnameTarget,
      rateLimited: false,
    };
  }
}

// ── Persistir resultado no banco ──────────────────────────────────────────────
export async function persistDomainStatus(
  workspaceId: string,
  domain: string,
  result: CloudflareCheckResult
): Promise<void> {
  if (result.rateLimited) return; // Nada a persistir se foi rate limited

  await db
    .update(workspaceDomains)
    .set({
      customDomain: domain,
      dnsStatus: result.isActive ? 'active' : result.status,
      dnsRecords: result.dnsRecords.length > 0 ? result.dnsRecords : undefined,
      ...(result.hostnameId ? { cfHostnameId: result.hostnameId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(workspaceDomains.workspaceId, workspaceId));
}
