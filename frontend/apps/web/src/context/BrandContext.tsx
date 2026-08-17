'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, Tenant } from '@/lib/api';

export type ThemeMode = 'light' | 'dark';

export interface BrandContextType {
  tenant: Tenant | null;
  primaryTenant: Tenant | null;
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
  theme: 'dark',
  loading: true,
  isBootReady: false,
  toggleTheme: () => {},
  reloadBrand: async () => {},
});

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [primaryTenant, setPrimaryTenant] = useState<Tenant | null>(null);
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

  const applyBrandStyles = useCallback((pTenant: Tenant | null, uTenant: Tenant | null, currentTheme: ThemeMode) => {
    const root = document.documentElement;

    const activeTenant = uTenant || pTenant;
    const start = uTenant?.gradientColorStart || pTenant?.gradientColorStart || '#4F46E5';
    const end = uTenant?.gradientColorEnd || pTenant?.gradientColorEnd || '#06B6D4';
    const contrast = uTenant?.contrastColor || pTenant?.contrastColor || '#FFFFFF';

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

    // Favicon e Ícone: Tenant ativo -> Fallback Tenant-Pai
    const iconUrl =
      currentTheme === 'light'
        ? (uTenant?.iconLightUrl || uTenant?.iconDarkUrl || uTenant?.logoLightUrl || uTenant?.logoDarkUrl || pTenant?.iconLightUrl || pTenant?.iconDarkUrl || pTenant?.logoLightUrl || pTenant?.logoDarkUrl)
        : (uTenant?.iconDarkUrl || uTenant?.iconLightUrl || uTenant?.logoDarkUrl || uTenant?.logoLightUrl || pTenant?.iconDarkUrl || pTenant?.iconLightUrl || pTenant?.logoDarkUrl || pTenant?.logoLightUrl);

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

    if (activeTenant?.name) {
      document.title = activeTenant.name;
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    applyBrandStyles(primaryTenant, tenant, nextTheme);
  };

  const loadBrand = useCallback(async () => {
    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      let resolvedPrimary: Tenant | null = null;
      let resolvedUserTenant: Tenant | null = null;

      // 1. Sempre buscar o Tenant-Pai (Plataforma White-Label Principal)
      try {
        const primaryRes = await api.getPrimaryTenant();
        if (primaryRes?.tenant) {
          resolvedPrimary = primaryRes.tenant;
        }
      } catch (err) {
        console.warn('Erro ao carregar tenant principal:', err);
      }
      setPrimaryTenant(resolvedPrimary);

      // 2. Resolver o tenant ativo do usuário (sessionStorage ou id)
      const activeTenantId = typeof window !== 'undefined' ? sessionStorage.getItem('active_tenant_id') : null;
      if (activeTenantId) {
        try {
          resolvedUserTenant = await api.getTenantById(activeTenantId);
        } catch (err) {
          console.warn('Erro ao carregar tenant do sessionStorage:', err);
        }
      }

      if (!resolvedUserTenant && host && host !== 'localhost' && host !== '127.0.0.1') {
        resolvedUserTenant = await api.getTenantByDomain(host);
        
        if (!resolvedUserTenant) {
          const parts = host.split('.');
          if (parts.length > 2) {
            const slugCandidate = parts[0];
            resolvedUserTenant = await api.getTenantBySlug(slugCandidate);
          }
        }
      }

      if (!resolvedUserTenant && resolvedPrimary) {
        resolvedUserTenant = resolvedPrimary;
      }

      setTenant(resolvedUserTenant);
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
    applyBrandStyles(primaryTenant, tenant, theme);
  }, [primaryTenant, tenant, theme, applyBrandStyles]);

  // Handle two-stage premium brand loader (black screen -> spinner + logo (min 1s) -> fade out)
  useEffect(() => {
    if (loading) {
      setLoaderState('black');
      return;
    }

    const logoUrl =
      theme === 'light'
        ? (tenant?.logoLightUrl || tenant?.logoDarkUrl || primaryTenant?.logoLightUrl || primaryTenant?.logoDarkUrl)
        : (tenant?.logoDarkUrl || tenant?.logoLightUrl || primaryTenant?.logoDarkUrl || primaryTenant?.logoLightUrl);
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
  }, [loading, tenant, primaryTenant, theme]);

  const isBootReady = loaderState === 'done';
  const bootLogoUrl =
    theme === 'light'
      ? (tenant?.logoLightUrl || tenant?.logoDarkUrl || primaryTenant?.logoLightUrl || primaryTenant?.logoDarkUrl)
      : (tenant?.logoDarkUrl || tenant?.logoLightUrl || primaryTenant?.logoDarkUrl || primaryTenant?.logoLightUrl);
  const bootBrandName = tenant?.name || primaryTenant?.name || 'Psi App';

  return (
    <BrandContext.Provider value={{ tenant, primaryTenant, theme, loading, isBootReady, toggleTheme, reloadBrand: loadBrand }}>
      {loaderState !== 'done' && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'var(--brand-bg-color, #09090B)',
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
              {/* Logo (Tenant -> Fallback Tenant-Pai) */}
              {bootLogoUrl ? (
                <img 
                  src={bootLogoUrl} 
                  alt={bootBrandName} 
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
                    color: 'var(--brand-text-color, #F4F4F5)',
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
                  border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.05)',
                  backgroundColor: theme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
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
