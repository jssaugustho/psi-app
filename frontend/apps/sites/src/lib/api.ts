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
  const url = isPreview
    ? `${PGRST_BASE_URL}/capture_pages?select=*,tenants!inner(*)&slug=eq.${pageSlug}&tenants.slug=eq.${tenantSlug}`
    : `${PGRST_BASE_URL}/capture_pages?select=*,tenants!inner(*)&slug=eq.${pageSlug}&is_active=eq.true&tenants.slug=eq.${tenantSlug}`;
  try {
    const res = await fetch(url, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data[0] as CapturePageData;
  } catch (err) {
    console.error('Error fetching capture page by slugs:', err);
    return null;
  }
}

/**
 * Fetch capture page and tenant details by custom domain name
 */
export async function getCapturePageByDomain(domainName: string): Promise<CapturePageData | null> {
  const url = `${PGRST_BASE_URL}/capture_pages?select=*,tenants!inner(*)&custom_domain=eq.${domainName}&is_active=eq.true`;
  try {
    const res = await fetch(url, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data[0] as CapturePageData;
  } catch (err) {
    console.error('Error fetching capture page by domain:', err);
    return null;
  }
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
  const url = `${PGRST_BASE_URL}/tenants?slug=eq.${slug}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const t = data[0];
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
  } catch (err) {
    console.error('Error fetching tenant by slug:', err);
    return null;
  }
}

/**
 * Fetch tenant details by domain (directly or via page)
 */
export async function getTenantByDomain(domain: string): Promise<TenantData | null> {
  // First check if tenant has this domain directly in tenants table
  const url = `${PGRST_BASE_URL}/tenants?domain=eq.${domain}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const t = data[0];
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
 * Fetch the primary tenant (tenant-pai da plataforma)
 */
export async function getPrimaryTenant(): Promise<TenantData | null> {
  const url = `${PGRST_BASE_URL}/tenants?is_primary=eq.true&limit=1`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const t = data[0];
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
  } catch (err) {
    console.error('Error fetching primary tenant:', err);
    return null;
  }
}

