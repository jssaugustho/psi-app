'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api, Tenant } from '@/lib/api';
import { AppShell, LoadingSpinner, Card, Button } from '@psi/ui';
import { Link } from '@/components/Link';
import { UserProfileModal } from '@/components/user-profile-modal';

const CrmIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ProfileIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869l.214-1.28z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.856.12-1.685.344-2.47" />
  </svg>
);

const FormIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

import { RealtimeProvider, useRealtime } from '@/context/RealtimeContext';

function getFriendlyPath(path: string): string {
  if (path.startsWith('/dashboard/captacao')) return 'No Criador de Sites';
  if (path.startsWith('/dashboard/crm')) return 'Na Triagem';
  if (path.startsWith('/dashboard/configuracoes')) return 'Nas Configurações';
  if (path === '/dashboard') return 'No Perfil';
  return 'No Painel';
}

function OnlineUsersIndicator() {
  const { onlineUsers } = useRealtime();

  return (
    <div className="relative group">
      <button
        type="button"
        style={{
          border: '1px solid var(--surface-border)',
          color: 'var(--brand-text-color)',
        }}
        className="px-3 h-9 rounded-xl flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer bg-transparent hover:bg-[var(--surface-hover)]"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <span>{onlineUsers.length} online</span>
      </button>

      {onlineUsers.length > 0 && (
        <div className="absolute right-0 mt-2 w-64 glass-lg border border-[var(--surface-border)] rounded-xl shadow-2xl p-3 space-y-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 text-left">
          <h4 className="text-xs font-bold border-b border-[var(--surface-border)] pb-1.5 mb-1.5 opacity-75" style={{ color: 'var(--brand-text-color)' }}>
            Membros Online
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {onlineUsers.map((u) => (
              <div key={u.userId} className="flex items-center gap-2 text-xs">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt={u.nome} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    `${u.nome?.[0]?.toUpperCase() ?? ''}${u.sobrenome?.[0]?.toUpperCase() ?? ''}`
                  )}
                </div>
                <div className="truncate flex-1">
                  <span className="block font-medium truncate" style={{ color: 'var(--brand-text-color)' }}>
                    {u.nome} {u.sobrenome}
                  </span>
                  <span className="block text-[9px] opacity-55 truncate" style={{ color: 'var(--brand-text-color)' }}>
                    {getFriendlyPath(u.path)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TenantSwitcher({ myTenants, activeTenantId }: { myTenants: any[], activeTenantId: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeTenant = myTenants.find(t => t.id === activeTenantId);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSwitch = (id: string) => {
    sessionStorage.setItem('active_tenant_id', id);
    window.location.reload();
  };
  
  if (!activeTenant || myTenants.length <= 1) return null;
  
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          border: '1px solid var(--surface-border)',
          color: 'var(--brand-text-color)',
        }}
        className="px-3 h-9 rounded-xl flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer bg-transparent hover:bg-[var(--surface-hover)] hover:border-slate-700/50"
      >
        <svg className="w-3.5 h-3.5 opacity-70 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v16.5m16.5-16.5v16.5m-16.5-16.5h16.5M5.25 5.25h13.5m-13.5 3h13.5m-13.5 3h13.5m-13.5 3h13.5m-13.5 3h13.5" />
        </svg>
        <span>Consultório: <strong className="font-bold">{activeTenant.name}</strong></span>
        <svg className={`w-3 h-3 opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-56 glass-lg border border-[var(--surface-border)] rounded-xl shadow-2xl p-1 z-[999] text-left"
        >
          <h4 className="text-[10px] font-bold px-3 py-1.5 border-b border-[var(--surface-border)] uppercase tracking-wide opacity-50" style={{ color: 'var(--brand-text-color)' }}>
            Trocar Consultório
          </h4>
          <div className="py-1">
            {myTenants.map((t) => {
              const isActive = t.id === activeTenantId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSwitch(t.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-transparent border-none flex items-center justify-between ${
                    isActive 
                      ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white' 
                      : 'hover:bg-[var(--surface-hover)]'
                  }`}
                  style={{ color: isActive ? '#FFFFFF' : 'var(--brand-text-color)' }}
                >
                  <span className="truncate">{t.name}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, setIsProfileOpen } = useAuth();
  const { tenant, primaryTenant, bootstrapped, theme, toggleTheme, reloadBrand } = useBrand();
  const pathname = usePathname();
  const router = useRouter();

  const [myTenants, setMyTenants] = useState<(Tenant & { memberRole?: string })[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);

  // 1. Validar autenticação inicial
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  // Bloqueio global se o sistema não estiver inicializado (sem Admin)
  if (bootstrapped === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center relative animate-page-enter">
        {/* Botão de alternância de tema no canto superior direito */}
        <div className="absolute top-4 right-4 z-10">
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              border: '1px solid var(--surface-border)',
              color: 'var(--brand-text-color)',
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all text-base cursor-pointer bg-transparent hover:bg-[var(--surface-hover)]"
            title={`Alternar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
          >
            {theme === 'dark' ? (
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
              </svg>
            ) : (
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>

        <Card className="max-w-md w-full p-8 space-y-5 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-3xl flex items-center justify-center mx-auto mb-2">
            🔒
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent" style={{ background: "var(--brand-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Sistema Indisponível
          </h1>
          <p className="text-xs leading-relaxed brand-text-muted">
            O sistema ainda não possui um Administrador inicial cadastrado. Por favor, acesse o <strong>Backoffice Admin</strong> para realizar a inicialização (bootstrap) da plataforma.
          </p>
          <Button
            onClick={() => logout()}
            variant="primary"
            className="w-full mt-4"
          >
            Sair da Sessão
          </Button>
        </Card>
      </div>
    );
  }

  // 2. Buscar workspaces do usuário e gerenciar seleção automática
  useEffect(() => {
    async function loadUserTenants() {
      if (!user) return;
      try {
        const list = await api.getMyTenants(user.id, user.role);
        setMyTenants(list);

        const storedId = typeof window !== 'undefined' 
          ? (localStorage.getItem('active_workspace_id') || localStorage.getItem('active_tenant_id') || sessionStorage.getItem('active_workspace_id'))
          : null;

        if (storedId && list.some((t) => t.id === storedId)) {
          setActiveTenantId(storedId);
          document.cookie = `active_workspace_id=${storedId}; path=/; max-age=31536000; SameSite=Lax`;
          document.cookie = `active_tenant_id=${storedId}; path=/; max-age=31536000; SameSite=Lax`;
        } else if (list.length === 1) {
          // Se tiver apenas 1, seleciona automaticamente
          const singleId = list[0].id;
          localStorage.setItem('active_workspace_id', singleId);
          localStorage.setItem('active_tenant_id', singleId);
          sessionStorage.setItem('active_workspace_id', singleId);
          document.cookie = `active_workspace_id=${singleId}; path=/; max-age=31536000; SameSite=Lax`;
          document.cookie = `active_tenant_id=${singleId}; path=/; max-age=31536000; SameSite=Lax`;
          setActiveTenantId(singleId);
          await reloadBrand();
        } else if (list.length > 1 && pathname !== '/dashboard/selecionar-consultorio') {
          router.push('/dashboard/selecionar-consultorio');
        }
      } catch (err) {
        console.error('Erro ao carregar workspaces:', err);
      } finally {
        setLoadingTenants(false);
      }
    }
    if (user) {
      loadUserTenants();
    }
  }, [user, reloadBrand, pathname, router]);

  const handleSelectTenant = async (id: string) => {
    localStorage.setItem('active_workspace_id', id);
    localStorage.setItem('active_tenant_id', id);
    sessionStorage.setItem('active_workspace_id', id);
    document.cookie = `active_workspace_id=${id}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `active_tenant_id=${id}; path=/; max-age=31536000; SameSite=Lax`;
    setActiveTenantId(id);
    await reloadBrand();
    window.location.reload();
  };

  if (loading || !user) {
    return null;
  }

  // 3. Aguardar silenciosamente enquanto busca workspaces
  if (loadingTenants) {
    return null;
  }

  // Permitir exibição direta da página de seleção de workspace ou onboarding
  if (pathname === '/dashboard/selecionar-consultorio' || pathname === '/dashboard/onboarding') {
    return <>{children}</>;
  }

  // 4. Barreira de Seleção: se possuir múltiplos workspaces e nenhum selecionado
  if (myTenants.length > 1 && !activeTenantId) {
    router.push('/dashboard/selecionar-consultorio');
    return null;
  }

  // 5. Se não tiver nenhum consultório vinculado, redireciona para a página de onboarding
  if (myTenants.length === 0) {
    if (pathname !== '/dashboard/onboarding') {
      router.push('/dashboard/onboarding');
      return null;
    }
  }

  const menuItems = [
    { label: 'Triagem', href: '/dashboard/crm', icon: <CrmIcon />, active: pathname === '/dashboard/crm' },
    { label: 'Criador de Sites', href: '/dashboard/captacao', icon: <GlobeIcon />, active: pathname.startsWith('/dashboard/captacao') },
    { label: 'Configurações', href: '/dashboard/configuracoes', icon: <SettingsIcon />, active: pathname === '/dashboard/configuracoes' },
  ];

  const appName = tenant?.name || primaryTenant?.name || 'Psi App';

  const logoUrl =
    theme === 'light'
      ? (tenant?.logoLightUrl || tenant?.logoDarkUrl || primaryTenant?.logoLightUrl || primaryTenant?.logoDarkUrl)
      : (tenant?.logoDarkUrl || tenant?.logoLightUrl || primaryTenant?.logoDarkUrl || primaryTenant?.logoLightUrl);

  const iconUrl =
    theme === 'light'
      ? (tenant?.iconLightUrl || tenant?.iconDarkUrl || tenant?.logoLightUrl || tenant?.logoDarkUrl || primaryTenant?.iconLightUrl || primaryTenant?.iconDarkUrl || primaryTenant?.logoLightUrl || primaryTenant?.logoDarkUrl)
      : (tenant?.iconDarkUrl || tenant?.iconLightUrl || tenant?.logoDarkUrl || tenant?.logoLightUrl || primaryTenant?.iconDarkUrl || primaryTenant?.iconLightUrl || primaryTenant?.logoDarkUrl || primaryTenant?.logoLightUrl);

  const isFullScreenEditor = 
    (pathname.startsWith('/dashboard/captacao/') && pathname !== '/dashboard/captacao' && pathname !== '/dashboard/captacao/nova') ||
    (pathname.startsWith('/dashboard/formularios/') && pathname !== '/dashboard/formularios');

  if (isFullScreenEditor) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col">
        {children}
      </div>
    );
  }

  return (
    <AppShell
      appName={appName}
      logoUrl={logoUrl}
      iconUrl={iconUrl}
      menuItems={menuItems}
      user={user}
      theme={theme}
      onToggleTheme={toggleTheme}
      onLogout={logout}
      onEditProfile={() => setIsProfileOpen(true)}
      onSelectTenant={() => router.push('/dashboard/selecionar-consultorio')}
      LinkComponent={Link}
      headerRightActions={
        <div className="flex items-center gap-3">
          <TenantSwitcher myTenants={myTenants} activeTenantId={activeTenantId} />
          <OnlineUsersIndicator />
        </div>
      }
    >
      {children}
      <UserProfileModal />
    </AppShell>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProvider>
      <DashboardContent>{children}</DashboardContent>
    </RealtimeProvider>
  );
}
