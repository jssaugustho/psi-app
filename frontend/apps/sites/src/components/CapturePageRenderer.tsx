"use client"

import React, { useState, useEffect } from 'react'
import { Sparkles, Check, ChevronDown, MapPin, Phone, MessageSquare, ArrowRight, Menu, X, Image as ImageIcon } from 'lucide-react'
import { TypeformModal } from './TypeformModal'

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
  };
  contractText?: string;
}

export function CapturePageRenderer({ page: initialPage, tenant: initialTenant, contractText }: CapturePageRendererProps) {
  const [page, setPage] = useState(initialPage)
  const [tenant, setTenant] = useState(initialTenant)
  const [modalOpen, setModalOpen] = useState(false)
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isPreview, setIsPreview] = useState(false)
  const [loaderState, setLoaderState] = useState<'black' | 'spinner' | 'fadeout' | 'done'>('black')

  // Sync state when props change
  useEffect(() => {
    setPage(initialPage)
  }, [initialPage])

  useEffect(() => {
    setTenant(initialTenant)
  }, [initialTenant])

  // Detect preview mode in URL
  useEffect(() => {
    setIsPreview(window.location.search.includes('preview=true'))
  }, [])

  // Handle two-stage premium website loader (black screen -> spinner + logo (min 1.5s) -> fade out)
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
        }, 4000); // 4 seconds max fallback
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

  // Listen to visual editor events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_DATA') {
        const { page: syncedPage, tenant: syncedTenant } = event.data;
        if (syncedPage) {
          setPage(prev => ({
            ...prev,
            dictionary: { ...prev.dictionary, ...syncedPage.dictionary },
            siteConfig: { ...prev.siteConfig, ...syncedPage.siteConfig },
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

  const dict = page.dictionary
  const cfg = page.siteConfig

  const defaultSections = [
    { id: 'diagnostic', type: 'diagnostic', isActive: true },
    { id: 'about', type: 'about', isActive: true },
    { id: 'process', type: 'process', isActive: true },
    { id: 'faq', type: 'faq', isActive: true },
    { id: 'space', type: 'space', isActive: true }
  ];
  const sections = cfg.sections || defaultSections;
  const activeSections = sections.filter((s: any) => s.isActive);

  const getSectionNavInfo = (section: any) => {
    const isSemantic = ['diagnostic', 'about', 'process', 'space', 'faq'].includes(section.type);
    const slug = section.slug || (isSemantic ? (section.type === 'diagnostic' ? 'services' : section.type) : section.id);
    
    if (isSemantic) {
      switch (section.type) {
        case 'about':
          return { id: slug, labelKey: 'nav.about', defaultLabel: section.name || 'Sobre', isCustom: !!section.name };
        case 'diagnostic':
          return { id: slug, labelKey: 'nav.services', defaultLabel: section.name || 'Especialidades', isCustom: !!section.name };
        case 'process':
          return { id: slug, labelKey: 'nav.process', defaultLabel: section.name || 'Como Funciona', isCustom: !!section.name };
        case 'faq':
          return { id: slug, labelKey: 'nav.faq', defaultLabel: section.name || 'Dúvidas', isCustom: !!section.name };
        case 'space':
          return { id: slug, labelKey: 'nav.space', defaultLabel: section.name || 'Espaço', isCustom: !!section.name };
        default:
          return null;
      }
    } else {
      // Dynamic layout template
      const label = section.name || section.badge || 'Nova Seção';
      return {
        id: slug,
        labelKey: `${section.id}.name`,
        defaultLabel: label,
        isCustom: true
      };
    }
  };

  // Helper to determine if a color is light
  const isLightColor = (hex: string) => {
    if (!hex) return false;
    const cleanHex = hex.replace('#', '');
    let r = 0, g = 0, b = 0;
    if (cleanHex.length === 3) {
      r = parseInt(cleanHex[0] + cleanHex[0], 16);
      g = parseInt(cleanHex[1] + cleanHex[1], 16);
      b = parseInt(cleanHex[2] + cleanHex[2], 16);
    } else if (cleanHex.length === 6) {
      r = parseInt(cleanHex.substring(0, 2), 16);
      g = parseInt(cleanHex.substring(2, 4), 16);
      b = parseInt(cleanHex.substring(4, 6), 16);
    }
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 140; // Brightness threshold
  };

  const theme = page.siteConfig?.theme;
  const bgCol = theme?.colors?.bgDark || tenant.bgDarkColor || '#09090B';
  const isLightBg = isLightColor(bgCol);
  const defaultText = isLightBg ? '#18181B' : '#F4F4F5';
  const defaultContrast = '#FFFFFF';
  const defaultMixBase = isLightBg ? '#FFFFFF' : '#000000';
  const textCol = theme?.colors?.textDark || defaultText;
  const cardCol = isLightBg 
    ? `color-mix(in srgb, ${bgCol} 96%, #000000)` 
    : `color-mix(in srgb, ${bgCol} 92%, #ffffff)`;
  const mixBaseCol = defaultMixBase;

  const themeStyles = {
    '--brand-gradient-start': theme?.colors?.primaryStart || tenant.gradientColorStart || '#CC8667',
    '--brand-gradient-end': theme?.colors?.primaryEnd || tenant.gradientColorEnd || '#AA5533',
    '--brand-contrast-color': theme?.colors?.contrast || defaultContrast,
    '--brand-bg-color': bgCol,
    '--brand-card-bg-color': cardCol,
    '--brand-text-color': textCol,
    '--mix-base': mixBaseCol,
    '--brand-gradient': `linear-gradient(135deg, ${theme?.colors?.primaryStart || tenant.gradientColorStart || '#CC8667'}, ${theme?.colors?.primaryEnd || tenant.gradientColorEnd || '#AA5533'})`,
    '--brand-heading-font': theme?.typography?.headingFont ? `'${theme.typography.headingFont}', serif` : 'var(--font-serif)',
    '--brand-body-font': theme?.typography?.bodyFont ? `'${theme.typography.bodyFont}', sans-serif` : 'var(--font-sans)',
  } as React.CSSProperties;

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Helper to parse double asterisks (**) for bold styling in paragraphs
  const parseParagraphMarkdown = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      const isBold = part.startsWith('**') && part.endsWith('**');
      if (isBold) {
        const innerText = part.slice(2, -2);
        return (
          <strong key={index} className="font-bold text-white">
            {innerText}
          </strong>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Helper to render text with click-to-edit capabilities inside the editor iframe
  const renderEditableText = (
    field: string,
    content: string | undefined,
    fallback: string,
    className = ""
  ) => {
    const text = content || fallback;
    const parsed = parseParagraphMarkdown(text);
    if (!isPreview) return <span className={className}>{parsed}</span>;

    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          window.parent.postMessage({ type: 'EDIT_ELEMENT', field }, '*');
        }}
        className={`${className} hover:outline hover:outline-2 hover:outline-blue-500/80 hover:outline-offset-1 hover:bg-blue-500/5 rounded px-1 transition-all cursor-pointer inline-block relative group`}
        title="Clique para editar este texto no painel"
      >
        {parsed}
        <span className="absolute -top-4 right-0 bg-blue-600 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-md font-sans uppercase tracking-wider">
          Editar
        </span>
      </span>
    );
  };

  // Helper to parse double asterisks (**), asterisks (*), or brackets ([]) and render them in brand primary colors
  const parseHighlightText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\[.*?\])/g);
    return parts.map((part, index) => {
      const isDoubleAsterisk = part.startsWith('**') && part.endsWith('**');
      const isSingleAsterisk = part.startsWith('*') && part.endsWith('*') && !isDoubleAsterisk;
      const isBracket = part.startsWith('[') && part.endsWith(']');
      
      if (isDoubleAsterisk || isSingleAsterisk || isBracket) {
        let innerText = part;
        if (isDoubleAsterisk) innerText = part.slice(2, -2);
        else if (isSingleAsterisk) innerText = part.slice(1, -1);
        else if (isBracket) innerText = part.slice(1, -1);
        
        return (
          <span 
            key={index} 
            className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] bg-clip-text text-transparent font-medium block md:inline"
            style={{ 
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            {innerText}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Helper to render editable title with highlights inside the editor iframe
  const renderEditableTitle = (
    field: string,
    content: string | undefined,
    fallback: string,
    className = ""
  ) => {
    const text = content || fallback;
    const parsed = parseHighlightText(text);
    if (!isPreview) return <span className={className}>{parsed}</span>;

    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          window.parent.postMessage({ type: 'EDIT_ELEMENT', field }, '*');
        }}
        className={`${className} hover:outline hover:outline-2 hover:outline-blue-500/80 hover:outline-offset-1 hover:bg-blue-500/5 rounded px-1 transition-all cursor-pointer inline-block relative group`}
        title="Clique para editar este título no painel"
      >
        {parsed}
        <span className="absolute -top-4 right-0 bg-blue-600 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-md font-sans uppercase tracking-wider">
          Editar Título
        </span>
      </span>
    );
  };

  return (
    <div 
      style={themeStyles} 
      className="min-h-screen text-[var(--brand-text-color)] bg-[var(--brand-bg-color)] font-sans antialiased selection:bg-[var(--brand-gradient-start)]/30 selection:text-white"
    >
      {/* Dynamic Google Fonts loader */}
      {theme?.typography?.headingFont || theme?.typography?.bodyFont ? (
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?family=${(theme?.typography?.headingFont || 'Playfair Display').replace(/\s+/g, '+')}:wght@300;400;500;600;700&family=${(theme?.typography?.bodyFont || 'Inter').replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`}
        />
      ) : (
        // Fallback default google fonts
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..700;1,400..700&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=Inter:wght@300;400;500;600;700&display=swap"
        />
      )}
      {cfg.faviconUrl && (
        <link rel="icon" href={cfg.faviconUrl} />
      )}

      <style>{`
        :root {
          --brand-gradient-start: ${theme?.colors?.primaryStart || tenant.gradientColorStart || '#CC8667'};
          --brand-gradient-end: ${theme?.colors?.primaryEnd || tenant.gradientColorEnd || '#AA5533'};
          --brand-contrast-color: ${theme?.colors?.contrast || defaultContrast};
          --brand-bg-color: ${bgCol};
          --brand-card-bg-color: ${cardCol};
          --brand-text-color: ${textCol};
          --brand-text-muted: color-mix(in srgb, var(--brand-text-color) 65%, transparent);
          --mix-base: ${mixBaseCol};
          --brand-gradient: linear-gradient(135deg, ${theme?.colors?.primaryStart || tenant.gradientColorStart || '#CC8667'}, ${theme?.colors?.primaryEnd || tenant.gradientColorEnd || '#AA5533'});
          --brand-heading-font: ${theme?.typography?.headingFont ? `'${theme.typography.headingFont}', serif` : 'var(--font-serif)'};
          --brand-body-font: ${theme?.typography?.bodyFont ? `'${theme.typography.bodyFont}', sans-serif` : 'var(--font-sans)'};
        }

        * {
          font-family: var(--brand-body-font) !important;
        }
        h1, h2, h3, h4, h5, h6, .font-serif, .font-serif * {
          font-family: var(--brand-heading-font) !important;
          color: var(--brand-text-color);
        }
        .font-mono, .font-mono * {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
        }
        .text-white {
          color: var(--brand-text-color) !important;
        }
        .text-\\[\\#A1A1AA\\], .text-zinc-400, .text-slate-400, .text-zinc-500, p {
          color: var(--brand-text-muted) !important;
        }
        
        .dark-theme-override {
          --brand-text-color: var(--brand-contrast-color) !important;
          --brand-text-muted: color-mix(in srgb, var(--brand-contrast-color) 75%, transparent) !important;
        }
        .dark-theme-override h1, 
        .dark-theme-override h2, 
        .dark-theme-override h3, 
        .dark-theme-override h4, 
        .dark-theme-override h5, 
        .dark-theme-override h6, 
        .dark-theme-override p, 
        .dark-theme-override span, 
        .dark-theme-override strong,
        .dark-theme-override .text-white {
          color: var(--brand-contrast-color) !important;
        }
        .dark-theme-override p, 
        .dark-theme-override .text-\\[\\#A1A1AA\\], 
        .dark-theme-override .text-zinc-400, 
        .dark-theme-override .text-slate-400, 
        .dark-theme-override .text-zinc-500 {
          color: color-mix(in srgb, var(--brand-contrast-color) 75%, transparent) !important;
        }
      `}</style>

      {/* Two-stage premium page loader */}
      {loaderState !== 'done' && (
        <div 
          className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center select-none transition-opacity duration-500 ease-in-out ${
            loaderState === 'fadeout' ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{ backgroundColor: 'var(--brand-bg-color)' }}
        >
          {/* Background decoration inside loader to match the site/hero background */}
          <div 
            className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40"
            style={{
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)'
            }}
          >
            <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-gradient-to-br from-[var(--brand-gradient-start)] to-transparent blur-[150px]" />
            <div className="absolute top-[-10%] right-[-10%] w-[45%] aspect-square rounded-full bg-gradient-to-bl from-[var(--brand-gradient-end)] to-transparent blur-[150px]" />
          </div>

          {loaderState !== 'black' && (
            <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-500 ease-out">
              {/* Logo/Icon */}
              {(cfg.logoUrl || tenant.logoDarkUrl || tenant.logoLightUrl) ? (
                <img 
                  src={cfg.logoUrl || tenant.logoDarkUrl || tenant.logoLightUrl || ''} 
                  alt={tenant.name} 
                  className="max-h-16 max-w-[200px] object-contain"
                  style={{ 
                    animation: 'fadeIn 0.6s ease-out forwards',
                  }}
                />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <span className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] flex items-center justify-center font-bold text-white text-2xl shadow-xl shadow-[var(--brand-gradient-start)]/20">
                    Ψ
                  </span>
                  <span className="font-serif text-lg tracking-wider text-[#F4F4F5]">{tenant.name}</span>
                </div>
              )}

              {/* Spinner */}
              <div className="relative h-10 w-10">
                <div 
                  className="absolute inset-0 rounded-full border-2 border-t-[var(--brand-gradient-start)] border-r-[var(--brand-gradient-end)] border-b-transparent border-l-transparent animate-spin"
                  style={{
                    borderColor: 'var(--brand-gradient-start) var(--brand-gradient-end) transparent transparent',
                  }}
                />
                <div className="absolute inset-2 rounded-full border border-white/5 bg-white/5 animate-pulse" />
              </div>
            </div>
          )}
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
      {/* Background decoration */}
      <div 
        className="absolute top-0 left-0 w-full h-[600px] overflow-hidden pointer-events-none z-0 opacity-40"
        style={{
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)'
        }}
      >
        <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-gradient-to-br from-[var(--brand-gradient-start)] to-transparent blur-[150px]" />
        <div className="absolute top-[-10%] right-[-10%] w-[45%] aspect-square rounded-full bg-gradient-to-bl from-[var(--brand-gradient-end)] to-transparent blur-[150px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 w-full glass-md border-b border-white/5 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div 
            onClick={() => {
              if (isPreview) {
                window.parent.postMessage({ type: 'EDIT_ELEMENT', field: 'siteConfig.logoUrl' }, '*');
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className={`flex items-center gap-2.5 cursor-pointer transition-all ${
              isPreview ? 'hover:outline hover:outline-2 hover:outline-blue-500 hover:outline-offset-2 rounded-lg p-1' : ''
            }`}
          >
            {(cfg.logoUrl || tenant.logoLightUrl || tenant.logoDarkUrl) ? (
              <img 
                src={cfg.logoUrl || tenant.logoLightUrl || tenant.logoDarkUrl || ''} 
                alt={tenant.name} 
                className="max-h-11 max-w-[220px] object-contain"
              />
            ) : (
              <>
                <span className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] flex items-center justify-center font-bold text-white shadow-md">
                  Ψ
                </span>
                <span className="font-serif text-lg tracking-wide text-[var(--brand-text-color)] font-normal">{tenant.name}</span>
              </>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {activeSections.filter((s: any) => s.showInNavbar ?? true).map((s: any) => {
              const navInfo = getSectionNavInfo(s);
              if (!navInfo) return null;
              
              const navText = s.name || (navInfo.isCustom ? s.badge : dict.nav?.[navInfo.labelKey.split('.')[1]]) || navInfo.defaultLabel;
              
              return (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(navInfo.id)}
                  className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-text-muted)] hover:text-[var(--brand-text-color)] cursor-pointer transition-colors bg-transparent border-none p-0"
                >
                  {renderEditableText(s.name ? `${s.id}.name` : navInfo.labelKey, navText, navInfo.defaultLabel)}
                </button>
              );
            })}
          </nav>

          <div className="hidden md:flex">
            <button
              onClick={() => setModalOpen(true)}
              className="h-10 px-5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-[var(--brand-contrast-color)] shadow-lg shadow-[var(--brand-gradient-start)]/20 hover:opacity-90 transform hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              {renderEditableText('hero.ctaPrimary', dict.hero?.ctaPrimary, 'Iniciar Triagem')}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-[var(--brand-text-muted)] hover:text-[var(--brand-text-color)] hover:bg-white/5 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-30 bg-[var(--brand-bg-color)] flex flex-col justify-between py-8 px-6 animate-in slide-in-from-right duration-250 border-t border-white/5">
          <nav className="flex flex-col gap-6 text-center">
            {activeSections.filter((s: any) => s.showInNavbar ?? true).map((s: any) => {
              const navInfo = getSectionNavInfo(s);
              if (!navInfo) return null;
              
              const navText = s.name || (navInfo.isCustom ? s.badge : dict.nav?.[navInfo.labelKey.split('.')[1]]) || navInfo.defaultLabel;
              
              return (
                <button
                  key={s.id}
                  onClick={() => { setMobileMenuOpen(false); scrollToSection(navInfo.id); }}
                  className="text-sm font-semibold uppercase tracking-wider text-[#A1A1AA] py-2 cursor-pointer block w-full text-center bg-transparent border-none"
                >
                  {renderEditableText(s.name ? `${s.id}.name` : navInfo.labelKey, navText, navInfo.defaultLabel)}
                </button>
              );
            })}
          </nav>
          <div>
            <button
              onClick={() => { setMobileMenuOpen(false); setModalOpen(true); }}
              className="w-full h-12 rounded-xl text-sm font-semibold bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-[var(--brand-contrast-color)] shadow-lg cursor-pointer"
            >
              {renderEditableText('hero.ctaPrimary', dict.hero?.ctaPrimary, 'Iniciar Triagem')}
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-12 md:pt-24 pb-16 text-center md:text-left flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider text-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/10 border border-[var(--brand-gradient-start)]/20 uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{renderEditableText('hero.badge', dict.hero?.badge, 'Atendimento Online & Presencial')}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-white font-normal leading-tight">
            {renderEditableTitle(
              'hero.title',
              dict.hero?.title || (dict.hero?.titlePart1 && dict.hero?.titlePart2 ? `${dict.hero.titlePart1} *${dict.hero.titlePart2}*` : undefined),
              'Terapia para recuperar o seu *equilíbrio interior*'
            )}
          </h1>

          <p className="text-[#A1A1AA] text-base sm:text-lg max-w-xl leading-relaxed font-light">
            {renderEditableText('hero.description', dict.hero?.description, 'Cuidado clínico ético e acolhedor para ajudar você a superar desafios emocionais, desenvolver o autoconhecimento e viver com mais leveza.')}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-4 justify-center md:justify-start items-center">
            <button
              onClick={() => setModalOpen(true)}
              className="w-full sm:w-auto px-8 h-12 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-[var(--brand-contrast-color)] font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[var(--brand-gradient-start)]/20 hover:opacity-90 transform hover:-translate-y-0.5 transition-all cursor-pointer text-sm"
            >
              {renderEditableText('hero.ctaPrimary', dict.hero?.ctaPrimary, 'Agendar Consulta')}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="w-full sm:w-auto px-8 h-12 bg-white/5 hover:bg-white/10 text-[var(--brand-text-color)] font-semibold rounded-xl border border-white/10 flex items-center justify-center transition-all cursor-pointer text-sm"
            >
              {renderEditableText('hero.ctaSecondary', dict.hero?.ctaSecondary, 'Saiba Mais')}
            </button>
          </div>

          {/* Feature Badges */}
          <div className="pt-6 flex flex-wrap gap-3 justify-center md:justify-start">
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-xs text-[#A1A1AA] font-medium">
              ✓ {renderEditableText('hero.badgeCrp', dict.hero?.badgeCrp, 'CRP Ativo')}
            </span>
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-xs text-[#A1A1AA] font-medium">
              ✓ {renderEditableText('hero.badgeApproach', dict.hero?.badgeApproach, 'Abordagem TCC')}
            </span>
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-xs text-[#A1A1AA] font-medium">
              ✓ {renderEditableText('hero.badgeEthic', dict.hero?.badgeEthic, 'Sigilo Ético')}
            </span>
          </div>
        </div>

        {/* Hero image frame matching Geovanna's layout */}
        <div className="flex-1 max-w-sm md:max-w-md w-full relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] rounded-2xl blur-xl opacity-25 z-0" />
          <div
            onClick={() => isPreview && window.parent.postMessage({ type: 'EDIT_ELEMENT', field: 'siteConfig.images.hero' }, '*')}
            className={`relative z-10 aspect-[3/4] rounded-2xl border border-white/10 overflow-hidden bg-zinc-900 shadow-2xl ${isPreview ? 'cursor-pointer hover:outline hover:outline-2 hover:outline-blue-500 hover:outline-offset-2' : ''}`}
          >
            {cfg.images?.hero || cfg.images?.portrait ? (
              <img 
                src={cfg.images.hero || cfg.images.portrait} 
                alt="Portrait" 
                className="w-full h-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-700" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-4xl text-zinc-700 font-serif">
                Ψ
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Dynamic Sections */}
      {sections.map((section: any) => {
        if (!section.isActive) return null;

        switch (section.type) {
          case 'diagnostic':
            return (
              <section key={section.id} id={section.slug || 'services'} className="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-white/5">
                <div className="text-center space-y-4 max-w-xl mx-auto mb-16">
                  <span className="text-xs font-bold tracking-wider text-[var(--brand-gradient-start)] uppercase">
                    {renderEditableText('diagnostic.badge', dict.diagnostic?.badge, 'Especialidades')}
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-serif text-white font-normal">
                    {renderEditableTitle('diagnostic.title', dict.diagnostic?.title, 'Como a terapia pode ajudar você')}
                  </h2>
                  <p className="text-[#A1A1AA] text-sm leading-relaxed font-light">
                    {renderEditableText('diagnostic.description', dict.diagnostic?.description, 'Encontre um espaço clínico especializado para trabalhar as demandas que impedem o seu bem-estar diário.')}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1 */}
                  <div className="p-6 rounded-2xl glass-sm hover:border-[var(--brand-gradient-start)]/20 transition-all duration-300 space-y-4">
                    <div className="h-10 w-10 rounded-xl bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] flex items-center justify-center text-lg font-bold">
                      01
                    </div>
                    <h3 className="text-lg font-serif text-white font-medium">
                      {renderEditableTitle('diagnostic.card1Title', dict.diagnostic?.card1Title, 'Ansiedade e Estresse')}
                    </h3>
                    <p className="text-[#A1A1AA] text-sm leading-relaxed font-light">
                      {renderEditableText('diagnostic.card1Desc', dict.diagnostic?.card1Desc, 'Identificação de gatilhos corporais e emocionais, construindo ferramentas práticas para a regulação do estresse diário.')}
                    </p>
                  </div>

                  {/* Card 2 */}
                  <div className="p-6 rounded-2xl glass-sm hover:border-[var(--brand-gradient-start)]/20 transition-all duration-300 space-y-4">
                    <div className="h-10 w-10 rounded-xl bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] flex items-center justify-center text-lg font-bold">
                      02
                    </div>
                    <h3 className="text-lg font-serif text-white font-medium">
                      {renderEditableTitle('diagnostic.card2Title', dict.diagnostic?.card2Title, 'Relações Saudáveis')}
                    </h3>
                    <p className="text-[#A1A1AA] text-sm leading-relaxed font-light">
                      {renderEditableText('diagnostic.card2Desc', dict.diagnostic?.card2Desc, 'Compreensão de padrões relacionais no trabalho e na vida a dois, facilitando a comunicação e a resolução de conflitos.')}
                    </p>
                  </div>

                  {/* Card 3 */}
                  <div className="p-6 rounded-2xl glass-sm hover:border-[var(--brand-gradient-start)]/20 transition-all duration-300 space-y-4">
                    <div className="h-10 w-10 rounded-xl bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] flex items-center justify-center text-lg font-bold">
                      03
                    </div>
                    <h3 className="text-lg font-serif text-white font-medium">
                      {renderEditableTitle('diagnostic.card3Title', dict.diagnostic?.card3Title, 'Desenvolvimento Pessoal')}
                    </h3>
                    <p className="text-[#A1A1AA] text-sm leading-relaxed font-light">
                      {renderEditableText('diagnostic.card3Desc', dict.diagnostic?.card3Desc, 'Fortalecimento da autoestima e inteligência emocional em momentos de transição de vida, luto ou novos caminhos profissionais.')}
                    </p>
                  </div>
                </div>
              </section>
            );
          case 'about':
            return (
              <section key={section.id} id={section.slug || 'about'} className="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-white/5 flex flex-col md:flex-row items-center gap-16">
                <div className="flex-1 max-w-sm w-full relative">
                  <div
                    onClick={() => isPreview && window.parent.postMessage({ type: 'EDIT_ELEMENT', field: 'siteConfig.images.portrait' }, '*')}
                    className={`aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 shadow-xl relative ${isPreview ? 'cursor-pointer hover:outline hover:outline-2 hover:outline-blue-500 hover:outline-offset-2' : ''}`}
                  >
                    {cfg.images?.portrait ? (
                      <img 
                        src={cfg.images.portrait} 
                        alt="Portrait detail" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-800" />
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-6">
                  <span className="text-xs font-bold tracking-wider text-[var(--brand-gradient-start)] uppercase">
                    {renderEditableText('about.badge', dict.about?.badge, 'Sua Psicóloga')}
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-serif text-white font-normal leading-tight">
                    {renderEditableTitle('about.title', dict.about?.title, 'Conheça mais sobre a sua terapeuta')}
                  </h2>
                  <p className="text-[#A1A1AA] text-sm leading-relaxed font-light">
                    {renderEditableText('about.description1', dict.about?.description1, 'Sou psicóloga clínica dedicada a apoiar pessoas no desenvolvimento de inteligência emocional e resolução de conflitos clínicos.')}
                  </p>
                  <p className="text-[#A1A1AA] text-sm leading-relaxed font-light">
                    {renderEditableText('about.description2', dict.about?.description2, 'Ofereço um espaço terapêutico sem julgamentos baseado no sigilo ético absoluto.')}
                  </p>

                  <div className="space-y-3 pt-2">
                    {(dict.about?.points || []).map((point: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 text-sm text-[#A1A1AA] font-light">
                        <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3" />
                        </div>
                        <span>{renderEditableText(`about.points.${idx}`, point, 'Ponto de destaque')}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => setModalOpen(true)}
                      className="px-8 h-12 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-[var(--brand-contrast-color)] font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[var(--brand-gradient-start)]/20 hover:opacity-90 transform hover:-translate-y-0.5 transition-all cursor-pointer text-sm"
                    >
                      {renderEditableText('about.cta', dict.about?.cta, 'Fazer Triagem')}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </section>
            );
          case 'process':
            return (
              <section key={section.id} id={section.slug || 'process'} className="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-white/5">
                <div className="text-center space-y-4 max-w-xl mx-auto mb-16">
                  <span className="text-xs font-bold tracking-wider text-[var(--brand-gradient-start)] uppercase">
                    {renderEditableText('process.badge', dict.process?.badge, 'O Processo')}
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-serif text-white font-normal">
                    {renderEditableTitle('process.title', dict.process?.title, 'Como funciona a jornada de terapia')}
                  </h2>
                  <p className="text-[#A1A1AA] text-sm leading-relaxed font-light">
                    {renderEditableText('process.description', dict.process?.description, 'Um processo transparente focado no seu acolhimento.')}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                  {/* Connector lines (Desktop) */}
                  <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] opacity-20 z-0" />

                  {/* Step 1 */}
                  <div className="space-y-4 text-center relative z-10">
                    <div className="h-14 w-14 rounded-full bg-[var(--brand-card-bg-color)] border border-white/10 flex items-center justify-center text-lg font-bold text-white mx-auto shadow-md">
                      1
                    </div>
                    <h3 className="text-lg font-serif text-white font-medium">
                      {renderEditableTitle('process.step1.title', dict.process?.step1?.title, 'Triagem Online')}
                    </h3>
                    <p className="text-[#A1A1AA] text-xs leading-relaxed max-w-xs mx-auto font-light">
                      {renderEditableText('process.step1.description', dict.process?.step1?.description, 'Preencha o formulário online rápido para que eu possa avaliar suas demandas e agilizar o primeiro contato.')}
                    </p>
                    <button
                      onClick={() => setModalOpen(true)}
                      className="text-xs font-bold text-[var(--brand-gradient-start)] hover:text-white transition-colors uppercase tracking-wider cursor-pointer bg-transparent border-none p-0"
                    >
                      {renderEditableText('process.step1.cta', dict.process?.step1?.cta, 'Iniciar Triagem')} ➔
                    </button>
                  </div>

                  {/* Step 2 */}
                  <div className="space-y-4 text-center relative z-10">
                    <div className="h-14 w-14 rounded-full bg-[var(--brand-card-bg-color)] border border-white/10 flex items-center justify-center text-lg font-bold text-white mx-auto shadow-md">
                      2
                    </div>
                    <h3 className="text-lg font-serif text-white font-medium">
                      {renderEditableTitle('process.step2.title', dict.process?.step2?.title, 'Agendamento')}
                    </h3>
                    <p className="text-[#A1A1AA] text-xs leading-relaxed max-w-xs mx-auto font-light">
                      {renderEditableText('process.step2.description', dict.process?.step2?.description, 'Entro em contato com você via WhatsApp para alinharmos valores, horários e marcar a primeira consulta.')}
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="space-y-4 text-center relative z-10">
                    <div className="h-14 w-14 rounded-full bg-[var(--brand-card-bg-color)] border border-white/10 flex items-center justify-center text-lg font-bold text-white mx-auto shadow-md">
                      3
                    </div>
                    <h3 className="text-lg font-serif text-white font-medium">
                      {renderEditableTitle('process.step3.title', dict.process?.step3?.title, 'Primeira Sessão')}
                    </h3>
                    <p className="text-[#A1A1AA] text-xs leading-relaxed max-w-xs mx-auto font-light">
                      {renderEditableText('process.step3.description', dict.process?.step3?.description, 'Damos início às sessões clínicas, focando no seu desenvolvimento pessoal e no seu autoconhecimento.')}
                    </p>
                  </div>
                </div>
              </section>
            );
          case 'faq':
            const isFaqGridMode = section.settings?.displayMode === 'grid';
            const faqItemsList = dict.faq?.items || dict.faq?.faq || [];
            return (
              <section key={section.id} id={section.slug || 'faq'} className={`relative z-10 mx-auto px-6 py-20 border-t border-white/5 animate-in fade-in duration-500 ${isFaqGridMode ? 'max-w-6xl' : 'max-w-3xl'}`}>
                <div className="text-center space-y-4 mb-12">
                  <span className="text-xs font-bold tracking-wider text-[var(--brand-gradient-start)] uppercase">
                    {renderEditableText('faq.badge', dict.faq?.badge, 'Dúvidas')}
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-serif text-white font-normal">
                    {renderEditableTitle('faq.title', dict.faq?.title, 'Perguntas Frequentes')}
                  </h2>
                  {(dict.faq?.description !== undefined || isPreview) && (
                    <p className="text-[#A1A1AA] text-sm leading-relaxed font-light max-w-xl mx-auto">
                      {renderEditableText('faq.description', dict.faq?.description, 'Esclareça suas principais dúvidas sobre o processo terapêutico.')}
                    </p>
                  )}
                </div>

                <div className={isFaqGridMode ? "grid grid-cols-1 md:grid-cols-2 gap-6 text-left" : "space-y-4"}>
                  {faqItemsList.map((faq: { question: string; answer: string }, idx: number) => {
                    const shouldOpenDefault = faqOpenIndex === null && (section.settings?.defaultOpenFirst ?? true) ? idx === 0 : false;
                    const isOpen = isFaqGridMode || faqOpenIndex === idx || shouldOpenDefault;
                    return (
                      <div 
                        key={idx} 
                        className={`border border-white/5 bg-[var(--brand-card-bg-color)] overflow-hidden transition-all duration-200 ${isFaqGridMode ? 'p-6 rounded-2xl space-y-3' : 'rounded-xl'}`}
                      >
                        {isFaqGridMode ? (
                          <>
                            <h3 className="text-white font-medium text-sm sm:text-base">
                              {renderEditableText(`faq.items.${idx}.question`, faq.question, 'Pergunta')}
                            </h3>
                            <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed font-light">
                              {renderEditableText(`faq.items.${idx}.answer`, faq.answer, 'Resposta')}
                            </p>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                const currentOpenIndex = faqOpenIndex === null && (section.settings?.defaultOpenFirst ?? true) ? 0 : faqOpenIndex;
                                setFaqOpenIndex(currentOpenIndex === idx ? -1 : idx);
                              }}
                              className="w-full px-6 py-4 flex items-center justify-between text-left text-white font-medium text-sm sm:text-base cursor-pointer hover:bg-white/5 transition-colors bg-transparent border-none"
                            >
                              <span>{renderEditableText(`faq.items.${idx}.question`, faq.question, 'Pergunta')}</span>
                              <ChevronDown className={`h-4 w-4 text-[#A1A1AA] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isOpen && (
                              <div className="px-6 pb-4 pt-1 text-xs sm:text-sm text-[#A1A1AA] leading-relaxed font-light border-t border-white/5 animate-in slide-in-from-top-1.5 duration-200">
                                {renderEditableText(`faq.items.${idx}.answer`, faq.answer, 'Resposta')}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            );
          case 'space':
            return (
              <section key={section.id} id={section.slug || 'space'} className="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-white/5 flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1 space-y-6">
                  <span className="text-xs font-bold tracking-wider text-[var(--brand-gradient-start)] uppercase">
                    {renderEditableText('space.badge', dict.space?.badge, 'O Consultório')}
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-serif text-white font-normal">
                    {renderEditableTitle('space.title', dict.space?.title, 'Ambiente Acolhedor')}
                  </h2>
                  <p className="text-[#A1A1AA] text-sm leading-relaxed font-light">
                    {renderEditableText('space.description', dict.space?.description, 'Nosso espaço físico é projetado com todo o conforto e privacidade para os seus atendimentos presenciais.')}
                  </p>

                  <div className="flex items-start gap-3 text-sm text-[#E4E4E7]">
                    <MapPin className="h-5 w-5 text-[var(--brand-gradient-start)] shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-bold text-xs uppercase text-[#A1A1AA] tracking-wider mb-0.5">
                        {renderEditableText('space.addressLabel', dict.space?.addressLabel, 'Endereço Clínico')}
                      </span>
                      <p className="font-light">
                        {renderEditableText('professional.address', cfg.professional?.address, 'Atendimento Online e Presencial')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 w-full space-y-4">
                  <div
                    onClick={() => isPreview && window.parent.postMessage({ type: 'EDIT_ELEMENT', field: 'siteConfig.images.officeSpace' }, '*')}
                    className={`aspect-video w-full rounded-2xl border border-white/5 overflow-hidden bg-zinc-900 shadow-xl relative ${isPreview ? 'cursor-pointer hover:outline hover:outline-2 hover:outline-blue-500 hover:outline-offset-2' : ''}`}
                  >
                    {cfg.professional?.mapsIframeUrl ? (
                      <iframe 
                        src={cfg.professional.mapsIframeUrl} 
                        className="w-full h-full border-0" 
                        allowFullScreen={false} 
                        loading="lazy" 
                      />
                    ) : cfg.images?.officeSpace ? (
                      <img 
                        src={cfg.images.officeSpace} 
                        alt="Consultório" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-850 flex items-center justify-center text-zinc-600 text-sm">
                        Nenhum mapa ou foto do espaço disponível
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          case 'grid':
            const gridColsCount = Number(section.settings?.columns || 3);
            const gridColsClass = 
              gridColsCount === 2 ? 'md:grid-cols-2' :
              gridColsCount === 4 ? 'md:grid-cols-4' :
              'md:grid-cols-3';
            
            const cardStyleClass = 
              section.settings?.cardStyle === 'bordered' ? 'border border-white/5 p-6 rounded-2xl bg-[var(--brand-card-bg-color)]/20' :
              section.settings?.cardStyle === 'flat' ? 'py-4' :
              'p-6 rounded-2xl glass-sm hover:border-[var(--brand-gradient-start)]/20 transition-all duration-300 bg-[var(--brand-card-bg-color)]/30';

            const alignmentClass = section.settings?.itemAlignment === 'center' ? 'text-center flex flex-col items-center' : 'text-left';
            const gridWidthClass = gridColsCount === 4 ? 'max-w-7xl' : 'max-w-6xl';

            return (
              <section key={section.id} id={section.slug || section.id} className={`relative z-10 mx-auto px-6 py-20 border-t border-white/5 animate-in fade-in duration-500 ${gridWidthClass}`}>
                <div className="text-center space-y-4 max-w-xl mx-auto mb-16">
                  {section.badge && (
                    <span className="text-xs font-bold tracking-wider text-[var(--brand-gradient-start)] uppercase block">
                      {renderEditableText(`${section.id}.badge`, section.badge, 'Destaques')}
                    </span>
                  )}
                  {section.title && (
                    <h2 className="text-3xl sm:text-4xl font-serif text-white font-normal">
                      {renderEditableTitle(`${section.id}.title`, section.title, 'Nossos Diferenciais')}
                    </h2>
                  )}
                  {section.description && (
                    <p className="text-[#A1A1AA] text-sm leading-relaxed font-light">
                      {renderEditableText(`${section.id}.description`, section.description, '')}
                    </p>
                  )}
                </div>

                <div className={`grid grid-cols-1 gap-6 ${gridColsClass}`}>
                  {(section.items || []).map((item: any, idx: number) => (
                    <div key={idx} className={`${cardStyleClass} ${alignmentClass} space-y-4`}>
                      {section.settings?.markerType !== 'none' && item.number && (
                        <div className="h-10 w-10 rounded-xl bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] flex items-center justify-center text-lg font-bold">
                          {section.settings?.markerType === 'icon' ? (
                            <Sparkles className="h-4 w-4" />
                          ) : (
                            renderEditableText(`${section.id}.items.${idx}.number`, item.number, `0${idx + 1}`)
                          )}
                        </div>
                      )}
                      {item.title && (
                        <h3 className="text-lg font-serif text-white font-medium">
                          {renderEditableTitle(`${section.id}.items.${idx}.title`, item.title, 'Título do Card')}
                        </h3>
                      )}
                      {item.description && (
                        <p className="text-[#A1A1AA] text-sm leading-relaxed font-light">
                          {renderEditableText(`${section.id}.items.${idx}.description`, item.description, 'Descrição do Card')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          case 'two-columns':
            const colStyleClass = 
              section.settings?.cardStyle === 'bordered' ? 'border border-white/5 p-8 rounded-2xl bg-[var(--brand-card-bg-color)]/20' :
              section.settings?.cardStyle === 'flat' ? 'py-4' :
              'p-8 rounded-2xl glass-sm hover:border-[var(--brand-gradient-start)]/20 transition-all duration-300 bg-[var(--brand-card-bg-color)]/30';
            
            const colAlignmentClass = section.settings?.itemAlignment === 'center' ? 'text-center flex flex-col items-center' : 'text-left';

            return (
              <section key={section.id} id={section.slug || section.id} className="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-white/5 animate-in fade-in duration-500">
                <div className="text-center space-y-4 max-w-xl mx-auto mb-16">
                  {section.badge && (
                    <span className="text-xs font-bold tracking-wider text-[var(--brand-gradient-start)] uppercase block">
                      {renderEditableText(`${section.id}.badge`, section.badge, 'Abordagem')}
                    </span>
                  )}
                  {section.title && (
                    <h2 className="text-3xl sm:text-4xl font-serif text-white font-normal">
                      {renderEditableTitle(`${section.id}.title`, section.title, 'Metodologia')}
                    </h2>
                  )}
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-stretch">
                  <div className={`flex-1 ${colStyleClass} ${colAlignmentClass} space-y-4`}>
                    <h3 className="text-xl font-serif text-white font-medium">
                      {renderEditableTitle(`${section.id}.leftTitle`, section.leftTitle, 'Coluna Esquerda')}
                    </h3>
                    <p className="text-[#A1A1AA] text-sm leading-relaxed font-light">
                      {renderEditableText(`${section.id}.leftText`, section.leftText, 'Texto explicativo da coluna esquerda.')}
                    </p>
                  </div>
                  <div className={`flex-1 ${colStyleClass} ${colAlignmentClass} space-y-4`}>
                    <h3 className="text-xl font-serif text-white font-medium">
                      {renderEditableTitle(`${section.id}.rightTitle`, section.rightTitle, 'Coluna Direita')}
                    </h3>
                    <p className="text-[#A1A1AA] text-sm leading-relaxed font-light">
                      {renderEditableText(`${section.id}.rightText`, section.rightText, 'Texto explicativo da coluna direita.')}
                    </p>
                  </div>
                </div>
              </section>
            );
          case 'text-image':
            const isImgMediaFirst = section.settings?.columnOrder ? (section.settings.columnOrder === 'media-first') : (section.imagePosition === 'left');
            return (
              <section key={section.id} id={section.slug || section.id} className="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-white/5 animate-in fade-in duration-500">
                <div className={`flex flex-col ${isImgMediaFirst ? 'md:flex-row-reverse' : 'md:flex-row'} gap-12 items-center`}>
                  <div className="flex-1 space-y-6 text-left">
                    {section.badge && (
                      <span className="text-xs font-bold tracking-wider text-[var(--brand-gradient-start)] uppercase block">
                        {renderEditableText(`${section.id}.badge`, section.badge, 'Espaço')}
                      </span>
                    )}
                    {section.title && (
                      <h2 className="text-3xl sm:text-4xl font-serif text-white font-normal">
                        {renderEditableTitle(`${section.id}.title`, section.title, 'Conheça mais')}
                      </h2>
                    )}
                    {section.description && (
                      <p className="text-[#A1A1AA] text-sm leading-relaxed font-light">
                        {renderEditableText(`${section.id}.description`, section.description, 'Descrição com texto corrido.')}
                      </p>
                    )}
                    {section.ctaText && (
                      <div className="pt-2">
                        <button
                          onClick={() => setModalOpen(true)}
                          className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] hover:from-[var(--brand-gradient-start)]/90 hover:to-[var(--brand-gradient-end)]/90 text-[var(--brand-contrast-color)] font-semibold text-xs uppercase tracking-wider py-4 px-8 rounded-full shadow-lg shadow-[var(--brand-gradient-start)]/10 hover:shadow-[var(--brand-gradient-start)]/20 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer border-none"
                        >
                          {renderEditableText(`${section.id}.ctaText`, section.ctaText, 'Fazer Agendamento')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Image Container with Dynamic Aspect Ratio */}
                  {(() => {
                    const ratioStyleClass = 
                      section.settings?.imageAspectRatio === 'portrait' ? 'aspect-[3/4] rounded-2xl' :
                      section.settings?.imageAspectRatio === 'rounded' ? 'aspect-square rounded-full border-2 border-[var(--brand-gradient-start)]/30' :
                      'aspect-square rounded-2xl';
                    
                    return (
                      <div className={`flex-1 w-full max-w-lg overflow-hidden border border-white/5 shadow-2xl relative ${ratioStyleClass}`}>
                        {section.image ? (
                          <img 
                            src={section.image} 
                            alt="Visual" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div 
                            onClick={() => {
                              if (isPreview) {
                                window.parent.postMessage({ type: 'EDIT_ELEMENT', field: `${section.id}.image` }, '*');
                              }
                            }}
                            className="w-full h-full bg-gradient-to-br from-zinc-850 to-zinc-900 flex flex-col items-center justify-center gap-2 cursor-pointer group text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            <ImageIcon className="h-8 w-8" />
                            <span className="text-[10px] uppercase font-bold tracking-wider">Adicionar Imagem</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </section>
            );
          case 'text-block':
          case 'cta-banner': {
            const bgStyle = section.settings?.bgStyle || (section.type === 'text-block' ? 'minimal' : 'gradient');
            const alignment = section.settings?.alignment || 'center';
            const alignmentClass = alignment === 'left' ? 'text-left items-start' : 'text-center items-center flex flex-col';
            
            let bgClass = '';
            let borderClass = 'border-t border-white/5';
            let containerClass = 'max-w-4xl mx-auto px-6 py-16';

            if (bgStyle === 'gradient') {
              bgClass = 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] rounded-3xl shadow-2xl';
              borderClass = 'border border-white/10';
              containerClass = 'max-w-5xl mx-auto px-8 py-12 md:py-16 my-8';
            } else if (bgStyle === 'card') {
              bgClass = 'glass-md rounded-3xl shadow-xl';
              borderClass = 'border border-white/5';
              containerClass = 'max-w-5xl mx-auto px-8 py-12 md:py-16 my-8';
            }

            return (
              <section key={section.id} id={section.slug || section.id} className="relative z-10 px-6 animate-in fade-in duration-500">
                <div className={`${bgClass} ${borderClass} ${containerClass} ${alignmentClass} ${bgStyle === 'gradient' ? 'dark-theme-override' : ''} space-y-6`}>
                  {section.badge && (
                    <span className={`text-xs font-bold tracking-wider uppercase block ${
                      bgStyle === 'gradient' ? 'text-white/80' : 'text-[var(--brand-gradient-start)]'
                    }`}>
                      {renderEditableText(`${section.id}.badge`, section.badge, 'Ação')}
                    </span>
                  )}
                  {section.title && (
                    <h2 className={`text-3xl sm:text-4xl font-serif font-normal leading-tight ${
                      bgStyle === 'gradient' ? 'text-white' : 'text-[var(--brand-text-color)]'
                    }`}>
                      {renderEditableTitle(`${section.id}.title`, section.title, 'Título')}
                    </h2>
                  )}
                  {section.description && (
                    <p className={`text-sm sm:text-base leading-relaxed font-light ${
                      bgStyle === 'gradient' ? 'text-white/80' : 'text-[#A1A1AA]'
                    }`}>
                      {renderEditableText(`${section.id}.description`, section.description, '')}
                    </p>
                  )}
                  {(section.ctaText || section.settings?.showSecondaryCta) && (
                    <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center w-full">
                      {section.ctaText && (
                        <button
                          onClick={() => setModalOpen(true)}
                          className={`font-semibold text-xs uppercase tracking-wider py-4 px-8 rounded-full shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer border-none ${
                            bgStyle === 'gradient'
                              ? 'bg-white text-zinc-900 hover:bg-white/90 shadow-xl'
                              : 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-[var(--brand-contrast-color)] hover:opacity-90'
                          }`}
                        >
                          {renderEditableText(`${section.id}.ctaText`, section.ctaText, 'Agendar Consulta')}
                        </button>
                      )}
                      {section.settings?.showSecondaryCta && tenant.phone && (
                        <button
                          onClick={() => {
                            window.open(`https://wa.me/55${tenant.phone?.replace(/\D/g, '')}`, '_blank');
                          }}
                          className={`font-semibold text-xs uppercase tracking-wider py-4 px-8 rounded-full shadow-md transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer border ${
                            bgStyle === 'gradient'
                              ? 'bg-transparent border-[var(--brand-contrast-color)]/20 text-[var(--brand-contrast-color)] hover:bg-[var(--brand-contrast-color)]/10'
                              : 'bg-white/5 border-white/10 text-[var(--brand-text-color)] hover:bg-white/10'
                          }`}
                        >
                          Tirar Dúvidas
                        </button>
                      )}
                    </div>
                  )}
                  {section.ctaSubtext && (
                    <p className={`text-[10px] tracking-wider uppercase font-medium ${
                      bgStyle === 'gradient' ? 'text-[var(--brand-contrast-color)]/60' : 'text-slate-500'
                    }`}>
                      {renderEditableText(`${section.id}.ctaSubtext`, section.ctaSubtext, '')}
                    </p>
                  )}
                </div>
              </section>
            );
          }

          case 'cta-split': {
            const isImgLeft = section.settings?.imagePosition === 'left';
            const cardStyle = section.settings?.cardStyle || 'glass';
            
            let cardClass = '';
            let borderClass = 'border-t border-white/5';
            let containerClass = 'max-w-6xl mx-auto px-6 py-20';

            if (cardStyle === 'glass') {
              cardClass = 'glass-md rounded-3xl shadow-xl';
              borderClass = 'border border-white/5';
              containerClass = 'max-w-6xl mx-auto px-8 py-12 md:py-16 my-8';
            } else if (cardStyle === 'bordered') {
              cardClass = 'border border-white/5 bg-[var(--brand-card-bg-color)]/20 rounded-3xl';
              borderClass = 'border border-white/5';
              containerClass = 'max-w-6xl mx-auto px-8 py-12 md:py-16 my-8';
            }

            const ratioClass = 
              section.settings?.imageAspectRatio === 'portrait' ? 'aspect-[3/4] rounded-2xl' :
              section.settings?.imageAspectRatio === 'rounded' ? 'aspect-square rounded-full border-2 border-[var(--brand-gradient-start)]/30' :
              'aspect-square rounded-2xl';

            return (
              <section key={section.id} id={section.slug || section.id} className="relative z-10 px-6 animate-in fade-in duration-500">
                <div className={`${cardClass} ${borderClass} ${containerClass}`}>
                  <div className={`flex flex-col ${isImgLeft ? 'md:flex-row' : 'md:flex-row-reverse'} gap-12 items-center`}>
                    
                    {/* Content column */}
                    <div className="flex-1 space-y-6 text-left">
                      {section.badge && (
                        <span className="text-xs font-bold tracking-wider text-[var(--brand-gradient-start)] uppercase block">
                          {renderEditableText(`${section.id}.badge`, section.badge, 'Agendamento')}
                        </span>
                      )}
                      {section.title && (
                        <h2 className="text-3xl sm:text-4xl font-serif text-[var(--brand-text-color)] font-normal leading-tight">
                          {renderEditableTitle(`${section.id}.title`, section.title, 'Agende agora')}
                        </h2>
                      )}
                      {section.description && (
                        <p className="text-sm leading-relaxed font-light">
                          {renderEditableText(`${section.id}.description`, section.description, '')}
                        </p>
                      )}
                      
                      <div className="pt-4 flex flex-col sm:flex-row gap-4 items-start">
                        {section.ctaText && (
                          <button
                            onClick={() => setModalOpen(true)}
                            className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-[var(--brand-contrast-color)] font-semibold text-xs uppercase tracking-wider py-4 px-8 rounded-full shadow-lg shadow-[var(--brand-gradient-start)]/10 hover:shadow-[var(--brand-gradient-start)]/20 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer border-none"
                          >
                            {renderEditableText(`${section.id}.ctaText`, section.ctaText, 'Iniciar Triagem')}
                          </button>
                        )}
                        {section.ctaSecondaryText && tenant.phone && (
                          <button
                            onClick={() => {
                              window.open(`https://wa.me/55${tenant.phone?.replace(/\D/g, '')}`, '_blank');
                            }}
                            className="bg-white/5 border border-white/10 hover:bg-white/10 text-[var(--brand-text-color)] font-semibold text-xs uppercase tracking-wider py-4 px-8 rounded-full transition-all duration-300 cursor-pointer shadow-sm"
                          >
                            {renderEditableText(`${section.id}.ctaSecondaryText`, section.ctaSecondaryText, 'Chamar no WhatsApp')}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Image Column */}
                    <div className={`flex-1 w-full max-w-sm overflow-hidden border border-white/5 shadow-2xl relative ${ratioClass}`}>
                      {section.image ? (
                        <img 
                          src={section.image} 
                          alt="Profissional" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div 
                          onClick={() => {
                            if (isPreview) {
                              window.parent.postMessage({ type: 'EDIT_ELEMENT', field: `${section.id}.image` }, '*');
                            }
                          }}
                          className="w-full h-full bg-gradient-to-br from-zinc-850 to-zinc-900 flex flex-col items-center justify-center gap-2 cursor-pointer group text-zinc-500 hover:text-zinc-300 transition-colors py-20"
                        >
                          <ImageIcon className="h-8 w-8" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">Adicionar Foto</span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </section>
            );
          }

          case 'quote': {
            const styleType = section.settings?.style || 'elegant';
            const alignment = section.settings?.alignment || 'center';
            const alignClass = alignment === 'left' ? 'text-left items-start' : 'text-center items-center flex flex-col';

            let wrapperClass = 'max-w-4xl mx-auto px-6 py-16';
            let borderClass = 'border-t border-white/5';
            
            if (styleType === 'card') {
              wrapperClass = 'max-w-4xl mx-auto px-8 py-12 md:py-16 my-8 glass-md rounded-3xl shadow-xl';
              borderClass = 'border border-white/5';
            }

            return (
              <section key={section.id} id={section.slug || section.id} className="relative z-10 px-6 animate-in fade-in duration-500">
                <div className={`${wrapperClass} ${borderClass} ${alignClass} space-y-4`}>
                  <span className="text-5xl sm:text-6xl font-serif text-[var(--brand-gradient-start)] opacity-40 leading-none select-none block">“</span>
                  <p className="text-lg sm:text-xl md:text-2xl font-serif text-[var(--brand-text-color)] font-light italic leading-relaxed">
                    {renderEditableText(`${section.id}.title`, section.title, 'Frase inspiradora ou citação sobre terapia')}
                  </p>
                  {section.author && (
                    <span className="text-xs tracking-wider uppercase font-semibold text-[var(--brand-gradient-start)] block pt-2">
                      — {renderEditableText(`${section.id}.author`, section.author, 'Autor')}
                    </span>
                  )}
                </div>
              </section>
            );
          }
          default:
            return null;
        }
      })}

      {/* Footer */}
      <footer className="relative z-10 bg-[var(--brand-bg-color)] border-t border-white/5 py-12 text-[#A1A1AA] text-xs">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div 
              onClick={() => {
                if (isPreview) {
                  window.parent.postMessage({ type: 'EDIT_ELEMENT', field: 'siteConfig.logoUrl' }, '*');
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className={`flex items-center gap-2 cursor-pointer transition-all ${
                isPreview ? 'hover:outline hover:outline-2 hover:outline-blue-500 hover:outline-offset-2 rounded-lg p-1' : ''
              }`}
            >
              {(cfg.logoUrl || tenant.logoLightUrl || tenant.logoDarkUrl) ? (
                <img 
                  src={cfg.logoUrl || tenant.logoLightUrl || tenant.logoDarkUrl || ''} 
                  alt={tenant.name} 
                  className="max-h-9 max-w-[180px] object-contain"
                />
              ) : (
                <>
                  <span className="h-7 w-7 rounded-lg bg-gradient-to-tr from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] flex items-center justify-center font-bold text-white">
                    Ψ
                  </span>
                  <span className="font-serif text-base tracking-wide text-[var(--brand-text-color)] font-normal">{tenant.name}</span>
                </>
              )}
            </div>
            <p className="leading-relaxed font-light">
              {renderEditableText('footer.description', dict.footer?.description, 'Espaço clínico ético focado na sua regulação emocional.')}
            </p>
            {cfg.professional?.crp && (
              <p className="font-semibold text-[var(--brand-text-color)]">
                {renderEditableText('footer.crpLabel', dict.footer?.crpLabel, 'CRP')}: {cfg.professional.crp}
              </p>
            )}
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-text-color)] mb-4">
              {renderEditableText('footer.navHeader', dict.footer?.navHeader, 'Navegação')}
            </h4>
            <ul className="space-y-2.5 font-light">
              {activeSections.map((s: any) => {
                const navInfo = getSectionNavInfo(s);
                if (!navInfo) return null;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => scrollToSection(navInfo.id)}
                      className="hover:text-[var(--brand-text-color)] text-[var(--brand-text-muted)] cursor-pointer transition-colors bg-transparent border-none p-0 text-left"
                    >
                      {renderEditableText(
                        navInfo.labelKey,
                        navInfo.isCustom ? s.badge : (navInfo.labelKey === 'nav.about' ? 'Sobre mim' : dict.nav?.[navInfo.labelKey.split('.')[1]]),
                        navInfo.defaultLabel === 'Sobre' ? 'Sobre mim' : navInfo.defaultLabel
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-text-color)] mb-4">
              {renderEditableText('footer.serviceHeader', dict.footer?.serviceHeader, 'Especialidades')}
            </h4>
            <ul className="space-y-2.5 font-light">
              {(dict.footer?.servicePoints || []).map((srv: string, idx: number) => (
                <li key={idx} className="text-[var(--brand-text-muted)]">{srv}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-text-color)] mb-4">Contato</h4>
            {tenant.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[var(--brand-gradient-start)]" />
                <span className="font-medium text-[var(--brand-text-color)]">{tenant.phone}</span>
              </div>
            )}
            <button
              onClick={() => setModalOpen(true)}
              className="h-10 px-5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-[var(--brand-contrast-color)] shadow-lg shadow-[var(--brand-gradient-start)]/20 hover:opacity-90 transform hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2 w-full border-none"
            >
              <MessageSquare className="h-4 w-4" />
              Preencher Triagem
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-light">
            © {new Date().getFullYear()} {tenant.name}. {renderEditableText('footer.rights', dict.footer?.rights, 'Todos os direitos reservados.')}
          </p>
          <a
            href={dict.footer?.devLink || "https://psiapp.com.br"}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white font-light decoration-0"
          >
            {dict.footer?.dev || 'Desenvolvido por Psi App'}
          </a>
        </div>
      </footer>

      {/* Triagem Modal */}
      <TypeformModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        tenantId={page.tenantId}
        pageId={page.id}
        formFlow={page.formFlow}
        whatsappNumber={tenant.phone || ""}
        contractText={contractText}
      />
    </div>
  )
}
