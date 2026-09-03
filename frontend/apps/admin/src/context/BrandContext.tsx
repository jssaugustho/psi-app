'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, PlatformBrand } from '@/lib/api';
import {
  BrandLoader,
  savePlatformBrandBackup,
  loadPlatformBrandBackup,
  applyBrandStylesToDOM,
} from '@psi/ui';

export type ThemeMode = 'light' | 'dark';

export interface BrandContextType {
  tenant: PlatformBrand | null;
  theme: ThemeMode;
  loading: boolean;
  /** true quando o loader de boot global sumiu — seguro para renderizar conteúdo */
  isBootReady: boolean;
  toggleTheme: () => void;
  reloadBrand: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType>({
  tenant: null,
  theme: 'dark',
  loading: true,
  isBootReady: false,
  toggleTheme: () => {},
  reloadBrand: async () => {},
});

export function BrandProvider({ children }: { children: React.ReactNode }) {
  // Inicialização com null para garantir 100% de paridade na hidratação SSR/Client do Next.js
  const [tenant, setTenant] = useState<PlatformBrand | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [loading, setLoading] = useState(true);

  // Resgata o cache do localStorage imediatamente após a hidratação do client
  useEffect(() => {
    const cached = loadPlatformBrandBackup<PlatformBrand>();
    if (cached) {
      setTenant(cached);
    }

    const savedTheme = localStorage.getItem('theme') as ThemeMode | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  const applyBrandStyles = useCallback((t: PlatformBrand | null, currentTheme: ThemeMode) => {
    applyBrandStylesToDOM(t, currentTheme, 'TheraOS Admin');
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    applyBrandStyles(tenant, nextTheme);
  };

  const loadBrand = useCallback(async () => {
    try {
      const primaryRes = await api.getPrimaryTenant();
      const fetched = primaryRes?.tenant;
      if (fetched && (fetched.name || fetched.gradientColorStart || fetched.logoDarkUrl || fetched.logoLightUrl)) {
        setTenant(fetched);
        savePlatformBrandBackup(fetched);
        applyBrandStyles(fetched, theme);
      } else {
        const cached = loadPlatformBrandBackup<PlatformBrand>();
        if (cached) setTenant(cached);
        applyBrandStyles(cached, theme);
      }
    } catch (err) {
      console.error('Erro ao resolver branding no admin:', err);
      const cached = loadPlatformBrandBackup<PlatformBrand>();
      if (cached) setTenant(cached);
      applyBrandStyles(cached, theme);
    } finally {
      setLoading(false);
    }
  }, [theme, applyBrandStyles]);

  const [loaderState, setLoaderState] = useState<'black' | 'spinner' | 'fadeout' | 'done'>('black');

  useEffect(() => {
    loadBrand();
  }, [loadBrand]);

  useEffect(() => {
    applyBrandStyles(tenant, theme);
  }, [tenant, theme, applyBrandStyles]);

  // Sync theme class with documentElement on render
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  });

  // Handle loader lifecycle
  useEffect(() => {
    if (!loading && loaderState === 'done') return;

    if (loading) {
      setLoaderState('black');
      return;
    }

    const logoUrl = tenant?.logoDarkUrl || tenant?.logoLightUrl;
    let spinnerStartTime = Date.now();
    let doneTimer: NodeJS.Timeout;
    let remainingTimer: NodeJS.Timeout;

    const proceedToDone = () => {
      setLoaderState('fadeout');
      doneTimer = setTimeout(() => {
        setLoaderState('done');
      }, 500);
    };

    const startSpinnerTimeout = () => {
      const elapsed = Date.now() - spinnerStartTime;
      const remaining = 1000 - elapsed;
      if (remaining > 0) {
        remainingTimer = setTimeout(proceedToDone, remaining);
      } else {
        proceedToDone();
      }
    };

    if (logoUrl) {
      const img = new Image();
      img.src = logoUrl;
      img.onload = () => {
        setLoaderState('spinner');
        startSpinnerTimeout();
      };
      img.onerror = () => {
        setLoaderState('spinner');
        startSpinnerTimeout();
      };
    } else {
      setLoaderState('spinner');
      startSpinnerTimeout();
    }

    return () => {
      if (doneTimer) clearTimeout(doneTimer);
      if (remainingTimer) clearTimeout(remainingTimer);
    };
  }, [loading, tenant]);

  const isBootReady = loaderState === 'done';

  const bootLogoUrl =
    theme === 'light'
      ? (tenant?.logoLightUrl || tenant?.logoDarkUrl)
      : (tenant?.logoDarkUrl || tenant?.logoLightUrl);
  const bootBrandName = tenant?.name || '';
  const spinnerStartColor = tenant?.gradientColorStart || '#4F46E5';
  const spinnerEndColor = tenant?.gradientColorEnd || '#06B6D4';

  return (
    <BrandContext.Provider value={{ tenant, theme, loading, isBootReady, toggleTheme, reloadBrand: loadBrand }}>
      <BrandLoader
        loaderState={loaderState}
        logoUrl={bootLogoUrl}
        brandName={bootBrandName}
        gradientStart={spinnerStartColor}
        gradientEnd={spinnerEndColor}
      />
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  return useContext(BrandContext);
}
