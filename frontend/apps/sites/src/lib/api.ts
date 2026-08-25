const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1';

const PGRST_BASE_URL = API_BASE_URL.endsWith('/v1')
  ? API_BASE_URL.slice(0, -3) + '/rest/v1'
  : API_BASE_URL + '/rest/v1';

export interface CapturePageData {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  is_active: boolean;
  custom_domain: string | null;
  seo_config: {
    metaTitle: string;
    metaDescription: string;
    socialImage?: string;
    ogImageUrl?: string;
  };
  site_config: any;
  dictionary: any;
  form_flow: any;
  title_draft?: string | null;
  slug_draft?: string | null;
  custom_domain_draft?: string | null;
  seo_config_draft?: {
    metaTitle: string;
    metaDescription: string;
    socialImage?: string;
    ogImageUrl?: string;
  } | null;
  site_config_draft?: any;
  dictionary_draft?: any;
  form_flow_draft?: any;
  created_at: string;
  updated_at: string;
  tenants: {
    id: string;
    name: string;
    slug: string;
    domain: string | null;
    phone: string | null;
    gradient_color_start: string | null;
    gradient_color_end: string | null;
    contrast_color: string | null;
    bg_dark_color: string | null;
    card_dark_color: string | null;
    text_dark_color: string | null;
    logo_light_url?: string | null;
    logo_dark_url?: string | null;
  };
}

export async function getCapturePageBySlugs(tenantSlug: string, pageSlug: string, isPreview?: boolean): Promise<CapturePageData | null> {
  const targetSlug = (pageSlug === '_root_' || pageSlug === 'root') ? '' : (pageSlug || '');
  const url = isPreview
    ? `${PGRST_BASE_URL}/capture_pages?select=*,tenants!inner(*)&slug=eq.${targetSlug}&tenants.slug=eq.${tenantSlug}`
    : `${PGRST_BASE_URL}/capture_pages?select=*,tenants!inner(*)&slug=eq.${targetSlug}&is_active=eq.true&tenants.slug=eq.${tenantSlug}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as CapturePageData;
    }
    // Fallback: se isPreview for falso mas a página ainda estiver pendente, busca sem a trava is_active
    if (!isPreview) {
      const fallbackUrl = `${PGRST_BASE_URL}/capture_pages?select=*,tenants!inner(*)&slug=eq.${targetSlug}&tenants.slug=eq.${tenantSlug}`;
      const fallbackRes = await fetch(fallbackUrl, { cache: 'no-store' });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (Array.isArray(fallbackData) && fallbackData.length > 0) {
          return fallbackData[0] as CapturePageData;
        }
      }
      // Se buscando a página raiz e não encontrada com slug="", busca a página mais recente do tenant
      if (targetSlug === '') {
        const rootFallbackUrl = `${PGRST_BASE_URL}/capture_pages?select=*,tenants!inner(*)&tenants.slug=eq.${tenantSlug}&order=created_at.desc&limit=1`;
        const rootFallbackRes = await fetch(rootFallbackUrl, { cache: 'no-store' });
        if (rootFallbackRes.ok) {
          const rootFallbackData = await rootFallbackRes.json();
          if (Array.isArray(rootFallbackData) && rootFallbackData.length > 0) {
            return rootFallbackData[0] as CapturePageData;
          }
        }
      }
    }
    return null;
  } catch (err) {
    console.error('Error fetching capture page by slugs:', err);
    return null;
  }
}

/**
 * Fetch capture page and tenant details by domain name or subdomain (e.g. geovanna.theraos.app or geovannabastos.com.br)
 * and optional page path slug (e.g. "" for root or "terapia")
 */
export async function getCapturePageByDomain(domainName: string, pathSlug: string = ''): Promise<CapturePageData | null> {
  const cleanDomain = domainName.split(':')[0].toLowerCase();
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'theraos.app';
  const cleanPathSlug = (pathSlug === '_root_' || pathSlug === 'root') ? '' : pathSlug.trim().toLowerCase();

  // 1. Identificar o tenant (pelo subdomínio gratuito ou domínio próprio registrado no tenant)
  let tenantData: TenantData | null = null;

  if (cleanDomain.endsWith(`.${baseDomain}`)) {
    const parts = cleanDomain.replace(`.${baseDomain}`, '').split('.');
    const tenantSlug = parts[parts.length - 1];
    if (tenantSlug && tenantSlug !== 'www' && tenantSlug !== 'app' && tenantSlug !== 'sites') {
      tenantData = await getTenantBySlug(tenantSlug);
    }
  } else if (!cleanDomain.includes('.')) {
    tenantData = await getTenantBySlug(cleanDomain);
  }

  if (!tenantData) {
    tenantData = await getTenantByDomain(cleanDomain);
  }

  if (tenantData) {
    const pageUrl = `${PGRST_BASE_URL}/capture_pages?select=*,tenants!inner(*)&tenant_id=eq.${tenantData.id}&slug=eq.${cleanPathSlug}&is_active=eq.true&limit=1`;
    try {
      const res = await fetch(pageUrl, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data[0] as CapturePageData;
        }
      }
      if (cleanPathSlug === '') {
        const fallbackUrl = `${PGRST_BASE_URL}/capture_pages?select=*,tenants!inner(*)&tenant_id=eq.${tenantData.id}&is_active=eq.true&order=created_at.desc&limit=1`;
        const fallbackRes = await fetch(fallbackUrl, { cache: 'no-store' });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (Array.isArray(fallbackData) && fallbackData.length > 0) {
            return fallbackData[0] as CapturePageData;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching capture page by tenant and path:', err);
    }
  }

  // Fallback legado por custom_domain em capture_pages
  const legacyUrl = `${PGRST_BASE_URL}/capture_pages?select=*,tenants!inner(*)&custom_domain=eq.${cleanDomain}&is_active=eq.true&limit=1`;
  try {
    const res = await fetch(legacyUrl, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data[0] as CapturePageData;
      }
    }
  } catch (err) {
    console.error('Error fetching capture page by legacy custom domain:', err);
  }

  return null;
}

/**
 * Fetch any contract template content by ID
 */
export async function getContractTemplateContent(templateId: string): Promise<string | null> {
  const url = `${PGRST_BASE_URL}/contract_templates?select=content&id=eq.${templateId}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data[0].content;
  } catch (err) {
    console.error('Error fetching contract template:', err);
    return null;
  }
}

export interface TenantData {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  phone: string | null;
  gradientColorStart: string | null;
  gradientColorEnd: string | null;
  contrastColor: string | null;
  bgDarkColor: string | null;
  cardDarkColor: string | null;
  textDarkColor: string | null;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
}

/**
 * Fetch tenant details by slug
 */
export async function getTenantBySlug(slug: string): Promise<TenantData | null> {
  const url = `${PGRST_BASE_URL}/workspaces?id=eq.${slug}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const t = data[0];
    return {
      id: t.id,
      name: t.name,
      slug: t.name,
      domain: null,
      phone: null,
      gradientColorStart: null,
      gradientColorEnd: null,
      contrastColor: null,
      bgDarkColor: null,
      cardDarkColor: null,
      textDarkColor: null,
      logoLightUrl: null,
      logoDarkUrl: null,
    };
  } catch (err) {
    console.error('Error fetching workspace by slug:', err);
    return null;
  }
}

/**
 * Fetch tenant details by domain (directly or via page)
 */
export async function getTenantByDomain(domain: string): Promise<TenantData | null> {
  // Check if workspace has this domain directly in workspace_domains table
  const url = `${PGRST_BASE_URL}/workspace_domains?select=workspace:workspaces(*)&domain=eq.${domain}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].workspace) {
        const t = data[0].workspace;
        return {
          id: t.id,
          name: t.name,
          slug: t.name,
          domain: t.domain,
          phone: t.phone,
          gradientColorStart: t.gradient_color_start,
          gradientColorEnd: t.gradient_color_end,
          contrastColor: t.contrast_color,
          bgDarkColor: t.bg_dark_color,
          cardDarkColor: t.card_dark_color,
          textDarkColor: t.text_dark_color,
          logoLightUrl: t.logo_light_url,
          logoDarkUrl: t.logo_dark_url,
        };
      }
    }
  } catch (err) {
    console.error('Error fetching tenant by domain directly:', err);
  }

  // Second, check if a capture_page with custom_domain exists and get its tenant
  const pageData = await getCapturePageByDomain(domain);
  if (pageData && pageData.tenants) {
    const t = pageData.tenants;
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      domain: t.domain,
      phone: t.phone,
      gradientColorStart: t.gradient_color_start,
      gradientColorEnd: t.gradient_color_end,
      contrastColor: t.contrast_color,
      bgDarkColor: t.bg_dark_color,
      cardDarkColor: t.card_dark_color,
      textDarkColor: t.text_dark_color,
      logoLightUrl: t.logo_light_url,
      logoDarkUrl: t.logo_dark_url,
    };
  }

  return null;
}

/**
 * Fetch the platform brand (marca global da plataforma em platform_settings)
 */
export async function getPrimaryTenant(): Promise<TenantData | null> {
  const url = `${API_BASE_URL}/platform/tenant/primary`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data?.tenant) {
        const t = data.tenant;
        return {
          id: 'platform',
          name: t.name || 'TheraOS',
          slug: 'platform',
          domain: null,
          phone: null,
          gradientColorStart: t.gradientColorStart || '#7C3AED',
          gradientColorEnd: t.gradientColorEnd || '#A855F7',
          contrastColor: t.contrastColor || '#FFFFFF',
          bgDarkColor: t.bgDarkColor || '#09090B',
          cardDarkColor: t.cardDarkColor || '#18181B',
          textDarkColor: t.textDarkColor || '#F8FAFC',
          logoLightUrl: t.logoLightUrl || null,
          logoDarkUrl: t.logoDarkUrl || null,
        };
      }
    }

    // Fallback direto via PostgREST na tabela platform_settings
    const pgrstUrl = `${PGRST_BASE_URL}/platform_settings?limit=1`;
    const pgrstRes = await fetch(pgrstUrl, { cache: 'no-store' });
    if (!pgrstRes.ok) return null;
    const pgrstData = await pgrstRes.json();
    if (!Array.isArray(pgrstData) || pgrstData.length === 0) return null;
    const ps = pgrstData[0];
    return {
      id: ps.id || 'platform',
      name: ps.platform_name || 'TheraOS',
      slug: 'platform',
      domain: ps.base_domain || null,
      phone: null,
      gradientColorStart: ps.gradient_color_start || '#7C3AED',
      gradientColorEnd: ps.gradient_color_end || '#A855F7',
      contrastColor: ps.contrast_color || '#FFFFFF',
      bgDarkColor: ps.bg_dark_color || '#09090B',
      cardDarkColor: ps.card_dark_color || '#18181B',
      textDarkColor: ps.text_dark_color || '#F8FAFC',
      logoLightUrl: ps.logo_light_url || null,
      logoDarkUrl: ps.logo_dark_url || null,
    };
  } catch (err) {
    console.error('Error fetching platform brand:', err);
    return null;
  }
}

export async function getBootstrapStatus(): Promise<{ bootstrapped: boolean } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/bootstrap/status`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

