/**
 * Helper compartilhado para resolver a fonte de tráfego de um lead
 * com base nos parâmetros UTM recebidos e nas fontes configuradas no workspace.
 *
 * Prioridade:
 *   1. Match exato pelo campo `utm_source` configurado na fonte
 *   2. Match pelo nome da fonte (inclusão parcial)
 *   3. Fallbacks para plataformas conhecidas (ig, fb, google, tiktok)
 *   4. `defaultTrafficSource` do workspace
 *   5. Parâmetro `fallback` (padrão: 'Direto')
 */

type TrafficSourceObj = {
  id?: string;
  name: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

export function resolveTrafficSource(
  workspace: { trafficSources: any[]; defaultTrafficSource: string },
  utmSource?: string | null,
  fallback = 'Direto'
): string {
  // Normalizar trafficSources para formato objeto (suporta string[] e obj[])
  const sources: TrafficSourceObj[] = (workspace.trafficSources || []).map((s: any) => {
    if (typeof s === 'string') {
      const slug = s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-');
      return { name: s, utm_source: slug };
    }
    return s as TrafficSourceObj;
  });

  if (utmSource) {
    const lower = utmSource.toLowerCase().trim();

    // 1. Match exato pelo campo utm_source configurado
    const byUtm = sources.find(s => s.utm_source?.toLowerCase() === lower);
    if (byUtm) return byUtm.name;

    // 2. Match pelo nome da fonte (inclusão parcial nos dois sentidos)
    const byName = sources.find(s => {
      const sLower = s.name.toLowerCase();
      return sLower.includes(lower) || lower.includes(sLower);
    });
    if (byName) return byName.name;

    // 3. Fallbacks para plataformas conhecidas
    if (['ig', 'instagram'].includes(lower)) {
      return sources.find(s => s.name.toLowerCase().includes('instagram'))?.name || 'Instagram';
    }
    if (['fb', 'facebook', 'meta'].includes(lower)) {
      return sources.find(s => s.name.toLowerCase().includes('facebook'))?.name || 'Facebook Ads';
    }
    if (['google', 'gads', 'googleads'].includes(lower)) {
      return sources.find(s => s.name.toLowerCase().includes('google'))?.name || 'Google Ads';
    }
    if (['tiktok', 'tt'].includes(lower)) {
      return sources.find(s => s.name.toLowerCase().includes('tiktok'))?.name || 'TikTok';
    }
    if (['linkedin', 'li'].includes(lower)) {
      return sources.find(s => s.name.toLowerCase().includes('linkedin'))?.name || 'LinkedIn';
    }

    // 4. Capitalizar e retornar o valor de utm_source como nome
    return utmSource.charAt(0).toUpperCase() + utmSource.slice(1);
  }

  // 5. Sem UTM: usar defaultTrafficSource ou fallback
  return workspace.defaultTrafficSource || fallback;
}
