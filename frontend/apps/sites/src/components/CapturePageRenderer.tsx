"use client"

import React, { useState, useEffect } from 'react'
import { Sparkles, Check, ChevronDown, MapPin, MessageSquare, ArrowRight, Menu, X, Image as ImageIcon, Globe, Share2, Stethoscope } from 'lucide-react'
import { TypeformModal } from './TypeformModal'
import { BrandLogo, toE164 } from '@psi/ui'
import { useUTMParams } from '../hooks/useUTMParams'


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

  const handleCtaClick = () => {
    const ctaType = page.ctaType || page.siteConfig?.ctaType || 'form';

    if (ctaType === 'whatsapp') {
      const activeSocial = getEffectiveSocialLinks();
      const whatsappNum = activeSocial.whatsapp || tenant.phone;
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
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isPreview, setIsPreview] = useState(false)
  const [loaderState, setLoaderState] = useState<'black' | 'spinner' | 'fadeout' | 'done'>('black')

  // Capturar UTMs da URL para atribuição de fonte de tráfego
  const utmParams = useUTMParams()

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
            title: syncedPage.title ?? prev.title,
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
  const sections = cfg?.sections || defaultSections;
  const activeSections = sections.filter((s: any) => s.isActive !== false);

  const getEffectiveSocialLinks = () => {
    let raw: any = {};
    if (cfg.hasSocialLinksOverride && cfg.socialLinks) {
      raw = cfg.socialLinks;
    } else {
      raw = (tenant as any).social_links || (tenant as any).socialLinks || {};
    }

    const whatsappNum = raw.whatsappNumber || raw.whatsapp || tenant.phone;
    const whatsappMsg = raw.whatsappMessage || '';
    const instagramVal = raw.instagram || (tenant as any).instagram;
    const linkedinVal = raw.linkedin;
    const doctoraliaVal = raw.doctoralia;
    const xVal = raw.x;
    const youtubeVal = raw.youtube;
    const facebookVal = raw.facebook;
    const tiktokVal = raw.tiktok;
    const otherVal = raw.other || [];

    const formatUrl = (val?: string, platform?: string, extraMsg?: string) => {
      if (!val) return '';
      const v = val.trim();
      if (platform === 'whatsapp') {
        if (v.startsWith('http://') || v.startsWith('https://')) {
          if (extraMsg && !v.includes('text=')) {
            const sep = v.includes('?') ? '&' : '?';
            return `${v}${sep}text=${encodeURIComponent(extraMsg)}`;
          }
          return v;
        }
        let digits = v.replace(/\D/g, '');
        if (digits.length === 10 || digits.length === 11) {
          digits = `55${digits}`;
        }
        if (!digits) return '';
        const query = extraMsg ? `?text=${encodeURIComponent(extraMsg)}` : '';
        return `https://wa.me/${digits}${query}`;
      }
      if (v.startsWith('http://') || v.startsWith('https://')) return v;
      if (platform === 'instagram') return `https://instagram.com/${v.replace('@', '')}`;
      if (platform === 'linkedin') return `https://linkedin.com/in/${v}`;
      if (platform === 'doctoralia') return `https://doctoralia.com.br/${v}`;
      if (platform === 'x') return `https://x.com/${v.replace('@', '')}`;
      if (platform === 'youtube') return `https://youtube.com/${v.startsWith('@') ? v : `@${v}`}`;
      if (platform === 'facebook') return `https://facebook.com/${v}`;
      if (platform === 'tiktok') return `https://tiktok.com/${v.startsWith('@') ? v : `@${v}`}`;
      return `https://${v}`;
    };

    return {
      whatsapp: whatsappNum ? formatUrl(whatsappNum, 'whatsapp', whatsappMsg) : null,
      instagram: instagramVal ? formatUrl(instagramVal, 'instagram') : null,
      linkedin: linkedinVal ? formatUrl(linkedinVal, 'linkedin') : null,
      doctoralia: doctoraliaVal ? formatUrl(doctoraliaVal, 'doctoralia') : null,
      x: xVal ? formatUrl(xVal, 'x') : null,
      youtube: youtubeVal ? formatUrl(youtubeVal, 'youtube') : null,
      facebook: facebookVal ? formatUrl(facebookVal, 'facebook') : null,
      tiktok: tiktokVal ? formatUrl(tiktokVal, 'tiktok') : null,
      other: otherVal.map((o: any) => ({ label: o.label, url: formatUrl(o.url) })),
    };
  };

  const activeSocial = getEffectiveSocialLinks();

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

  const effectiveLogoUrl = cfg.logoUrl || tenant.defaultSiteLogoUrl || tenant.logoLightUrl || tenant.logoDarkUrl || '';
  const effectiveFaviconUrl = cfg.faviconUrl || tenant.defaultSiteFaviconUrl || tenant.iconLightUrl || tenant.iconDarkUrl || '';
  const effectiveLogoConfig = cfg.logoConfig || tenant.defaultSiteLogoConfig;

  let headingFont = theme?.typography?.headingFont || 'Playfair Display';
  if (headingFont === 'serif') headingFont = 'Playfair Display';

  let bodyFont = theme?.typography?.bodyFont || 'Inter';
  if (bodyFont === 'sans') bodyFont = 'Inter';

  const themeStyles = {
    '--brand-gradient-start': theme?.colors?.primaryStart || tenant.gradientColorStart || '#52525B',
    '--brand-gradient-end': theme?.colors?.primaryEnd || tenant.gradientColorEnd || '#27272A',
    '--brand-contrast-color': theme?.colors?.contrast || defaultContrast,
    '--brand-bg-color': bgCol,
    '--brand-card-bg-color': cardCol,
    '--brand-text-color': textCol,
    '--mix-base': mixBaseCol,
    '--brand-gradient': `linear-gradient(135deg, ${theme?.colors?.primaryStart || tenant.gradientColorStart || '#CC8667'}, ${theme?.colors?.primaryEnd || tenant.gradientColorEnd || '#AA5533'})`,
    '--brand-heading-font': headingFont ? `'${headingFont}', serif` : 'var(--font-serif)',
    '--brand-body-font': bodyFont ? `'${bodyFont}', sans-serif` : 'var(--font-sans)',
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

  // Helper to render text with click-to-edit capabilities inside the editor iframe (No hardcoded text fallbacks in live sites)
  const renderEditableText = (
    field: string,
    content: string | undefined,
    fallbackHint: string,
    className = ""
  ) => {
    const hasValue = Boolean(content && content.trim());
    const rawText = hasValue ? content!.trim() : '';

    if (!isPreview) {
      if (!hasValue) return null;
      const parsed = parseParagraphMarkdown(rawText);
      return <span className={className}>{parsed}</span>;
    }

    // In preview mode (editor iframe): display visual placeholder if text is empty so editor sees it needs filling
    const parsed = hasValue ? parseParagraphMarkdown(rawText) : (
      <span className="italic text-red-400/90 text-xs border border-dashed border-red-400/40 rounded px-1.5 py-0.5 bg-red-500/10 font-sans select-none">
        [Campo Vazio - {fallbackHint || 'Preencher'}]
      </span>
    );

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
    fallbackHint: string,
    className = ""
  ) => {
    const hasValue = Boolean(content && content.trim());
    const rawText = hasValue ? content!.trim() : '';

    if (!isPreview) {
      if (!hasValue) return null;
      const parsed = parseHighlightText(rawText);
      return <span className={className}>{parsed}</span>;
    }

    // In preview mode (editor iframe): display visual placeholder if title is empty so editor sees it needs filling
    const parsed = hasValue ? parseHighlightText(rawText) : (
      <span className="italic text-red-400/90 text-sm border border-dashed border-red-400/40 rounded px-1.5 py-0.5 bg-red-500/10 font-sans select-none">
        [Título Vazio - {fallbackHint || 'Preencher'}]
      </span>
    );

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
          Editar
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
          href={`https://fonts.googleapis.com/css2?family=${(headingFont || 'Playfair Display').replace(/\s+/g, '+')}:wght@300;400;500;600;700;800&family=${(bodyFont || 'Inter').replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`}
        />
      ) : (
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Italiana&family=Playfair+Display:ital,wght@0,300..800;1,300..800&family=Montserrat:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap"
        />
      )}
      {cfg.faviconUrl && (
        <link rel="icon" href={cfg.faviconUrl} />
      )}

      <style>{`
        ${theme?.typography?.customHeadingFontUrl ? `
          @font-face {
            font-family: "${(theme.typography.customHeadingFontName || 'CustomHeadingFont').replace(/[^a-zA-Z0-9\s\-]/g, '').trim()}";
            src: url("${theme.typography.customHeadingFontUrl}") format("${theme.typography.customHeadingFontFormat || 'woff2'}");
            font-display: swap;
          }
        ` : theme?.typography?.customFontUrl ? `
          @font-face {
            font-family: "${(theme.typography.customFontName || 'CustomFont').replace(/[^a-zA-Z0-9\s\-]/g, '').trim()}";
            src: url("${theme.typography.customFontUrl}") format("${theme.typography.customFontFormat || 'woff2'}");
            font-display: swap;
          }
        ` : ''}

        ${theme?.typography?.customBodyFontUrl ? `
          @font-face {
            font-family: "${(theme.typography.customBodyFontName || 'CustomBodyFont').replace(/[^a-zA-Z0-9\s\-]/g, '').trim()}";
            src: url("${theme.typography.customBodyFontUrl}") format("${theme.typography.customBodyFontFormat || 'woff2'}");
            font-display: swap;
          }
        ` : ''}

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
          --brand-heading-font: ${theme?.typography?.customHeadingFontName ? `'${theme.typography.customHeadingFontName.replace(/[^a-zA-Z0-9\s\-]/g, '')}', serif` : theme?.typography?.headingFont ? `'${(theme.typography.headingFont).replace(/[^a-zA-Z0-9\s\-]/g, '')}', serif` : 'var(--font-serif)'};
          --brand-heading-weight: ${theme?.typography?.headingWeight || '400'};
          --brand-body-font: ${theme?.typography?.customBodyFontName ? `'${theme.typography.customBodyFontName.replace(/[^a-zA-Z0-9\s\-]/g, '')}', sans-serif` : theme?.typography?.bodyFont ? `'${(theme.typography.bodyFont).replace(/[^a-zA-Z0-9\s\-]/g, '')}', sans-serif` : 'var(--font-sans)'};
        }

        * {
          font-family: var(--brand-body-font) !important;
        }
        h1, h2, h3, h4, h5, h6, .font-serif, .font-serif * {
          font-family: var(--brand-heading-font) !important;
          font-weight: var(--brand-heading-weight, 400) !important;
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
        .logo-icon-box, .logo-icon-box * {
          color: var(--brand-contrast-color) !important;
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
              <BrandLogo
                logoUrl={cfg.logoUrl}
                logoConfig={cfg.logoConfig}
                faviconUrl={cfg.faviconUrl}
                title={cfg.professional?.name}
                fallbackText="Psicologia"
                primaryStart={theme?.colors?.primaryStart || tenant.gradientColorStart || '#CC8667'}
                primaryEnd={theme?.colors?.primaryEnd || tenant.gradientColorEnd || '#AA5533'}
                contrastColor={tenant.contrastColor || '#FFFFFF'}
                textColor="#F4F4F5"
                size="lg"
                imgClassName="max-h-16 max-w-[200px] object-contain"
              />


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
            <BrandLogo
              logoUrl={effectiveLogoUrl}
              logoConfig={effectiveLogoConfig}
              faviconUrl={effectiveFaviconUrl}
              title={cfg.professional?.name || 'Psicologia'}
              fallbackText="Psicologia"
              primaryStart={theme?.colors?.primaryStart || tenant.gradientColorStart || '#CC8667'}
              primaryEnd={theme?.colors?.primaryEnd || tenant.gradientColorEnd || '#AA5533'}
              contrastColor={tenant.contrastColor || '#FFFFFF'}
              textColor="var(--brand-text-color)"
              size="md"
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {activeSections.filter((s: any) => s.showInNavbar ?? (s.id !== 'faq')).slice(0, 4).map((s: any) => {
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
              onClick={handleCtaClick}
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
            {activeSections.filter((s: any) => !s.hideOnMobile && (s.showInNavbar ?? (s.id !== 'faq'))).slice(0, 4).map((s: any) => {
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
              onClick={() => { setMobileMenuOpen(false); handleCtaClick(); }}
              className="w-full h-12 rounded-xl text-sm font-semibold bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-[var(--brand-contrast-color)] shadow-lg cursor-pointer"
            >
              {renderEditableText('hero.ctaPrimary', dict.hero?.ctaPrimary, 'Iniciar Triagem')}
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className={`relative z-10 max-w-6xl mx-auto px-6 pt-12 md:pt-24 pb-16 text-center md:text-left flex flex-col md:flex-row items-center gap-8 md:gap-12 ${cfg.images?.hideHeroSectionOnMobile ? 'hidden md:flex' : ''}`}>
        <div className="flex-1 space-y-5 md:space-y-6 flex flex-col items-center md:items-start w-full">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider text-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/10 border border-[var(--brand-gradient-start)]/20 uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{renderEditableText('hero.badge', dict.hero?.badge, 'Atendimento Online & Presencial')}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white font-normal leading-tight">
            {renderEditableTitle(
              'hero.title',
              dict.hero?.title || (dict.hero?.titlePart1 && dict.hero?.titlePart2 ? `${dict.hero.titlePart1} *${dict.hero.titlePart2}*` : undefined),
              'Terapia para recuperar o seu *equilíbrio interior*'
            )}
          </h1>

          <p className="text-[#A1A1AA] text-sm sm:text-base max-w-xl leading-relaxed font-light">
            {renderEditableText('hero.description', dict.hero?.description, 'Cuidado clínico ético e acolhedor para ajudar você a superar desafios emocionais, desenvolver o autoconhecimento e viver com mais leveza.')}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center md:justify-start w-full md:w-auto">
            <button
              onClick={handleCtaClick}
              className="w-full sm:w-auto px-8 h-12 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-[var(--brand-contrast-color)] font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[var(--brand-gradient-start)]/20 hover:opacity-90 transform hover:-translate-y-0.5 transition-all cursor-pointer text-xs sm:text-sm uppercase tracking-wider border-none"
            >
              {renderEditableText('hero.ctaPrimary', dict.hero?.ctaPrimary, 'Agendar Consulta')}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="w-full sm:w-auto px-8 h-12 bg-white/5 hover:bg-white/10 text-[var(--brand-text-color)] font-semibold rounded-xl border border-white/10 flex items-center justify-center transition-all cursor-pointer text-xs sm:text-sm uppercase tracking-wider"
            >
              {renderEditableText('hero.ctaSecondary', dict.hero?.ctaSecondary, 'Saiba Mais')}
            </button>
          </div>

          {/* Feature Badges */}
          <div className="pt-2 flex flex-wrap gap-2 justify-center md:justify-start">
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

        {/* Hero image — shown on mobile unless explicitly toggled off */}
        <div className={`flex-1 max-w-[280px] sm:max-w-xs md:max-w-md w-full mx-auto relative ${cfg.images?.hideHeroOnMobile ? 'hidden md:block' : ''}`}>
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
              <section key={section.id} id={section.slug || 'services'} className={`relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-20 border-t border-white/5 ${section.hideOnMobile ? 'hidden md:block' : ''}`}>
                <div className="text-center space-y-4 max-w-xl mx-auto mb-12 md:mb-16">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Card 1 */}
                  <div className="p-6 rounded-2xl glass-sm hover:border-[var(--brand-gradient-start)]/20 transition-all duration-300 space-y-4 text-center sm:text-left flex flex-col items-center sm:items-start">
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
                  <div className="p-6 rounded-2xl glass-sm hover:border-[var(--brand-gradient-start)]/20 transition-all duration-300 space-y-4 text-center sm:text-left flex flex-col items-center sm:items-start">
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
                  <div className="p-6 rounded-2xl glass-sm hover:border-[var(--brand-gradient-start)]/20 transition-all duration-300 space-y-4 text-center sm:text-left flex flex-col items-center sm:items-start">
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
              <section key={section.id} id={section.slug || 'about'} className={`relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-20 border-t border-white/5 flex flex-col md:flex-row items-center gap-10 md:gap-16 text-center md:text-left ${section.hideOnMobile ? 'hidden md:flex' : ''}`}>
                {/* Portrait — shown on mobile unless toggled off */}
                <div className={`flex-1 max-w-[280px] sm:max-w-xs md:max-w-sm w-full mx-auto relative ${cfg.images?.hidePortraitOnMobile ? 'hidden md:block' : ''}`}>
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

                <div className="flex-1 space-y-5 flex flex-col items-center md:items-start w-full">
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

                  <div className="space-y-3 pt-2 w-full">
                    {(dict.about?.points || []).map((point: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 text-sm text-[#A1A1AA] font-light text-left">
                        <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3" />
                        </div>
                        <span>{renderEditableText(`about.points.${idx}`, point, 'Ponto de destaque')}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 w-full flex flex-col sm:flex-row items-center justify-center md:justify-start">
                    <button
                      onClick={handleCtaClick}
                      className="w-full sm:w-auto px-8 h-12 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-[var(--brand-contrast-color)] font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[var(--brand-gradient-start)]/20 hover:opacity-90 transform hover:-translate-y-0.5 transition-all cursor-pointer text-xs sm:text-sm uppercase tracking-wider border-none"
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
              <section key={section.id} id={section.slug || 'process'} className={`relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-20 border-t border-white/5 ${section.hideOnMobile ? 'hidden md:block' : ''}`}>
                <div className="text-center space-y-4 max-w-xl mx-auto mb-12 md:mb-16">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
                  {/* Connector lines (Desktop) */}
                  <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] opacity-20 z-0" />

                  {/* Step 1 */}
                  <div className="space-y-4 text-center relative z-10 flex flex-col items-center">
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
                      onClick={handleCtaClick}
                      className="text-xs font-bold text-[var(--brand-gradient-start)] hover:text-white transition-colors uppercase tracking-wider cursor-pointer bg-transparent border-none p-0"
                    >
                      {renderEditableText('process.step1.cta', dict.process?.step1?.cta, 'Iniciar Triagem')} ➔
                    </button>
                  </div>

                  {/* Step 2 */}
                  <div className="space-y-4 text-center relative z-10 flex flex-col items-center">
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
                  <div className="space-y-4 text-center relative z-10 flex flex-col items-center">
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
              <section key={section.id} id={section.slug || 'faq'} className={`relative z-10 mx-auto px-6 py-16 md:py-20 border-t border-white/5 animate-in fade-in duration-500 ${isFaqGridMode ? 'max-w-6xl' : 'max-w-3xl'} ${section.hideOnMobile ? 'hidden md:block' : ''}`}>
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

                <div className={isFaqGridMode ? "grid grid-cols-1 sm:grid-cols-2 gap-6 text-left" : "space-y-4"}>
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
              <section key={section.id} id={section.slug || 'space'} className={`relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-20 border-t border-white/5 flex flex-col md:flex-row items-center gap-10 md:gap-12 text-center md:text-left ${section.hideOnMobile ? 'hidden md:flex' : ''}`}>
                <div className="flex-1 space-y-5 flex flex-col items-center md:items-start w-full">
                  <span className="text-xs font-bold tracking-wider text-[var(--brand-gradient-start)] uppercase">
                    {renderEditableText('space.badge', dict.space?.badge, 'O Consultório')}
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-serif text-white font-normal">
                    {renderEditableTitle('space.title', dict.space?.title, 'Ambiente Acolhedor')}
                  </h2>
                  <p className="text-[#A1A1AA] text-sm leading-relaxed font-light">
                    {renderEditableText('space.description', dict.space?.description, 'Nosso espaço físico é projetado com todo o conforto e privacidade para os seus atendimentos presenciais.')}
                  </p>

                  <div className="flex items-start gap-3 text-sm text-[#E4E4E7] text-left">
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

                <div className={`flex-1 w-full space-y-4 max-w-sm md:max-w-lg mx-auto ${cfg.images?.hideOfficeSpaceOnMobile ? 'hidden md:block' : ''}`}>
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
              gridColsCount === 2 ? 'sm:grid-cols-2' :
              gridColsCount === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' :
              'sm:grid-cols-2 lg:grid-cols-3';
            
            const cardStyleClass = 
              section.settings?.cardStyle === 'bordered' ? 'border border-white/5 p-6 rounded-2xl bg-[var(--brand-card-bg-color)]/20' :
              section.settings?.cardStyle === 'flat' ? 'py-4' :
              'p-6 rounded-2xl glass-sm hover:border-[var(--brand-gradient-start)]/20 transition-all duration-300 bg-[var(--brand-card-bg-color)]/30';

            const alignmentClass = section.settings?.itemAlignment === 'center' ? 'text-center flex flex-col items-center' : 'text-left';
            const gridWidthClass = gridColsCount === 4 ? 'max-w-7xl' : 'max-w-6xl';

            return (
              <section key={section.id} id={section.slug || section.id} className={`relative z-10 mx-auto px-6 py-16 md:py-20 border-t border-white/5 animate-in fade-in duration-500 ${gridWidthClass} ${section.hideOnMobile ? 'hidden md:block' : ''}`}>
                <div className="text-center space-y-4 max-w-xl mx-auto mb-12 md:mb-16">
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
                    <div key={idx} className={`${cardStyleClass} ${alignmentClass} space-y-4 text-center sm:text-left flex flex-col items-center sm:items-start`}>
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
              <section key={section.id} id={section.slug || section.id} className={`relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-20 border-t border-white/5 animate-in fade-in duration-500 ${section.hideOnMobile ? 'hidden md:block' : ''}`}>
                <div className="text-center space-y-4 max-w-xl mx-auto mb-12 md:mb-16">
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

                <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-stretch">
                  <div className={`flex-1 ${colStyleClass} ${colAlignmentClass} space-y-4 text-center sm:text-left flex flex-col items-center sm:items-start`}>
                    <h3 className="text-xl font-serif text-white font-medium">
                      {renderEditableTitle(`${section.id}.leftTitle`, section.leftTitle, 'Coluna Esquerda')}
                    </h3>
                    <p className="text-[#A1A1AA] text-sm leading-relaxed font-light">
                      {renderEditableText(`${section.id}.leftText`, section.leftText, 'Texto explicativo da coluna esquerda.')}
                    </p>
                  </div>
                  <div className={`flex-1 ${colStyleClass} ${colAlignmentClass} space-y-4 text-center sm:text-left flex flex-col items-center sm:items-start`}>
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
              <section key={section.id} id={section.slug || section.id} className={`relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-20 border-t border-white/5 animate-in fade-in duration-500 ${section.hideOnMobile ? 'hidden md:block' : ''}`}>
                <div className={`flex flex-col ${isImgMediaFirst ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 md:gap-12 items-center text-center md:text-left`}>
                  <div className="flex-1 space-y-5 md:space-y-6 flex flex-col items-center md:items-start w-full">
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
                      <div className="pt-2 w-full sm:w-auto flex justify-center md:justify-start">
                        <button
                          onClick={handleCtaClick}
                          className="w-full sm:w-auto px-8 h-12 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-[var(--brand-contrast-color)] font-semibold text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-[var(--brand-gradient-start)]/20 hover:opacity-90 transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer border-none"
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
                      <div className={`flex-1 w-full max-w-xs sm:max-w-sm md:max-w-lg overflow-hidden border border-white/5 shadow-2xl relative mx-auto ${ratioStyleClass} ${section.hideImageOnMobile ? 'hidden md:block' : ''}`}>
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
                            className="w-full h-full bg-gradient-to-br from-zinc-850 to-zinc-900 flex flex-col items-center justify-center gap-2 cursor-pointer group text-zinc-500 hover:text-zinc-300 transition-colors py-16"
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
            const alignmentClass = alignment === 'left' ? 'text-center sm:text-left items-center sm:items-start' : 'text-center items-center flex flex-col';
            
            let bgClass = '';
            let borderClass = 'border-t border-white/5';
            let containerClass = 'max-w-4xl mx-auto px-6 py-16';

            if (bgStyle === 'gradient') {
              bgClass = 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] rounded-3xl shadow-2xl';
              borderClass = 'border border-white/10';
              containerClass = 'max-w-5xl mx-auto px-6 sm:px-8 py-10 md:py-16 my-8';
            } else if (bgStyle === 'card') {
              bgClass = 'glass-md rounded-3xl shadow-xl';
              borderClass = 'border border-white/5';
              containerClass = 'max-w-5xl mx-auto px-6 sm:px-8 py-10 md:py-16 my-8';
            }

            return (
              <section key={section.id} id={section.slug || section.id} className={`relative z-10 px-6 animate-in fade-in duration-500 ${section.hideOnMobile ? 'hidden md:block' : ''}`}>
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
                    <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center items-center w-full">
                      {section.ctaText && (
                        <button
                          onClick={handleCtaClick}
                          className={`w-full sm:w-auto px-8 h-12 font-semibold text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer border-none flex items-center justify-center gap-2 ${
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
                            const digits = toE164(tenant.phone || '').replace(/\D/g, '');
                            window.open(`https://wa.me/${digits}`, '_blank');
                          }}
                          className={`w-full sm:w-auto px-8 h-12 font-semibold text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-md transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer border flex items-center justify-center gap-2 ${
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
              containerClass = 'max-w-6xl mx-auto px-6 sm:px-8 py-10 md:py-16 my-8';
            } else if (cardStyle === 'bordered') {
              cardClass = 'border border-white/5 bg-[var(--brand-card-bg-color)]/20 rounded-3xl';
              borderClass = 'border border-white/5';
              containerClass = 'max-w-6xl mx-auto px-6 sm:px-8 py-10 md:py-16 my-8';
            }

            const ratioClass = 
              section.settings?.imageAspectRatio === 'portrait' ? 'aspect-[3/4] rounded-2xl' :
              section.settings?.imageAspectRatio === 'rounded' ? 'aspect-square rounded-full border-2 border-[var(--brand-gradient-start)]/30' :
              'aspect-square rounded-2xl';

            return (
              <section key={section.id} id={section.slug || section.id} className={`relative z-10 px-6 animate-in fade-in duration-500 ${section.hideOnMobile ? 'hidden md:block' : ''}`}>
                <div className={`${cardClass} ${borderClass} ${containerClass}`}>
                  <div className={`flex flex-col ${isImgLeft ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 md:gap-12 items-center text-center md:text-left`}>
                    
                    {/* Content column */}
                    <div className="flex-1 space-y-5 md:space-y-6 flex flex-col items-center md:items-start w-full">
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
                      
                      <div className="pt-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center md:justify-start w-full">
                        {section.ctaText && (
                          <button
                            onClick={handleCtaClick}
                            className="w-full sm:w-auto px-8 h-12 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-[var(--brand-contrast-color)] font-semibold text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-[var(--brand-gradient-start)]/20 hover:opacity-90 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer border-none flex items-center justify-center gap-2"
                          >
                            {renderEditableText(`${section.id}.ctaText`, section.ctaText, 'Iniciar Triagem')}
                          </button>
                        )}
                        {section.ctaSecondaryText && tenant.phone && (
                          <button
                            onClick={() => {
                              const digits = toE164(tenant.phone || '').replace(/\D/g, '');
                              window.open(`https://wa.me/${digits}`, '_blank');
                            }}
                            className="w-full sm:w-auto px-8 h-12 bg-white/5 border border-white/10 hover:bg-white/10 text-[var(--brand-text-color)] font-semibold text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer shadow-sm flex items-center justify-center gap-2"
                          >
                            {renderEditableText(`${section.id}.ctaSecondaryText`, section.ctaSecondaryText, 'Chamar no WhatsApp')}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Image Column */}
                    <div className={`flex-1 w-full max-w-xs sm:max-w-sm md:max-w-md overflow-hidden border border-white/5 shadow-2xl relative mx-auto ${ratioClass} ${section.hideImageOnMobile ? 'hidden md:block' : ''}`}>
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
                          className="w-full h-full bg-gradient-to-br from-zinc-850 to-zinc-900 flex flex-col items-center justify-center gap-2 cursor-pointer group text-zinc-500 hover:text-zinc-300 transition-colors py-16"
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
            const alignClass = alignment === 'left' ? 'text-center sm:text-left items-center sm:items-start' : 'text-center items-center flex flex-col';

            let wrapperClass = 'max-w-4xl mx-auto px-6 py-16';
            let borderClass = 'border-t border-white/5';
            
            if (styleType === 'card') {
              wrapperClass = 'max-w-4xl mx-auto px-6 sm:px-8 py-10 md:py-16 my-8 glass-md rounded-3xl shadow-xl';
              borderClass = 'border border-white/5';
            }

            return (
              <section key={section.id} id={section.slug || section.id} className={`relative z-10 px-6 animate-in fade-in duration-500 ${section.hideOnMobile ? 'hidden md:block' : ''}`}>
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
      <footer className="relative z-10 bg-[var(--brand-bg-color)] border-t border-white/5 py-12 text-[#A1A1AA] text-xs text-center sm:text-left">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4 flex flex-col items-center md:items-start">
            <div 
              onClick={() => {
                if (isPreview) {
                  window.parent.postMessage({ type: 'EDIT_ELEMENT', field: 'siteConfig.logoUrl' }, '*');
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className={`flex items-center justify-center md:justify-start gap-2 cursor-pointer transition-all ${
                isPreview ? 'hover:outline hover:outline-2 hover:outline-blue-500 hover:outline-offset-2 rounded-lg p-1' : ''
              }`}
            >
            <BrandLogo
              logoUrl={cfg.logoUrl}
              logoConfig={cfg.logoConfig}
              faviconUrl={cfg.faviconUrl}
              title={cfg.professional?.name || 'Psicologia'}
              fallbackText="Psicologia"
              primaryStart={theme?.colors?.primaryStart || tenant.gradientColorStart || '#CC8667'}
              primaryEnd={theme?.colors?.primaryEnd || tenant.gradientColorEnd || '#AA5533'}
              contrastColor={tenant.contrastColor || '#FFFFFF'}
              textColor="var(--brand-text-color)"
              size="sm"
            />
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

          <div className="flex flex-col items-center md:items-start">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-text-color)] mb-4">
              {renderEditableText('footer.navHeader', dict.footer?.navHeader, 'Navegação')}
            </h4>
            <ul className="space-y-2.5 font-light">
              {activeSections.filter((s: any) => s.showInNavbar ?? (s.id !== 'faq')).slice(0, 4).map((s: any) => {
                const navInfo = getSectionNavInfo(s);
                if (!navInfo) return null;
                const navText = s.name || (navInfo.isCustom ? s.badge : dict.nav?.[navInfo.labelKey.split('.')[1]]) || navInfo.defaultLabel;
                return (
                  <li key={s.id} className={s.hideOnMobile ? 'hidden md:block' : ''}>
                    <button
                      onClick={() => scrollToSection(navInfo.id)}
                      className="hover:text-[var(--brand-text-color)] text-[var(--brand-text-muted)] cursor-pointer transition-colors bg-transparent border-none p-0 text-center md:text-left"
                    >
                      {renderEditableText(
                        s.name ? `${s.id}.name` : navInfo.labelKey,
                        navText,
                        navInfo.defaultLabel === 'Sobre' ? 'Sobre mim' : navInfo.defaultLabel
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex flex-col items-center md:items-start">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-text-color)] mb-4">
              {renderEditableText('footer.serviceHeader', dict.footer?.serviceHeader, 'Especialidades')}
            </h4>
            <ul className="space-y-2.5 font-light">
              {[
                dict.diagnostic?.card1Title,
                dict.diagnostic?.card2Title,
                dict.diagnostic?.card3Title,
              ].filter(Boolean).map((title: string, idx: number) => (
                <li key={idx} className="text-[var(--brand-text-muted)]">
                  {renderEditableText(
                    `diagnostic.card${idx + 1}Title`,
                    title,
                    `Especialidade ${idx + 1}`
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4 flex flex-col items-center md:items-start w-full">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-text-color)] mb-4">Redes Sociais</h4>

            {/* Ícones de Redes Sociais */}
            {(activeSocial.whatsapp || activeSocial.instagram || activeSocial.linkedin || activeSocial.doctoralia || activeSocial.x || activeSocial.youtube || activeSocial.facebook || activeSocial.tiktok || activeSocial.other.length > 0) && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1 pb-2">
                {activeSocial.whatsapp && (
                  <a href={activeSocial.whatsapp} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="h-8 w-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 flex items-center justify-center transition-all">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </a>
                )}
                {activeSocial.instagram && (
                  <a href={activeSocial.instagram} target="_blank" rel="noopener noreferrer" title="Instagram" className="h-8 w-8 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 flex items-center justify-center transition-all">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>
                )}
                {activeSocial.linkedin && (
                  <a href={activeSocial.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn" className="h-8 w-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 flex items-center justify-center transition-all">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                  </a>
                )}
                {activeSocial.doctoralia && (
                  <a href={activeSocial.doctoralia} target="_blank" rel="noopener noreferrer" title="Doctoralia" className="h-8 w-8 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 flex items-center justify-center transition-all">
                    <Stethoscope className="h-4 w-4" />
                  </a>
                )}
                {activeSocial.x && (
                  <a href={activeSocial.x} target="_blank" rel="noopener noreferrer" title="X (Twitter)" className="h-8 w-8 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-slate-300 border border-slate-500/20 flex items-center justify-center transition-all">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                )}
                {activeSocial.youtube && (
                  <a href={activeSocial.youtube} target="_blank" rel="noopener noreferrer" title="YouTube" className="h-8 w-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center justify-center transition-all">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  </a>
                )}
                {activeSocial.facebook && (
                  <a href={activeSocial.facebook} target="_blank" rel="noopener noreferrer" title="Facebook" className="h-8 w-8 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 flex items-center justify-center transition-all">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                )}
                {activeSocial.other.map((link: any, idx: number) => (
                  <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" title={link.label} className="h-8 px-2.5 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-slate-300 border border-slate-500/20 flex items-center gap-1 text-[11px] font-semibold transition-all">
                    <Globe className="h-3.5 w-3.5" />
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            )}

            <button
              onClick={handleCtaClick}
              className="h-10 px-5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-[var(--brand-contrast-color)] shadow-lg shadow-[var(--brand-gradient-start)]/20 hover:opacity-90 transform hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2 w-full border-none"
            >
              <MessageSquare className="h-4 w-4" />
              Preencher Triagem
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
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
        workspaceId={page.tenantId}
        pageId={page.id}
        utmParams={utmParams}
        formFlow={page.formFlow}
        whatsappNumber={tenant.phone || ""}
        theme={page.siteConfig?.theme}
        isDark={!isLightBg}
      />
    </div>
  )
}
