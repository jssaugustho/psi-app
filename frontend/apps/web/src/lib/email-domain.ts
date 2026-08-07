/**
 * TLDs de dois níveis conhecidos.
 * Quando presente, o domínio raiz é formado pelas últimas 3 partes.
 */
const TWO_LEVEL_TLDS = new Set([
  'com.br', 'net.br', 'org.br', 'gov.br', 'edu.br', 'mil.br',
  'co.uk', 'me.uk', 'org.uk', 'net.uk', 'ltd.uk', 'plc.uk',
  'co.nz', 'net.nz', 'org.nz', 'govt.nz', 'ac.nz',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
  'com.ar', 'com.mx', 'com.co', 'com.pe', 'com.ve',
  'com.pt', 'co.jp', 'co.za', 'co.in',
]);

/**
 * Extrai o domínio raiz registrável (remove subdomínios, preserva TLDs de 2 níveis).
 *
 * @example
 * extractRootDomain('app.clinicaalpha.com.br') // → 'clinicaalpha.com.br'
 * extractRootDomain('clinicaalpha.com.br')     // → 'clinicaalpha.com.br'
 * extractRootDomain('app.example.com')         // → 'example.com'
 */
export function extractRootDomain(hostname: string): string {
  const host = hostname
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .trim();

  const parts = host.split('.');

  if (parts.length >= 3) {
    const lastTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    if (TWO_LEVEL_TLDS.has(lastTwo)) {
      return parts.slice(-3).join('.');
    }
  }

  return parts.slice(-2).join('.');
}

/**
 * Deriva o domínio de envio de e-mail a partir do domínio principal do tenant.
 * O prefixo `no-reply` sempre fica no nível raiz, nunca abaixo de um subdomínio.
 *
 * @example
 * deriveEmailDomain('app.clinicaalpha.com.br') // → 'no-reply.clinicaalpha.com.br'
 * deriveEmailDomain('clinicaalpha.com.br')     // → 'no-reply.clinicaalpha.com.br'
 * deriveEmailDomain('app.example.com')         // → 'no-reply.example.com'
 */
export function deriveEmailDomain(tenantDomain: string | null | undefined): string | null {
  if (!tenantDomain?.trim()) return null;
  const root = extractRootDomain(tenantDomain);
  if (!root || !root.includes('.')) return null;
  return `no-reply.${root}`;
}
