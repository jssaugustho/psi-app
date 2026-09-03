import { cache } from 'react';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1';

let resolvedPgrstUrl = API_BASE_URL;
if (resolvedPgrstUrl.includes('localhost:5000') || resolvedPgrstUrl.includes('127.0.0.1:5000')) {
  resolvedPgrstUrl = resolvedPgrstUrl.replace(':5000', ':8000');
}

export const PGRST_BASE_URL = resolvedPgrstUrl.endsWith('/v1')
  ? resolvedPgrstUrl.slice(0, -3) + '/rest/v1'
  : resolvedPgrstUrl + '/rest/v1';

export const apiConnection = {
  notifyOffline(errorMsg?: string) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('psi:api-offline', { detail: { message: errorMsg } }));
    }
  },
  notifyOnline() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('psi:api-online'));
    }
  },
};

let lastNetworkErrorTime = 0;

function isNetworkErrorCoolingDown(): boolean {
  return lastNetworkErrorTime > 0 && Date.now() - lastNetworkErrorTime < 3000;
}

function handleFetchError(err: any) {
  lastNetworkErrorTime = Date.now();
  apiConnection.notifyOffline('Servidor de API indisponível.');
}

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
  if (isNetworkErrorCoolingDown()) return false;
  try {
    const res = await fetch(`${PGRST_BASE_URL}/capture_pages?id=eq.${pageId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    });
    if (!res.ok) {
      return false;
    }
    const data = await res.json();
    apiConnection.notifyOnline();
    return Array.isArray(data) && data.length > 0;
  } catch (err: any) {
    handleFetchError(err);
    return false;
  }
}

export const getCapturePageBySlugs = cache(async (
  tenantSlug: string,
  pageSlug: string,
  isPreview?: boolean,
  token?: string
): Promise<CapturePageData | null> => {
  if (isNetworkErrorCoolingDown()) return null;

  const targetSlug = (pageSlug === '_root_' || pageSlug === 'root') ? '' : (pageSlug || '');
  const url = (isPreview || token)
    ? `${PGRST_BASE_URL}/capture_pages?select=*,tenants:workspaces!inner(*,workspace_domains!inner(*))&slug=eq.${targetSlug}&tenants.workspace_domains.subdomain=eq.${tenantSlug}`
    : `${PGRST_BASE_URL}/capture_pages?select=*,tenants:workspaces!inner(*,workspace_domains!inner(*))&slug=eq.${targetSlug}&is_active=eq.true&tenants.workspace_domains.subdomain=eq.${tenantSlug}`;
  try {
    const fetchOptions: RequestInit = (isPreview || token) ? { cache: 'no-store' } : { next: { revalidate: 60, tags: ['sites', `site-${tenantSlug}`] } };
    const res = await fetch(url, fetchOptions);
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    apiConnection.notifyOnline();

    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      if (item.tenants && item.tenants.workspace_domains && item.tenants.workspace_domains.length > 0) {
        item.tenants.slug = item.tenants.workspace_domains[0].subdomain;
      } else if (item.tenants && item.tenants.workspace_domains && typeof item.tenants.workspace_domains === 'object') {
        item.tenants.slug = item.tenants.workspace_domains.subdomain;
      }
      
      const status = item.site_config?.status;
      const isPublished = status === 'published';
      
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
      
      if (!isPublished) {
        return null;
      }
      return item as CapturePageData;
    }
    return null;
  } catch (err) {
    handleFetchError(err);
    return null;
  }
});

export const getCapturePageByDomain = cache(async (
  domainName: string,
  pathSlug: string = '',
  isPreview?: boolean,
  token?: string
): Promise<CapturePageData | null> => {
  if (isNetworkErrorCoolingDown()) return null;

  const cleanDomain = domainName.split(':')[0].toLowerCase();
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'theraos.app';
  const cleanPathSlug = (pathSlug === '_root_' || pathSlug === 'root') ? '' : pathSlug.trim().toLowerCase();

  const fetchOptions: RequestInit = (isPreview || token) ? { cache: 'no-store' } : { next: { revalidate: 60, tags: ['sites', `domain-${cleanDomain}`] } };

  let tenantData: TenantData | null = null;

  if (cleanDomain.endsWith(`.${baseDomain}`)) {
    const parts = cleanDomain.replace(`.${baseDomain}`, '').split('.');
    const tenantSlug = parts[parts.length - 1];
    if (tenantSlug && tenantSlug !== 'www' && tenantSlug !== 'app' && tenantSlug !== 'sites') {
      tenantData = await getTenantBySlug(tenantSlug);
    }
  } else if (!cleanDomain.includes('.')) {
    tenantData = await getTenantBySlug(cleanDomain);
  } else {
    const parts = cleanDomain.split('.');
    if (parts.length >= 3) {
      const candidateSlug = parts[0];
      if (candidateSlug && !['www', 'app', 'sites', 'custom'].includes(candidateSlug)) {
        tenantData = await getTenantBySlug(candidateSlug);
      }
    }
  }

  // Busca direta em workspace_domains caso tenantData ainda não tenha sido resolvido por slug
  if (!tenantData) {
    const altCleanDomain = cleanDomain.startsWith('www.') ? cleanDomain.replace('www.', '') : `www.${cleanDomain}`;
    const domainUrl = `${PGRST_BASE_URL}/workspace_domains?select=workspace:workspaces(*)&or=(custom_domain.eq.${cleanDomain},custom_domain.eq.${altCleanDomain})`;
    try {
      const res = await fetch(domainUrl, fetchOptions);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && data[0].workspace) {
          const t = data[0].workspace;
          tenantData = {
            id: t.id,
            name: t.name,
            slug: t.name,
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
      handleFetchError(err);
      return null;
    }
  }

  if (tenantData) {
    const pageUrl = (isPreview || token)
      ? `${PGRST_BASE_URL}/capture_pages?select=*,tenants:workspaces!inner(*,workspace_domains(*))&workspace_id=eq.${tenantData.id}&slug=eq.${cleanPathSlug}&limit=1`
      : `${PGRST_BASE_URL}/capture_pages?select=*,tenants:workspaces!inner(*,workspace_domains(*))&workspace_id=eq.${tenantData.id}&slug=eq.${cleanPathSlug}&is_active=eq.true&limit=1`;
    try {
      const res = await fetch(pageUrl, fetchOptions);
      if (res.ok) {
        const data = await res.json();
        apiConnection.notifyOnline();
        if (Array.isArray(data) && data.length > 0) {
          const item = data[0];
          if (item.tenants && item.tenants.workspace_domains) {
            if (Array.isArray(item.tenants.workspace_domains) && item.tenants.workspace_domains.length > 0) {
              item.tenants.slug = item.tenants.workspace_domains[0].subdomain;
            } else if (typeof item.tenants.workspace_domains === 'object') {
              item.tenants.slug = (item.tenants.workspace_domains as any).subdomain;
            }
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
      handleFetchError(err);
      return null;
    }
  }

  const altCleanDomain = cleanDomain.startsWith('www.') ? cleanDomain.replace('www.', '') : `www.${cleanDomain}`;
  const legacyUrl = (isPreview || token)
    ? `${PGRST_BASE_URL}/capture_pages?select=*,tenants:workspaces!inner(*,workspace_domains(*))&or=(custom_domain.eq.${cleanDomain},custom_domain.eq.${altCleanDomain})&limit=1`
    : `${PGRST_BASE_URL}/capture_pages?select=*,tenants:workspaces!inner(*,workspace_domains(*))&or=(custom_domain.eq.${cleanDomain},custom_domain.eq.${altCleanDomain})&is_active=eq.true&limit=1`;
  try {
    const res = await fetch(legacyUrl, fetchOptions);
    if (res.ok) {
      const data = await res.json();
      apiConnection.notifyOnline();
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
    handleFetchError(err);
  }

  return null;
});

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

export const getTenantBySlug = cache(async (slug: string): Promise<TenantData | null> => {
  if (isNetworkErrorCoolingDown()) return null;

  const fetchOptions: RequestInit = { next: { revalidate: 60, tags: ['tenants', `tenant-${slug}`] } };
  const url = `${PGRST_BASE_URL}/workspace_domains?select=workspace:workspaces(*)&subdomain=eq.${slug}`;
  try {
    const res = await fetch(url, fetchOptions);
    if (res.ok) {
      const data = await res.json();
      apiConnection.notifyOnline();
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
    handleFetchError(err);
    return null;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(slug)) {
    const directUrl = `${PGRST_BASE_URL}/workspaces?id=eq.${slug}`;
    try {
      const res = await fetch(directUrl, fetchOptions);
      if (res.ok) {
        const data = await res.json();
        apiConnection.notifyOnline();
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
      handleFetchError(err);
    }
  }

  return null;
});

export const getTenantByDomain = cache(async (domain: string): Promise<TenantData | null> => {
  if (isNetworkErrorCoolingDown()) return null;

  const clean = domain.split(':')[0].toLowerCase();
  const altClean = clean.startsWith('www.') ? clean.replace('www.', '') : `www.${clean}`;

  const fetchOptions: RequestInit = { next: { revalidate: 60, tags: ['tenants', `domain-${clean}`] } };
  const url = `${PGRST_BASE_URL}/workspace_domains?select=workspace:workspaces(*)&or=(custom_domain.eq.${clean},custom_domain.eq.${altClean})`;
  try {
    const res = await fetch(url, fetchOptions);
    if (res.ok) {
      const data = await res.json();
      apiConnection.notifyOnline();
      if (Array.isArray(data) && data.length > 0 && data[0].workspace) {
        const t = data[0].workspace;
        return {
          id: t.id,
          name: t.name,
          slug: t.name,
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
    handleFetchError(err);
  }

  return null;
});

export const getPrimaryTenant = cache(async (): Promise<TenantData | null> => {
  if (isNetworkErrorCoolingDown()) return null;

  const url = `${API_BASE_URL}/platform/tenant/primary`;
  try {
    const res = await fetch(url, { next: { revalidate: 300, tags: ['primary-tenant'] } });
    if (res.ok) {
      const data = await res.json();
      apiConnection.notifyOnline();
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
  } catch (err) {
    handleFetchError(err);
  }

  return null;
});

export const getBootstrapStatus = cache(async (): Promise<{ bootstrapped: boolean } | null> => {
  if (isNetworkErrorCoolingDown()) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/bootstrap/status`, { next: { revalidate: 300, tags: ['bootstrap'] } });
    if (!res.ok) return null;
    apiConnection.notifyOnline();
    return await res.json();
  } catch (err) {
    handleFetchError(err);
    return null;
  }
});
