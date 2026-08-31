'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, PlatformBrand } from '@/lib/api';
import { BrandLoader } from '@psi/ui';

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

const BACKUP_STORAGE_KEY = 'theraos_admin_platform_brand_cache';

function saveBrandBackup(primary: PlatformBrand | null) {
  if (typeof window === 'undefined') return;
  try {
    if (primary) {
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify({ platformBrand: primary, updatedAt: Date.now() }));
    }
  } catch (e) {
    console.warn('Falha ao salvar cache em localStorage:', e);
  }
}

function loadBrandBackup(): PlatformBrand | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw).platformBrand || null;
  } catch (e) {
    return null;
  }
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<PlatformBrand | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [loading, setLoading] = useState(true);

  // Inicializar estado do tema a partir do localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as ThemeMode | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  const applyBrandStyles = useCallback((t: PlatformBrand | null, currentTheme: ThemeMode) => {
    const root = document.documentElement;

    const cachedPlatform = !t ? loadBrandBackup() : null;
    const activePlatform = t || cachedPlatform;

    const start = activePlatform?.gradientColorStart || '#7C3AED';
    const end = activePlatform?.gradientColorEnd || '#A855F7';
    const contrast = activePlatform?.contrastColor || '#FFFFFF';

    root.style.setProperty('--brand-gradient-start', start);
    root.style.setProperty('--brand-gradient-end', end);
    root.style.setProperty('--brand-contrast-color', contrast);
    root.style.setProperty('--brand-gradient', `linear-gradient(135deg, ${start}, ${end})`);

    const bgLight = activePlatform?.bgLightColor || '#FAFAFA';
    const bgDark = activePlatform?.bgDarkColor || '#09090B';

    if (currentTheme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.setProperty('--brand-bg-color', bgLight);
      root.style.setProperty('--brand-card-bg-color', '#FFFFFF');
      root.style.setProperty('--brand-text-color', '#09090B');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.style.setProperty('--brand-bg-color', bgDark);
      root.style.setProperty('--brand-card-bg-color', 'color-mix(in srgb, #FFFFFF 6%, ' + bgDark + ')');
      root.style.setProperty('--brand-text-color', '#F4F4F5');
    }

    // Favicon e Título
    const iconUrl =
      currentTheme === 'light'
        ? activePlatform?.iconLightUrl || activePlatform?.iconDarkUrl
        : activePlatform?.iconDarkUrl || activePlatform?.iconLightUrl;

    if (iconUrl) {
      const existingIcons = document.querySelectorAll("link[rel*='icon']");
      if (existingIcons.length > 0) {
        existingIcons.forEach((el) => {
          (el as HTMLLinkElement).href = iconUrl;
        });
      } else {
        const link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = iconUrl;
        document.getElementsByTagName('head')[0].appendChild(link);
      }
    }

    const platformTitle = activePlatform?.name || 'TheraOS Admin';
    document.title = platformTitle;
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
      if (primaryRes?.tenant) {
        setTenant(primaryRes.tenant);
        saveBrandBackup(primaryRes.tenant);
        applyBrandStyles(primaryRes.tenant, theme);
      } else {
        const cached = loadBrandBackup();
        setTenant(cached);
        applyBrandStyles(cached, theme);
      }
    } catch (err) {
      console.error('Erro ao resolver branding no admin:', err);
      const cached = loadBrandBackup();
      setTenant(cached);
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

  // Keep theme class in sync with theme state on every render to prevent Next.js layout resets
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

  // Handle two-stage premium brand loader (black screen -> spinner + logo (min 1s) -> fade out)
  useEffect(() => {
    // Prevent loader from re-triggering if the app is already loaded and theme/tenant changes
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
