'use client';

import React, { useState, useEffect } from 'react';
import { BrandLogo, BrandLogoProps } from './brand-logo';
import { Button } from './button';
import { loadPlatformBrandBackup } from './brand-storage';

export interface ErrorViewProps {
  error?: (Error & { digest?: string }) | null;
  reset?: () => void;
  homePath?: string;
  title?: string;
  description?: string;
  clientApp?: 'web' | 'admin' | 'sites' | string;
  logoProps?: BrandLogoProps;
}

export function ErrorView({
  error,
  reset,
  homePath = '/',
  title = 'Ops! Algo não saiu como esperado',
  description = 'Desculpe pelo inconveniente. Ocorreu uma falha inesperada durante o processamento da página.',
  clientApp = 'web',
  logoProps,
}: ErrorViewProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logSent, setLogSent] = useState(false);

  // 1. Resolução do Logotipo Oficial da Plataforma (Platform Brand)
  const [platformBrand, setPlatformBrand] = useState<any>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  useEffect(() => {
    // Carrega ativamente a Marca da Plataforma do cache
    const brand = loadPlatformBrandBackup();
    if (brand) {
      setPlatformBrand(brand);
    }

    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark') ||
        (!document.documentElement.classList.contains('light') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDarkTheme(isDark);
    }
  }, []);

  const platformLogoUrl = logoProps?.logoUrl ||
    (isDarkTheme
      ? (platformBrand?.logoDarkUrl || platformBrand?.logoLightUrl)
      : (platformBrand?.logoLightUrl || platformBrand?.logoDarkUrl));

  const platformTitle = logoProps?.title || platformBrand?.name || 'Psi App';

  // 2. Envio automático do erro para o backend (/v1/platform/errors -> RabbitMQ system.logs)
  useEffect(() => {
    if (!error || logSent) return;

    const dispatchErrorLog = async () => {
      try {
        const payload = {
          name: error.name || 'UnhandledClientError',
          message: error.message || 'Erro no cliente sem mensagem detalhada',
          stack: error.stack || null,
          url: typeof window !== 'undefined' ? window.location.href : null,
          clientApp,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          severity: 'error',
          metadata: {
            digest: error.digest || null,
            timestamp: new Date().toISOString(),
          },
        };

        const res = await fetch('/v1/platform/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          setLogSent(true);
        }
      } catch (err) {
        console.warn('⚡ Falha ao notificar o serviço de logs da plataforma:', err);
      }
    };

    dispatchErrorLog();
  }, [error, clientApp, logSent]);

  const handleReload = () => {
    if (reset) {
      reset();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleCopyError = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && error) {
      const details = `Error: ${error.message || 'Desconhecido'}\nDigest: ${error.digest || 'N/A'}\nApp: ${clientApp}\nURL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}\nStack: ${error.stack || 'N/A'}`;
      navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none font-sans relative overflow-hidden bg-slate-950 text-slate-100">
      {/* Background Orbs & Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-25"
          style={{ background: 'var(--brand-gradient-start, #6366F1)' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-25"
          style={{ background: 'var(--brand-gradient-end, #8B5CF6)' }}
        />
      </div>

      {/* Main Glassmorphic Error Card */}
      <div className="w-full max-w-lg glass-lg rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl space-y-6 animate-page-enter backdrop-blur-xl bg-slate-900/80">
        {/* Platform Brand Header (Official Platform Logo ONLY) */}
        <div className="flex justify-center mb-1">
          <BrandLogo
            logoUrl={platformLogoUrl}
            title={platformTitle}
            fallbackText={platformTitle}
            size="md"
            {...logoProps}
          />
        </div>

        {/* Warning Badge with Subtle Pulse */}
        <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-md animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Title & User-friendly Description */}
        <div className="space-y-2 select-text">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            {description}
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={handleReload}
            variant="primary"
            className="!py-3 flex-1 flex items-center justify-center gap-2 text-sm font-semibold shadow-lg shadow-indigo-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Tentar Novamente</span>
          </Button>

          <a href={homePath} className="flex-1">
            <Button
              variant="secondary"
              className="!py-3 w-full flex items-center justify-center gap-2 text-sm font-semibold border-white/10 hover:bg-white/5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span>Ir para o Início</span>
            </Button>
          </a>
        </div>

        {/* Technical Error Accordion & Logging Status */}
        {error && (
          <div className="pt-3 text-left border-t border-white/10">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <span>{showDetails ? 'Ocultar detalhes técnicos' : 'Exibir detalhes técnicos'}</span>
                <span className="text-[10px]">{showDetails ? '▲' : '▼'}</span>
              </button>

              {logSent && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Registrado no sistema
                </span>
              )}
            </div>

            {showDetails && (
              <div className="mt-3 space-y-2 animate-fade-in select-text">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-mono text-slate-400">Log de Exceção:</span>
                  <button
                    type="button"
                    onClick={handleCopyError}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300 hover:bg-white/20 transition-all cursor-pointer"
                  >
                    {copied ? '✓ Copiado' : '📋 Copiar'}
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-950 text-red-300 border border-slate-800 text-[11px] overflow-x-auto custom-scrollbar font-mono leading-relaxed max-h-44 whitespace-pre-wrap break-all shadow-inner">
                  {`[${error.name || 'Error'}] ${error.message || 'Sem mensagem explícita'}`}
                  {error.digest && `\nDigest: ${error.digest}`}
                  {error.stack && `\n\nStack:\n${error.stack}`}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
