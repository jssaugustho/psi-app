'use client';

import React from 'react';
import { ArrowLeft, Compass, ExternalLink } from 'lucide-react';
import type { TenantData } from '../lib/api';

interface NotFoundViewProps {
  tenant?: TenantData | null;
  primaryTenant?: TenantData | null;
  requestedSlug?: string;
  requestedDomain?: string;
}

export function NotFoundView({ tenant, primaryTenant, requestedSlug, requestedDomain }: NotFoundViewProps) {
  const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'https://app.psiapp.com.br';

  // Active tenant is either the specifically requested tenant or the platform's primary tenant (tenant-pai)
  const activeTenant = tenant || primaryTenant;

  const gradStart = activeTenant?.gradientColorStart || '#8B5CF6';
  const gradEnd = activeTenant?.gradientColorEnd || '#D946EF';
  const bgDark = activeTenant?.bgDarkColor || '#09090B';
  const cardDark = activeTenant?.cardDarkColor || '#18181B';
  const textDark = activeTenant?.textDarkColor || '#FFFFFF';

  const tenantLogo = tenant?.logoDarkUrl || tenant?.logoLightUrl || primaryTenant?.logoDarkUrl || primaryTenant?.logoLightUrl;

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = mainAppUrl;
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-between p-6 sm:p-10 font-sans selection:bg-purple-500 selection:text-white"
      style={{
        backgroundColor: bgDark,
        color: textDark,
      }}
    >
      {/* Top Header */}
      <header className="w-full max-w-4xl flex items-center justify-center py-4 border-b border-white/10">
        {/* Centered Tenant Logo */}
        <div className="flex items-center justify-center">
          {activeTenant && tenantLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={tenantLogo} 
              alt={activeTenant.name} 
              className="h-10 w-auto max-w-[220px] object-contain rounded-md"
            />
          ) : (
            <div 
              className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-lg"
              style={{
                background: `linear-gradient(135deg, ${gradStart}, ${gradEnd})`,
              }}
            >
              {activeTenant ? activeTenant.name.charAt(0).toUpperCase() : 'T'}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Box */}
      <main className="my-auto py-12 flex flex-col items-center text-center max-w-lg w-full">
        {/* Glow effect container */}
        <div className="relative mb-8">
          <div 
            className="absolute inset-0 rounded-full blur-3xl opacity-30 animate-pulse"
            style={{
              background: `linear-gradient(135deg, ${gradStart}, ${gradEnd})`,
            }}
          />
          <div 
            className="relative h-24 w-24 rounded-3xl flex items-center justify-center border border-white/15 shadow-2xl backdrop-blur-md"
            style={{
              backgroundColor: cardDark,
            }}
          >
            <Compass className="h-12 w-12 text-white/80 animate-spin-slow" style={{ color: gradEnd }} />
          </div>
        </div>

        {/* 404 Badge */}
        <div 
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4 border border-white/10"
          style={{
            backgroundColor: `${gradStart}1A`, // 10% opacity
            color: gradEnd,
          }}
        >
          Erro 404 • Página Não Encontrada
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
          Ops! Não encontramos esta página.
        </h1>

        {/* Subtitle / Contextual Message */}
        <p className="text-sm sm:text-base text-white/70 leading-relaxed mb-8 max-w-md">
          {requestedSlug && activeTenant ? (
            <>
              A página <code className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-xs">/{requestedSlug}</code> de <strong className="text-white">{activeTenant.name}</strong> não está disponível ou foi desativada.
            </>
          ) : requestedDomain ? (
            <>
              O endereço <code className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-xs">{requestedDomain}</code> não possui uma página de captação ativa no momento.
            </>
          ) : (
            'O endereço que você tentou acessar não existe, foi alterado ou está indisponível temporariamente.'
          )}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full">
          <button
            type="button"
            onClick={handleGoBack}
            className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs font-semibold text-white/90 bg-white/10 hover:bg-white/15 border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar Página
          </button>

          <a
            href={mainAppUrl}
            className="w-full sm:w-auto no-underline"
          >
            <button
              type="button"
              className="w-full h-11 px-6 rounded-xl text-xs font-bold text-white uppercase tracking-wider transition-all shadow-lg hover:brightness-110 active:scale-95 flex items-center justify-center gap-2 cursor-pointer border-none"
              style={{
                background: `linear-gradient(135deg, ${gradStart}, ${gradEnd})`,
              }}
            >
              <span>Ir para o App</span>
              <ExternalLink className="h-4 w-4" />
            </button>
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl pt-6 border-t border-white/10 text-center text-xs text-white/40 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          © {new Date().getFullYear()} {activeTenant ? activeTenant.name : 'TheraOS'}. Todos os direitos reservados.
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          <span>Plataforma de Gestão & Captação</span>
        </div>
      </footer>
    </div>
  );
}
