'use client';

import React from 'react';
import { Card } from './card';
import { Button } from './button';
import { WifiOff, ServerCrash, Database, RefreshCw, AlertTriangle } from 'lucide-react';

export type ServiceStatusState = 'checking' | 'operational' | 'down' | 'waiting';

export interface ServiceStatusCardProps {
  apiStatus?: ServiceStatusState;
  dbStatus?: ServiceStatusState;
  queueStatus?: ServiceStatusState;
  checking?: boolean;
  errorMsg?: string | null;
  offlineReason?: 'user_internet' | 'api_server' | null;
  isAdmin?: boolean;
  onRetry?: () => void;
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
  offlineReason = 'api_server',
  isAdmin = false,
  onRetry,
  isModal = false,
  title,
  subtitle,
  className = '',
}: ServiceStatusCardProps) {
  const isUserInternetError = offlineReason === 'user_internet';

  // Resolução dinâmica de títulos e descrições baseadas no motivo do erro e papel do usuário
  let resolvedTitle = title;
  let resolvedSubtitle = subtitle;

  if (!resolvedTitle) {
    if (isUserInternetError) {
      resolvedTitle = 'Sem Conexão com a Internet';
    } else if (isAdmin) {
      resolvedTitle = 'Servidor de API Indisponível';
    } else {
      resolvedTitle = 'Plataforma em Manutenção';
    }
  }

  if (!resolvedSubtitle) {
    if (isUserInternetError) {
      resolvedSubtitle = 'Seu dispositivo perdeu a conexão com a rede. Verifique seu Wi-Fi, cabo de rede ou dados móveis.';
    } else if (isAdmin) {
      resolvedSubtitle = 'Não conseguimos estabelecer conexão com a plataforma no momento. Seu trabalho nesta página foi preservado.';
    } else {
      resolvedSubtitle = 'Estamos realizando uma manutenção preventiva no sistema. Seu trabalho nesta página foi preservado e a conexão será restabelecida em breve.';
    }
  }

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
      {/* Linha com cor de gradiente da marca no topo */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: 'var(--brand-gradient, linear-gradient(135deg, #7C3AED, #A855F7))' }}
      />

      <div className="space-y-3 pt-2">
        <div
          className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
            isUserInternetError ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
          }`}
        >
          {isUserInternetError ? (
            <WifiOff className="w-6 h-6 animate-pulse" />
          ) : (
            <ServerCrash className="w-6 h-6 animate-pulse" />
          )}
        </div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--brand-text-color, #F8FAFC)' }}>
          {resolvedTitle}
        </h1>
        <p className="text-sm max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--brand-text-color, #F8FAFC)', opacity: 0.75 }}>
          {resolvedSubtitle}
        </p>
      </div>

      {/* Exibe a lista técnica de serviços APENAS se houver internet E o usuário for Administrador */}
      {!isUserInternetError && isAdmin && (
        <div className="space-y-2.5 text-left">
          <label
            className="text-[10px] font-semibold uppercase tracking-wider block"
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
      )}

      {errorMsg && (
        <div
          className={`text-xs p-3 rounded-lg text-center font-medium border ${
            isUserInternetError
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {errorMsg}
        </div>
      )}

      <div className="pt-2">
        <Button
          onClick={onRetry}
          disabled={checking}
          className="w-full flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Verificando Conexão...' : 'Tentar Novamente'}
        </Button>
      </div>

      <div
        className="text-center text-[10px]"
        style={{ color: 'var(--brand-text-color, #F8FAFC)', opacity: 0.5 }}
      >
        Tentando conectar automaticamente...
      </div>
    </Card>
  );
}
