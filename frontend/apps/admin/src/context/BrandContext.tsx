'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, Tenant } from '@/lib/api';

export type ThemeMode = 'light' | 'dark';

export interface BrandContextType {
  tenant: Tenant | null;
  theme: ThemeMode;
  loading: boolean;
  toggleTheme: () => void;
  reloadBrand: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType>({
  tenant: null,
  theme: 'dark',
  loading: true,
  toggleTheme: () => {},
  reloadBrand: async () => {},
});

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
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

  const applyBrandStyles = useCallback((t: Tenant | null, currentTheme: ThemeMode) => {
    const root = document.documentElement;

    const start = t?.gradientColorStart || '#4F46E5';
    const end = t?.gradientColorEnd || '#06B6D4';
    const contrast = t?.contrastColor || '#FFFFFF';

    root.style.setProperty('--brand-gradient-start', start);
    root.style.setProperty('--brand-gradient-end', end);
    root.style.setProperty('--brand-contrast-color', contrast);
    root.style.setProperty('--brand-gradient', `linear-gradient(135deg, ${start}, ${end})`);

    if (currentTheme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.setProperty('--brand-bg-color', t?.bgLightColor || '#F8FAFC');
      root.style.setProperty('--brand-card-bg-color', t?.cardLightColor || '#FFFFFF');
      root.style.setProperty('--brand-text-color', t?.textLightColor || '#0F172A');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.style.setProperty('--brand-bg-color', t?.bgDarkColor || '#020617');
      root.style.setProperty('--brand-card-bg-color', t?.cardDarkColor || '#0F172A');
      root.style.setProperty('--brand-text-color', t?.textDarkColor || '#F8FAFC');
    }

    // Favicon e Título
    const iconUrl =
      currentTheme === 'light'
        ? t?.iconLightUrl || t?.iconDarkUrl
        : t?.iconDarkUrl || t?.iconLightUrl;

    if (iconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = iconUrl;
    }

    if (t?.name) {
      document.title = t.name;
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    applyBrandStyles(tenant, nextTheme);
  };

  const loadBrand = useCallback(async () => {
    try {
      const res = await api.getPrimaryTenant();
      if (res?.tenant) {
        setTenant(res.tenant);
        applyBrandStyles(res.tenant, theme);
      } else {
        applyBrandStyles(null, theme);
      }
    } catch (err) {
      applyBrandStyles(null, theme);
    } finally {
      setLoading(false);
    }
  }, [theme, applyBrandStyles]);

  useEffect(() => {
    loadBrand();
  }, [loadBrand]);

  useEffect(() => {
    applyBrandStyles(tenant, theme);
  }, [tenant, theme, applyBrandStyles]);

  return (
    <BrandContext.Provider value={{ tenant, theme, loading, toggleTheme, reloadBrand: loadBrand }}>
      {loading ? (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid rgba(255, 255, 255, 0.1)',
            borderTopColor: '#9CA3AF',
            animation: 'spin 1s linear infinite',
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : (
        children
      )}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  return useContext(BrandContext);
}
