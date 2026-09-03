'use client';

import React, { useState } from 'react';
import { BrandLogo, BrandLogoProps } from './brand-logo';
import { Button } from './button';

export interface ErrorViewProps {
  error?: (Error & { digest?: string }) | null;
  reset?: () => void;
  homePath?: string;
  title?: string;
  description?: string;
  logoProps?: BrandLogoProps;
}

export function ErrorView({
  error,
  reset,
  homePath = '/',
  title = 'Ops! Algo não saiu como esperado',
  description = 'Desculpe pelo inconveniente. Ocorreu uma falha inesperada durante o processamento da página.',
  logoProps,
}: ErrorViewProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleReload = () => {
    if (reset) {
      reset();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleCopyError = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && error) {
      const details = `Error: ${error.message || 'Desconhecido'}\nDigest: ${error.digest || 'N/A'}\nStack: ${error.stack || 'N/A'}`;
      navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none font-sans">
      {/* Background Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'var(--brand-gradient-start, #4F46E5)' }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'var(--brand-gradient-end, #06B6D4)' }}
        />
      </div>

      {/* Outer Card */}
      <div className="w-full max-w-lg glass-lg rounded-3xl p-6 sm:p-10 border border-brand-divider shadow-2xl space-y-6 animate-page-enter">
        {/* Brand Header */}
        <div className="flex justify-center mb-2">
          <BrandLogo size="md" {...logoProps} />
        </div>

        {/* Warning Icon Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Text Details */}
        <div className="space-y-2 select-text">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight opacity-90">
            {title}
          </h1>
          <p className="text-xs sm:text-sm opacity-60 leading-relaxed max-w-md mx-auto">
            {description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={handleReload}
            variant="primary"
            className="!py-3 flex-1 flex items-center justify-center gap-2 text-sm font-semibold"
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

          <a
            href={homePath}
            className="flex-1"
          >
            <Button
              variant="secondary"
              className="!py-3 w-full flex items-center justify-center gap-2 text-sm font-semibold"
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

        {/* Technical Error Details Accordion */}
        {error && (
          <div className="pt-2 text-left border-t border-brand-divider">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex justify-between items-center py-2 text-xs font-semibold opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <span>{showDetails ? 'Ocultar detalhes técnicos' : 'Exibir detalhes técnicos'}</span>
              <span className="text-[10px]">{showDetails ? '▲' : '▼'}</span>
            </button>

            {showDetails && (
              <div className="mt-2 space-y-2 animate-fade-in select-text">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-mono opacity-50">Log de Exceção:</span>
                  <button
                    type="button"
                    onClick={handleCopyError}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {copied ? '✓ Copiado' : '📋 Copiar'}
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-neutral-900 dark:bg-neutral-950 text-red-300 border border-neutral-800 text-[11px] overflow-x-auto custom-scrollbar font-mono leading-relaxed max-h-40 whitespace-pre-wrap break-all">
                  {error.message || 'Erro sem mensagem explícita'}
                  {error.digest && `\nDigest: ${error.digest}`}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
