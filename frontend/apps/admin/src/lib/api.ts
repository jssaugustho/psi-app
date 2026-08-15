import { compressImage, type UploadType } from '@psi/image-utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1';

const PGRST_BASE_URL = API_BASE_URL.endsWith('/v1')
  ? API_BASE_URL.slice(0, -3) + '/rest/v1'
  : API_BASE_URL + '/rest/v1';

const TENANT_SELECT = 'id,name,slug,domain,isPrimary:is_primary,ownerId:owner_id,logoLightUrl:logo_light_url,logoDarkUrl:logo_dark_url,iconLightUrl:icon_light_url,iconDarkUrl:icon_dark_url,gradientColorStart:gradient_color_start,gradientColorEnd:gradient_color_end,contrastColor:contrast_color,bgLightColor:bg_light_color,bgDarkColor:bg_dark_color,cardLightColor:card_light_color,cardDarkColor:card_dark_color,textLightColor:text_light_color,textDarkColor:text_dark_color';

const PROFILE_SELECT = 'id,nome:first_name,sobrenome:last_name,telefone:phone,email,avatar_url,role,created_at';

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

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: User;
}


export interface BootstrapStatusResponse {
  bootstrapped: boolean;
  admin_email: string | null;
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

export interface PlatformSettings {
  id: string;
  cloudflare_api_token: string | null;
  cloudflare_zone_id: string | null;
  cloudflare_account_id: string | null;
  base_domain: string | null;
  r2_bucket_name: string | null;
  r2_public_domain: string | null;
  r2_access_key_id: string | null;
  r2_secret_access_key: string | null;
  resend_api_key: string | null;
  resend_from_domain: string | null;
  has_resend: boolean;
  primary_tenant_id: string | null;
  is_configured: boolean;
  base_tenant_price: number;
  additional_member_price: number;
  created_at: string;
  updated_at: string;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: 'admin' | 'agent';
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
  owner_email?: string;
}


export interface PlatformSetupStatusResponse {
  is_configured: boolean;
  has_cloudflare: boolean;
  has_r2: boolean;
  has_resend: boolean;
  cloudflare_zone_id: string | null;
  cloudflare_account_id: string | null;
  base_domain: string | null;
  r2_bucket_name: string | null;
  r2_public_domain: string | null;
  resend_from_domain: string | null;
  primary_tenant: Tenant | null;
}

export interface DnsRecord {
  /** Label do tipo de registro (ex: SPF, DKIM, MX, DMARC) */
  record: string;
  /** Subdomínio ou host onde o registro deve ser adicionado */
  name: string;
  /** Tipo do registro DNS: TXT, MX, CNAME */
  type: string;
  /** TTL sugerido (ex: 'Auto', '3600') */
  ttl: string;
  /** Status de verificação: 'not_started' | 'pending' | 'verified' | 'failed' */
  status: string;
  /** Valor que deve ser inserido no DNS */
  value: string;
  /** Prioridade (apenas para MX) */
  priority?: number;
}

export interface DnsVerifierResponse {
  domain: string;
  domain_id: string;
  /** Status geral do domínio: 'not_started' | 'pending' | 'verified' | 'failure' */
  status: string;
  region: string;
  records: DnsRecord[];
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
}

/**
 * Helper genérico de fetch para chamadas à API.
 *
 * Fluxo de autenticação:
 *  1. Envia a requisição com o access_token atual.
 *  2. Se a resposta for 401, tenta renovar o token via refresh_token.
 *  3. Se o refresh tiver sucesso, persiste os novos tokens e repete a
 *     requisição original uma única vez.
 *  4. Se o refresh falhar (token expirado/inválido), dispara o evento
 *     customizado 'auth:logout' para que o AuthProvider faça o logout.
 *
 * Para evitar corrida de condição (múltiplas requisições expirando ao
 * mesmo tempo), compartilhamos uma única Promise de refresh enquanto
 * ela estiver em andamento.
 */
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

  // Tratar resposta vazia (204 No Content ou corpo sem texto)
  const contentType = response.headers.get('content-type');
  const text = await response.text();
  let data: any = {};
  if (text) {
    try {
      data = contentType?.includes('application/json') ? JSON.parse(text) : { message: text };
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
      // Refresh falhou → dispara evento de logout para o AuthProvider
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
  // Checar status de bootstrap do Admin inicial (PostgREST View)
  getBootstrapStatus: () => fetchApi<BootstrapStatusResponse>(`${PGRST_BASE_URL}/bootstrap_status?limit=1`, {
    headers: { 'Accept': 'application/vnd.pgrst.object+json' }
  }),

  // Renovar access_token usando o refresh_token
  // Nota: persiste automaticamente no localStorage via doRefresh() no fetchApi.
  // Este método é chamado diretamente pelo AuthContext no ciclo proativo.
  refreshToken: (refresh_token: string) =>
    fetchApi<RefreshTokenResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token }),
    }),

  // Realizar bootstrap do primeiro Admin
  bootstrapAdmin: (body: { nome: string; sobrenome: string; telefone?: string; email: string; password: string }) =>
    fetchApi<AuthResponse & { message: string }>('/auth/bootstrap', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

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
      body: JSON.stringify({ ...body, appType: 'admin' }),
    }),

  // Buscar perfil do usuário logado (PostgREST + RLS)
  getMe: async () => {
    const res = await fetchApi<User[]>(`${PGRST_BASE_URL}/profiles?select=${PROFILE_SELECT}&limit=1`);
    return { user: res[0] };
  },

  // Platform Setup Status (PostgREST View)
  getPlatformSetupStatus: () => fetchApi<PlatformSetupStatusResponse>(`${PGRST_BASE_URL}/platform_setup_status?limit=1`, {
    headers: { 'Accept': 'application/vnd.pgrst.object+json' }
  }),

  // Salvar e validar credenciais Cloudflare + R2 Bucket
  saveCloudflare: (body: {
    api_token: string;
    zone_id: string;
    account_id: string;
    base_domain?: string;
    r2_bucket_name: string;
    r2_public_domain: string;
    r2_access_key_id: string;
    r2_secret_access_key: string;
  }) =>
    fetchApi<{ message: string; zone_id: string; base_domain?: string; r2_bucket_name: string }>('/platform/setup/cloudflare', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Listar Zones da conta Cloudflare
  getCloudflareZones: (apiToken?: string) =>
    fetchApi<{ success: boolean; zones: Array<{ id: string; name: string; status: string }> }>(
      `/platform/cloudflare/zones${apiToken ? `?api_token=${encodeURIComponent(apiToken)}` : ''}`
    ),

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

  // Configurar Tenant-Pai Principal e Identidade Visual White-Label
  setupPrimaryTenant: (body: {
    name: string;
    slug: string;
    domain?: string;
    logo_light_url?: string;
    logo_dark_url?: string;
    icon_light_url?: string;
    icon_dark_url?: string;
    gradient_color_start: string;
    gradient_color_end: string;
    contrast_color: string;
    bg_light_color?: string;
    bg_dark_color?: string;
    card_light_color?: string;
    card_dark_color?: string;
    text_light_color?: string;
    text_dark_color?: string;
  }) =>
    fetchApi<{ message: string; tenant: Tenant }>('/platform/setup/tenant', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Buscar Tenant-Pai Principal (PostgREST)
  getPrimaryTenant: async () => {
    const res = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/tenants?select=${TENANT_SELECT}&is_primary=eq.true&limit=1`);
    return { tenant: res[0] };
  },

  // Atualizar configurações White-Label do Tenant-Pai (PostgREST PATCH)
  updatePrimaryTenant: async (body: Partial<{
    name: string;
    slug: string;
    domain: string | null;
    logo_light_url: string | null;
    logo_dark_url: string | null;
    icon_light_url: string | null;
    icon_dark_url: string | null;
    gradient_color_start: string;
    gradient_color_end: string;
    contrast_color: string;
    bg_light_color: string;
    bg_dark_color: string;
    card_light_color: string;
    card_dark_color: string;
    text_light_color: string;
    text_dark_color: string;
  }>) => {
    const res = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/tenants?select=${TENANT_SELECT}&is_primary=eq.true`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: {
        'Prefer': 'return=representation'
      }
    });
    return { message: 'Configurações White-Label atualizadas com sucesso!', tenant: res[0] };
  },

  // Configurar Resend no wizard de setup inicial (valida API key + domínio)
  saveResend: (body: { resend_api_key: string; resend_from_domain: string }) =>
    fetchApi<{ message: string; resend_from_domain: string; domain_status: string }>('/platform/setup/resend', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Atualizar configurações do Resend na página de Settings
  updateResend: (body: { resend_api_key?: string; resend_from_domain?: string }) =>
    fetchApi<{ message: string }>('/platform/resend', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  // Buscar registros DNS do domínio Resend (para o componente DnsVerifier)
  getResendDns: () => fetchApi<DnsVerifierResponse>('/platform/resend/dns'),

  // Disparar re-verificação do domínio no Resend
  triggerResendVerify: () =>
    fetchApi<{ message: string }>('/platform/resend/verify', { method: 'POST' }),

  // Buscar histórico de status do sistema (Postgres + RabbitMQ logs)
  getStatusHistory: (range: '24h' | '7d' = '24h') =>
    fetchApi<StatusHistoryResponse>(`/platform/status/history?range=${range}`),

  // Disparar checagem manual imediata de status
  triggerStatusCheck: () =>
    fetchApi<{ message: string }>('/platform/status/check', { method: 'POST' }),

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

  // Reenviar manualmente um e-mail transacional
  resendEmailLog: (id: string) =>
    fetchApi<{ message: string }>(`/platform/emails/${id}/resend`, {
      method: 'POST',
    }),

  // Buscar todos os usuários (PostgREST com filtros de busca e role)
  getUsers: async (search?: string, roleFilter?: string) => {
    const params = new URLSearchParams({
      select: PROFILE_SELECT,
      order: 'created_at.desc',
    });
    
    if (roleFilter && roleFilter !== 'all') {
      params.set('role', `eq.${roleFilter}`);
    }
    
    if (search) {
      params.set('or', `(first_name.ilike.*${search}*,last_name.ilike.*${search}*,email.ilike.*${search}*)`);
    }
    
    return fetchApi<User[]>(`${PGRST_BASE_URL}/profiles?${params.toString()}`);
  },

  // Buscar um usuário específico por ID
  getUser: async (id: string) => {
    const res = await fetchApi<User[]>(`${PGRST_BASE_URL}/profiles?select=${PROFILE_SELECT}&id=eq.${id}&limit=1`);
    if (!res || res.length === 0) {
      throw new Error('Usuário não encontrado');
    }
    return res[0];
  },

  // Atualizar perfil de qualquer usuário (PATCH do PostgREST)
  updateUserProfile: async (id: string, body: Partial<User>) => {
    const dbBody: Record<string, any> = {};
    if (body.nome !== undefined) dbBody.first_name = body.nome;
    if (body.sobrenome !== undefined) dbBody.last_name = body.sobrenome;
    if (body.telefone !== undefined) dbBody.phone = body.telefone;
    if (body.avatar_url !== undefined) dbBody.avatar_url = body.avatar_url;
    if (body.role !== undefined) dbBody.role = body.role;

    const res = await fetchApi<User[]>(`${PGRST_BASE_URL}/profiles?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dbBody),
      headers: {
        'Prefer': 'return=representation'
      }
    });
    return res[0];
  },

  // Buscar logs de e-mails de um usuário específico
  getUserEmailLogs: async (email: string) => {
    return fetchApi<any[]>(`${PGRST_BASE_URL}/email_logs?to_email=eq.${email}&order=created_at.desc&limit=10`);
  },

  // --- SUB & RBAC METODOS ---
  getPlatformSettings: async () => {
    const res = await fetchApi<PlatformSettings[]>(`${PGRST_BASE_URL}/platform_settings?limit=1`);
    return res[0] || null;
  },

  updatePlatformSettings: async (id: string, body: Partial<PlatformSettings>) => {
    const res = await fetchApi<PlatformSettings[]>(`${PGRST_BASE_URL}/platform_settings?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: {
        'Prefer': 'return=representation'
      }
    });
    return res[0];
  },

  getTenantSubscriptions: async () => {
    return fetchApi<TenantSubscription[]>(`${PGRST_BASE_URL}/tenant_subscriptions?order=created_at.desc`);
  },

  getTenantSubscription: async (tenantId: string) => {
    const res = await fetchApi<TenantSubscription[]>(`${PGRST_BASE_URL}/tenant_subscriptions?tenant_id=eq.${tenantId}&limit=1`);
    return res[0] || null;
  },

  getTenantMembers: async (tenantId: string) => {
    return fetchApi<TenantMember[]>(`${PGRST_BASE_URL}/tenant_members?tenant_id=eq.${tenantId}&select=id,tenant_id,user_id,role,created_at,updated_at,profile:profiles(id,nome:first_name,sobrenome:last_name,email,phone)`);
  },

  addTenantMemberByEmail: async (tenantId: string, email: string, role: 'admin' | 'agent') => {
    const usersRes = await fetchApi<User[]>(`${PGRST_BASE_URL}/profiles?email=eq.${email.trim().toLowerCase()}&limit=1`);
    if (!usersRes || usersRes.length === 0) {
      throw new Error(`Usuário com e-mail "${email}" não encontrado na plataforma. Por favor, registre o usuário primeiro.`);
    }
    const userId = usersRes[0].id;
    const res = await fetchApi<TenantMember[]>(`${PGRST_BASE_URL}/tenant_members`, {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: tenantId,
        user_id: userId,
        role: role
      }),
      headers: {
        'Prefer': 'return=representation'
      }
    });
    return res[0];
  },

  updateTenantMemberRole: async (memberId: string, role: 'admin' | 'agent') => {
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

  getTenantsList: async () => {
    return fetchApi<Tenant[]>(`${PGRST_BASE_URL}/tenants?select=${TENANT_SELECT}&order=created_at.desc`);
  },

  updateTenantOwner: async (tenantId: string, ownerId: string | null) => {
    const res = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/tenants?id=eq.${tenantId}`, {
      method: 'PATCH',
      body: JSON.stringify({ owner_id: ownerId }),
      headers: {
        'Prefer': 'return=representation'
      }
    });
    return res[0];
  },

  getTenantById: async (id: string) => {
    const res = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/tenants?select=${TENANT_SELECT}&id=eq.${id}`);
    return res[0];
  },

  createTenant: async (body: { name: string; slug: string; domain?: string | null; ownerId?: string | null; isPrimary?: boolean }) => {
    const res = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/tenants`, {
      method: 'POST',
      body: JSON.stringify({
        name: body.name,
        slug: body.slug,
        domain: body.domain || null,
        owner_id: body.ownerId || null,
        is_primary: body.isPrimary || false,
      }),
      headers: {
        'Prefer': 'return=representation'
      }
    });
    return res[0];
  },

  updateTenant: async (id: string, body: Partial<Tenant>) => {
    const dbBody: Record<string, any> = {};
    if (body.name !== undefined) dbBody.name = body.name;
    if (body.slug !== undefined) dbBody.slug = body.slug;
    if (body.domain !== undefined) dbBody.domain = body.domain;
    if (body.isPrimary !== undefined) dbBody.is_primary = body.isPrimary;
    if (body.ownerId !== undefined) dbBody.owner_id = body.ownerId;
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
    if (body.resendApiKey !== undefined) dbBody.resend_api_key = body.resendApiKey;

    const res = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/tenants?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dbBody),
      headers: {
        'Prefer': 'return=representation'
      }
    });
    return res[0];
  },

  deleteTenant: async (id: string) => {
    await fetchApi(`${PGRST_BASE_URL}/tenants?id=eq.${id}`, {
      method: 'DELETE'
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
};

export interface ServiceStatus {
  serviceName: string;
  status: 'operational' | 'degraded' | 'down' | 'offline';
  responseTimeMs: number;
  lastCheckAt: string | null;
}

export interface StatusBucket {
  timestamp: string;
  status: 'operational' | 'degraded' | 'down' | 'no_data';
  avgResponseTimeMs: number;
}

export interface StatusHistoryResponse {
  range: '24h' | '7d';
  currentStatus: ServiceStatus[];
  history: Record<string, StatusBucket[]>;
}
