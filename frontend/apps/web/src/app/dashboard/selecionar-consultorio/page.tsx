'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api, Tenant } from '@/lib/api';
import { Card, LoadingSpinner, Button } from '@psi/ui';

export default function SelectTenantPage() {
  const { user, loading: loadingAuth, logout } = useAuth();
  const { reloadBrand, theme, toggleTheme } = useBrand();
  const router = useRouter();

  const [tenants, setTenants] = useState<(Tenant & { memberRole?: string })[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push('/login');
    }
  }, [loadingAuth, user, router]);

  useEffect(() => {
    async function loadTenants() {
      if (!user) return;
      setLoadingTenants(true);
      try {
        const list = await api.getMyTenants(user.id, user.role);
        setTenants(list);

        // Se tiver apenas 1 consultório, seleciona automaticamente
        if (list.length === 1) {
          handleSelectTenant(list[0].id);
        }
      } catch (err) {
        console.error('Erro ao carregar consultórios para seleção:', err);
      } finally {
        setLoadingTenants(false);
      }
    }

    if (user) {
      loadTenants();
    }
  }, [user]);

  const handleSelectTenant = async (tenantId: string) => {
    setSelectingId(tenantId);
    try {
      // 1. Salvar no localStorage
      localStorage.setItem('active_tenant_id', tenantId);
      sessionStorage.setItem('active_tenant_id', tenantId);

      // 2. Sincronizar cookie para SSR (Next.js Server Components)
      document.cookie = `active_tenant_id=${tenantId}; path=/; max-age=31536000; SameSite=Lax`;

      // 3. Atualizar contexto visual de marca
      await reloadBrand();

      // 4. Redirecionar para a área principal do dashboard
      router.push('/dashboard/crm');
    } catch (err) {
      console.error('Erro ao selecionar consultório:', err);
      setSelectingId(null);
    }
  };

  if (loadingAuth || loadingTenants) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <LoadingSpinner message="Carregando seus consultórios..." className="py-20" />
      </div>
    );
  }

  const activeTenantId = typeof window !== 'undefined' ? localStorage.getItem('active_tenant_id') : null;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 md:p-6 relative animate-page-enter">
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

      <div className="w-full max-w-3xl space-y-8">
        {/* Cabeçalho */}
        <div className="text-center space-y-3">
          <div className="brand-badge text-xs uppercase tracking-wider px-3 py-1">
            <span>Espaços de Trabalho & Workspaces</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent" style={{ background: "var(--brand-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Selecione o Workspace que deseja acessar
          </h1>
          <p className="text-sm max-w-lg mx-auto leading-relaxed brand-text-muted">
            Você está vinculado a múltiplos workspaces na plataforma TheraOS. Escolha abaixo qual deseja visualizar e gerenciar agora.
          </p>
        </div>

        {/* Lista de Tenants */}
        {tenants.length === 0 ? (
          <Card className="p-8 text-center space-y-5 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-3xl flex items-center justify-center mx-auto mb-2">
              ⚠️
            </div>
            <h2 className="text-xl font-bold bg-clip-text text-transparent" style={{ background: "var(--brand-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Nenhum Workspace Encontrado
            </h2>
            <p className="text-xs leading-relaxed brand-text-muted">
              Você ainda não possui nenhum workspace ativo vinculado ao seu perfil.
            </p>
            <Button
              onClick={logout}
              variant="primary"
              className="w-full"
            >
              Sair da Sessão
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {tenants.map((t) => {
              const isSelected = activeTenantId === t.id;
              const isSelecting = selectingId === t.id;
              const isOwner = t.ownerId === user?.id;
              const roleBadge = isOwner
                ? 'Proprietário'
                : t.memberRole === 'admin'
                ? 'Administrador'
                : 'Membro';

              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTenant(t.id)}
                  disabled={isSelecting}
                  className="w-full text-left p-6 rounded-2xl border glass-md hover:border-[var(--brand-gradient-start)]/40 hover:bg-[var(--surface-hover)] transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[160px] relative group"
                  style={{
                    borderColor: isSelected ? 'var(--brand-gradient-start)' : undefined,
                    boxShadow: isSelected ? '0 0 0 2px color-mix(in srgb, var(--brand-gradient-start) 20%, transparent)' : undefined,
                    background: isSelected ? 'color-mix(in srgb, var(--brand-gradient-start) 5%, var(--mix-base))' : undefined,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      {/* Logo / Nome */}
                      <div className="flex items-center gap-3">
                        {t.iconDarkUrl || t.iconLightUrl || t.logoDarkUrl || t.logoLightUrl ? (
                          <img
                            src={t.iconDarkUrl || t.iconLightUrl || t.logoDarkUrl || t.logoLightUrl || ''}
                            alt={t.name}
                            className="w-10 h-10 rounded-xl object-contain p-1 border shrink-0"
                            style={{
                              backgroundColor: 'var(--mix-base)',
                              borderColor: 'var(--surface-border)',
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-lg" style={{ background: 'var(--brand-gradient)' }}>
                            {t.name?.[0]?.toUpperCase() || 'C'}
                          </div>
                        )}
                        <div className="truncate">
                          <h3 className="font-bold text-base transition-colors truncate group-hover:text-[var(--brand-gradient-start)]" style={{ color: 'var(--brand-text-color)' }}>
                            {t.name}
                          </h3>
                        </div>
                      </div>

                      {/* Badge de Papel */}
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border glass-sm brand-text-muted">
                        {roleBadge}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full pt-4 border-t border-[var(--surface-border)] mt-2">
                    <span className="text-xs font-semibold group-hover:underline flex items-center gap-1" style={{ color: 'var(--brand-gradient-start)' }}>
                      {isSelecting ? 'Acessando...' : isSelected ? 'Ativo (Clique para Entrar)' : 'Acessar Workspace'}
                    </span>
                    <svg
                      className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                      style={{ color: 'var(--brand-gradient-start)' }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Rodapé / Sair */}
        <div className="flex items-center justify-between text-xs pt-4 border-t border-[var(--surface-border)]" style={{ color: 'var(--brand-text-color)', opacity: 0.6 }}>
          <span>Logado como: <strong className="font-semibold" style={{ color: 'var(--brand-text-color)' }}>{user?.email}</strong></span>
          <button
            onClick={logout}
            className="hover:underline transition-colors bg-transparent border-none cursor-pointer font-semibold"
            style={{ color: 'var(--brand-gradient-start)' }}
          >
            Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
}
