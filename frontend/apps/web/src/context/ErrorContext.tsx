'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, Button } from '@psi/ui';
import { AlertTriangle, RotateCw, XCircle } from 'lucide-react';

interface GlobalError {
  name: string;
  message: string;
  stack?: string;
  url?: string;
}

interface ErrorContextType {
  error: GlobalError | null;
  setError: (error: GlobalError | null) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextType>({
  error: null,
  setError: () => {},
  clearError: () => {},
});

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<GlobalError | null>(null);

  const reportErrorToApi = async (name: string, message: string, stack?: string) => {
    try {
      // Evita loops infinitos se a chamada de log falhar
      if (message.includes('/platform/errors') || (stack && stack.includes('/platform/errors'))) {
        return;
      }
      await api.logError({
        name,
        message,
        stack,
        url: typeof window !== 'undefined' ? window.location.href : null,
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : null,
        severity: 'error',
      });
    } catch (e) {
      console.error('Falha ao registrar erro no backend:', e);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleError = (event: ErrorEvent) => {
      const err = event.error || {};
      const name = err.name || 'Error';
      const message = event.message || err.message || 'Erro desconhecido';
      const stack = err.stack || undefined;
      const url = window.location.href;

      reportErrorToApi(name, message, stack);
      setError({ name, message, stack, url });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const err = event.reason || {};
      const name = err.name || 'UnhandledRejection';
      const message = err.message || String(err);
      const stack = err.stack || undefined;
      const url = window.location.href;

      reportErrorToApi(name, message, stack);
      setError({ name, message, stack, url });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const manualSetError = (err: GlobalError | null) => {
    if (err) {
      reportErrorToApi(err.name, err.message, err.stack);
    }
    setError(err);
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <ErrorContext.Provider value={{ error, setError: manualSetError, clearError }}>
      {children}

      {error && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{
            zIndex: 999999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.3s ease-out forwards',
          }}
        >
          <Card className="w-full max-w-lg space-y-6 relative overflow-hidden shadow-2xl border border-[var(--surface-border)]">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />

            <div className="text-center space-y-3 pt-2">
              <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-red-500/10 text-red-400">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--brand-text-color, #FFF)' }}>
                Erro Inesperado Detectado
              </h1>
              <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--brand-text-color, #FFF)', opacity: 0.7 }}>
                Ocorreu uma falha inesperada na aplicação. O erro foi registrado automaticamente para análise.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-left space-y-2">
              <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                <XCircle className="w-4 h-4" />
                <span>{error.name || 'Erro'}</span>
              </div>
              <p className="text-xs text-zinc-300 font-mono select-text break-words">
                {error.message}
              </p>
              {error.stack && (
                <details className="mt-2 group">
                  <summary className="text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-300 cursor-pointer select-none outline-none">
                    Ver Stack Trace
                  </summary>
                  <pre className="mt-2 text-[10px] text-zinc-400 font-mono overflow-auto max-h-40 p-2 rounded bg-zinc-900 border border-zinc-800 select-text whitespace-pre-wrap break-all">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white"
              >
                <RotateCw className="w-4 h-4" />
                Recarregar Página
              </Button>

              <button
                type="button"
                onClick={clearError}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-[var(--surface-border, #333)] text-[var(--brand-text-color, #FFF)] opacity-70 hover:opacity-100 hover:bg-[var(--surface-hover, #222)] transition-all cursor-pointer"
              >
                Ignorar e Continuar
              </button>
            </div>
          </Card>
        </div>
      )}
    </ErrorContext.Provider>
  );
}

export function useError() {
  return useContext(ErrorContext);
}
