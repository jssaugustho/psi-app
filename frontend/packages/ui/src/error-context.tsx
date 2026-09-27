'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Card } from './card';
import { Button } from './button';
import { AlertTriangle, RotateCw, XCircle, Copy, Check, CheckCircle2, Loader2 } from 'lucide-react';

export interface GlobalError {
  name: string;
  message: string;
  stack?: string;
  url?: string;
}

export interface ErrorContextType {
  error: GlobalError | null;
  setError: (error: GlobalError | null) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextType>({
  error: null,
  setError: () => {},
  clearError: () => {},
});

export interface ErrorProviderProps {
  children: React.ReactNode;
  clientApp?: 'web' | 'admin' | 'sites';
  onReportError?: (error: { name: string; message: string; stack?: string; url?: string; userAgent?: string }) => Promise<void>;
  apiUrl?: string;
}

export function ErrorProvider({ children, clientApp = 'web', onReportError, apiUrl }: ErrorProviderProps) {
  const [error, setError] = useState<GlobalError | null>(null);
  const [logSentStatus, setLogSentStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [copiedStack, setCopiedStack] = useState(false);

  const reportErrorToApi = async (name: string, message: string, stack?: string) => {
    try {
      setLogSentStatus('sending');
      if (message.includes('/platform/errors') || (stack && stack.includes('/platform/errors'))) {
        setLogSentStatus('idle');
        return;
      }

      const payload = {
        name,
        message,
        stack,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
        serviceName: 'frontend',
        severity: 'error',
        metadata: {
          clientApp,
          reportedAt: new Date().toISOString(),
        },
      };

      if (onReportError) {
        await onReportError(payload);
        setLogSentStatus('sent');
        return;
      }

      const baseUrl = apiUrl || (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') : '');
      const endpoint = `${baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`}/platform/errors`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-App': clientApp,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setLogSentStatus('sent');
      } else {
        setLogSentStatus('failed');
      }
    } catch (e) {
      console.error('Falha ao registrar erro no backend:', e);
      setLogSentStatus('failed');
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
  }, [clientApp, apiUrl, onReportError]);

  const manualSetError = (err: GlobalError | null) => {
    if (err) {
      reportErrorToApi(err.name, err.message, err.stack);
    } else {
      setLogSentStatus('idle');
    }
    setError(err);
  };

  const clearError = () => {
    setError(null);
    setLogSentStatus('idle');
    setCopiedStack(false);
  };

  const handleCopyStack = async () => {
    if (!error) return;
    const textToCopy = `${error.name || 'Error'}: ${error.message}\nURL: ${error.url || ''}\n\nStack Trace:\n${error.stack || 'Nenhum stack trace disponível'}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedStack(true);
      setTimeout(() => setCopiedStack(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar stack trace:', err);
    }
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
          <Card className="w-full max-w-lg space-y-5 relative overflow-hidden shadow-2xl border border-[var(--surface-border)]">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />

            <div className="text-center space-y-2 pt-2">
              <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-red-500/10 text-red-400">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--brand-text-color, #FFF)' }}>
                Erro Inesperado Detectado
              </h1>
              <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--brand-text-color, #FFF)', opacity: 0.7 }}>
                Ocorreu uma falha inesperada na aplicação. O erro foi registrado automaticamente para análise.
              </p>

              {/* 🏷️ Badge de Confirmação de Log Enviado */}
              <div className="pt-1 flex items-center justify-center">
                {logSentStatus === 'sending' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Loader2 className="w-3 h-3 animate-spin" /> Enviando log de erro aos desenvolvedores...
                  </span>
                )}
                {logSentStatus === 'sent' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Log de erro registrado com sucesso
                  </span>
                )}
                {logSentStatus === 'failed' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <AlertTriangle className="w-3.5 h-3.5" /> Servidor offline — log salvo localmente
                  </span>
                )}
              </div>
            </div>

            {/* 📦 Detalhes do Erro e Stack Trace */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-left space-y-2">
              <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                <XCircle className="w-4 h-4 shrink-0" />
                <span className="break-all">{error.name || 'Erro'}</span>
              </div>
              <p className="text-xs text-zinc-300 font-mono select-text break-words">
                {error.message}
              </p>

              {error.stack && (
                <details className="mt-3 group" open>
                  <div className="flex items-center justify-between pb-1">
                    <summary className="text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-300 cursor-pointer select-none outline-none">
                      Stack Trace
                    </summary>

                    {/* 📋 Botão de Copiar Stack Trace */}
                    <button
                      type="button"
                      onClick={handleCopyStack}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Copiar Stack Trace completo"
                    >
                      {copiedStack ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-zinc-400" />
                          <span>Copiar Stack</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="mt-1 text-[10px] text-zinc-400 font-mono overflow-auto max-h-40 p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800/80 select-text whitespace-pre-wrap break-all leading-relaxed">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>

            <div className="pt-1 flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
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
