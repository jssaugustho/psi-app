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
      root.style.setProperty('--brand-bg-color', '#FAFAFA');       // zinc-50
      root.style.setProperty('--brand-card-bg-color', '#FFFFFF');  // white
      root.style.setProperty('--brand-text-color', '#09090B');     // zinc-950
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.style.setProperty('--brand-bg-color', '#09090B');       // zinc-950
      root.style.setProperty('--brand-card-bg-color', '#18181B');  // zinc-900
      root.style.setProperty('--brand-text-color', '#F4F4F5');     // zinc-100
    }

    // Favicon e Título
    const iconUrl =
      currentTheme === 'light'
        ? t?.iconLightUrl || t?.iconDarkUrl
        : t?.iconDarkUrl || t?.iconLightUrl;

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
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      let resolvedTenant: Tenant | null = null;

      // 1. Tentar resolver por domínio customizado ou por subdomínio (slug)
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        resolvedTenant = await api.getTenantByDomain(host);
        
        if (!resolvedTenant) {
          const parts = host.split('.');
          if (parts.length > 2) {
            const slugCandidate = parts[0];
            resolvedTenant = await api.getTenantBySlug(slugCandidate);
          }
        }
      }

      // 2. Fallback para o tenant principal caso não tenha encontrado por domínio
      if (!resolvedTenant) {
        const primaryRes = await api.getPrimaryTenant();
        if (primaryRes?.tenant) {
          resolvedTenant = primaryRes.tenant;
        }
      }

      if (resolvedTenant) {
        setTenant(resolvedTenant);
        applyBrandStyles(resolvedTenant, theme);
      } else {
        applyBrandStyles(null, theme);
      }
    } catch (err) {
      console.error('Erro ao resolver branding:', err);
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
