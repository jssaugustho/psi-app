"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { TypeformModal } from './TypeformModal'
import { BrandLogo, toE164 } from '@psi/ui'
import { useUTMParams } from '../hooks/useUTMParams'
import { CanvasRenderer } from './CanvasRenderer'
import { migrateLegacyCanvas } from '@psi/canvas-renderer'


interface CapturePageRendererProps {
  page: {
    id: string;
    tenantId: string;
    title: string;
    slug: string;
    customDomain?: string | null;
    siteConfig: any;
    dictionary: any;
    formFlow: any;
    ctaType?: string | null;
    ctaWhatsappMessage?: string | null;
    ctaExternalUrl?: string | null;
    formId?: string | null;
    canvasData?: any;
    canvas_data?: any;
  };
  tenant: {
    id: string;
    name: string;
    phone?: string | null;
    slug: string;
    gradientColorStart?: string | null;
    gradientColorEnd?: string | null;
    contrastColor?: string | null;
    bgDarkColor?: string | null;
    cardDarkColor?: string | null;
    textDarkColor?: string | null;
    logoDarkUrl?: string | null;
    logoLightUrl?: string | null;
    iconDarkUrl?: string | null;
    iconLightUrl?: string | null;
    defaultSiteLogoUrl?: string | null;
    defaultSiteFaviconUrl?: string | null;
    defaultSiteLogoConfig?: any;
    socialLinks?: any;
  };
}

export function CapturePageRenderer({ page: initialPage, tenant: initialTenant }: CapturePageRendererProps) {
  const [page, setPage] = useState(initialPage)
  const [tenant, setTenant] = useState(initialTenant)
  const [modalOpen, setModalOpen] = useState(false)
  const [isPreview, setIsPreview] = useState(false)
  const [loaderState, setLoaderState] = useState<'black' | 'spinner' | 'fadeout' | 'done'>('black')

  const utmParams = useUTMParams()

  useEffect(() => {
    setPage(initialPage)
  }, [initialPage])

  useEffect(() => {
    setTenant(initialTenant)
  }, [initialTenant])

  useEffect(() => {
    setIsPreview(window.location.search.includes('preview=true'))
  }, [])

  // Two-stage page loader
  useEffect(() => {
    const logoUrl = tenant.logoDarkUrl || tenant.logoLightUrl;
    let spinnerStartTime = 0;
    let doneTimer: NodeJS.Timeout;
    let remainingTimer: NodeJS.Timeout;
    let fallbackTimeout: NodeJS.Timeout;

    const proceedToDone = () => {
      setLoaderState('fadeout');
      doneTimer = setTimeout(() => {
        setLoaderState('done');
      }, 500);
    };

    const checkFinish = () => {
      const elapsed = Date.now() - spinnerStartTime;
      const remaining = 1500 - elapsed;
      if (remaining > 0) {
        remainingTimer = setTimeout(proceedToDone, remaining);
      } else {
        proceedToDone();
      }
    };

    const startSpinnerTimeout = () => {
      spinnerStartTime = Date.now();
      if (document.readyState === 'complete') {
        checkFinish();
      } else {
        window.addEventListener('load', checkFinish);
        fallbackTimeout = setTimeout(() => {
          window.removeEventListener('load', checkFinish);
          checkFinish();
        }, 4000);
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
      window.removeEventListener('load', checkFinish);
      if (doneTimer) clearTimeout(doneTimer);
      if (remainingTimer) clearTimeout(remainingTimer);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, [tenant.logoDarkUrl, tenant.logoLightUrl]);

  // Sync state with parent iframe if in editor preview mode
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_DATA') {
        const { page: syncedPage, tenant: syncedTenant } = event.data;
        if (syncedPage) {
          setPage(prev => ({
            ...prev,
            title: syncedPage.title ?? prev.title,
            dictionary: { ...prev.dictionary, ...syncedPage.dictionary },
            siteConfig: { ...prev.siteConfig, ...syncedPage.siteConfig },
            canvasData: syncedPage.canvasData || syncedPage.canvas_data || prev.canvasData,
          }));
        }
        if (syncedTenant) {
          setTenant(prev => ({ ...prev, ...syncedTenant }));
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleCtaClick = () => {
    const ctaType = page.ctaType || page.siteConfig?.ctaType || 'form';

    if (ctaType === 'whatsapp') {
      const whatsappNum = tenant.phone;
      const cleanDigits = whatsappNum ? toE164(whatsappNum).replace(/\D/g, '') : '';
      const message = page.ctaWhatsappMessage || page.siteConfig?.ctaWhatsappMessage || 'Olá! Gostaria de agendar uma consulta.';
      const encodedMessage = encodeURIComponent(message);
      const waUrl = cleanDigits ? `https://wa.me/${cleanDigits}?text=${encodedMessage}` : `https://wa.me/?text=${encodedMessage}`;
      window.open(waUrl, '_blank');
      return;
    }

    if (ctaType === 'external_url') {
      const targetUrl = page.ctaExternalUrl || page.siteConfig?.ctaExternalUrl;
      if (targetUrl) {
        const url = targetUrl.startsWith('http://') || targetUrl.startsWith('https://') ? targetUrl : `https://${targetUrl}`;
        window.open(url, '_blank');
      } else {
        setModalOpen(true);
      }
      return;
    }

    setModalOpen(true);
  };

  const canvasData = useMemo(() => {
    return migrateLegacyCanvas(page);
  }, [page]);

  const cfg = page.siteConfig || {};
  const theme = cfg.theme || {};
  const primaryStart = theme?.colors?.primaryStart || tenant.gradientColorStart || '#CC8667';
  const primaryEnd = theme?.colors?.primaryEnd || tenant.gradientColorEnd || '#AA5533';
  const bgCol = theme?.colors?.bgDark || tenant.bgDarkColor || '#09090B';

  return (
    <div className="min-h-screen relative font-sans antialiased">
      {/* Two-stage premium page loader */}
      {loaderState !== 'done' && (
        <div 
          className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center select-none transition-opacity duration-500 ease-in-out ${
            loaderState === 'fadeout' ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{ backgroundColor: bgCol }}
        >
          {loaderState !== 'black' && (
            <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-500 ease-out">
              <BrandLogo
                logoUrl={cfg.logoUrl || tenant.logoDarkUrl || tenant.logoLightUrl}
                logoConfig={cfg.logoConfig || tenant.defaultSiteLogoConfig}
                faviconUrl={cfg.faviconUrl || tenant.defaultSiteFaviconUrl}
                title={cfg.professional?.name}
                fallbackText="Psicologia"
                primaryStart={primaryStart}
                primaryEnd={primaryEnd}
                contrastColor={tenant.contrastColor || '#FFFFFF'}
                textColor="#F4F4F5"
                size="lg"
                imgClassName="max-h-16 max-w-[200px] object-contain"
              />
              <div className="relative h-10 w-10">
                <div 
                  className="absolute inset-0 rounded-full border-2 border-t-[var(--brand-gradient-start)] border-r-[var(--brand-gradient-end)] border-b-transparent border-l-transparent animate-spin"
                  style={{
                    borderColor: `${primaryStart} ${primaryEnd} transparent transparent`,
                  }}
                />
                <div className="absolute inset-2 rounded-full border border-white/5 bg-white/5 animate-pulse" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Canvas v2.0 Page Engine */}
      <CanvasRenderer
        canvasData={canvasData}
        page={{ ...page, tenant, workspace: tenant }}
        onCtaClick={handleCtaClick}
        isPublicView={!isPreview}
      />

      {/* Triagem Modal */}
      <TypeformModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        tenantId={page.tenantId}
        workspaceId={page.tenantId}
        pageId={page.id}
        utmParams={utmParams}
        formFlow={page.formFlow}
        whatsappNumber={tenant.phone || ""}
        theme={page.siteConfig?.theme}
        isDark={true}
      />
    </div>
  )
}
