'use client';

import React from 'react';
import { Card } from './card';
import { Button } from './button';
import { WifiOff, ServerCrash, Database, RefreshCw, AlertTriangle, RotateCw } from 'lucide-react';

export type ServiceStatusState = 'checking' | 'operational' | 'down' | 'waiting';

export interface ServiceStatusCardProps {
  apiStatus?: ServiceStatusState;
  dbStatus?: ServiceStatusState;
  queueStatus?: ServiceStatusState;
  checking?: boolean;
  errorMsg?: string | null;
  onRetry?: () => void;
  onReload?: () => void;
  isModal?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function ServiceStatusCard({
  apiStatus = 'checking',
  dbStatus = 'waiting',
  queueStatus = 'waiting',
  checking = false,
  errorMsg = null,
  onRetry,
  onReload,
  isModal = false,
  title = 'Conexão Indisponível',
  subtitle,
  className = '',
}: ServiceStatusCardProps) {
  const defaultSubtitle = isModal
    ? 'Não conseguimos estabelecer conexão com a plataforma no momento. Seu trabalho nesta página foi preservado.'
    : 'Não conseguimos estabelecer conexão com a plataforma no momento.';

  const displaySubtitle = subtitle ?? defaultSubtitle;

  const handleReload = () => {
    if (onReload) {
      onReload();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const getStatusBadge = (status: ServiceStatusState) => {
    switch (status) {
      case 'checking':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 animate-pulse uppercase tracking-wider">
            Verificando
          </span>
        );
      case 'operational':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 uppercase tracking-wider">
            Online
          </span>
        );
      case 'down':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 uppercase tracking-wider">
            Inativo
          </span>
        );
      case 'waiting':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-500 uppercase tracking-wider">
            Aguardando API
          </span>
        );
    }
  };

  return (
    <Card className={`w-full max-w-md space-y-6 relative overflow-hidden text-center shadow-2xl border border-[var(--surface-border)] ${className}`}>
      {/* Detalhe de linha de gradiente no topo */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: 'var(--brand-gradient, linear-gradient(135deg, #7C3AED, #A855F7))' }}
      />

      <div className="space-y-3 pt-2">
        <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-red-500/10 text-red-400">
          <WifiOff className="w-6 h-6 animate-pulse" />
        </div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--brand-text-color, #F8FAFC)' }}>
          {title}
        </h1>
        <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--brand-text-color, #F8FAFC)', opacity: 0.7 }}>
          {displaySubtitle}
        </p>
      </div>

      {/* Status dos Serviços Individuais em Tempo Real */}
      <div className="space-y-2.5 text-left">
        <label
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--brand-text-color, #F8FAFC)', opacity: 0.5 }}
        >
          Status dos Serviços (Tempo Real)
        </label>

        <div className="space-y-2">
          {/* Serviço 1: API */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-hover, rgba(255,255,255,0.05))] border border-[var(--surface-border, rgba(255,255,255,0.08))]">
            <div className="flex items-center gap-2">
              <ServerCrash className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium" style={{ color: 'var(--brand-text-color, #F8FAFC)' }}>
                Servidor de API
              </span>
            </div>
            {getStatusBadge(apiStatus)}
          </div>

          {/* Serviço 2: Database */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-hover, rgba(255,255,255,0.05))] border border-[var(--surface-border, rgba(255,255,255,0.08))]">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium" style={{ color: 'var(--brand-text-color, #F8FAFC)' }}>
                Banco de Dados
              </span>
            </div>
            {getStatusBadge(dbStatus)}
          </div>

          {/* Serviço 3: Mensageria */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-hover, rgba(255,255,255,0.05))] border border-[var(--surface-border, rgba(255,255,255,0.08))]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium" style={{ color: 'var(--brand-text-color, #F8FAFC)' }}>
                Realtime & Fila
              </span>
            </div>
            {getStatusBadge(queueStatus)}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="text-xs p-3 rounded-lg text-center font-medium bg-red-500/10 border border-red-500/20 text-red-400">
          {errorMsg}
        </div>
      )}

      <div className="pt-2 space-y-2">
        <Button
          onClick={onRetry}
          disabled={checking}
          className="w-full flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Verificando Conexão...' : 'Tentar Novamente'}
        </Button>

        <button
          type="button"
          onClick={handleReload}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-[var(--surface-border, rgba(255,255,255,0.1))] text-[var(--brand-text-color, #F8FAFC)] opacity-70 hover:opacity-100 hover:bg-[var(--surface-hover, rgba(255,255,255,0.05))] transition-all cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Recarregar Página (F5)
        </button>
      </div>

      <div
        className="text-center text-[10px]"
        style={{ color: 'var(--brand-text-color, #F8FAFC)', opacity: 0.5 }}
      >
        Tentando conectar automaticamente a cada 3 segundos.
      </div>
    </Card>
  );
}
