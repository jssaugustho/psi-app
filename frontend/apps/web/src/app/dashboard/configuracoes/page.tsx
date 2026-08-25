import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { WorkspaceSettingsForm } from './workspace-settings-form';
import { Workspace } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const PGRST_BASE_URL = API_BASE_URL.endsWith('/v1')
  ? API_BASE_URL.slice(0, -3) + '/rest/v1'
  : API_BASE_URL + '/rest/v1';

const TENANT_SELECT = 'id,name,ownerId:owner_id,crp,bio,specialties,cityState:city_state,instagram,isOnlineService:is_online_service,defaultSiteAvatarUrl:default_site_avatar_url,trafficSources:traffic_sources,defaultTrafficSource:default_traffic_source';

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
  let resolvedTenant: Workspace | null = null;

  if (activeTenantId) {
    try {
      const res = await fetch(`${PGRST_BASE_URL}/workspaces?select=${TENANT_SELECT}&id=eq.${activeTenantId}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        next: { revalidate: 0 }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          resolvedTenant = data[0];
        }
      }
    } catch (e) {
      console.error('Erro ao resolver workspace por cookie active_tenant_id via SSR:', e);
    }
  }

  // Se não encontrou por cookie, tentar pelos pertencimentos do usuário em workspace_members
  if (!resolvedTenant && user?.id) {
    try {
      const memberRes = await fetch(`${PGRST_BASE_URL}/workspace_members?user_id=eq.${user.id}&select=workspace:workspaces(${TENANT_SELECT})&limit=1`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        next: { revalidate: 0 }
      });
      if (memberRes.ok) {
        const memberData = await memberRes.json();
        if (memberData && memberData.length > 0 && memberData[0].workspace) {
          resolvedTenant = memberData[0].workspace;
        }
      }
    } catch (e) {
      console.error('Erro ao resolver workspace por workspace_members via SSR:', e);
    }
  }

  // Se não encontrou por membro, tentar por owner_id
  if (!resolvedTenant && user?.id) {
    try {
      const res = await fetch(`${PGRST_BASE_URL}/workspaces?select=${TENANT_SELECT}&owner_id=eq.${user.id}&limit=1`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        next: { revalidate: 0 }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          resolvedTenant = data[0];
        }
      }
    } catch (e) {
      console.error('Erro ao carregar workspace do usuário proprietário via SSR:', e);
    }
  }

  // Fallback para administrador global da plataforma
  if (!resolvedTenant && user.role === 'admin') {
    try {
      const res = await fetch(`${PGRST_BASE_URL}/workspaces?select=${TENANT_SELECT}&order=created_at.desc&limit=1`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
        `${PGRST_BASE_URL}/workspace_members?workspace_id=eq.${resolvedTenant.id}&user_id=eq.${user.id}&role=eq.admin`,
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
