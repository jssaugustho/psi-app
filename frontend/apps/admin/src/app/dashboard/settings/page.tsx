'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api, PlatformBrand, PlatformSetupStatusResponse } from '@/lib/api';
import { WhiteLabelSettings } from '@/components/white-label-settings';
import { ResendSettings } from '@/components/resend-settings';
import { CloudflareDomainsSettings } from '@/components/cloudflare-domains-settings';
import { R2StorageSettings } from '@/components/r2-storage-settings';
import { BillingSettings } from '@/components/billing-settings';
import { LoadingSpinner } from '@psi/ui';

const BillingIcon = () => (
  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
);

const PaletteIcon = () => (
  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  </svg>
);

const MailIcon = () => (
  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const BucketIcon = () => (
  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

type Tab = 'white-label' | 'domains' | 'storage' | 'email' | 'billing' | 'conta';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'white-label', label: 'White-Label', icon: <PaletteIcon /> },
  { id: 'domains', label: 'Domínios', icon: <GlobeIcon /> },
  { id: 'storage', label: 'Armazenamento', icon: <BucketIcon /> },
  { id: 'email', label: 'E-mail', icon: <MailIcon /> },
  { id: 'billing', label: 'Assinaturas', icon: <BillingIcon /> },
  { id: 'conta', label: 'Minha Conta', icon: <UserIcon /> },
];

export default function SettingsPage() {
  const { user, setIsProfileOpen, logout } = useAuth();
  const { reloadBrand } = useBrand();

  const [activeTab, setActiveTab] = useState<Tab>('white-label');
  const [tenant, setTenant] = useState<PlatformBrand | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as Tab;
      if (tabParam && tabs.some((t) => t.id === tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const handleTabChange = (tabId: Tab) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabId);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };
  const [loadingTenant, setLoadingTenant] = useState(true);
  const [tenantError, setTenantError] = useState('');
  const [platformStatus, setPlatformStatus] = useState<PlatformSetupStatusResponse | null>(null);

  const loadTenant = useCallback(async () => {
    setLoadingTenant(true);
    setTenantError('');
    try {
      const [tenantRes, statusRes] = await Promise.all([
        api.getPrimaryTenant(),
        api.getPlatformSetupStatus(),
      ]);
      setTenant(tenantRes.tenant);
      setPlatformStatus(statusRes);
    } catch (err: any) {
      setTenantError(err.message || 'Erro ao buscar configurações.');
    } finally {
      setLoadingTenant(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadTenant();
  }, [user, loadTenant]);

  const handleTenantSaved = async (updated: PlatformBrand) => {
    setTenant(updated);
    await reloadBrand();
  };


  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-page-enter">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-sm mt-1" style={{ opacity: 0.6 }}>
            Gerencie as configurações globais da plataforma
          </p>
        </div>

        {loadingTenant ? (
          <LoadingSpinner message="Carregando configurações..." className="py-20" />
        ) : (
          <>
            {/* Tab Bar */}
            <div
              className="flex gap-1 p-1 rounded-2xl w-fit glass-sm"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border-none"
                  style={
                    activeTab === tab.id
                      ? {
                          background: 'var(--brand-gradient)',
                          color: 'var(--brand-contrast-color)',
                          boxShadow: '0 2px 12px color-mix(in srgb, var(--brand-gradient-start) 25%, transparent)',
                        }
                      : {
                          background: 'transparent',
                          color: 'var(--brand-text-color)',
                          opacity: 0.65,
                        }
                  }
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div
              className="glass-md rounded-2xl p-6 md:p-8 transition-colors duration-300"
              style={{
                color: 'var(--brand-text-color)',
              }}
            >
              {/* ── ABA: WHITE-LABEL ── */}
              {activeTab === 'white-label' && (
                <>
                  {tenantError ? (
                    <div
                      className="px-4 py-3 rounded-xl text-sm"
                      style={{
                        background: 'var(--status-error-bg)',
                        border: '1px solid var(--status-error-border)',
                        color: 'var(--status-error-text)',
                      }}
                    >
                      <svg className="w-4 h-4 text-red-500 inline mr-2 align-middle" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {tenantError}
                      <button
                        onClick={loadTenant}
                        className="ml-3 underline text-xs hover:no-underline"
                        style={{ color: 'inherit' }}
                      >
                        Tentar novamente
                      </button>
                    </div>
                  ) : tenant ? (
                    <WhiteLabelSettings tenant={tenant} onSaved={handleTenantSaved} />
                  ) : (
                    <p className="text-sm" style={{ opacity: 0.6 }}>Nenhum tenant configurado ainda.</p>
                  )}
                </>
              )}

              {/* ── ABA: DOMÍNIOS (CLOUDFLARE) ── */}
              {activeTab === 'domains' && (
                <CloudflareDomainsSettings
                  platformStatus={platformStatus}
                  onSaved={loadTenant}
                />
              )}

              {/* ── ABA: ARMAZENAMENTO (R2 BUCKETS) ── */}
              {activeTab === 'storage' && (
                <R2StorageSettings
                  platformStatus={platformStatus}
                  onSaved={loadTenant}
                />
              )}

              {/* ── ABA: E-MAIL (RESEND) ── */}
              {activeTab === 'email' && (
                <ResendSettings
                  currentFromDomain={platformStatus?.resend_from_domain ?? null}
                  hasResendKey={platformStatus?.has_resend_key ?? false}
                  onSaved={loadTenant}
                />
              )}

              {/* ── ABA: ASSINATURAS (BILLING) ── */}
              {activeTab === 'billing' && (
                <BillingSettings />
              )}

              {/* ── ABA: CONTA ── */}
              {activeTab === 'conta' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold mb-1">Minha Conta</h2>
                    <p className="text-sm" style={{ opacity: 0.6 }}>
                      Dados do administrador logado atualmente.
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt="Foto de perfil"
                        className="w-16 h-16 rounded-2xl object-cover shadow-lg shrink-0"
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg shrink-0"
                        style={{
                          background: 'var(--brand-gradient)',
                          color: 'var(--brand-contrast-color)',
                        }}
                      >
                        {user?.nome?.[0]?.toUpperCase()}
                        {user?.sobrenome?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-bold text-lg">{user?.nome} {user?.sobrenome}</p>
                        <button
                          onClick={() => setIsProfileOpen(true)}
                          className="px-2 py-1 rounded-lg border border-slate-700/60 hover:bg-slate-800/40 text-[10px] font-bold uppercase tracking-wider cursor-pointer bg-transparent transition-all flex items-center gap-1 shrink-0"
                          style={{ color: 'var(--brand-text-color)' }}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Editar Perfil
                        </button>
                      </div>
                      <p className="text-sm" style={{ opacity: 0.6 }}>{user?.email}</p>
                      {/* Badge de role — usa variável semântica de sucesso */}
                      <span
                        className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase"
                        style={{
                          background: 'var(--status-success-bg)',
                          border: '1px solid var(--status-success-border)',
                          color: 'var(--status-success-text)',
                        }}
                      >
                        {user?.role}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        label: 'Membro desde',
                        value: user?.created_at
                          ? new Date(user.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '—',
                        mono: false,
                      },
                      { label: 'ID do Usuário', value: user?.id ?? '—', mono: true },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="p-4 rounded-xl space-y-1"
                        style={{
                          border: '1px solid var(--surface-border)',
                          background: 'var(--surface-hover)',
                        }}
                      >
                        <p className="text-[10px] uppercase font-bold tracking-wider" style={{ opacity: 0.4 }}>
                          {item.label}
                        </p>
                        <p className={`text-sm font-medium ${item.mono ? 'font-mono text-xs opacity-70' : ''}`}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1rem' }}>
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer bg-transparent"
                      style={{
                        color: 'var(--status-error-text)',
                        border: '1px solid var(--status-error-border)',
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background = 'var(--status-error-bg)')
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')
                      }
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sair da Sessão
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
    </div>
  );
}
