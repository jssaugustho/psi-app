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
  createdAt?: string;
  updatedAt?: string;
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
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

/**
 * Helper genérico de fetch para chamadas à API
 */
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

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
      body: JSON.stringify(body),
    }),

  // Buscar perfil do usuário logado
  getMe: () => fetchApi<{ user: User }>('/auth/me'),

  // --- SUB & RBAC METODOS ---
  getTenantSubscription: async (tenantId: string) => {
    const res = await fetchApi<TenantSubscription[]>(`${PGRST_BASE_URL}/tenant_subscriptions?tenant_id=eq.${tenantId}&limit=1`);
    return res[0] || null;
  },

  getTenantMembers: async (tenantId: string) => {
    return fetchApi<TenantMember[]>(`${PGRST_BASE_URL}/tenant_members?tenant_id=eq.${tenantId}&select=id,tenant_id,user_id,role,created_at,updated_at,profile:profiles(id,first_name,last_name,email,phone)`);
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

    const res = await fetchApi<Tenant[]>(`${PGRST_BASE_URL}/tenants?id=eq.${tenantId}`, {
      method: 'PATCH',
      body: JSON.stringify(dbBody),
      headers: {
        'Prefer': 'return=representation'
      }
    });
    return res[0];
  }
};
