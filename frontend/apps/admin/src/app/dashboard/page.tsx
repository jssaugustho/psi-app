'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api, PlatformSetupStatusResponse } from '@/lib/api';
import { Card, LoadingSpinner } from '@psi/ui';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { tenant: brandTenant, theme } = useBrand();

  const [platformStatus, setPlatformStatus] = useState<PlatformSetupStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const loadPlatformStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const status = await api.getPlatformSetupStatus();
      setPlatformStatus(status);
    } catch (err: any) {
      console.error('Erro ao buscar status de setup da plataforma:', err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadPlatformStatus();
  }, [loadPlatformStatus]);

  const primaryTenant = brandTenant || platformStatus?.primary_tenant;

  if (loadingStatus || !platformStatus) {
    return <LoadingSpinner message="Carregando dados do painel..." className="min-h-[50vh]" />;
  }

  return (
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
            {platformStatus?.base_domain ? `(${platformStatus.base_domain})` : ''}
          </p>
        </div>
        {/* Badge "Configurada" */}
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
        <Card title="Marca da Plataforma" subtitle={primaryTenant?.name || 'TheraOS'}>
          <span
            className="text-2xl font-bold"
            style={{ color: 'var(--brand-gradient-start)' }}
          >
            Ativa (platform_settings)
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
  );
}
