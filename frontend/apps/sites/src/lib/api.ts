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
