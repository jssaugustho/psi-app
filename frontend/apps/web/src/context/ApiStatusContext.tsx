'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { apiConnection } from '@/lib/api';
import { Card, Button } from '@psi/ui';
import { WifiOff, ServerCrash, Database, RefreshCw, AlertTriangle, RotateCw } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiStatusContextType {
  isOffline: boolean;
  checkHealth: () => Promise<void>;
}

const ApiStatusContext = createContext<ApiStatusContextType>({
  isOffline: false,
  checkHealth: async () => {},
});

export function ApiStatusProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOfflinePage = pathname === '/offline';

  const [isOffline, setIsOffline] = useState(false);
  const [checking, setChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados dos serviços individuais
  const [apiStatus, setApiStatus] = useState<'checking' | 'operational' | 'down'>('checking');
  const [dbStatus, setDbStatus] = useState<'checking' | 'operational' | 'down' | 'waiting'>('waiting');
  const [queueStatus, setQueueStatus] = useState<'checking' | 'operational' | 'down' | 'waiting'>('waiting');

  const checkHealth = useCallback(async () => {
    setChecking(true);
    setApiStatus('checking');
    setDbStatus('checking');
    setQueueStatus('checking');

    try {
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(4000) : undefined,
      });

      if (response.ok) {
        const data = await response.json();
        setApiStatus('operational');

        const dbOk = data.services?.database === 'operational';
        const queueOk = data.services?.queue === 'operational';

        setDbStatus(dbOk ? 'operational' : 'down');
        setQueueStatus(queueOk ? 'operational' : 'down');

        if (dbOk && queueOk) {
          setErrorMsg(null);
          setIsOffline(false);
        } else {
          setErrorMsg('O servidor de API respondeu, mas existem serviços internos inoperantes.');
          setIsOffline(true);
        }
      } else {
        setApiStatus('down');
        setDbStatus('waiting');
        setQueueStatus('waiting');
        setErrorMsg(`O servidor de API retornou código de erro ${response.status}.`);
        setIsOffline(true);
      }
    } catch (err) {
      setApiStatus('down');
      setDbStatus('waiting');
      setQueueStatus('waiting');
      setErrorMsg('Sem resposta do servidor de API. Verifique se o backend está rodando.');
      setIsOffline(true);
    } finally {
      setChecking(false);
    }
  }, []);

  // Escutar eventos emitidos pelo helper de fetch
  useEffect(() => {
    const unsubscribe = apiConnection.subscribe((status, details) => {
      if (status === 'offline') {
        if (details) setErrorMsg(details);
        setIsOffline(true);
      } else if (status === 'online' && isOffline) {
        // Se a API respondeu normalmente a uma requisição e estávamos offline
        setIsOffline(false);
        setErrorMsg(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOffline]);

  // Timer de auto-ping a cada 3 segundos enquanto o modal estiver visível (offline)
  useEffect(() => {
    if (!isOffline) return;

    const interval = setInterval(() => {
      if (!checking) {
        checkHealth();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOffline, checking, checkHealth]);

  const getStatusBadge = (status: 'checking' | 'operational' | 'down' | 'waiting') => {
    switch (status) {
      case 'checking':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-500/10 text-zinc-400 animate-pulse uppercase tracking-wider">
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
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-500/10 text-zinc-500 uppercase tracking-wider">
            Aguardando API
          </span>
        );
    }
  };

  return (
    <ApiStatusContext.Provider value={{ isOffline, checkHealth }}>
      {children}

      {/* Modal de Sobreposição Global (Z-Index Máximo) - Oculto na rota dedicada /offline */}
      {isOffline && !isOfflinePage && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{
            zIndex: 999999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.3s ease-out forwards',
          }}
        >
          <Card className="w-full max-w-md space-y-6 relative overflow-hidden shadow-2xl border border-[var(--surface-border)]">
            {/* Detalhe de linha de gradiente no topo */}
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'var(--brand-gradient, linear-gradient(135deg, #52525B, #27272A))' }} />

            <div className="text-center space-y-3 pt-2">
              <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-red-500/10 text-red-400">
                <WifiOff className="w-6 h-6 animate-pulse" />
              </div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--brand-text-color)' }}>
                Conexão Indisponível
              </h1>
              <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--brand-text-color)', opacity: 0.7 }}>
                Não conseguimos estabelecer conexão com a plataforma no momento. Seu trabalho nesta página foi preservado.
              </p>
            </div>

            {/* Status dos Serviços Individuais em Tempo Real */}
            <div className="space-y-2.5">
              <label
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--brand-text-color)', opacity: 0.5 }}
              >
                Status dos Serviços (Tempo Real)
              </label>
              
              <div className="space-y-2">
                {/* Serviço 1: API */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-hover)] border border-[var(--surface-border)]">
                  <div className="flex items-center gap-2">
                    <ServerCrash className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium" style={{ color: 'var(--brand-text-color)' }}>Servidor de API</span>
                  </div>
                  {getStatusBadge(apiStatus)}
                </div>

                {/* Serviço 2: Database */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-hover)] border border-[var(--surface-border)]">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium" style={{ color: 'var(--brand-text-color)' }}>Banco de Dados</span>
                  </div>
                  {getStatusBadge(dbStatus)}
                </div>

                {/* Serviço 3: Mensageria */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-hover)] border border-[var(--surface-border)]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium" style={{ color: 'var(--brand-text-color)' }}>Realtime & Fila</span>
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
                onClick={() => checkHealth()}
                disabled={checking}
                className="w-full flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'Verificando Conexão...' : 'Tentar Novamente'}
              </Button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-[var(--surface-border)] text-[var(--brand-text-color)] opacity-70 hover:opacity-100 hover:bg-[var(--surface-hover)] transition-all cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Recarregar Página (F5)
              </button>
            </div>

            <div
              className="text-center text-[10px]"
              style={{ color: 'var(--brand-text-color)', opacity: 0.5 }}
            >
              Tentando conectar automaticamente a cada 3 segundos.
            </div>
          </Card>
        </div>
      )}
    </ApiStatusContext.Provider>
  );
}

export function useApiStatus() {
  return useContext(ApiStatusContext);
}
