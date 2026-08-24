import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { WorkspaceSettingsForm } from './workspace-settings-form';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const PGRST_BASE_URL = API_BASE_URL.endsWith('/v1')
  ? API_BASE_URL.slice(0, -3) + '/rest/v1'
  : API_BASE_URL + '/rest/v1';

const TENANT_SELECT = 'id,name,slug,domain,ownerId:owner_id,logoLightUrl:logo_light_url,logoDarkUrl:logo_dark_url,iconLightUrl:icon_light_url,iconDarkUrl:icon_dark_url,gradientColorStart:gradient_color_start,gradientColorEnd:gradient_color_end,contrastColor:contrast_color,bgLightColor:bg_light_color,bgDarkColor:bg_dark_color,cardLightColor:card_light_color,cardDarkColor:card_dark_color,textLightColor:text_light_color,textDarkColor:text_dark_color,emailDomain:email_domain,resendApiKey:resend_api_key,trafficSources:traffic_sources,defaultTrafficSource:default_traffic_source';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
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
  trafficSources?: string[];
  defaultTrafficSource?: string;
}

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    redirect('/login');
  }

  // 1. Obter usuário logado
  let user = null;
  try {
    const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      next: { revalidate: 0 } // Desabilitar cache para checagem sempre atualizada
    });
    if (meRes.ok) {
      const meData = await meRes.json();
      user = meData.user;
    }
  } catch (e) {
    console.error('Erro ao buscar usuário via SSR:', e);
  }

  if (!user) {
    redirect('/login');
  }

  // 2. Resolver o tenant ativo (Cookie active_tenant_id -> Membro do Tenant -> Owner -> Fallback Admin)
  const activeTenantId = cookieStore.get('active_tenant_id')?.value;
  let resolvedTenant: Tenant | null = null;

  if (activeTenantId) {
    try {
      const res = await fetch(`${PGRST_BASE_URL}/tenants?select=${TENANT_SELECT}&id=eq.${activeTenantId}`, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 0 }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          resolvedTenant = data[0];
        }
      }
    } catch (e) {
      console.error('Erro ao resolver tenant por cookie active_tenant_id via SSR:', e);
    }
  }

  // Se não encontrou por cookie, tentar pelos pertencimentos do usuário em tenant_members
  if (!resolvedTenant && user?.id) {
    try {
      const memberRes = await fetch(`${PGRST_BASE_URL}/tenant_members?user_id=eq.${user.id}&select=tenant:tenants(${TENANT_SELECT})&limit=1`, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 0 }
      });
      if (memberRes.ok) {
        const memberData = await memberRes.json();
        if (memberData && memberData.length > 0 && memberData[0].tenant) {
          resolvedTenant = memberData[0].tenant;
        }
      }
    } catch (e) {
      console.error('Erro ao resolver tenant por tenant_members via SSR:', e);
    }
  }

  // Se não encontrou por membro, tentar por owner_id
  if (!resolvedTenant && user?.id) {
    try {
      const res = await fetch(`${PGRST_BASE_URL}/tenants?select=${TENANT_SELECT}&owner_id=eq.${user.id}&limit=1`, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 0 }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          resolvedTenant = data[0];
        }
      }
    } catch (e) {
      console.error('Erro ao carregar tenant do usuário proprietário via SSR:', e);
    }
  }

  // Fallback para administrador global da plataforma
  if (!resolvedTenant && user.role === 'admin') {
    try {
      const res = await fetch(`${PGRST_BASE_URL}/tenants?select=${TENANT_SELECT}&order=created_at.desc&limit=1`, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 0 }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          resolvedTenant = data[0];
        }
      }
    } catch (e) {
      console.error('Erro ao carregar primeiro tenant para admin via SSR:', e);
    }
  }

  if (!resolvedTenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <h2 className="text-xl font-semibold text-slate-200">Tenant não encontrado</h2>
        <p className="text-sm mt-1">Não foi possível resolver o espaço de trabalho ativo.</p>
      </div>
    );
  }

  // 3. Checar permissão de administrador (Dono do tenant, administrador de tenant, ou admin global da plataforma)
  let isTenantAdmin = false;
  
  if (resolvedTenant.ownerId === user.id || user.role === 'admin') {
    isTenantAdmin = true;
  } else {
    try {
      const memberRes = await fetch(
        `${PGRST_BASE_URL}/tenant_members?tenant_id=eq.${resolvedTenant.id}&user_id=eq.${user.id}&role=eq.admin`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          next: { revalidate: 0 }
        }
      );
      if (memberRes.ok) {
        const membersData = await memberRes.json();
        if (membersData && membersData.length > 0) {
          isTenantAdmin = true;
        }
      }
    } catch (e) {
      console.error('Erro ao validar perfil de membro administrador via SSR:', e);
    }
  }

  // Se não for admin, redirecionar de volta para o dashboard
  if (!isTenantAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Configurações do Consultório / Clínica</h1>
        <p className="text-sm text-slate-400 mt-1">
          Gerencie o nome da marca, logomarcas, paleta de cores, domínio customizado e biblioteca de mídia deste consultório.
        </p>
      </div>

      <WorkspaceSettingsForm tenant={resolvedTenant} initialUser={user} />
    </div>
  );
}
