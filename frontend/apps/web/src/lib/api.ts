import { compressImage, type UploadType } from '@psi/image-utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1';

const PGRST_BASE_URL = API_BASE_URL.endsWith('/v1')
  ? API_BASE_URL.slice(0, -3) + '/rest/v1'
  : API_BASE_URL + '/rest/v1';

const TENANT_SELECT = 'id,name,slug,domain,isPrimary:is_primary,ownerId:owner_id,logoLightUrl:logo_light_url,logoDarkUrl:logo_dark_url,iconLightUrl:icon_light_url,iconDarkUrl:icon_dark_url,gradientColorStart:gradient_color_start,gradientColorEnd:gradient_color_end,contrastColor:contrast_color,bgLightColor:bg_light_color,bgDarkColor:bg_dark_color,cardLightColor:card_light_color,cardDarkColor:card_dark_color,textLightColor:text_light_color,textDarkColor:text_dark_color';

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

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  isPrimary: boolean;
  ownerId?: string | null;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  iconLightUrl: string | null;
  iconDarkUrl: string | null;
  gradientColorStart: string;
  gradientColorEnd: string;
  contrastColor: string;
  bgLightColor?: string;
  bgDarkColor?: string;
  cardLightColor?: string;
  cardDarkColor?: string;
  textLightColor?: string;
  textDarkColor?: string;
  emailDomain?: string | null;
  resendApiKey?: string | null;
  traffic_sources?: string[];
  default_traffic_source?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: 'admin' | 'secretaria' | 'psicologo' | 'agent';
  created_at: string;
  updated_at: string;
  profile?: User;
}

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

  const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    console.error('Falha de conexão com o backend:', err);
    if (typeof window !== 'undefined' && window.location.pathname !== '/offline') {
      window.location.href = '/offline';
    }
    throw new Error('Servidor de API indisponível.');
  }

  // Verificar status 502, 503, 504 (erros de proxy/gateway)
  if ([502, 503, 504].includes(response.status)) {
    if (typeof window !== 'undefined' && window.location.pathname !== '/offline') {
      window.location.href = '/offline';
    }
    throw new Error('Servidor de API temporariamente indisponível.');
  }

  // Interceptor de 401: tenta renovar o token e repetir a requisição uma vez
  if (response.status === 401 && !_isRetry) {
    try {
      await doRefresh();
      return fetchApi<T>(endpoint, options, true); // retry com novo token
    } catch {
      // Refresh falhou → dispara evento de logout para o AuthProvider
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:logout'));
      }
      throw new Error('Sessão expirada. Faça login novamente.');
    }
  }

  const data = await response.json();

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
    // 1. Comprimir client-side
    const compressed = await compressImage(file, type);

    // 2. Pedir Presigned URL diretamente via fetchApi
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

    // 3. PUT direto no R2 — a VPS nunca toca no arquivo
    const uploadRes = await fetch(upload_url, {
      method: 'PUT',
      body: compressed,
      headers: { 'Content-Type': compressed.type },
    });

    if (!uploadRes.ok) {
      throw new Error(`Falha ao enviar arquivo para o R2: ${uploadRes.statusText}`);
    }

    return { url: public_url, key };
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

  getMyTenants: async (userId: string) => {
    const memberRes = await fetchApi<any[]>(`${PGRST_BASE_URL}/tenant_members?user_id=eq.${userId}&select=role,tenant:tenants(${TENANT_SELECT})`);
    const ownedRes = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/tenants?owner_id=eq.${userId}&select=${TENANT_SELECT}`);
    
    const list: (Tenant & { memberRole?: string })[] = [];
    const ids = new Set<string>();
    
    for (const t of ownedRes) {
      list.push({ ...t, memberRole: 'admin' });
      ids.add(t.id);
    }
    
    for (const m of memberRes) {
      if (m.tenant && !ids.has(m.tenant.id)) {
        list.push({ ...m.tenant, memberRole: m.role });
        ids.add(m.tenant.id);
      }
    }
    
    return list;
  },

  updateTenantBranding: async (tenantId: string, body: Partial<Tenant>) => {
    const dbBody: Record<string, any> = {};
    if (body.name !== undefined) dbBody.name = body.name;
    if (body.slug !== undefined) dbBody.slug = body.slug;
    if (body.domain !== undefined) dbBody.domain = body.domain;
    if (body.logoLightUrl !== undefined) dbBody.logo_light_url = body.logoLightUrl;
    if (body.logoDarkUrl !== undefined) dbBody.logo_dark_url = body.logoDarkUrl;
    if (body.iconLightUrl !== undefined) dbBody.icon_light_url = body.iconLightUrl;
    if (body.iconDarkUrl !== undefined) dbBody.icon_dark_url = body.iconDarkUrl;
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
    // resend_api_key é uma configuração da plataforma (platformSettings), não do tenant filho.
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

  getPrimaryTenant: async () => {
    const res = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/tenants?select=${TENANT_SELECT}&is_primary=eq.true&limit=1`);
    return { tenant: res[0] || null };
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
  }
};
