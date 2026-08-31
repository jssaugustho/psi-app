export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1';

let resolvedPgrstUrl = API_BASE_URL;
if (resolvedPgrstUrl.includes('localhost:5000') || resolvedPgrstUrl.includes('127.0.0.1:5000')) {
  resolvedPgrstUrl = resolvedPgrstUrl.replace(':5000', ':8000');
}

export const PGRST_BASE_URL = resolvedPgrstUrl.endsWith('/v1')
  ? resolvedPgrstUrl.slice(0, -3) + '/rest/v1'
  : resolvedPgrstUrl + '/rest/v1';

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

function applyDraftData(item: any): any {
  if (!item) return item;
  const draft = item.draft_data || {};
  return {
    ...item,
    title: draft.title !== undefined && draft.title !== null ? draft.title : item.title,
    slug: draft.slug !== undefined && draft.slug !== null ? draft.slug : item.slug,
    custom_domain: draft.customDomain !== undefined && draft.customDomain !== null ? draft.customDomain : item.custom_domain,
    seo_config: draft.seoConfig !== undefined && draft.seoConfig !== null ? draft.seoConfig : item.seo_config,
    site_config: draft.siteConfig !== undefined && draft.siteConfig !== null ? draft.siteConfig : item.site_config,
    dictionary: draft.dictionary !== undefined && draft.dictionary !== null ? draft.dictionary : item.dictionary,
    form_flow: draft.formFlow !== undefined && draft.formFlow !== null ? draft.formFlow : item.form_flow,
    cta_type: draft.ctaType !== undefined && draft.ctaType !== null ? draft.ctaType : item.cta_type,
    cta_whatsapp_message: draft.ctaWhatsappMessage !== undefined ? draft.ctaWhatsappMessage : item.cta_whatsapp_message,
    cta_external_url: draft.ctaExternalUrl !== undefined ? draft.ctaExternalUrl : item.cta_external_url,
    form_id: draft.formId !== undefined ? draft.formId : item.form_id,
  };
}

async function verifyUserAccess(pageId: string, token: string): Promise<boolean> {
  try {
    console.log(`[SITES_DEBUG] verifyUserAccess called for page ${pageId} with token startsWith: ${token ? token.substring(0, 15) : 'empty'}`);
    const res = await fetch(`${PGRST_BASE_URL}/capture_pages?id=eq.${pageId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`PostgREST request failed with status ${res.status}: ${errText}`);
    }
    const data = await res.json();
    const authorized = Array.isArray(data) && data.length > 0;
    if (!authorized) {
      throw new Error(`User is not authorized (RLS returned 0 matching rows). User is likely not a member of the workspace for page ${pageId}.`);
    }
    return true;
  } catch (err: any) {
    console.error(`[SITES_DEBUG] Error verifying user access: ${err?.message || err}`);
    throw err;
  }
}

export async function getCapturePageBySlugs(
  tenantSlug: string,
  pageSlug: string,
  isPreview?: boolean,
  token?: string
): Promise<CapturePageData | null> {
  const targetSlug = (pageSlug === '_root_' || pageSlug === 'root') ? '' : (pageSlug || '');
  const url = (isPreview || token)
    ? `${PGRST_BASE_URL}/capture_pages?select=*,tenants:workspaces!inner(*,workspace_domains!inner(*))&slug=eq.${targetSlug}&tenants.workspace_domains.subdomain=eq.${tenantSlug}`
    : `${PGRST_BASE_URL}/capture_pages?select=*,tenants:workspaces!inner(*,workspace_domains!inner(*))&slug=eq.${targetSlug}&is_active=eq.true&tenants.workspace_domains.subdomain=eq.${tenantSlug}`;
  try {
    console.log(`[SITES_DEBUG] getCapturePageBySlugs called with tenantSlug=${tenantSlug}, pageSlug=${pageSlug}, isPreview=${isPreview}, tokenExists=${!!token}`);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`getCapturePageBySlugs fetch failed with status ${res.status}`);
    }
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      if (item.tenants && item.tenants.workspace_domains && item.tenants.workspace_domains.length > 0) {
        item.tenants.slug = item.tenants.workspace_domains[0].subdomain;
      } else if (item.tenants && item.tenants.workspace_domains && typeof item.tenants.workspace_domains === 'object') {
        item.tenants.slug = item.tenants.workspace_domains.subdomain;
      }
      
      const status = item.site_config?.status;
      const isPublished = status === 'published';
      console.log(`[SITES_DEBUG] Page found: id=${item.id}, site_config.status=${status}, isPublished=${isPublished}`);
      
      if (isPreview || token) {
        if (token) {
          try {
            const authorized = await verifyUserAccess(item.id, token);
            if (authorized) {
              return applyDraftData(item) as CapturePageData;
            }
          } catch (verifyErr: any) {
            throw new Error(`Auth verification failed: ${verifyErr.message}`);
          }
        }
        if (isPublished) {
          console.log(`[SITES_DEBUG] Returning published page as fallback for preview`);
          return item as CapturePageData;
        }
        throw new Error(`User is not authorized or token is missing, and page is not published.`);
      }
      
      if (!isPublished) {
        throw new Error(`Page is not published and not in preview mode`);
      }
      return item as CapturePageData;
    }
    
    // Fallback: se isPreview for falso mas a página ainda estiver pendente, busca sem a trava is_active
    if (!isPreview && !token) {
      const fallbackUrl = `${PGRST_BASE_URL}/capture_pages?select=*,tenants:workspaces!inner(*,workspace_domains!inner(*))&slug=eq.${targetSlug}&tenants.workspace_domains.subdomain=eq.${tenantSlug}`;
      const fallbackRes = await fetch(fallbackUrl, { cache: 'no-store' });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (Array.isArray(fallbackData) && fallbackData.length > 0) {
          const item = fallbackData[0];
          if (item.tenants && item.tenants.workspace_domains && item.tenants.workspace_domains.length > 0) {
            item.tenants.slug = item.tenants.workspace_domains[0].subdomain;
          } else if (item.tenants && item.tenants.workspace_domains && typeof item.tenants.workspace_domains === 'object') {
            item.tenants.slug = item.tenants.workspace_domains.subdomain;
          }
          const isPublished = item.site_config?.status === 'published';
          if (isPublished) {
            return item as CapturePageData;
          }
        }
      }
    }
    
    // Se buscando a página raiz e não encontrada com slug="", busca a página mais recente do tenant
    if (targetSlug === '') {
      const rootFallbackUrl = `${PGRST_BASE_URL}/capture_pages?select=*,tenants:workspaces!inner(*,workspace_domains!inner(*))&tenants.workspace_domains.subdomain=eq.${tenantSlug}&order=created_at.desc&limit=1`;
      const rootFallbackRes = await fetch(rootFallbackUrl, { cache: 'no-store' });
      if (rootFallbackRes.ok) {
        const rootFallbackData = await rootFallbackRes.json();
        if (Array.isArray(rootFallbackData) && rootFallbackData.length > 0) {
          const item = rootFallbackData[0];
          if (item.tenants && item.tenants.workspace_domains && item.tenants.workspace_domains.length > 0) {
            item.tenants.slug = item.tenants.workspace_domains[0].subdomain;
          } else if (item.tenants && item.tenants.workspace_domains && typeof item.tenants.workspace_domains === 'object') {
            item.tenants.slug = item.tenants.workspace_domains.subdomain;
          }
          const isPublished = item.site_config?.status === 'published';
          if (isPublished) {
            return item as CapturePageData;
          }
        }
      }
    }
    
    throw new Error(`No matching capture page found for domain ${tenantSlug} and slug ${pageSlug}`);
  } catch (err) {
    console.error('Error fetching capture page by slugs:', err);
    throw err;
  }
}

export async function getCapturePageByDomain(
  domainName: string,
  pathSlug: string = '',
  isPreview?: boolean,
  token?: string
): Promise<CapturePageData | null> {
  const cleanDomain = domainName.split(':')[0].toLowerCase();
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'theraos.app';
  const cleanPathSlug = (pathSlug === '_root_' || pathSlug === 'root') ? '' : pathSlug.trim().toLowerCase();

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
    const pageUrl = (isPreview || token)
      ? `${PGRST_BASE_URL}/capture_pages?select=*,tenants:workspaces!inner(*,workspace_domains(*))&workspace_id=eq.${tenantData.id}&slug=eq.${cleanPathSlug}&limit=1`
      : `${PGRST_BASE_URL}/capture_pages?select=*,tenants:workspaces!inner(*,workspace_domains(*))&workspace_id=eq.${tenantData.id}&slug=eq.${cleanPathSlug}&is_active=eq.true&limit=1`;
    try {
      const res = await fetch(pageUrl, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const item = data[0];
          if (item.tenants && item.tenants.workspace_domains && item.tenants.workspace_domains.length > 0) {
            item.tenants.slug = item.tenants.workspace_domains[0].subdomain;
          }
          
          const isPublished = item.site_config?.status === 'published';
          
          if (isPreview || token) {
            if (token) {
              const authorized = await verifyUserAccess(item.id, token);
              if (authorized) {
                return applyDraftData(item) as CapturePageData;
              }
            }
            if (isPublished) {
              return item as CapturePageData;
            }
            return null;
          }
          
          if (!isPublished) return null;
          return item as CapturePageData;
        }
      }
      if (cleanPathSlug === '' && !isPreview && !token) {
        const fallbackUrl = `${PGRST_BASE_URL}/capture_pages?select=*,tenants:workspaces!inner(*,workspace_domains(*))&workspace_id=eq.${tenantData.id}&is_active=eq.true&order=created_at.desc&limit=1`;
        const fallbackRes = await fetch(fallbackUrl, { cache: 'no-store' });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (Array.isArray(fallbackData) && fallbackData.length > 0) {
            const item = fallbackData[0];
            if (item.tenants && item.tenants.workspace_domains && item.tenants.workspace_domains.length > 0) {
              item.tenants.slug = item.tenants.workspace_domains[0].subdomain;
            }
            const isPublished = item.site_config?.status === 'published';
            if (isPublished) {
              return item as CapturePageData;
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching capture page by tenant and path:', err);
    }
  }

  const legacyUrl = (isPreview || token)
    ? `${PGRST_BASE_URL}/capture_pages?select=*,tenants:workspaces!inner(*,workspace_domains(*))&custom_domain=eq.${cleanDomain}&limit=1`
    : `${PGRST_BASE_URL}/capture_pages?select=*,tenants:workspaces!inner(*,workspace_domains(*))&custom_domain=eq.${cleanDomain}&is_active=eq.true&limit=1`;
  try {
    const res = await fetch(legacyUrl, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        if (item.tenants && item.tenants.workspace_domains && item.tenants.workspace_domains.length > 0) {
          item.tenants.slug = item.tenants.workspace_domains[0].subdomain;
        }
        
        const isPublished = item.site_config?.status === 'published';
        
        if (isPreview || token) {
          if (token) {
            const authorized = await verifyUserAccess(item.id, token);
            if (authorized) {
              return applyDraftData(item) as CapturePageData;
            }
          }
          if (isPublished) {
            return item as CapturePageData;
          }
          return null;
        }
        
        if (!isPublished) return null;
        return item as CapturePageData;
      }
    }
  } catch (err) {
    console.error('Error fetching capture page by legacy custom domain:', err);
  }

  return null;
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
  // 1. Tentar buscar pelo subdomínio na tabela workspace_domains
  const url = `${PGRST_BASE_URL}/workspace_domains?select=workspace:workspaces(*)&subdomain=eq.${slug}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].workspace) {
        const t = data[0].workspace;
        return {
          id: t.id,
          name: t.name,
          slug: slug,
          domain: data[0].custom_domain || null,
          phone: t.phone || null,
          gradientColorStart: t.gradient_color_start || null,
          gradientColorEnd: t.gradient_color_end || null,
          contrastColor: t.contrast_color || null,
          bgDarkColor: t.bg_dark_color || null,
          cardDarkColor: t.card_dark_color || null,
          textDarkColor: t.text_dark_color || null,
          logoLightUrl: t.logo_light_url || null,
          logoDarkUrl: t.logo_dark_url || null,
        };
      }
    }
  } catch (err) {
    console.error('Error fetching workspace by subdomain slug:', err);
  }

  // 2. Fallback: buscar direto por UUID se o slug recebido já for um UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(slug)) {
    const directUrl = `${PGRST_BASE_URL}/workspaces?id=eq.${slug}`;
    try {
      const res = await fetch(directUrl, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
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
        }
      }
    } catch (err) {
      console.error('Error fetching workspace by UUID directly:', err);
    }
  }

  return null;
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
    const selectFields = 'id,platform_name,logo_light_url,logo_dark_url,icon_light_url,icon_dark_url,gradient_color_start,gradient_color_end,contrast_color,bg_light_color,bg_dark_color,base_domain,r2_bucket_name,r2_public_domain,resend_from_domain,has_resend,base_tenant_price,additional_member_price,created_at,updated_at';
    const pgrstUrl = `${PGRST_BASE_URL}/platform_settings?select=${selectFields}&limit=1`;
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

