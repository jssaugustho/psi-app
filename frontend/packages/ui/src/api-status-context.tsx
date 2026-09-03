'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { ServiceStatusCard, ServiceStatusState } from './service-status-card';

export interface ApiStatusContextType {
  isOffline: boolean;
  checking: boolean;
  errorMsg: string | null;
  offlineReason: 'user_internet' | 'api_server' | null;
  isAdmin: boolean;
  apiStatus: ServiceStatusState;
  dbStatus: ServiceStatusState;
  queueStatus: ServiceStatusState;
  checkHealth: (silent?: boolean) => Promise<void>;
}

const ApiStatusContext = createContext<ApiStatusContextType>({
  isOffline: false,
  checking: false,
  errorMsg: null,
  offlineReason: null,
  isAdmin: false,
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

/**
 * Função utilitária para testar ativamente a conectividade real de internet do usuário.
 * Realiza requisições leves de teste para verificar se o dispositivo possui acesso à rede externa.
 */
async function checkUserInternetAccess(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    await fetch(`https://1.1.1.1/favicon.ico?_=${Date.now()}`, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return true;
  } catch {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      await fetch(`https://www.google.com/favicon.ico?_=${Date.now()}`, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return true;
    } catch {
      return false;
    }
  }
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
  const [offlineReason, setOfflineReason] = useState<'user_internet' | 'api_server' | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Estados dos serviços individuais
  const [apiStatus, setApiStatus] = useState<ServiceStatusState>('checking');
  const [dbStatus, setDbStatus] = useState<ServiceStatusState>('waiting');
  const [queueStatus, setQueueStatus] = useState<ServiceStatusState>('waiting');

  // Detectar se o usuário é administrador
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawUser = localStorage.getItem('user') || localStorage.getItem('profile');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (parsed?.role === 'admin') {
          setIsAdmin(true);
          return;
        }
      }
      if (window.location.hostname.includes('admin') || window.location.pathname.startsWith('/dashboard')) {
        const token = localStorage.getItem('token');
        if (token) {
          setIsAdmin(true);
          return;
        }
      }
    } catch {
      // Ignora erro de parsing
    }
  }, [pathname]);

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

    // 1. Verificar desconexão imediata pela API da rede do navegador
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setOfflineReason('user_internet');
      setErrorMsg('Sem conexão com a internet. Verifique seu sinal de Wi-Fi ou cabo de rede.');
      setApiStatus('down');
      setDbStatus('waiting');
      setQueueStatus('waiting');
      setIsOffline(true);
      if (!silent) setChecking(false);
      return;
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
          setOfflineReason(null);
          setIsOffline(false);

          if (typeof window !== 'undefined' && window.location.pathname === '/offline') {
            const redirectTarget = defaultRedirectUrl || '/';
            window.location.href = redirectTarget;
          }
        } else {
          setOfflineReason('api_server');
          setErrorMsg('O servidor de API respondeu, mas existem serviços internos em manutenção.');
          setIsOffline(true);
        }
      } else {
        setOfflineReason('api_server');
        setApiStatus('down');
        setDbStatus('waiting');
        setQueueStatus('waiting');
        setErrorMsg(`O servidor de API retornou código de erro ${response.status}.`);
        setIsOffline(true);
      }
    } catch (err) {
      // 2. A requisição para a nossa API falhou. Vamos testar ativamente se a internet do usuário funciona:
      const hasUserInternet = await checkUserInternetAccess();

      if (!hasUserInternet) {
        setOfflineReason('user_internet');
        setErrorMsg('Sem conexão com a internet. Verifique seu sinal de Wi-Fi ou cabo de rede.');
      } else {
        setOfflineReason('api_server');
        setErrorMsg('Sem resposta do servidor de API. Verifique se o backend está rodando.');
      }

      setApiStatus('down');
      setDbStatus('waiting');
      setQueueStatus('waiting');
      setIsOffline(true);
    } finally {
      if (!silent) {
        setChecking(false);
      }
    }
  }, [getResolvedApiUrl, defaultRedirectUrl]);

  // Checagem síncrona imediata ao montar
  useEffect(() => {
    checkHealth(true);
  }, [checkHealth]);

  // Polling automático a cada 60 segundos enquanto estiver ONLINE
  useEffect(() => {
    if (isOffline) return;

    const interval = setInterval(() => {
      checkHealth(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [isOffline, checkHealth]);

  // Auto-ping rápido a cada 3 segundos enquanto estiver OFFLINE
  useEffect(() => {
    if (!isOffline) return;

    const interval = setInterval(() => {
      if (!checking) {
        checkHealth(true);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOffline, checking, checkHealth]);

  // Eventos de conectividade nativos do navegador e eventos customizados psi:api-offline
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleWindowOffline = () => {
      setOfflineReason('user_internet');
      setErrorMsg('Sem conexão com a internet. Verifique seu sinal de Wi-Fi ou cabo de rede.');
      setIsOffline(true);
    };

    const handleWindowOnline = () => {
      checkHealth(true);
    };

    const handleCustomOffline = async (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      const hasUserInternet = await checkUserInternetAccess();

      if (!hasUserInternet) {
        setOfflineReason('user_internet');
        setErrorMsg('Sem conexão com a internet. Verifique seu sinal de Wi-Fi ou cabo de rede.');
      } else {
        setOfflineReason('api_server');
        if (customEvent.detail?.message) {
          setErrorMsg(customEvent.detail.message);
        }
      }
      setIsOffline(true);
    };

    const handleCustomOnline = () => {
      if (isOffline) {
        setIsOffline(false);
        setErrorMsg(null);
        setOfflineReason(null);
      }
    };

    window.addEventListener('offline', handleWindowOffline);
    window.addEventListener('online', handleWindowOnline);
    window.addEventListener('psi:api-offline', handleCustomOffline);
    window.addEventListener('psi:api-online', handleCustomOnline);

    return () => {
      window.removeEventListener('offline', handleWindowOffline);
      window.removeEventListener('online', handleWindowOnline);
      window.removeEventListener('psi:api-offline', handleCustomOffline);
      window.removeEventListener('psi:api-online', handleCustomOnline);
    };
  }, [isOffline, checkHealth]);

  return (
    <ApiStatusContext.Provider
      value={{
        isOffline,
        checking,
        errorMsg,
        offlineReason,
        isAdmin,
        apiStatus,
        dbStatus,
        queueStatus,
        checkHealth,
      }}
    >
      {children}

      {/* Modal de Sobreposição Global (Z-Index Máximo) */}
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
            offlineReason={offlineReason}
            isAdmin={isAdmin}
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
