import { compressImage, type UploadType } from '@psi/image-utils';
import { env } from '../env';

const API_BASE_URL = env.NEXT_PUBLIC_API_URL;

const PGRST_BASE_URL = env.NEXT_PUBLIC_POSTGREST_URL || (API_BASE_URL.endsWith('/v1')
  ? API_BASE_URL.slice(0, -3) + '/rest/v1'
  : API_BASE_URL ? API_BASE_URL + '/rest/v1' : '/rest/v1');

// Workspace tem apenas: id, name, owner_id, crp, bio, specialties, city_state,
// instagram, is_online_service, default_site_avatar_url, traffic_sources,
// default_traffic_source, created_at, updated_at
// Branding (logos, cores) fica em visual_identities — não em workspaces
const TENANT_SELECT = 'id,name,ownerId:owner_id,crp,bio,cityState:city_state,instagram,isOnlineService:is_online_service,defaultSiteAvatarUrl:default_site_avatar_url,trafficSources:traffic_sources,defaultTrafficSource:default_traffic_source,createdAt:created_at,updatedAt:updated_at';

const PROFILE_SELECT = 'id,nome:first_name,sobrenome:last_name,telefone:phone,email,cpf,crp,has_no_crp,avatar_url,role,created_at';

export interface User {
  id: string;
  nome: string;
  sobrenome: string;
  telefone: string | null;
  email: string;
  cpf?: string | null;
  crp?: string | null;
  has_no_crp?: boolean;
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
  has_admin?: boolean;
  has_platform_settings?: boolean;
  admin_email?: string | null;
  message?: string;
}

export interface Tenant {
  id: string;
  name: string;
  ownerId?: string | null;
  // Informações clínicas do workspace
  crp?: string | null;
  bio?: string | null;
  specialties?: string[] | null;
  cityState?: string | null;
  instagram?: string | null;
  isOnlineService?: boolean;
  defaultSiteAvatarUrl?: string | null;
  trafficSources?: string[];
  defaultTrafficSource?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface R2BucketConfig {
  id: string;
  name: string;
  publicDomain: string;
  accessKeyId: string;
  secretAccessKey: string;
  isBackup?: boolean;
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
  backup_r2_buckets?: R2BucketConfig[];
  resend_api_key: string | null;
  resend_from_domain: string | null;
  has_resend: boolean;
  is_configured: boolean;
  base_tenant_price: number;
  additional_member_price: number;
  created_at: string;
  updated_at: string;
}

export interface TenantMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'admin' | 'agent';
  created_at: string;
  updated_at: string;
  profile?: User;
}

export interface TenantSubscription {
  workspace_id: string;
  workspace_name: string;
  owner_id: string | null;
  base_price: number;
  additional_member_price: number;
  members_count: number;
  total_price: number;
  created_at: string;
  owner_email?: string;
}


export interface PlatformBrand {
  name: string;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  iconLightUrl: string | null;
  iconDarkUrl: string | null;
  gradientColorStart: string;
  gradientColorEnd: string;
  contrastColor: string;
  bgLightColor?: string;
  bgDarkColor?: string;
}

export interface PlatformSetupStatusResponse {
  is_configured: boolean;
  has_cloudflare: boolean;
  has_r2: boolean;
  has_resend_key?: boolean;
  has_resend_domain?: boolean;
  has_resend: boolean;
  has_visual_identity?: boolean;
  cloudflare_api_token?: string | null;
  cloudflare_zone_id: string | null;
  cloudflare_account_id: string | null;
  base_domain: string | null;
  r2_bucket_name: string | null;
  r2_public_domain: string | null;
  r2_access_key_id?: string | null;
  r2_secret_access_key?: string | null;
  backup_r2_buckets?: R2BucketConfig[];
  resend_api_key?: string | null;
  resend_from_domain: string | null;
  primary_tenant: PlatformBrand | null;
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

  const isPostgrest = url.includes('/rest/v1');
  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };
  if (!isPostgrest && options.credentials === undefined) {
    fetchOptions.credentials = 'include';
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (err: any) {
    console.error('Falha de conexão com o backend no endpoint:', endpoint, err);
    throw new Error('Servidor de API indisponível.');
  }

  // Verificar status 502, 503, 504 (erros de proxy/gateway)
  if ([502, 503, 504].includes(response.status)) {
    throw new Error('Servidor de API temporariamente indisponível.');
  }

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
  // Checar status de bootstrap do Admin inicial (Fastify REST API)
  getBootstrapStatus: () => fetchApi<BootstrapStatusResponse>('/auth/bootstrap/status'),

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

  // Solicitar reset de senha por e-mail
  forgotPassword: (email: string) =>
    fetchApi<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email, appType: 'admin' }),
    }),

  // Redefinir senha com token de recuperação
  resetPassword: (password: string, token: string) =>
    fetchApi<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ password }),
    }),

  // Buscar perfil do usuário logado através da API autenticada
  getMe: () => fetchApi<{ user: User }>('/auth/me'),

  // Platform Setup Status (Backend API)
  getPlatformSetupStatus: () => fetchApi<PlatformSetupStatusResponse>('/platform/setup/status'),

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

  // Salvar apenas credenciais de Domínio do Cloudflare
  saveCloudflareDomains: (body: {
    api_token?: string;
    zone_id: string;
    account_id: string;
    base_domain?: string;
  }) =>
    fetchApi<{ message: string; zone_id: string; base_domain?: string }>('/platform/cloudflare/domains', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Salvar credenciais de Armazenamento (Bucket Principal R2 + Buckets de Reserva)
  saveR2Storage: (body: {
    r2_bucket_name: string;
    r2_public_domain: string;
    r2_access_key_id?: string;
    r2_secret_access_key?: string;
    backup_r2_buckets?: R2BucketConfig[];
  }) =>
    fetchApi<{ message: string; r2_bucket_name: string; backup_buckets_count: number }>('/platform/cloudflare/storage', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Testar Conexão & Validar Permissões do Cloudflare
  testCloudflarePermissions: (body: { api_token?: string; zone_id?: string; account_id?: string }) =>
    fetchApi<{
      success: boolean;
      tokenValid: boolean;
      zoneActive: boolean;
      zoneName: string;
      sslStatus: string;
      permissions: Array<{ name: string; status: 'ok' | 'warning' | 'error'; detail: string }>;
    }>('/platform/cloudflare/test-permissions', {
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

  // Configurar Tenant-Pai Principal e Identidade Visual White-Label
  setupPrimaryTenant: (body: {
    name: string;
    logo_light_url?: string;
    logo_dark_url?: string;
    icon_light_url?: string;
    icon_dark_url?: string;
    gradient_color_start: string;
    gradient_color_end: string;
    contrast_color: string;
    bg_light_color?: string;
    bg_dark_color?: string;
  }) =>
    fetchApi<{ message: string; tenant: PlatformBrand }>('/platform/setup/tenant', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Buscar Marca da Plataforma em platform_settings
  getPrimaryTenant: async () => {
    try {
      const res = await fetchApi<{ tenant: PlatformBrand }>('/platform/tenant/primary');
      return { tenant: res.tenant };
    } catch (e) {
      return { tenant: null as any };
    }
  },

  // Atualizar configurações da Marca da Plataforma em platform_settings
  updatePrimaryTenant: async (body: Partial<{
    name: string;
    logo_light_url: string | null;
    logo_dark_url: string | null;
    icon_light_url: string | null;
    icon_dark_url: string | null;
    gradient_color_start: string;
    gradient_color_end: string;
    contrast_color: string;
    bg_light_color: string;
    bg_dark_color: string;
  }>) => {
    const res = await fetchApi<{ message: string; tenant: PlatformBrand }>('/platform/tenant/primary', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return { message: res.message || 'Configurações White-Label salvas com sucesso!', tenant: res.tenant };
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
    const selectFields = 'id,platform_name,logo_light_url,logo_dark_url,icon_light_url,icon_dark_url,gradient_color_start,gradient_color_end,contrast_color,bg_light_color,bg_dark_color,base_domain,r2_bucket_name,r2_public_domain,resend_from_domain,has_resend,base_tenant_price,additional_member_price,created_at,updated_at';
    const res = await fetchApi<PlatformSettings[]>(`${PGRST_BASE_URL}/platform_settings?select=${selectFields}&limit=1`);
    return res[0] || null;
  },

  updatePlatformSettings: async (id: string, body: Partial<PlatformSettings>) => {
    const selectFields = 'id,platform_name,logo_light_url,logo_dark_url,icon_light_url,icon_dark_url,gradient_color_start,gradient_color_end,contrast_color,bg_light_color,bg_dark_color,base_domain,r2_bucket_name,r2_public_domain,resend_from_domain,has_resend,base_tenant_price,additional_member_price,created_at,updated_at';
    const res = await fetchApi<PlatformSettings[]>(`${PGRST_BASE_URL}/platform_settings?select=${selectFields}&id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: {
        'Prefer': 'return=representation'
      }
    });
    return res[0];
  },

  // Assinaturas: calculadas dinamicamente a partir de workspaces + workspace_members
  // (tabela tenant_subscriptions não existe no banco)
  getTenantSubscriptions: async () => {
    const workspaces = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/workspaces?select=${TENANT_SELECT}&order=created_at.desc`);
    const members = await fetchApi<Array<{ workspace_id: string }>>(`${PGRST_BASE_URL}/workspace_members?select=workspace_id`);
    return workspaces.map(w => ({
      workspace_id: w.id,
      workspace_name: w.name,
      owner_id: w.ownerId || null,
      base_price: 0,
      additional_member_price: 0,
      members_count: members.filter(m => m.workspace_id === w.id).length,
      total_price: 0,
      created_at: w.createdAt || '',
    })) as TenantSubscription[];
  },

  getTenantSubscription: async (workspaceId: string) => {
    const res = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/workspaces?select=${TENANT_SELECT}&id=eq.${workspaceId}&limit=1`);
    if (!res || res.length === 0) return null;
    const w = res[0];
    const members = await fetchApi<Array<{ workspace_id: string }>>(`${PGRST_BASE_URL}/workspace_members?workspace_id=eq.${workspaceId}&select=workspace_id`);
    return {
      workspace_id: w.id,
      workspace_name: w.name,
      owner_id: w.ownerId || null,
      base_price: 0,
      additional_member_price: 0,
      members_count: members.length,
      total_price: 0,
      created_at: w.createdAt || '',
    } as TenantSubscription;
  },

  // workspace_members (antes: tenant_members — tabela não existe mais)
  getTenantMembers: async (workspaceId: string) => {
    return fetchApi<TenantMember[]>(`${PGRST_BASE_URL}/workspace_members?workspace_id=eq.${workspaceId}&select=id,workspace_id,user_id,role,created_at,updated_at,profile:profiles(id,nome:first_name,sobrenome:last_name,email,phone)`);
  },

  addTenantMemberByEmail: async (workspaceId: string, email: string, role: 'admin' | 'agent') => {
    const usersRes = await fetchApi<User[]>(`${PGRST_BASE_URL}/profiles?email=eq.${email.trim().toLowerCase()}&limit=1`);
    if (!usersRes || usersRes.length === 0) {
      throw new Error(`Usuário com e-mail "${email}" não encontrado na plataforma. Por favor, registre o usuário primeiro.`);
    }
    const userId = usersRes[0].id;
    const res = await fetchApi<TenantMember[]>(`${PGRST_BASE_URL}/workspace_members`, {
      method: 'POST',
      body: JSON.stringify({
        workspace_id: workspaceId,
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
    const res = await fetchApi<TenantMember[]>(`${PGRST_BASE_URL}/workspace_members?id=eq.${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
      headers: {
        'Prefer': 'return=representation'
      }
    });
    return res[0];
  },

  removeTenantMember: async (memberId: string) => {
    await fetchApi(`${PGRST_BASE_URL}/workspace_members?id=eq.${memberId}`, {
      method: 'DELETE'
    });
  },

  getTenantsList: async () => {
    return fetchApi<Tenant[]>(`${PGRST_BASE_URL}/workspaces?select=${TENANT_SELECT}&order=created_at.desc`);
  },

  updateTenantOwner: async (workspaceId: string, ownerId: string | null) => {
    const res = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/workspaces?id=eq.${workspaceId}`, {
      method: 'PATCH',
      body: JSON.stringify({ owner_id: ownerId }),
      headers: {
        'Prefer': 'return=representation'
      }
    });
    return res[0];
  },

  getTenantById: async (id: string) => {
    const res = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/workspaces?select=${TENANT_SELECT}&id=eq.${id}`);
    return res[0];
  },

  // Criar workspace — só campos reais existem: name, owner_id
  createTenant: async (body: { name: string; ownerId?: string | null }) => {
    const res = await fetchApi<any[]>(`${PGRST_BASE_URL}/workspaces`, {
      method: 'POST',
      body: JSON.stringify({
        name: body.name,
        owner_id: body.ownerId || null,
      }),
      headers: {
        'Prefer': 'return=representation'
      }
    });
    return res[0];
  },

  // Atualizar workspace — só campos reais: name, owner_id e campos clínicos
  updateTenant: async (id: string, body: Partial<Tenant>) => {
    const dbBody: Record<string, any> = {};
    if (body.name !== undefined) dbBody.name = body.name;
    if (body.ownerId !== undefined) dbBody.owner_id = body.ownerId;
    if (body.crp !== undefined) dbBody.crp = body.crp;
    if (body.bio !== undefined) dbBody.bio = body.bio;
    if (body.specialties !== undefined) dbBody.specialties = body.specialties;
    if (body.cityState !== undefined) dbBody.city_state = body.cityState;
    if (body.instagram !== undefined) dbBody.instagram = body.instagram;
    if (body.isOnlineService !== undefined) dbBody.is_online_service = body.isOnlineService;
    if (body.defaultSiteAvatarUrl !== undefined) dbBody.default_site_avatar_url = body.defaultSiteAvatarUrl;
    if (body.trafficSources !== undefined) dbBody.traffic_sources = body.trafficSources;
    if (body.defaultTrafficSource !== undefined) dbBody.default_traffic_source = body.defaultTrafficSource;

    const res = await fetchApi<any[]>(`${PGRST_BASE_URL}/workspaces?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dbBody),
      headers: {
        'Prefer': 'return=representation'
      }
    });
    return res[0];
  },

  deleteTenant: async (id: string) => {
    await fetchApi(`/platform/workspaces/${id}`, {
      method: 'DELETE'
    });
  },

  // Busca por domínio customizado (coluna custom_domain, não domain)
  getTenantByDomain: async (domain: string) => {
    const res = await fetchApi<any[]>(`${PGRST_BASE_URL}/workspace_domains?select=workspace:workspaces(${TENANT_SELECT})&custom_domain=eq.${domain}`);
    return res[0]?.workspace || null;
  },

  // Buscar logs de erros da plataforma
  getErrorLogs: (filters: {
    limit?: number;
    offset?: number;
    serviceName?: string;
    severity?: string;
    name?: string;
    message?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, String(val));
      }
    });
    return fetchApi<{ success: boolean; logs: ErrorLog[]; total: number }>(`/platform/errors?${params.toString()}`);
  },

  // Buscar logs de auditoria de ações sensíveis
  getAuditLogs: (filters: {
    limit?: number;
    offset?: number;
    action?: string;
    category?: string;
    serviceName?: string;
    status?: string;
    userId?: string;
    workspaceId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, String(val));
      }
    });
    return fetchApi<{ success: boolean; logs: AuditLog[]; total: number }>(`/platform/audit-logs?${params.toString()}`);
  },
};

export interface AuditLog {
  id: string;
  action: string;
  category: string;
  serviceName: string;
  status: 'success' | 'failure';
  userId: string | null;
  workspaceId: string | null;
  ip: string | null;
  userAgent: string | null;
  details: Record<string, any> | null;
  createdAt: string;
}


export interface ErrorLog {
  id: string;
  name: string | null;
  message: string;
  stack: string | null;
  url: string | null;
  userAgent: string | null;
  userId: string | null;
  serviceName: string;
  severity: string;
  metadata: Record<string, any> | null;
  createdAt: string;
}

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
