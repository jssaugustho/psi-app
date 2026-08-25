'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { apiConnection } from '@/lib/api';
import { Card, Button } from '@psi/ui';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiStatusContextType {
  isOffline: boolean;
  checkHealth: () => Promise<void>;
}

const ApiStatusContext = createContext<ApiStatusContextType>({
  isOffline: false,
  checkHealth: async () => {},
});

// ── ÍCONES SVG ──────────────────────────────────────────────────────────────
const WifiOffIcon = () => (
  <svg className="w-10 h-10 text-rose-500 animate-pulse" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M12 18h.01M8.5 14.5a5 5 0 017 0M5 11a10 10 0 0110.5-2M2.5 7.5A15 15 0 0118 4.5" />
  </svg>
);

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg className={`w-4 h-4 ${className || ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

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
      const healthUrl = API_URL.endsWith('/v1')
        ? `${API_URL}/health`
        : API_URL ? `${API_URL}/v1/health` : '/v1/health';

      const response = await fetch(healthUrl, {
        method: 'GET',
        cache: 'no-store',
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
    } catch {
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
        setIsOffline(false);
        setErrorMsg(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOffline]);

  // Timer de auto-ping a cada 5 segundos enquanto estiver marcado como offline
  useEffect(() => {
    if (!isOffline || isOfflinePage) return;

    const interval = setInterval(() => {
      checkHealth();
    }, 5000);

    return () => clearInterval(interval);
  }, [isOffline, isOfflinePage, checkHealth]);

  return (
    <ApiStatusContext.Provider value={{ isOffline, checkHealth }}>
      {children}

      {/* Modal de Sobreposição Global - Oculto na rota dedicada /offline */}
      {isOffline && !isOfflinePage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <Card className="max-w-md w-full p-6 text-center space-y-6 border-rose-500/30 shadow-2xl bg-slate-950/90 text-slate-100">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20">
                <WifiOffIcon />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight">Serviço Temporariamente Indisponível</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {errorMsg || 'Detectamos uma perda de conexão com os servidores do Backoffice.'}
              </p>
            </div>

            {/* Status individual dos serviços */}
            <div className="grid grid-cols-3 gap-2 py-3 px-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block font-medium">Gateway API</span>
                <span className={`font-semibold ${apiStatus === 'operational' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {apiStatus === 'checking' ? '...' : apiStatus === 'operational' ? 'Online' : 'Offline'}
                </span>
              </div>

              <div className="space-y-1 border-x border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Banco Postgres</span>
                <span className={`font-semibold ${dbStatus === 'operational' ? 'text-emerald-400' : dbStatus === 'down' ? 'text-rose-400' : 'text-slate-500'}`}>
                  {dbStatus === 'checking' ? '...' : dbStatus === 'operational' ? 'Online' : dbStatus === 'down' ? 'Offline' : '—'}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block font-medium">RabbitMQ Queues</span>
                <span className={`font-semibold ${queueStatus === 'operational' ? 'text-emerald-400' : queueStatus === 'down' ? 'text-rose-400' : 'text-slate-500'}`}>
                  {queueStatus === 'checking' ? '...' : queueStatus === 'operational' ? 'Online' : queueStatus === 'down' ? 'Offline' : '—'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={checkHealth}
                disabled={checking}
                className="w-full flex items-center justify-center gap-2 py-2.5"
              >
                <RefreshIcon className={checking ? 'animate-spin' : ''} />
                <span>{checking ? 'Verificando serviços...' : 'Tentar Reconectar Agora'}</span>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </ApiStatusContext.Provider>
  );
}

export const useApiStatus = () => useContext(ApiStatusContext);
