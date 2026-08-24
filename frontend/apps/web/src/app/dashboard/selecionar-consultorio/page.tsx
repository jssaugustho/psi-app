'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api, Tenant } from '@/lib/api';
import { Card, LoadingSpinner } from '@psi/ui';

export default function SelectTenantPage() {
  const { user, loading: loadingAuth, logout } = useAuth();
  const { reloadBrand } = useBrand();
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
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <LoadingSpinner message="Carregando seus consultórios..." className="py-20" />
      </div>
    );
  }

  const activeTenantId = typeof window !== 'undefined' ? localStorage.getItem('active_tenant_id') : null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 md:p-6 animate-page-enter">
      <div className="w-full max-w-3xl space-y-8">
        {/* Cabeçalho */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider">
            <span>Espaços Clínicos & Consultórios</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Selecione o Consultório que deseja acessar
          </h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Você está vinculado a múltiplos espaços na plataforma TheraOS. Escolha abaixo qual deseja visualizar e gerenciar agora.
          </p>
        </div>

        {/* Lista de Tenants */}
        {tenants.length === 0 ? (
          <Card className="p-8 text-center space-y-4 max-w-md mx-auto">
            <div className="text-2xl">⚠️</div>
            <h2 className="text-lg font-bold text-slate-100">Nenhum Consultório Encontrado</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Você ainda não possui nenhum consultório ou workspace ativo vinculado ao seu perfil.
            </p>
            <button
              onClick={logout}
              className="w-full h-10 rounded-xl text-xs font-semibold cursor-pointer border-none text-white bg-slate-900 hover:bg-slate-800 transition-all font-mono uppercase"
            >
              Sair da Sessão
            </button>
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
                  className={`w-full text-left p-6 rounded-2xl border glass-md hover:border-purple-500/40 hover:bg-white/5 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[160px] relative group ${
                    isSelected ? 'border-purple-500/60 ring-2 ring-purple-500/20 bg-purple-500/5' : 'border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      {/* Logo / Nome */}
                      <div className="flex items-center gap-3">
                        {t.iconDarkUrl || t.iconLightUrl || t.logoDarkUrl || t.logoLightUrl ? (
                          <img
                            src={t.iconDarkUrl || t.iconLightUrl || t.logoDarkUrl || t.logoLightUrl || ''}
                            alt={t.name}
                            className="w-10 h-10 rounded-xl object-contain bg-slate-900 p-1 border border-slate-800 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-lg">
                            {t.name?.[0]?.toUpperCase() || 'C'}
                          </div>
                        )}
                        <div className="truncate">
                          <h3 className="font-bold text-base text-slate-100 group-hover:text-purple-300 transition-colors truncate">
                            {t.name}
                          </h3>
                          <span className="text-xs text-slate-500 font-mono block truncate">
                            /{t.slug}
                          </span>
                        </div>
                      </div>

                      {/* Badge de Papel */}
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 bg-slate-900 text-slate-300 border border-slate-800">
                        {roleBadge}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full pt-4 border-t border-slate-800/60 mt-2">
                    <span className="text-xs font-semibold text-purple-400 group-hover:underline flex items-center gap-1">
                      {isSelecting ? 'Acessando...' : isSelected ? 'Ativo (Clique para Entrar)' : 'Acessar Consultório'}
                    </span>
                    <svg
                      className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform"
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
        <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-900">
          <span>Logado como: <strong className="text-slate-300">{user?.email}</strong></span>
          <button
            onClick={logout}
            className="text-red-400 hover:text-red-300 transition-colors bg-transparent border-none cursor-pointer font-semibold"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
}
