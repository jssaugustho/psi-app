/**
 * Utilitário para derivação do domínio de envio de e-mail.
 *
 * Regra: o subdomínio `no-reply` deve estar no mesmo nível do domínio raiz,
 * independente de o tenant usar um subdomínio para acessar o sistema.
 *
 * Exemplos:
 *   clinicaalpha.com.br       → no-reply.clinicaalpha.com.br
 *   app.clinicaalpha.com.br   → no-reply.clinicaalpha.com.br  ← mesmo nível
 *   example.com               → no-reply.example.com
 *   app.example.com           → no-reply.example.com           ← mesmo nível
 *   deep.sub.example.com      → no-reply.example.com
 */

/**
 * TLDs de dois níveis conhecidos. O domínio raiz será formado pelas
 * últimas 3 partes quando o TLD de 2 níveis estiver presente.
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
 * Extrai o domínio raiz registrável a partir de um hostname.
 * Remove subdomínios, mas preserva TLDs de dois níveis.
 *
 * @example
 * extractRootDomain('app.clinicaalpha.com.br') // → 'clinicaalpha.com.br'
 * extractRootDomain('clinicaalpha.com.br')     // → 'clinicaalpha.com.br'
 * extractRootDomain('app.example.com')         // → 'example.com'
 */
export function extractRootDomain(hostname: string): string {
  // Normalizar: remover protocolo e path
  const host = hostname.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase().trim();

  const parts = host.split('.');

  // Verificar se os últimos 2 segmentos formam um TLD de 2 níveis
  if (parts.length >= 3) {
    const lastTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    if (TWO_LEVEL_TLDS.has(lastTwo)) {
      // Raiz = últimas 3 partes (ex: clinicaalpha.com.br)
      return parts.slice(-3).join('.');
    }
  }

  // TLD simples: raiz = últimas 2 partes (ex: example.com)
  return parts.slice(-2).join('.');
}

/**
 * Deriva o domínio de envio de e-mail a partir do domínio principal do tenant.
 * Sempre usa `no-reply` no mesmo nível do domínio raiz.
 *
 * @param tenantDomain - Domínio principal do tenant (pode ter subdomínio ou não)
 * @returns string no formato `no-reply.<rootDomain>`, ou null se o input for inválido
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
