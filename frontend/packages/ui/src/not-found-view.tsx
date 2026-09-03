'use client';

import React from 'react';
import { BrandLogo, BrandLogoProps } from './brand-logo';
import { Button } from './button';

export interface NotFoundViewProps {
  homePath?: string;
  title?: string;
  description?: string;
  logoProps?: BrandLogoProps;
}

export function NotFoundView({
  homePath = '/',
  title = 'Página Não Encontrada',
  description = 'A página que você está procurando não existe, foi movida ou está temporariamente indisponível.',
  logoProps,
}: NotFoundViewProps) {
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

        {/* 404 Badge */}
        <div className="space-y-1">
          <span className="text-6xl sm:text-7xl font-black font-mono tracking-tighter brand-accent-text inline-block">
            404
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight opacity-90">
            {title}
          </h1>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm opacity-60 leading-relaxed max-w-md mx-auto">
          {description}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <a
            href={homePath}
            className="flex-1"
          >
            <Button
              variant="primary"
              className="!py-3 w-full flex items-center justify-center gap-2 text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span>Voltar ao Início</span>
            </Button>
          </a>

          <Button
            onClick={() => {
              if (typeof window !== 'undefined') window.history.back();
            }}
            variant="secondary"
            className="!py-3 flex-1 flex items-center justify-center gap-2 text-sm font-semibold"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Voltar Página</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
