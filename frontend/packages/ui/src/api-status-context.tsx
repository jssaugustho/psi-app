'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { ServiceStatusCard, ServiceStatusState } from './service-status-card';

export interface ApiStatusContextType {
  isOffline: boolean;
  checking: boolean;
  errorMsg: string | null;
  apiStatus: ServiceStatusState;
  dbStatus: ServiceStatusState;
  queueStatus: ServiceStatusState;
  checkHealth: (silent?: boolean) => Promise<void>;
}

const ApiStatusContext = createContext<ApiStatusContextType>({
  isOffline: false,
  checking: false,
  errorMsg: null,
  apiStatus: 'checking',
  dbStatus: 'waiting',
  queueStatus: 'waiting',
  checkHealth: async () => {},
});

export interface ApiStatusProviderProps {
  children: React.ReactNode;
  apiUrl?: string;
  defaultRedirectUrl?: string;
}

export function ApiStatusProvider({
  children,
  apiUrl,
  defaultRedirectUrl,
}: ApiStatusProviderProps) {
  const pathname = usePathname();
  const isOfflinePage = pathname === '/offline';

  const [isOffline, setIsOffline] = useState(false);
  const [checking, setChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados dos serviços individuais
  const [apiStatus, setApiStatus] = useState<ServiceStatusState>('checking');
  const [dbStatus, setDbStatus] = useState<ServiceStatusState>('waiting');
  const [queueStatus, setQueueStatus] = useState<ServiceStatusState>('waiting');

  const getResolvedApiUrl = useCallback(() => {
    const envApiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const base = apiUrl || envApiUrl;
    if (!base) return '';
    if (base.endsWith('/v1')) return base;
    return `${base}/v1`;
  }, [apiUrl]);

  const checkHealth = useCallback(async (silent = false) => {
    if (!silent) {
      setChecking(true);
      setApiStatus('checking');
      setDbStatus('checking');
      setQueueStatus('checking');
    }

    try {
      const baseUrl = getResolvedApiUrl();
      const healthEndpoint = baseUrl.endsWith('/v1') ? `${baseUrl}/health` : `${baseUrl}/v1/health`;
      
      const response = await fetch(healthEndpoint, {
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

          // Se estava na rota /offline e recuperou conexão, redireciona de volta
          if (typeof window !== 'undefined' && window.location.pathname === '/offline') {
            const redirectTarget = defaultRedirectUrl || '/';
            window.location.href = redirectTarget;
          }
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
      if (!silent) {
        setChecking(false);
      }
    }
  }, [getResolvedApiUrl, defaultRedirectUrl]);

  // Checagem imediata de saúde ao montar a aplicação (ex: rota /login ou raiz)
  useEffect(() => {
    checkHealth(true);
  }, [checkHealth]);

  // Escutar CustomEvents de conexao emitidos pelos helpers fetchApi
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOffline = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      if (customEvent.detail?.message) {
        setErrorMsg(customEvent.detail.message);
      }
      setIsOffline(true);
    };

    const handleOnline = () => {
      if (isOffline) {
        setIsOffline(false);
        setErrorMsg(null);
      }
    };

    window.addEventListener('psi:api-offline', handleOffline);
    window.addEventListener('psi:api-online', handleOnline);

    return () => {
      window.removeEventListener('psi:api-offline', handleOffline);
      window.removeEventListener('psi:api-online', handleOnline);
    };
  }, [isOffline]);

  // Auto-ping timer a cada 3s quando offline
  useEffect(() => {
    if (!isOffline) return;

    const interval = setInterval(() => {
      if (!checking) {
        checkHealth(true);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOffline, checking, checkHealth]);

  return (
    <ApiStatusContext.Provider
      value={{
        isOffline,
        checking,
        errorMsg,
        apiStatus,
        dbStatus,
        queueStatus,
        checkHealth,
      }}
    >
      {children}

      {/* Modal de Sobreposição Global (Z-Index Máximo) - Exibido quando offline fora da rota /offline */}
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
          <ServiceStatusCard
            isModal={true}
            apiStatus={apiStatus}
            dbStatus={dbStatus}
            queueStatus={queueStatus}
            checking={checking}
            errorMsg={errorMsg}
            onRetry={() => checkHealth(false)}
          />
        </div>
      )}
    </ApiStatusContext.Provider>
  );
}

export function useApiStatus() {
  return useContext(ApiStatusContext);
}
