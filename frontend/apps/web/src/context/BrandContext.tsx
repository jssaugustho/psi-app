'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, Tenant } from '@/lib/api';

export type ThemeMode = 'light' | 'dark';

export interface BrandContextType {
  tenant: Tenant | null;
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

      // 0. Tentar resolver pelo active_tenant_id do sessionStorage
      const activeTenantId = typeof window !== 'undefined' ? sessionStorage.getItem('active_tenant_id') : null;
      if (activeTenantId) {
        try {
          resolvedTenant = await api.getTenantById(activeTenantId);
        } catch (err) {
          console.warn('Erro ao carregar tenant do sessionStorage:', err);
        }
      }

      // 1. Tentar resolver por domínio customizado ou por subdomínio (slug) se não encontrado no sessionStorage
      if (!resolvedTenant && host && host !== 'localhost' && host !== '127.0.0.1') {
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
        setTenant((prev) => (prev?.id === resolvedTenant?.id ? prev : resolvedTenant));
      } else {
        setTenant(null);
      }
    } catch (err) {
      console.error('Erro ao resolver branding:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const [loaderState, setLoaderState] = useState<'black' | 'spinner' | 'fadeout' | 'done'>('black');

  useEffect(() => {
    loadBrand();
  }, [loadBrand]);

  useEffect(() => {
    applyBrandStyles(tenant, theme);
  }, [tenant, theme, applyBrandStyles]);

  // Handle two-stage premium brand loader (black screen -> spinner + logo (min 1s) -> fade out)
  useEffect(() => {
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

  return (
    <BrandContext.Provider value={{ tenant, theme, loading, isBootReady, toggleTheme, reloadBrand: loadBrand }}>
      {loaderState !== 'done' && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#000000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            transition: 'opacity 0.5s ease-in-out',
            opacity: loaderState === 'fadeout' ? 0 : 1,
            pointerEvents: loaderState === 'fadeout' ? 'none' : 'auto',
          }}
        >
          {loaderState !== 'black' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '32px',
              animation: 'fadeIn 0.5s ease-out forwards',
            }}>
              {/* Logo */}
              {(tenant?.logoDarkUrl || tenant?.logoLightUrl) ? (
                <img 
                  src={tenant.logoDarkUrl || tenant.logoLightUrl || ''} 
                  alt={tenant.name} 
                  style={{
                    maxHeight: '64px',
                    maxWidth: '240px',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: `linear-gradient(135deg, ${tenant?.gradientColorStart || '#4F46E5'}, ${tenant?.gradientColorEnd || '#06B6D4'})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    color: '#FFFFFF',
                    fontSize: '24px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  }}>
                    Ψ
                  </div>
                  <span style={{
                    fontFamily: 'serif',
                    fontSize: '18px',
                    letterSpacing: '0.05em',
                    color: '#F4F4F5',
                  }}>{tenant?.name || 'Psi App'}</span>
                </div>
              )}

              {/* Custom Spinner */}
              <div style={{
                position: 'relative',
                width: '40px',
                height: '40px',
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '2px solid transparent',
                  borderTopColor: tenant?.gradientColorStart || '#4F46E5',
                  borderRightColor: tenant?.gradientColorEnd || '#06B6D4',
                  animation: 'spin 1s linear infinite',
                }} />
                <div style={{
                  position: 'absolute',
                  inset: '8px',
                  borderRadius: '50%',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }} />
              </div>
            </div>
          )}
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: .5; }
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  return useContext(BrandContext);
}
