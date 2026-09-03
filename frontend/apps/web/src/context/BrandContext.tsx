'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, Tenant } from '@/lib/api';
import {
  BrandLoader,
  savePlatformBrandBackup,
  loadPlatformBrandBackup,
  saveUserWorkspaceBackup,
  loadUserWorkspaceBackup,
  applyBrandStylesToDOM,
} from '@psi/ui';

export type ThemeMode = 'light' | 'dark';

export interface BrandContextType {
  tenant: Tenant | null;
  primaryTenant: Tenant | null;
  bootstrapped: boolean | null;
  theme: ThemeMode;
  loading: boolean;
  /** true quando o loader de boot global sumiu — seguro para renderizar conteúdo */
  isBootReady: boolean;
  toggleTheme: () => void;
  reloadBrand: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType>({
  tenant: null,
  primaryTenant: null,
  bootstrapped: null,
  theme: 'dark',
  loading: true,
  isBootReady: false,
  toggleTheme: () => {},
  reloadBrand: async () => {},
});

export function BrandProvider({ children }: { children: React.ReactNode }) {
  // Inicialização com null para garantir 100% de paridade na hidratação SSR/Client do Next.js
  const [primaryTenant, setPrimaryTenant] = useState<Tenant | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [bootstrapped, setBootstrapped] = useState<boolean | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [loading, setLoading] = useState(true);

  // Resgata os caches do localStorage imediatamente após a hidratação inicial do client
  useEffect(() => {
    const cachedPrimary = loadPlatformBrandBackup<Tenant>();
    if (cachedPrimary) {
      setPrimaryTenant(cachedPrimary);
    }
    const cachedUser = loadUserWorkspaceBackup<Tenant>();
    if (cachedUser) {
      setTenant(cachedUser);
    }

    const savedTheme = localStorage.getItem('theme') as ThemeMode | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  const applyBrandStyles = useCallback((pTenant: Tenant | null, uTenant: Tenant | null, currentTheme: ThemeMode) => {
    applyBrandStylesToDOM(pTenant, currentTheme, 'TheraOS');
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    applyBrandStyles(primaryTenant, tenant, nextTheme);
  };

  const loadBrand = useCallback(async () => {
    try {
      let resolvedPrimary: Tenant | null = null;
      let resolvedUserTenant: Tenant | null = null;
      let hasApiError = false;

      // 0. Checar status de bootstrap da plataforma
      try {
        const bootStatus = await api.getBootstrapStatus();
        setBootstrapped(bootStatus.bootstrapped);
      } catch (err) {
        console.warn('Erro ao verificar status de bootstrap:', err);
      }

      // 1. Sempre buscar o Tenant-Pai (Plataforma White-Label Principal)
      try {
        const primaryRes = await api.getPrimaryTenant();
        const fetchedPrimary = primaryRes?.tenant;
        if (fetchedPrimary && (fetchedPrimary.name || fetchedPrimary.gradientColorStart || fetchedPrimary.logoDarkUrl || fetchedPrimary.logoLightUrl)) {
          resolvedPrimary = fetchedPrimary;
        }
      } catch (err) {
        console.warn('Erro ao carregar tenant principal da API:', err);
        hasApiError = true;
      }

      // 2. Resolver o workspace ativo do usuário via localStorage / cookie
      const activeWorkspaceId = typeof window !== 'undefined'
        ? (localStorage.getItem('active_workspace_id') || localStorage.getItem('active_tenant_id') || sessionStorage.getItem('active_workspace_id'))
        : null;

      if (activeWorkspaceId) {
        try {
          const userWorkspace = await api.getTenantById(activeWorkspaceId);
          if (userWorkspace && (userWorkspace.name || userWorkspace.gradientColorStart || userWorkspace.logoDarkUrl || userWorkspace.logoLightUrl)) {
            resolvedUserTenant = userWorkspace;
            if (typeof window !== 'undefined') {
              document.cookie = `active_workspace_id=${activeWorkspaceId}; path=/; max-age=31536000; SameSite=Lax`;
              document.cookie = `active_tenant_id=${activeWorkspaceId}; path=/; max-age=31536000; SameSite=Lax`;
            }
          }
        } catch (err) {
          console.warn('Erro ao carregar workspace ativo por id:', err);
          hasApiError = true;
        }
      }

      if (resolvedPrimary) {
        setPrimaryTenant(resolvedPrimary);
        savePlatformBrandBackup(resolvedPrimary);
      } else if (hasApiError) {
        const backup = loadPlatformBrandBackup<Tenant>();
        if (backup) {
          console.log('📦 Marca da plataforma carregada do cache no localStorage.');
          setPrimaryTenant(backup);
        }
      }

      if (resolvedUserTenant) {
        setTenant(resolvedUserTenant);
        saveUserWorkspaceBackup(resolvedUserTenant);
      } else if (hasApiError) {
        const userBackup = loadUserWorkspaceBackup<Tenant>();
        if (userBackup) {
          setTenant(userBackup);
        }
      }
    } catch (err) {
      console.error('Erro ao resolver branding:', err);
      const backup = loadPlatformBrandBackup<Tenant>();
      if (backup) {
        setPrimaryTenant(backup);
      }
      const userBackup = loadUserWorkspaceBackup<Tenant>();
      if (userBackup) {
        setTenant(userBackup);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const [loaderState, setLoaderState] = useState<'black' | 'spinner' | 'fadeout' | 'done'>('black');

  useEffect(() => {
    loadBrand();
  }, [loadBrand]);

  useEffect(() => {
    applyBrandStyles(primaryTenant, tenant, theme);
  }, [primaryTenant, tenant, theme, applyBrandStyles]);

  // Keep theme class in sync with documentElement
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

  // Handle loading state transitions
  useEffect(() => {
    if (!loading && loaderState === 'done') return;

    if (loading) {
      setLoaderState('black');
      return;
    }

    const logoUrl =
      theme === 'light'
        ? (tenant?.logoLightUrl || tenant?.logoDarkUrl || primaryTenant?.logoLightUrl || primaryTenant?.logoDarkUrl)
        : (tenant?.logoDarkUrl || tenant?.logoLightUrl || primaryTenant?.logoDarkUrl || primaryTenant?.logoLightUrl);

    let doneTimer: NodeJS.Timeout;
    let remainingTimer: NodeJS.Timeout;
    const spinnerStartTime = Date.now();

    const proceedToDone = () => {
      setLoaderState('fadeout');
      doneTimer = setTimeout(() => {
        setLoaderState('done');
      }, 500);
    };

    const startSpinnerTimeout = () => {
      const elapsed = Date.now() - spinnerStartTime;
      const remaining = 800 - elapsed;
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
  }, [loading, tenant, primaryTenant, theme]);

  const isBootReady = loaderState === 'done';
  const bootLogoUrl =
    theme === 'light'
      ? (tenant?.logoLightUrl || tenant?.logoDarkUrl || primaryTenant?.logoLightUrl || primaryTenant?.logoDarkUrl)
      : (tenant?.logoDarkUrl || tenant?.logoLightUrl || primaryTenant?.logoDarkUrl || primaryTenant?.logoLightUrl);
  const bootBrandName = tenant?.name || primaryTenant?.name || '';

  const spinnerStartColor = tenant?.gradientColorStart || primaryTenant?.gradientColorStart || '#52525B';
  const spinnerEndColor = tenant?.gradientColorEnd || primaryTenant?.gradientColorEnd || '#27272A';

  return (
    <BrandContext.Provider value={{ tenant, primaryTenant, bootstrapped, theme, loading, isBootReady, toggleTheme, reloadBrand: loadBrand }}>
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
