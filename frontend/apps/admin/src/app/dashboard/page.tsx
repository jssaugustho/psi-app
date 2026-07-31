'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api, PlatformSetupStatusResponse } from '@/lib/api';
import { AppShell, Card, Button } from '@psi/ui';
import { PlatformSetupWizard } from '@/components/platform-setup-wizard';
import { Link } from '@/components/Link';

const HomeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const StatusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EnvelopeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const OfficeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

export default function AdminDashboardPage() {
  const { user, loading, logout, setIsProfileOpen } = useAuth();
  const { tenant: brandTenant, theme, toggleTheme, reloadBrand } = useBrand();
  const router = useRouter();

  const [platformStatus, setPlatformStatus] = useState<PlatformSetupStatusResponse | null>(null);
  const [checkingPlatform, setCheckingPlatform] = useState(true);

  const loadPlatformStatus = useCallback(async () => {
    setCheckingPlatform(true);
    try {
      const status = await api.getPlatformSetupStatus();
      setPlatformStatus(status);
      await reloadBrand();
    } catch (err: any) {
      console.error('Erro ao buscar status de setup da plataforma:', err);
    } finally {
      setCheckingPlatform(false);
    }
  }, [reloadBrand]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role === 'admin') {
        loadPlatformStatus();
      }
    }
  }, [loading, user, router, loadPlatformStatus]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading || checkingPlatform || (!user && !checkingPlatform)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ color: 'var(--brand-text-color)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: 'color-mix(in srgb, var(--brand-gradient-start) 30%, transparent)',
              borderTopColor: 'var(--brand-gradient-start)',
            }}
          />
          <p className="text-sm" style={{ opacity: 0.6 }}>
            Verificando status do sistema e plataforma...
          </p>
        </div>
      </div>
    );
  }

  // ── Acesso negado ─────────────────────────────────────────────────────────
  if (user && user.role !== 'admin') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ color: 'var(--brand-text-color)' }}
      >
        <Card className="max-w-md text-center space-y-4">
        <svg className="w-12 h-12 text-red-500 mx-auto" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
          <h2 className="text-xl font-bold" style={{ color: 'var(--status-error-text)' }}>
            Acesso Negado
          </h2>
          <p className="text-sm" style={{ color: 'var(--brand-text-color)', opacity: 0.65 }}>
            Seu perfil ({user.email}) não possui privilégios de Administrador Global para acessar
            este Backoffice.
          </p>
          <Button variant="danger" onClick={logout}>
            Sair e alternar conta
          </Button>
        </Card>
      </div>
    );
  }

  const menuItems = [
    { label: 'Painel Geral', href: '/dashboard', icon: <HomeIcon />, active: true },
    { label: 'Status do App', href: '/dashboard/status', icon: <StatusIcon />, active: false },
    { label: 'Tenants', href: '/dashboard/tenants', icon: <OfficeIcon />, active: false },
    { label: 'Usuários', href: '/dashboard/users', icon: <UsersIcon />, active: false },
    { label: 'E-mails', href: '/dashboard/emails', icon: <EnvelopeIcon />, active: false },
    { label: 'Configurações', href: '/dashboard/settings', icon: <SettingsIcon />, active: false },
  ];

  const primaryTenant = brandTenant || platformStatus?.primary_tenant;
  const appName = primaryTenant?.name || 'Psi Backoffice';

  const logoUrl =
    theme === 'light'
      ? primaryTenant?.logoLightUrl || primaryTenant?.logoDarkUrl
      : primaryTenant?.logoDarkUrl || primaryTenant?.logoLightUrl;

  const iconUrl =
    theme === 'light'
      ? primaryTenant?.iconLightUrl || primaryTenant?.iconDarkUrl
      : primaryTenant?.iconDarkUrl || primaryTenant?.iconLightUrl;

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
    >
      {!platformStatus?.is_configured ? (
        <div className="animate-page-enter">
          <PlatformSetupWizard
            initialHasCloudflare={platformStatus?.has_cloudflare}
            onComplete={loadPlatformStatus}
          />
        </div>
      ) : (
        <div className="space-y-6 max-w-5xl mx-auto animate-page-enter">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Painel de Administração Global</h1>
              <p className="text-xs mt-1" style={{ opacity: 0.65 }}>
                Plataforma Ativa:{' '}
                <strong style={{ color: 'var(--brand-gradient-start)' }}>
                  {primaryTenant?.name}
                </strong>{' '}
                ({primaryTenant?.domain || primaryTenant?.slug})
              </p>
            </div>
            {/* Badge "Configurada" — usa cor de sucesso semântica */}
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold uppercase"
              style={{
                background: 'var(--status-success-bg)',
                border: '1px solid var(--status-success-border)',
                color: 'var(--status-success-text)',
              }}
            >
              Plataforma Configurada
            </span>
          </div>

          {/* Cards de Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card title="Status do Backend" subtitle="Fastify API & PostgreSQL">
              <span
                className="text-2xl font-bold"
                style={{ color: 'var(--status-success-text)' }}
              >
                100% Operacional
              </span>
            </Card>
            <Card
              title="Cloudflare"
              subtitle={`Zone ID: ${platformStatus.cloudflare_zone_id?.substring(0, 8)}...`}
            >
              <span
                className="text-2xl font-bold"
                style={{ color: 'var(--brand-gradient-end)' }}
              >
                Validado & Conectado
              </span>
            </Card>
            <Card title="Tenant Principal" subtitle={primaryTenant?.slug || 'Padrão'}>
              <span
                className="text-2xl font-bold"
                style={{ color: 'var(--brand-gradient-start)' }}
              >
                Ativo (is_primary)
              </span>
            </Card>
          </div>

          {/* Identidade Visual + Dados do Admin */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Identidade Visual White-Label">
              <div className="space-y-4 text-sm">
                {/* Gradiente */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase" style={{ opacity: 0.55 }}>
                    Gradiente:
                  </span>
                  <div
                    style={{
                      background: `linear-gradient(135deg, ${primaryTenant?.gradientColorStart}, ${primaryTenant?.gradientColorEnd})`,
                      border: '1px solid var(--surface-border)',
                    }}
                    className="w-24 h-6 rounded-lg shadow-md"
                  />
                  <span className="font-mono text-xs" style={{ opacity: 0.75 }}>
                    {primaryTenant?.gradientColorStart} ➔ {primaryTenant?.gradientColorEnd}
                  </span>
                </div>

                {/* Tema Atual */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase" style={{ opacity: 0.55 }}>
                    Tema Atual:
                  </span>
                  <span
                    className="glass-sm px-3 py-1 rounded-lg text-xs font-bold"
                  >
                    {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                  </span>
                </div>

                {/* Preview de Botão */}
                <div>
                  <span
                    className="text-xs font-semibold uppercase block mb-1"
                    style={{ opacity: 0.55 }}
                  >
                    Preview de Botão:
                  </span>
                  <button
                    style={{
                      background: `linear-gradient(135deg, ${primaryTenant?.gradientColorStart}, ${primaryTenant?.gradientColorEnd})`,
                      color: primaryTenant?.contrastColor,
                    }}
                    className="py-2.5 px-5 rounded-xl font-semibold text-xs border-none shadow-lg cursor-default"
                  >
                    Botão White-Label Ativo
                  </button>
                </div>
              </div>
            </Card>

            <Card title="Dados do Administrador Logado">
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Nome:</strong> {user?.nome} {user?.sobrenome}
                </p>
                <p>
                  <strong>E-mail:</strong> {user?.email}
                </p>
                <p>
                  <strong>Role:</strong>{' '}
                  <span
                    className="font-bold uppercase"
                    style={{ color: 'var(--status-success-text)' }}
                  >
                    {user?.role}
                  </span>
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
