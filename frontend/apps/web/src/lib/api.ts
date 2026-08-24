import { compressImage, type UploadType } from '@psi/image-utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const PGRST_BASE_URL = API_BASE_URL.endsWith('/v1')
  ? API_BASE_URL.slice(0, -3) + '/rest/v1'
  : API_BASE_URL + '/rest/v1';

const TENANT_SELECT = 'id,name,slug,domain,ownerId:owner_id,crp,bio,specialties,cityState:city_state,instagram,isOnlineService:is_online_service,defaultSiteAvatarUrl:default_site_avatar_url,traffic_sources,default_traffic_source';

export interface User {
  id: string;
  nome: string;
  sobrenome: string;
  telefone: string | null;
  email: string;
  role?: string;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BootstrapStatusResponse {
  bootstrapped: boolean;
  has_admin?: boolean;
  has_platform_settings?: boolean;
  admin_email?: string | null;
  message?: string;
}

export interface VisualIdentity {
  id: string;
  workspaceId: string;
  name: string;
  isWorkspaceDefault: boolean;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  logoConfig?: {
    mode: 'html' | 'image';
    text?: string;
    iconType?: 'psi' | 'custom';
    customIconUrl?: string;
  } | null;
  primaryColor: string;
  secondaryColor: string;
  contrastColor: string;
  bgColor: string;
  cardColor: string;
  textColor: string;
  fontHeading: string;
  fontBody: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceDomain {
  id: string;
  workspaceId: string;
  subdomain: string;
  customDomain?: string | null;
  cfHostnameId?: string | null;
  dnsStatus: string;
  dnsRecords?: Array<{ type: string; name: string; value: string; description?: string }> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug?: string;
  domain?: string | null;
  ownerId?: string | null;
  crp?: string | null;
  bio?: string | null;
  specialties?: string[] | null;
  cityState?: string | null;
  instagram?: string | null;
  isOnlineService?: boolean;
  defaultSiteAvatarUrl?: string | null;
  traffic_sources?: string[];
  default_traffic_source?: string;
  visualIdentity?: VisualIdentity | null;
  workspaceDomain?: WorkspaceDomain | null;
  createdAt?: string;
  updatedAt?: string;

  // Fallbacks de compatibilidade visual
  bgLightColor?: string;
  bgDarkColor?: string;
  cardLightColor?: string;
  cardDarkColor?: string;
  textLightColor?: string;
  textDarkColor?: string;
  emailDomain?: string | null;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
  iconLightUrl?: string | null;
  iconDarkUrl?: string | null;
  defaultSiteLogoUrl?: string | null;
  defaultSiteFaviconUrl?: string | null;
  defaultSiteLogoConfig?: any;
  defaultSitePrimaryColor?: string;
  defaultSiteSecondaryColor?: string;
  gradientColorStart?: string;
  gradientColorEnd?: string;
  contrastColor?: string;
}

// Alias de compatibilidade
export type Tenant = Workspace;

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  tenant_id?: string;
  user_id: string;
  role: 'owner' | 'admin' | 'secretaria' | 'psicologo' | 'agent' | 'membro';
  permissions?: string[];
  created_at: string;
  updated_at: string;
  profile?: User;
}

export type TenantMember = WorkspaceMember;

export interface TenantSubscription {
  tenant_id: string;
  tenant_name: string;
  owner_id: string | null;
  base_price: number;
  additional_member_price: number;
  members_count: number;
  total_price: number;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
  user: User;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
}

export interface PipelineColumn {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  color: string;
  category: 'pendente' | 'acolhimento' | 'paciente' | 'alta' | 'negativa';
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  source: string | null;
  screening_notes: string | null;
  next_contact_at: string | null;
  last_contact_at: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relation: string | null;
  emergency_contact_phone: string | null;
  is_minor: boolean;
  accepted_contract_at: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  created_at: string;
  updated_at: string;
}

export interface InteractionHistory {
  id: string;
  contact_id: string;
  tenant_id: string;
  type: 'comment' | 'status_change' | 'appointment' | 'email_sent';
  duration_seconds: number | null;
  notes: string | null;
  created_at: string;
  contact?: { name: string } | null;
}

export interface EmailCampaign {
  id: string;
  tenant_id: string;
  title: string;
  subject: string;
  body: string;
  status: 'draft' | 'sending' | 'sent';
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

let _refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    if (!refreshToken) throw new Error('Sem refresh_token disponível');

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) throw new Error('Refresh falhou');

    const data: RefreshTokenResponse = await response.json();
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('token_expires_at', String(data.expires_at));
    return data.access_token;
  })().finally(() => {
    _refreshPromise = null;
  });

  return _refreshPromise;
}

type ApiConnectionListener = (status: 'offline' | 'online', errorDetails?: string) => void;
const connectionListeners = new Set<ApiConnectionListener>();

export const apiConnection = {
  subscribe(listener: ApiConnectionListener) {
    connectionListeners.add(listener);
    return () => {
      connectionListeners.delete(listener);
    };
  },
  notifyOffline(errorMsg?: string) {
    connectionListeners.forEach((fn) => fn('offline', errorMsg));
  },
  notifyOnline() {
    connectionListeners.forEach((fn) => fn('online'));
  },
};

/**
 * Helper genérico de fetch para chamadas à API
 */
async function fetchApi<T>(endpoint: string, options: RequestInit = {}, _isRetry = false): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let resolvedEndpoint = endpoint;
  if (API_BASE_URL.endsWith('/v1') && resolvedEndpoint.startsWith('/v1/')) {
    resolvedEndpoint = resolvedEndpoint.slice(3);
  }

  const url = resolvedEndpoint.startsWith('http://') || resolvedEndpoint.startsWith('https://')
    ? resolvedEndpoint
    : `${API_BASE_URL}${resolvedEndpoint}`;

  let response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch (err: any) {
    console.error('Falha de conexão com o backend:', err);
    apiConnection.notifyOffline('Sem resposta do servidor de API. Verifique se o backend está rodando.');
    throw new Error('Servidor de API indisponível.');
  }

  // Verificar status 502, 503, 504 (erros de proxy/gateway)
  if ([502, 503, 504].includes(response.status)) {
    apiConnection.notifyOffline(`O servidor de API retornou código de erro ${response.status}.`);
    throw new Error('Servidor de API temporariamente indisponível.');
  }

  apiConnection.notifyOnline();

  // Tratar resposta vazia (204 No Content ou corpo sem texto)
  const contentType = response.headers.get('content-type');
  const text = await response.text();
  let data: any = {};
  if (text) {
    try {
      data = contentType?.includes('json') ? JSON.parse(text) : { message: text };
    } catch {
      data = { message: text };
    }
  }

  const isAuthEndpoint = endpoint.includes('/auth/login') ||
                         endpoint.includes('/auth/register') ||
                         endpoint.includes('/auth/bootstrap') ||
                         endpoint.includes('/auth/refresh');

  // Interceptor de 401: tenta renovar o token e repetir a requisição uma vez (apenas para rotas protegidas)
  if (response.status === 401 && !_isRetry && !isAuthEndpoint) {
    try {
      await doRefresh();
      return fetchApi<T>(endpoint, options, true); // retry com novo token
    } catch {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:logout'));
      }
      throw new Error('Sessão expirada. Faça login novamente.');
    }
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Erro na requisição');
  }

  return data as T;
}

export const api = {
  // Realizar cadastro
  register: (body: { nome: string; sobrenome: string; telefone?: string; email: string; password: string }) =>
    fetchApi<{ message: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Realizar login
  login: (body: { email: string; password: string }) =>
    fetchApi<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ ...body, appType: 'app' }),
    }),

  // Renovar access_token usando o refresh_token
  refreshToken: (refresh_token: string) =>
    fetchApi<RefreshTokenResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token }),
    }),

  // Buscar perfil do usuário logado
  getMe: () => fetchApi<{ user: User }>('/auth/me'),

  // Atualizar perfil de usuário logado
  updateMe: (body: {
    nome: string;
    sobrenome: string;
    telefone?: string | null;
    avatarUrl?: string | null;
    password?: string | null;
  }) =>
    fetchApi<{ message: string; user: User }>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  // Pede ao backend uma Presigned URL para upload direto no Cloudflare R2
  getUploadPresignedUrl: (body: {
    filename: string;
    content_type: string;
    upload_type: UploadType;
  }) =>
    fetchApi<{ upload_url: string; public_url: string; key: string }>('/platform/upload/presign', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /**
   * Pipeline completo de upload:
   * 1. Comprime a imagem client-side com Canvas API
   * 2. Solicita Presigned URL ao backend
   * 3. Faz PUT direto no Cloudflare R2 (sem passar pela VPS)
   * Retorna a URL pública permanente do arquivo.
   */
  uploadImage: async (file: File, type: UploadType): Promise<{ url: string; key: string }> => {
    // 1. Comprimir client-side com Canvas API (@psi/image-utils)
    const compressed = await compressImage(file, type);

    // 2. Pedir Presigned URL diretamente ao backend
    const { upload_url, public_url, key } = await fetchApi<{ upload_url: string; public_url: string; key: string }>(
      '/platform/upload/presign',
      {
        method: 'POST',
        body: JSON.stringify({
          filename: compressed.name,
          content_type: compressed.type,
          upload_type: type,
        }),
      }
    );

    // 3. PUT direto no Cloudflare R2 (sem passar pela VPS)
    const uploadRes = await fetch(upload_url, {
      method: 'PUT',
      body: compressed,
      headers: { 'Content-Type': compressed.type },
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '');
      if (errText.includes('AccessDenied') || uploadRes.status === 403) {
        throw new Error('Acesso Negado pelo Cloudflare R2. Verifique se a R2 Secret Access Key salva em Configurações > Cloudflare & R2 está correta.');
      }
      throw new Error(`Falha ao enviar arquivo para o R2: ${uploadRes.statusText || uploadRes.status}`);
    }

    return { url: public_url, key };
  },

  // --- BIBLIOTECA DE MIDIA METODOS ---
  getMediaAssets: async (tenantId: string) => {
    return fetchApi<any[]>(`/platform/media?tenantId=${tenantId}`, {
      method: 'GET',
    });
  },

  registerMediaAsset: async (body: {
    tenantId: string;
    name: string;
    key: string;
    url: string;
    mimeType: string;
    fileSize: number;
    width?: number | null;
    height?: number | null;
    isCropped?: boolean;
    parentId?: string | null;
    usageContext?: string | null;
  }) => {
    return fetchApi<any>('/platform/media', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  deleteMediaAsset: async (id: string) => {
    return fetchApi<{ message: string }>(`/platform/media/${id}`, {
      method: 'DELETE',
    });
  },

  // --- SUB & RBAC METODOS ---
  getTenantSubscription: async (tenantId: string) => {
    const res = await fetchApi<TenantSubscription[]>(`${PGRST_BASE_URL}/tenant_subscriptions?tenant_id=eq.${tenantId}&limit=1`);
    return res[0] || null;
  },

  getTenantMembers: async (tenantId: string) => {
    return fetchApi<TenantMember[]>(`${PGRST_BASE_URL}/tenant_members?tenant_id=eq.${tenantId}&select=id,tenant_id,user_id,role,created_at,updated_at,profile:profiles(id,nome:first_name,sobrenome:last_name,email,phone)`);
  },

  addTenantMemberByEmail: async (tenantId: string, email: string, role: 'admin' | 'secretaria' | 'psicologo' | 'agent') => {
    return fetchApi<any>('/auth/invite', {
      method: 'POST',
      body: JSON.stringify({
        tenantId,
        email,
        role
      })
    });
  },

  resendInvite: async (tenantId: string, email: string) => {
    return fetchApi<any>('/auth/invite/resend', {
      method: 'POST',
      body: JSON.stringify({
        tenantId,
        email
      })
    });
  },

  getEmailLogsByEmail: async (email: string) => {
    return fetchApi<any[]>(`${PGRST_BASE_URL}/email_logs?to_email=eq.${email.trim().toLowerCase()}&order=created_at.desc`);
  },

  updateTenantMemberRole: async (memberId: string, role: 'admin' | 'secretaria' | 'psicologo' | 'agent') => {
    const res = await fetchApi<TenantMember[]>(`${PGRST_BASE_URL}/tenant_members?id=eq.${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
      headers: {
        'Prefer': 'return=representation'
      }
    });
    return res[0];
  },

  removeTenantMember: async (memberId: string) => {
    await fetchApi(`${PGRST_BASE_URL}/tenant_members?id=eq.${memberId}`, {
      method: 'DELETE'
    });
  },

  getBootstrapStatus: () => fetchApi<BootstrapStatusResponse>('/auth/bootstrap/status'),

  getMyTenants: async (userId: string, userRole?: string) => {
    if (userRole === 'admin') {
      try {
        const allTenants = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/tenants?select=${TENANT_SELECT}&order=created_at.desc`);
        if (allTenants && allTenants.length > 0) {
          return allTenants.map((t) => ({ ...t, memberRole: 'admin' }));
        }
      } catch (e) {
        console.warn('Erro ao carregar lista global de tenants para admin:', e);
      }
    }

    let memberRes: any[] = [];
    let ownedRes: Tenant[] = [];

    try {
      memberRes = await fetchApi<any[]>(`${PGRST_BASE_URL}/tenant_members?user_id=eq.${userId}&select=role,tenant:tenants(${TENANT_SELECT})`);
      ownedRes = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/tenants?owner_id=eq.${userId}&select=${TENANT_SELECT}`);
    } catch (err) {
      console.warn('Erro com TENANT_SELECT customizado, tentando fallback simples:', err);
      try {
        const SIMPLE_SELECT = 'id,name,slug,domain,ownerId:owner_id';
        memberRes = await fetchApi<any[]>(`${PGRST_BASE_URL}/tenant_members?user_id=eq.${userId}&select=role,tenant:tenants(${SIMPLE_SELECT})`);
        ownedRes = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/tenants?owner_id=eq.${userId}&select=${SIMPLE_SELECT}`);
      } catch (errFallback) {
        console.error('Erro ao buscar pertencimento de tenants:', errFallback);
      }
    }
    
    const list: (Tenant & { memberRole?: string })[] = [];
    const ids = new Set<string>();
    
    for (const t of ownedRes || []) {
      list.push({ ...t, memberRole: 'admin' });
      ids.add(t.id);
    }
    
    for (const m of memberRes || []) {
      if (m.tenant && !ids.has(m.tenant.id)) {
        list.push({ ...m.tenant, memberRole: m.role });
        ids.add(m.tenant.id);
      }
    }

    if (list.length === 0) {
      try {
        const fallbackTenants = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/tenants?select=id,name,slug,domain,owner_id&order=created_at.desc`);
        if (fallbackTenants && fallbackTenants.length > 0) {
          return fallbackTenants.map((t) => ({ ...t, memberRole: 'admin' }));
        }
      } catch (e) {
        console.warn('Falha no fallback de tenants:', e);
      }
    }
    
    return list;
  },

  updateTenantBranding: async (tenantId: string, body: Partial<Tenant>) => {
    const dbBody: Record<string, any> = {};
    if (body.name !== undefined) dbBody.name = body.name;
    if (body.slug !== undefined) dbBody.slug = body.slug;
    if (body.domain !== undefined) dbBody.domain = body.domain;
    if (body.crp !== undefined) dbBody.crp = body.crp;
    if (body.bio !== undefined) dbBody.bio = body.bio;
    if (body.specialties !== undefined) dbBody.specialties = body.specialties;
    if (body.cityState !== undefined) dbBody.city_state = body.cityState;
    if (body.instagram !== undefined) dbBody.instagram = body.instagram;
    if (body.isOnlineService !== undefined) dbBody.is_online_service = body.isOnlineService;
    if (body.gradientColorStart !== undefined) dbBody.gradient_color_start = body.gradientColorStart;
    if (body.gradientColorEnd !== undefined) dbBody.gradient_color_end = body.gradientColorEnd;
    if (body.contrastColor !== undefined) dbBody.contrast_color = body.contrastColor;
    if (body.bgLightColor !== undefined) dbBody.bg_light_color = body.bgLightColor;
    if (body.bgDarkColor !== undefined) dbBody.bg_dark_color = body.bgDarkColor;
    if (body.cardLightColor !== undefined) dbBody.card_light_color = body.cardLightColor;
    if (body.cardDarkColor !== undefined) dbBody.card_dark_color = body.cardDarkColor;
    if (body.textLightColor !== undefined) dbBody.text_light_color = body.textLightColor;
    if (body.textDarkColor !== undefined) dbBody.text_dark_color = body.textDarkColor;
    if (body.emailDomain !== undefined) dbBody.email_domain = body.emailDomain;
    if (body.defaultSiteAvatarUrl !== undefined) dbBody.default_site_avatar_url = body.defaultSiteAvatarUrl;
    if (body.defaultSiteLogoUrl !== undefined) dbBody.default_site_logo_url = body.defaultSiteLogoUrl;
    if (body.defaultSiteFaviconUrl !== undefined) dbBody.default_site_favicon_url = body.defaultSiteFaviconUrl;
    if (body.defaultSiteLogoConfig !== undefined) dbBody.default_site_logo_config = body.defaultSiteLogoConfig;
    if (body.defaultSitePrimaryColor !== undefined) dbBody.default_site_primary_color = body.defaultSitePrimaryColor;
    if (body.defaultSiteSecondaryColor !== undefined) dbBody.default_site_secondary_color = body.defaultSiteSecondaryColor;
    if (body.traffic_sources !== undefined) dbBody.traffic_sources = body.traffic_sources;
    if (body.default_traffic_source !== undefined) dbBody.default_traffic_source = body.default_traffic_source;

    const res = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/tenants?id=eq.${tenantId}`, {
      method: 'PATCH',
      body: JSON.stringify(dbBody),
      headers: {
        'Prefer': 'return=representation'
      }
    });
    return res[0];
  },

  updateProfile: async (userId: string, body: Partial<{
    nome: string;
    sobrenome: string;
    telefone: string | null;
    avatar_url: string | null;
    crp: string | null;
    bio: string | null;
    specialties: string[] | null;
    city_state: string | null;
    instagram: string | null;
  }>) => {
    const dbBody: Record<string, any> = {};
    if (body.nome !== undefined) dbBody.first_name = body.nome;
    if (body.sobrenome !== undefined) dbBody.last_name = body.sobrenome;
    if (body.telefone !== undefined) dbBody.phone = body.telefone;
    if (body.avatar_url !== undefined) dbBody.avatar_url = body.avatar_url;
    if (body.crp !== undefined) dbBody.crp = body.crp;
    if (body.bio !== undefined) dbBody.bio = body.bio;
    if (body.specialties !== undefined) dbBody.specialties = body.specialties;
    if (body.city_state !== undefined) dbBody.city_state = body.city_state;
    if (body.instagram !== undefined) dbBody.instagram = body.instagram;

    const res = await fetchApi<any[]>(`${PGRST_BASE_URL}/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(dbBody),
      headers: {
        'Prefer': 'return=representation'
      }
    });
    return res[0];
  },

  getPrimaryTenant: async () => {
    try {
      const res = await fetchApi<{ tenant: Tenant }>(`/platform/tenant/primary`);
      return { tenant: res.tenant || null };
    } catch {
      return { tenant: null };
    }
  },

  updatePlatformBranding: async (body: {
    name?: string;
    logo_light_url?: string | null;
    logo_dark_url?: string | null;
    icon_light_url?: string | null;
    icon_dark_url?: string | null;
    gradient_color_start?: string;
    gradient_color_end?: string;
    contrast_color?: string;
  }) => {
    return fetchApi<{ message: string; settings: any }>(`/platform/tenant/primary`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  getTenantByDomain: async (domain: string) => {
    const res = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/tenants?select=${TENANT_SELECT}&domain=eq.${domain}`);
    return res[0] || null;
  },

  getTenantBySlug: async (slug: string) => {
    const res = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/tenants?select=${TENANT_SELECT}&slug=eq.${slug}`);
    return res[0] || null;
  },

  getTenantById: async (id: string) => {
    const res = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/tenants?select=${TENANT_SELECT}&id=eq.${id}`);
    return res[0] || null;
  },

  // --- CRM: Pipeline Columns ---
  getPipelineColumns: async (tenantId: string): Promise<PipelineColumn[]> => {
    return fetchApi<PipelineColumn[]>(`${PGRST_BASE_URL}/pipeline_columns?tenant_id=eq.${tenantId}&order=order.asc`);
  },

  createPipelineColumn: async (body: { tenant_id: string; name: string; order: number; slug?: string; color?: string; category?: string }): Promise<PipelineColumn> => {
    const res = await fetchApi<PipelineColumn[]>(`${PGRST_BASE_URL}/pipeline_columns`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Prefer': 'return=representation' }
    });
    return res[0];
  },

  updatePipelineColumn: async (id: string, body: Partial<PipelineColumn>): Promise<PipelineColumn> => {
    const res = await fetchApi<PipelineColumn[]>(`${PGRST_BASE_URL}/pipeline_columns?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Prefer': 'return=representation' }
    });
    return res[0];
  },

  deletePipelineColumn: async (id: string): Promise<void> => {
    await fetchApi(`${PGRST_BASE_URL}/pipeline_columns?id=eq.${id}`, {
      method: 'DELETE'
    });
  },

  // --- CRM: Contacts ---
  getContacts: async (tenantId: string): Promise<Contact[]> => {
    return fetchApi<Contact[]>(`${PGRST_BASE_URL}/contacts?tenant_id=eq.${tenantId}&order=created_at.desc`);
  },

  createContact: async (body: {
    tenant_id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    status: string;
    source?: string | null;
    screening_notes?: string | null;
  }): Promise<Contact> => {
    const res = await fetchApi<Contact[]>(`${PGRST_BASE_URL}/contacts`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Prefer': 'return=representation' }
    });
    return res[0];
  },

  updateContact: async (id: string, body: Partial<Contact>): Promise<Contact> => {
    const res = await fetchApi<Contact[]>(`${PGRST_BASE_URL}/contacts?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Prefer': 'return=representation' }
    });
    return res[0];
  },

  deleteContact: async (id: string): Promise<void> => {
    await fetchApi(`${PGRST_BASE_URL}/contacts?id=eq.${id}`, {
      method: 'DELETE'
    });
  },

  // --- CRM: Interaction History ---
  getInteractionHistory: async (contactId: string): Promise<InteractionHistory[]> => {
    return fetchApi<InteractionHistory[]>(`${PGRST_BASE_URL}/interaction_history?contact_id=eq.${contactId}&order=created_at.desc`);
  },

  getGlobalInteractionHistory: async (tenantId: string): Promise<InteractionHistory[]> => {
    return fetchApi<InteractionHistory[]>(`${PGRST_BASE_URL}/interaction_history?tenant_id=eq.${tenantId}&select=*,contact:contacts(name)&order=created_at.desc&limit=50`);
  },

  createInteractionHistory: async (body: {
    contact_id: string;
    tenant_id: string;
    type: 'comment' | 'status_change' | 'appointment' | 'email_sent';
    duration_seconds?: number | null;
    notes?: string | null;
  }): Promise<InteractionHistory> => {
    const res = await fetchApi<InteractionHistory[]>(`${PGRST_BASE_URL}/interaction_history`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Prefer': 'return=representation' }
    });
    return res[0];
  },

  // --- CRM: Email Campaigns ---
  getEmailCampaigns: async (tenantId: string): Promise<EmailCampaign[]> => {
    return fetchApi<EmailCampaign[]>(`${PGRST_BASE_URL}/email_campaigns?tenant_id=eq.${tenantId}&order=created_at.desc`);
  },

  createEmailCampaign: async (body: {
    tenant_id: string;
    title: string;
    subject: string;
    body: string;
    status: 'draft' | 'sending' | 'sent';
  }): Promise<EmailCampaign> => {
    const res = await fetchApi<EmailCampaign[]>(`${PGRST_BASE_URL}/email_campaigns`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Prefer': 'return=representation' }
    });
    return res[0];
  },

  updateEmailCampaign: async (id: string, body: Partial<EmailCampaign>): Promise<EmailCampaign> => {
    const res = await fetchApi<EmailCampaign[]>(`${PGRST_BASE_URL}/email_campaigns?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Prefer': 'return=representation' }
    });
    return res[0];
  },

  deleteEmailCampaign: async (id: string): Promise<void> => {
    await fetchApi(`${PGRST_BASE_URL}/email_campaigns?id=eq.${id}`, {
      method: 'DELETE'
    });
  },

  // --- Captação: Capture Pages ---
  getCapturePages: async (tenantId: string): Promise<CapturePage[]> => {
    const list = await fetchApi<any[]>(`${PGRST_BASE_URL}/capture_pages?tenant_id=eq.${tenantId}&order=created_at.desc`);
    return list.map(item => ({
      id: item.id,
      tenantId: item.tenant_id,
      title: item.title,
      slug: item.slug,
      isActive: item.is_active,
      customDomain: item.custom_domain,
      seoConfig: item.seo_config,
      siteConfig: item.site_config,
      dictionary: item.dictionary,
      formFlow: item.form_flow,
      titleDraft: item.title_draft,
      slugDraft: item.slug_draft,
      customDomainDraft: item.custom_domain_draft,
      seoConfigDraft: item.seo_config_draft,
      siteConfigDraft: item.site_config_draft,
      dictionaryDraft: item.dictionary_draft,
      formFlowDraft: item.form_flow_draft,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  getCapturePage: async (id: string): Promise<CapturePage> => {
    const list = await fetchApi<any[]>(`${PGRST_BASE_URL}/capture_pages?id=eq.${id}`);
    if (list.length === 0) throw new Error('Página não encontrada');
    const item = list[0];
    return {
      id: item.id,
      tenantId: item.tenant_id,
      title: item.title,
      slug: item.slug,
      isActive: item.is_active,
      customDomain: item.custom_domain,
      seoConfig: item.seo_config,
      siteConfig: item.site_config,
      dictionary: item.dictionary,
      formFlow: item.form_flow,
      titleDraft: item.title_draft,
      slugDraft: item.slug_draft,
      customDomainDraft: item.custom_domain_draft,
      seoConfigDraft: item.seo_config_draft,
      siteConfigDraft: item.site_config_draft,
      dictionaryDraft: item.dictionary_draft,
      formFlowDraft: item.form_flow_draft,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  },

  createCapturePage: async (body: {
    title: string;
    slug: string;
    tenantId?: string;
    customDomain?: string;
    crp?: string;
    approach?: string;
    address?: string;
    titlePart1?: string;
    titlePart2?: string;
    description?: string;
    whatsappMessageTemplate?: string;
    logoText?: string;
    primaryStart?: string;
    primaryEnd?: string;
    contrast?: string;
    logoUrl?: string;
    faviconUrl?: string;
    seoConfig?: { metaTitle?: string; metaDescription?: string; keywords?: string };
    siteConfig?: any;
    dictionary?: any;
    formFlow?: any;
  }): Promise<{ success: boolean; page: CapturePage }> => {
    const res = await fetchApi<{ success: boolean; page: any }>('/crm/captacao', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    return {
      success: res.success,
      page: {
        id: res.page.id,
        tenantId: res.page.tenantId || res.page.tenant_id,
        title: res.page.title,
        slug: res.page.slug,
        isActive: res.page.isActive ?? res.page.is_active,
        customDomain: res.page.customDomain ?? res.page.custom_domain,
        seoConfig: res.page.seoConfig || res.page.seo_config,
        siteConfig: res.page.siteConfig || res.page.site_config,
        dictionary: res.page.dictionary,
        formFlow: res.page.formFlow || res.page.form_flow,
        titleDraft: res.page.title_draft,
        slugDraft: res.page.slug_draft,
        customDomainDraft: res.page.custom_domain_draft,
        seoConfigDraft: res.page.seo_config_draft,
        siteConfigDraft: res.page.site_config_draft,
        dictionaryDraft: res.page.dictionary_draft,
        formFlowDraft: res.page.form_flow_draft,
        createdAt: res.page.createdAt || res.page.created_at,
        updatedAt: res.page.updatedAt || res.page.updated_at,
      }
    };
  },

  updateCapturePage: async (id: string, body: Partial<CapturePage>): Promise<CapturePage> => {
    const dbBody: Record<string, any> = {};
    if (body.title !== undefined) dbBody.title = body.title;
    if (body.slug !== undefined) dbBody.slug = body.slug;
    if (body.isActive !== undefined) dbBody.is_active = body.isActive;
    if (body.customDomain !== undefined) dbBody.custom_domain = body.customDomain;
    if (body.seoConfig !== undefined) dbBody.seo_config = body.seoConfig;
    if (body.siteConfig !== undefined) dbBody.site_config = body.siteConfig;
    if (body.dictionary !== undefined) dbBody.dictionary = body.dictionary;
    if (body.formFlow !== undefined) dbBody.form_flow = body.formFlow;

    if (body.titleDraft !== undefined) dbBody.title_draft = body.titleDraft;
    if (body.slugDraft !== undefined) dbBody.slug_draft = body.slugDraft;
    if (body.customDomainDraft !== undefined) dbBody.custom_domain_draft = body.customDomainDraft;
    if (body.seoConfigDraft !== undefined) dbBody.seo_config_draft = body.seoConfigDraft;
    if (body.siteConfigDraft !== undefined) dbBody.site_config_draft = body.siteConfigDraft;
    if (body.dictionaryDraft !== undefined) dbBody.dictionary_draft = body.dictionaryDraft;
    if (body.formFlowDraft !== undefined) dbBody.form_flow_draft = body.formFlowDraft;

    const res = await fetchApi<any[]>(`${PGRST_BASE_URL}/capture_pages?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dbBody),
      headers: { 'Prefer': 'return=representation' }
    });
    const item = res[0];
    return {
      id: item.id,
      tenantId: item.tenant_id,
      title: item.title,
      slug: item.slug,
      isActive: item.is_active,
      customDomain: item.custom_domain,
      seoConfig: item.seo_config,
      siteConfig: item.site_config,
      dictionary: item.dictionary,
      formFlow: item.form_flow,
      titleDraft: item.title_draft,
      slugDraft: item.slug_draft,
      customDomainDraft: item.custom_domain_draft,
      seoConfigDraft: item.seo_config_draft,
      siteConfigDraft: item.site_config_draft,
      dictionaryDraft: item.dictionary_draft,
      formFlowDraft: item.form_flow_draft,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  },

  deleteCapturePage: async (id: string): Promise<void> => {
    await fetchApi(`/crm/captacao/pages/${id}`, {
      method: 'DELETE'
    });
  },

  // --- Formulários de Triagem (Screening Forms) ---
  getForms: async (tenantId: string): Promise<ScreeningForm[]> => {
    const res = await fetchApi<{ success: boolean; forms: ScreeningForm[] }>(`/crm/forms?tenantId=${tenantId}`);
    return res.forms || [];
  },

  createForm: async (body: {
    title: string;
    slug?: string;
    tenantId: string;
    themeConfig?: Record<string, any>;
    formFlow?: Record<string, any>;
  }): Promise<ScreeningForm> => {
    const res = await fetchApi<{ success: boolean; form: ScreeningForm }>(`/crm/forms`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res.form;
  },

  getFormById: async (id: string): Promise<ScreeningForm> => {
    const res = await fetchApi<{ success: boolean; form: ScreeningForm }>(`/crm/forms/${id}`);
    return res.form;
  },

  updateForm: async (id: string, body: {
    titleDraft?: string;
    slugDraft?: string;
    themeConfigDraft?: Record<string, any>;
    formFlowDraft?: Record<string, any>;
    isPublish?: boolean;
  }): Promise<ScreeningForm> => {
    const res = await fetchApi<{ success: boolean; form: ScreeningForm }>(`/crm/forms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return res.form;
  },

  deleteForm: async (id: string): Promise<void> => {
    await fetchApi(`/crm/forms/${id}`, {
      method: 'DELETE',
    });
  },

  submitPublicForm: async (body: {
    tenantId: string;
    formId?: string;
    pageId?: string;
    responses: Record<string, any>;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
  }): Promise<{ success: boolean; contactId: string; name: string }> => {
    return fetchApi(`/crm/forms/public/submit`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // --- Captação: Contract Templates ---
  getContractTemplates: async (tenantId: string): Promise<ContractTemplate[]> => {
    const list = await fetchApi<any[]>(`${PGRST_BASE_URL}/contract_templates?tenant_id=eq.${tenantId}&order=created_at.desc`);
    return list.map(item => ({
      id: item.id,
      tenantId: item.tenant_id,
      title: item.title,
      content: item.content,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  createContractTemplate: async (body: { tenant_id: string; title: string; content: string }): Promise<ContractTemplate> => {
    const res = await fetchApi<any[]>(`${PGRST_BASE_URL}/contract_templates`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Prefer': 'return=representation' }
    });
    const item = res[0];
    return {
      id: item.id,
      tenantId: item.tenant_id,
      title: item.title,
      content: item.content,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  },

  updateContractTemplate: async (id: string, body: Partial<ContractTemplate>): Promise<ContractTemplate> => {
    const dbBody: Record<string, any> = {};
    if (body.title !== undefined) dbBody.title = body.title;
    if (body.content !== undefined) dbBody.content = body.content;

    const res = await fetchApi<any[]>(`${PGRST_BASE_URL}/contract_templates?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dbBody),
      headers: { 'Prefer': 'return=representation' }
    });
    const item = res[0];
    return {
      id: item.id,
      tenantId: item.tenant_id,
      title: item.title,
      content: item.content,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  },

  deleteContractTemplate: async (id: string): Promise<void> => {
    await fetchApi(`${PGRST_BASE_URL}/contract_templates?id=eq.${id}`, {
      method: 'DELETE'
    });
  },

  getPlatformSetupStatus: async (): Promise<{ base_domain: string | null }> => {
    return fetchApi<{ base_domain: string | null }>('/platform/setup/status');
  },

  checkSubdomainAvailability: async (slug: string, tenantId?: string): Promise<{ available: boolean; slug: string; fullUrl: string; reason: string }> => {
    const query = tenantId 
      ? `/crm/captacao/check-subdomain?slug=${encodeURIComponent(slug)}&tenantId=${encodeURIComponent(tenantId)}`
      : `/crm/captacao/check-subdomain?slug=${encodeURIComponent(slug)}`;
    return fetchApi<{ available: boolean; slug: string; fullUrl: string; reason: string }>(query);
  },

  registerCustomHostname: async (pageId: string | null, domain: string): Promise<{
    success: boolean;
    status: string;
    hostname: string;
    hostnameId?: string;
    cnameTarget: string;
    dnsRecords: Array<{ type: string; name: string; value: string; description: string }>;
  }> => {
    return fetchApi('/crm/captacao/custom-hostname/register', {
      method: 'POST',
      body: JSON.stringify({ pageId, domain }),
    });
  },

  verifyCustomHostname: async (domain: string, hostnameId?: string): Promise<{
    success: boolean;
    status: string;
    sslStatus?: string;
    sslActive: boolean;
    hostname: string;
    hostnameId?: string;
    cnameTarget: string;
  }> => {
    return fetchApi('/crm/captacao/custom-hostname/verify', {
      method: 'POST',
      body: JSON.stringify({ domain, hostnameId }),
    });
  }
};

export interface CapturePage {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  isActive: boolean;
  ctaType?: 'whatsapp' | 'external_url' | 'form';
  ctaWhatsappMessage?: string | null;
  ctaExternalUrl?: string | null;
  formId?: string | null;
  ctaTypeDraft?: 'whatsapp' | 'external_url' | 'form' | null;
  ctaWhatsappMessageDraft?: string | null;
  ctaExternalUrlDraft?: string | null;
  formIdDraft?: string | null;
  customDomain: string | null;
  crp?: string;
  logoText?: string;
  primaryStart?: string;
  primaryEnd?: string;
  contrast?: string;
  logoUrl?: string;
  faviconUrl?: string;
  seoConfig: {
    metaTitle: string;
    metaDescription: string;
    keywords?: string;
    socialImage?: string;
    ogImageUrl?: string;
    allowIndexing?: boolean;
  };
  siteConfig: any;
  dictionary: any;
  formFlow: any;
  titleDraft?: string | null;
  slugDraft?: string | null;
  customDomainDraft?: string | null;
  seoConfigDraft?: {
    metaTitle: string;
    metaDescription: string;
    keywords?: string;
    socialImage?: string;
    ogImageUrl?: string;
    allowIndexing?: boolean;
  } | null;
  siteConfigDraft?: any;
  dictionaryDraft?: any;
  formFlowDraft?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ScreeningForm {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  isActive: boolean;
  themeConfig: {
    primaryStart?: string;
    primaryEnd?: string;
    contrast?: string;
    fontHeading?: string;
    fontBody?: string;
  };
  formFlow: any;
  titleDraft?: string | null;
  slugDraft?: string | null;
  themeConfigDraft?: any;
  formFlowDraft?: any;
  boundPages?: Array<{ id: string; title: string; slug: string }>;
  submissionsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContractTemplate {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
