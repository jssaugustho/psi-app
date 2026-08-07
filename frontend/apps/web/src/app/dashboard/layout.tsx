'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api, Tenant } from '@/lib/api';
import { AppShell, LoadingSpinner, Card } from '@psi/ui';
import Link from 'next/link';

const AgendaIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zM14.25 15h.008v.008H14.25V15zm0 2.25h.008v.008H14.25v-.008zM16.5 15h.008v.008H16.5V15zm0 2.25h.008v.008H16.5v-.008z" />
  </svg>
);

const CrmIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const EmailIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const BillingIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5c.621 0 1.125.504 1.125 1.125v12.75c0 .621-.504 1.125-1.125 1.125H3.75A1.125 1.125 0 012.625 18V5.625C2.625 5.004 3.129 4.5 3.75 4.5zM9 10.5h.008v.008H9V10.5zm3 0h.008v.008H12V10.5z" />
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

import { RealtimeProvider, useRealtime } from '@/context/RealtimeContext';

function getFriendlyPath(path: string): string {
  if (path.startsWith('/dashboard/crm')) return 'Visualizando CRM';
  if (path.startsWith('/dashboard/agenda')) return 'Na Agenda';
  if (path.startsWith('/dashboard/configuracoes')) return 'Nas Configurações';
  if (path.startsWith('/dashboard/membros')) return 'Visualizando Equipe';
  if (path.startsWith('/dashboard/faturamento')) return 'Visualizando Faturamento';
  if (path === '/dashboard') return 'Visualizando Perfil';
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
  const { tenant, theme, toggleTheme, reloadBrand } = useBrand();
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

  // 2. Buscar tenants do usuário e gerenciar seleção automática
  useEffect(() => {
    async function loadUserTenants() {
      if (!user) return;
      try {
        const list = await api.getMyTenants(user.id);
        setMyTenants(list);

        const storedId = sessionStorage.getItem('active_tenant_id');
        if (storedId) {
          setActiveTenantId(storedId);
        } else if (list.length === 1) {
          // Se tiver apenas 1, seleciona automaticamente
          const singleId = list[0].id;
          sessionStorage.setItem('active_tenant_id', singleId);
          setActiveTenantId(singleId);
          await reloadBrand();
        }
      } catch (err) {
        console.error('Erro ao carregar consultórios:', err);
      } finally {
        setLoadingTenants(false);
      }
    }
    if (user) {
      loadUserTenants();
    }
  }, [user, reloadBrand]);

  const handleSelectTenant = async (id: string) => {
    sessionStorage.setItem('active_tenant_id', id);
    setActiveTenantId(id);
    await reloadBrand();
    window.location.reload();
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-4 h-4 rounded-full animate-ping" style={{ backgroundColor: 'var(--brand-gradient-start)' }} />
          <span>Carregando sessão...</span>
        </div>
      </div>
    );
  }

  // 3. Exibir spinner se ainda estiver buscando os consultórios
  if (loadingTenants) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-4 h-4 rounded-full animate-ping" style={{ backgroundColor: 'var(--brand-gradient-start)' }} />
          <span>Carregando consultórios...</span>
        </div>
      </div>
    );
  }

  // 4. Barreira de Seleção: se possuir múltiplos consultórios e nenhum selecionado
  if (myTenants.length > 1 && !activeTenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <Card className="w-full max-w-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 
              className="text-3xl font-bold bg-clip-text text-transparent"
              style={{
                background: 'var(--brand-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Acessar Consultório
            </h2>
            <p className="text-sm text-slate-400">
              Escolha qual espaço clínico você deseja acessar neste momento:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myTenants.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTenant(t.id)}
                className="w-full text-left p-5 rounded-2xl border border-[var(--surface-border)] glass-md hover:bg-white/5 transition-all duration-200 cursor-pointer flex flex-col justify-between h-36 relative group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {t.logoDarkUrl || t.logoLightUrl ? (
                      <img src={t.logoDarkUrl || t.logoLightUrl || ''} alt={t.name} className="max-h-6 max-w-[120px] object-contain" />
                    ) : (
                      <span className="font-bold text-slate-200 truncate">{t.name}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">/{t.slug}</span>
                </div>
                <div className="flex items-center justify-between w-full mt-4">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Acessar</span>
                  <svg className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          <div className="text-center pt-2">
            <button
              onClick={logout}
              className="text-xs text-red-400 hover:underline bg-transparent border-none cursor-pointer"
            >
              Sair da conta
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // 5. Se não tiver nenhum consultório vinculado
  if (myTenants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <Card className="w-full max-w-md p-6 text-center space-y-4">
          <div className="text-xl">⚠️</div>
          <h2 className="text-lg font-bold text-slate-100">Nenhum Consultório Vinculado</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Você ainda não está associado a nenhum consultório ou clínica na plataforma. Entre em contato com seu administrador para receber um convite de acesso.
          </p>
          <button
            onClick={logout}
            className="w-full h-10 rounded-xl text-xs font-semibold cursor-pointer border-none text-white bg-slate-900 hover:bg-slate-800 transition-all font-mono uppercase"
          >
            Sair da Sessão
          </button>
        </Card>
      </div>
    );
  }

  const menuItems = [
    { label: 'Agenda', href: '/dashboard/agenda', icon: <AgendaIcon />, active: pathname === '/dashboard/agenda' },
    { label: 'Triagem', href: '/dashboard/crm', icon: <CrmIcon />, active: pathname === '/dashboard/crm' },
    { label: 'Campanhas', href: '/dashboard/email', icon: <EmailIcon />, active: pathname === '/dashboard/email' },
    { label: 'Equipe', href: '/dashboard/membros', icon: <UsersIcon />, active: pathname === '/dashboard/membros' },
    { label: 'Faturamento', href: '/dashboard/faturamento', icon: <BillingIcon />, active: pathname === '/dashboard/faturamento' },
    { label: 'Configurações', href: '/dashboard/configuracoes', icon: <SettingsIcon />, active: pathname === '/dashboard/configuracoes' },
    { label: 'Perfil', href: '/dashboard', icon: <ProfileIcon />, active: pathname === '/dashboard' },
  ];

  const appName = tenant?.name || 'Psi App';

  const logoUrl =
    theme === 'light'
      ? tenant?.logoLightUrl || tenant?.logoDarkUrl
      : tenant?.logoDarkUrl || tenant?.logoLightUrl;

  const iconUrl =
    theme === 'light'
      ? tenant?.iconLightUrl || tenant?.iconDarkUrl
      : tenant?.iconDarkUrl || tenant?.iconLightUrl;

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
      LinkComponent={Link}
      headerRightActions={
        <div className="flex items-center gap-3">
          <TenantSwitcher myTenants={myTenants} activeTenantId={activeTenantId} />
          <OnlineUsersIndicator />
        </div>
      }
    >
      {children}
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
