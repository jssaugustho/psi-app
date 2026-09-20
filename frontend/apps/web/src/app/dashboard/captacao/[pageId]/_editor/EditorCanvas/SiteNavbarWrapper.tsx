'use client';

import React, { useState } from 'react';
import { NavbarConfig, Section } from '../types';
import { Compass, ExternalLink, Menu, X } from 'lucide-react';
import { BrandLogo } from '@psi/ui';
import { getThemeColors, getThemeTypography, getThemeButtonDefaults, getTextFallbackColor } from '../utils/colorHelpers';
import { getLucideIcon } from '../PropertiesPanel/components/IconPicker';

interface SiteNavbarWrapperProps {
  navbar?: NavbarConfig;
  sections: Section[];
  isSelected: boolean;
  onSelect: (id: string, type: any) => void;
  page?: any;
  isEditorMode?: boolean;
  viewportMode?: 'desktop' | 'mobile';
}

export function SiteNavbarWrapper({
  navbar,
  sections,
  isSelected,
  onSelect,
  page,
  isEditorMode = true,
  viewportMode,
}: SiteNavbarWrapperProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isTopCtaHovered, setIsTopCtaHovered] = useState(false);
  const [isDrawerCtaHovered, setIsDrawerCtaHovered] = useState(false);

  if (!navbar || navbar.enabled === false) return null;

  const { primaryStart, primaryEnd, contrast, siteBg } = getThemeColors(page);
  const theme = page?.siteConfig?.theme || {};
  const themeTypo = getThemeTypography(page);
  const buttonDefaults = getThemeButtonDefaults(page);
  const fallbackTextColor = getTextFallbackColor(siteBg, 'heading');

  // Custom Cores & Estilos da Bar
  const headerBgColor = navbar.backgroundColor || `color-mix(in srgb, ${primaryStart} 4%, ${siteBg})`;
  const textColor = navbar.textColor || fallbackTextColor;

  // Tipografia dos links do navbar — herda do theme.levels.links com override do próprio navbar
  const linkFontFamily = navbar.linkFontFamily
    ? `'${navbar.linkFontFamily}', sans-serif`
    : themeTypo.levels.links.fontFamily
    ? `'${themeTypo.levels.links.fontFamily}', sans-serif`
    : themeTypo.fontBody
    ? `'${themeTypo.fontBody}', sans-serif`
    : 'inherit';
  const linkFontSize = navbar.linkFontSize || themeTypo.levels.links.fontSize || '0.875rem';
  const linkFontWeight = navbar.linkFontWeight || themeTypo.levels.links.fontWeight || '600';
  const linkLetterSpacing = navbar.linkLetterSpacing || themeTypo.levels.links.letterSpacing || 'normal';
  const linkTextTransform = navbar.linkTextTransform || themeTypo.levels.links.textTransform || 'none';

  // Tamanho do Logotipo
  const logoHeightNum = typeof navbar.logoHeight === 'number' ? navbar.logoHeight : (parseInt(String(navbar.logoHeight || '32'), 10) || 32);
  const logoHeightStr = `${logoHeightNum}px`;

  const overlayBgColor = navbar.mobileOverlayBgColor || headerBgColor;
  const overlayTextColor = navbar.mobileOverlayTextColor || textColor;
  const mobileAlign = navbar.mobileMenuAlign || 'center';

  let alignClass = 'items-center text-center justify-center';
  if (mobileAlign === 'left') alignClass = 'items-start text-left justify-start';
  if (mobileAlign === 'right') alignClass = 'items-end text-right justify-end';

  let blurClass = 'backdrop-blur-md';
  if (navbar.mobileOverlayBackdropBlur === 'none') blurClass = 'backdrop-blur-none';
  if (navbar.mobileOverlayBackdropBlur === 'sm') blurClass = 'backdrop-blur-sm';
  if (navbar.mobileOverlayBackdropBlur === 'md') blurClass = 'backdrop-blur-md';
  if (navbar.mobileOverlayBackdropBlur === 'lg') blurClass = 'backdrop-blur-lg';

  // Posicionamento (Padrão, Sticky, Fixed)
  const posMode = navbar.positionMode || (navbar.sticky ? 'sticky' : 'static');
  let positionClass = 'relative mb-6';
  if (posMode === 'sticky') {
    positionClass = 'sticky top-0 z-50 mb-0';
  } else if (posMode === 'fixed') {
    positionClass = 'fixed top-0 left-0 right-0 z-50 mb-0';
  }

  // CTA Href / Action Helper
  const getCtaHref = () => {
    if (navbar.ctaButtonAction === 'whatsapp') {
      const number = navbar.ctaWhatsappNumber ? navbar.ctaWhatsappNumber.replace(/\D/g, '') : '';
      const msg = navbar.ctaWhatsappMessage || '';
      return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
    }
    if (navbar.ctaButtonAction === 'scroll_to' && navbar.ctaScrollTargetId) {
      return `#${navbar.ctaScrollTargetId}`;
    }
    if (navbar.ctaButtonAction === 'external_url' && navbar.ctaExternalUrl) {
      return navbar.ctaExternalUrl;
    }
    return '#agendamento';
  };

  // Visibilidade responsiva baseada no viewportMode (no editor) ou classes Tailwind md: (na página real)
  const isMobileViewport = viewportMode === 'mobile';
  const isDesktopViewport = viewportMode === 'desktop';

  let hamburgerVisibilityClass = 'flex md:hidden';
  let desktopNavClass = 'hidden md:flex';
  let topBarCtaClass = 'hidden md:inline-flex';

  if (isEditorMode) {
    if (isMobileViewport) {
      hamburgerVisibilityClass = 'flex';
      desktopNavClass = 'hidden';
      topBarCtaClass = 'hidden';
    } else if (isDesktopViewport) {
      hamburgerVisibilityClass = 'hidden';
      desktopNavClass = 'flex';
      topBarCtaClass = 'inline-flex';
    }
  }

  // Renderizador do Botão CTA da Navbar (Herda 100% dos Padrões Globais do Tema com Lógica de Overrides)
  const renderCtaButton = (isMobileDrawer: boolean = false) => {
    if (navbar.showCtaButton === false) return null;
    if (isMobileDrawer && navbar.showMobileCtaButton === false) return null;

    const ctaVariant = navbar.ctaVariant || buttonDefaults.variant || 'gradient';

    let computedBg = buttonDefaults.gradientString || `linear-gradient(135deg, ${primaryStart}, ${primaryEnd})`;
    let computedColor = buttonDefaults.color || '#FFFFFF';
    let computedBorderColor = buttonDefaults.borderColor || 'transparent';

    if (navbar.ctaBgColor) {
      computedBg = navbar.ctaBgColor;
    } else if (ctaVariant === 'solid') {
      computedBg = buttonDefaults.backgroundColor || primaryStart;
    } else if (ctaVariant === 'glass') {
      computedBg = 'color-mix(in srgb, var(--brand-gradient-start) 20%, transparent)';
      computedBorderColor = 'color-mix(in srgb, var(--brand-gradient-start) 30%, transparent)';
    } else if (ctaVariant === 'outline') {
      computedBg = 'transparent';
      computedColor = 'var(--brand-gradient-start)';
      computedBorderColor = 'var(--brand-gradient-start)';
    } else if (ctaVariant === 'soft') {
      computedBg = 'color-mix(in srgb, var(--brand-gradient-start) 15%, transparent)';
      computedColor = 'var(--brand-gradient-start)';
      computedBorderColor = 'transparent';
    }

    if (navbar.ctaTextColor) {
      computedColor = navbar.ctaTextColor;
    }

    const isHovered = isMobileDrawer ? isDrawerCtaHovered : isTopCtaHovered;
    const setIsHovered = isMobileDrawer ? setIsDrawerCtaHovered : setIsTopCtaHovered;

    const hoverBg = navbar.ctaHoverBackgroundColor || buttonDefaults.hoverBackgroundColor;
    const hoverColor = navbar.ctaHoverColor || buttonDefaults.hoverColor;
    const hoverBorderColor = navbar.ctaHoverBorderColor || buttonDefaults.hoverBorderColor;
    const hoverShadow = navbar.ctaHoverBoxShadow || buttonDefaults.hoverBoxShadow;
    const hoverOpacity = navbar.ctaHoverOpacity !== undefined ? navbar.ctaHoverOpacity : buttonDefaults.hoverOpacity;
    const hoverScale = navbar.ctaHoverScale !== undefined ? navbar.ctaHoverScale : buttonDefaults.hoverScale;
    const hoverTranslateY = navbar.ctaHoverTranslateY !== undefined ? navbar.ctaHoverTranslateY : buttonDefaults.hoverTranslateY;

    let activeBg = computedBg;
    let activeColor = computedColor;
    let activeBorderColor = navbar.ctaBorderColor || computedBorderColor;

    if (isHovered) {
      if (hoverBg) activeBg = hoverBg;
      if (hoverColor) activeColor = hoverColor;
      if (hoverBorderColor) activeBorderColor = hoverBorderColor;
    }

    const btnTransforms: string[] = [];
    if (isHovered) {
      if (hoverScale !== undefined && hoverScale !== 1) btnTransforms.push(`scale(${hoverScale})`);
      if (hoverTranslateY !== undefined && hoverTranslateY !== 0) {
        const ty = typeof hoverTranslateY === 'number' ? `${hoverTranslateY}px` : hoverTranslateY;
        btnTransforms.push(`translateY(${ty})`);
      }
    }

    const duration = `${buttonDefaults.transitionDurationMs || 200}ms`;
    const timing = buttonDefaults.transitionTimingFunction || 'ease-in-out';

    const ctaPaddingX = navbar.ctaPaddingX || buttonDefaults.paddingX || (isMobileDrawer ? '24px' : '16px');
    const ctaPaddingY = navbar.ctaPaddingY || buttonDefaults.paddingY || (isMobileDrawer ? '12px' : '8px');
    const ctaBorderRadius = navbar.ctaBorderRadius || buttonDefaults.borderRadius || '12px';
    const ctaBorderWidth = navbar.ctaBorderWidth || buttonDefaults.borderWidth || (ctaVariant === 'outline' ? '1px' : '0px');
    const ctaBorderStyle = navbar.ctaBorderStyle || buttonDefaults.borderStyle || (ctaVariant === 'outline' ? 'solid' : 'none');

    const ctaFontFamily = navbar.ctaFontFamily
      ? `'${navbar.ctaFontFamily}', sans-serif`
      : buttonDefaults.fontFamily
      ? `'${buttonDefaults.fontFamily}', sans-serif`
      : themeTypo.levels.buttons.fontFamily
      ? `'${themeTypo.levels.buttons.fontFamily}', sans-serif`
      : themeTypo.fontBody
      ? `'${themeTypo.fontBody}', sans-serif`
      : 'inherit';

    const ctaFontSize = navbar.ctaFontSize || buttonDefaults.fontSize || themeTypo.levels.buttons.fontSize || '0.875rem';
    const ctaFontWeight = navbar.ctaFontWeight || buttonDefaults.fontWeight || themeTypo.levels.buttons.fontWeight || '700';
    const ctaLetterSpacing = navbar.ctaLetterSpacing || buttonDefaults.letterSpacing || themeTypo.levels.buttons.letterSpacing || 'normal';
    const ctaTextTransform = navbar.ctaTextTransform || buttonDefaults.textTransform || themeTypo.levels.buttons.textTransform || 'none';

    const ButtonIconLeft = navbar.ctaIconLeft ? getLucideIcon(navbar.ctaIconLeft) : null;
    const ButtonIconRight = navbar.ctaIconRight ? getLucideIcon(navbar.ctaIconRight) : null;

    const baseClass = isMobileDrawer
      ? 'w-full text-center shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all'
      : `${topBarCtaClass} items-center justify-center font-bold text-xs shadow-md transition-all cursor-pointer gap-2`;

    return (
      <a
        href={getCtaHref()}
        onClick={(e) => {
          e.preventDefault();
          if (isMobileDrawer) setMobileMenuOpen(false);
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={baseClass}
        style={{
          background: activeBg,
          color: activeColor,
          borderRadius: ctaBorderRadius,
          borderWidth: ctaBorderWidth,
          borderColor: activeBorderColor,
          borderStyle: ctaBorderStyle,
          fontFamily: ctaFontFamily,
          fontSize: ctaFontSize,
          fontWeight: ctaFontWeight,
          letterSpacing: ctaLetterSpacing,
          textTransform: ctaTextTransform as any,
          paddingLeft: ctaPaddingX,
          paddingRight: ctaPaddingX,
          paddingTop: ctaPaddingY,
          paddingBottom: ctaPaddingY,
          boxShadow: isHovered && hoverShadow ? hoverShadow : undefined,
          opacity: isHovered && hoverOpacity !== undefined ? hoverOpacity : undefined,
          transform: btnTransforms.length > 0 ? btnTransforms.join(' ') : undefined,
          transition: `all ${duration} ${timing}`,
        }}
      >
        {ButtonIconLeft && <ButtonIconLeft className="w-4 h-4 shrink-0 pointer-events-none" />}
        <span>{navbar.ctaButtonText || 'Agendar Consulta'}</span>
        {ButtonIconRight && <ButtonIconRight className="w-4 h-4 shrink-0 pointer-events-none" />}
      </a>
    );
  };

  return (
    <header
      onClick={(e) => {
        e.stopPropagation();
        onSelect('navbar-root', 'navbar');
      }}
      className={`w-full py-3 px-6 rounded-2xl border border-[var(--surface-border)] backdrop-blur-md transition-all duration-200 cursor-pointer flex flex-col justify-center shadow-sm select-none ${positionClass} ${
        isSelected
          ? 'outline outline-2 outline-emerald-500 -outline-offset-2'
          : 'hover:outline hover:outline-1 hover:outline-emerald-400/60 hover:-outline-offset-1'
      }`}
      style={{
        background: headerBgColor,
        color: textColor,
        fontFamily: linkFontFamily,
      }}
    >
      <div
        className="flex items-center justify-between w-full mx-auto"
        style={{
          maxWidth: page?.siteConfig?.theme?.contentMaxWidth || page?.siteConfig?.theme?.containerMaxWidth || '1200px',
        }}
      >
        {/* Logotipo da Navbar com altura customizada */}
        <div className="flex items-center gap-2" style={{ height: logoHeightStr }}>
          <BrandLogo
            logoUrl={navbar?.customImageUrl || page?.logoUrl || theme?.logoUrl}
            logoConfig={page?.siteConfig?.logoConfig || (navbar?.customText ? { text: navbar.customText } : null)}
            faviconUrl={page?.faviconUrl || theme?.faviconUrl}
            title={navbar?.customText || page?.title}
            fallbackText="Psicologia"
            primaryStart={primaryStart}
            primaryEnd={primaryEnd}
            contrastColor={textColor}
            fontHeading={theme?.fontHeading}
            height={logoHeightNum}
            size="sm"
          />
        </div>

        {/* Links de Navegação do Menu (Desktop) */}
        <nav
          className={`${desktopNavClass} items-center gap-6`}
          style={{ color: textColor }}
        >
          {navbar.links && navbar.links.length > 0 ? (
            navbar.links.map((link) => {
              const targetSec = sections.find((s) => s.id === link.sectionId);
              return (
                <a
                  key={link.id}
                  href={link.targetType === 'section' ? `#${link.sectionId}` : link.externalUrl}
                  onClick={(e) => e.preventDefault()}
                  className="hover:opacity-80 transition-opacity flex items-center gap-1"
                  style={{
                    color: textColor,
                    fontFamily: linkFontFamily,
                    fontSize: linkFontSize,
                    fontWeight: linkFontWeight,
                    letterSpacing: linkLetterSpacing,
                    textTransform: linkTextTransform as any,
                  }}
                >
                  <span>{link.label || targetSec?.label || 'Link'}</span>
                  {link.targetType === 'external_url' && <ExternalLink className="w-2.5 h-2.5 opacity-60" />}
                </a>
              );
            })
          ) : (
            <span className="text-[10px] opacity-60 italic" style={{ color: textColor }}>
              Nenhum link configurado na Navbar
            </span>
          )}
        </nav>

        {/* Botão CTA do Topo & Toggle Hambúrguer (Desktop & Mobile) */}
        <div className="flex items-center gap-3">
          {renderCtaButton(false)}

          {/* Toggle Hambúrguer */}
          {navbar.enableMobileHamburger !== false && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className={`${hamburgerVisibilityClass} p-1.5 rounded-lg border border-[var(--surface-border)] hover:bg-[var(--mix-base)]/50 transition-colors cursor-pointer items-center justify-center`}
              style={{ color: textColor }}
              title="Toggle Menu Hambúrguer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Preview das links no editor (abaixo do header) quando hamburger abre */}
      {isEditorMode && mobileMenuOpen && navbar.enableMobileHamburger !== false && (
        <div className={`mt-4 flex flex-col gap-2 pt-4 border-t border-[var(--surface-border)]/40 ${alignClass}`}>
          {navbar.links && navbar.links.length > 0 ? (
            navbar.links.map((link) => {
              const targetSec = sections.find((s) => s.id === link.sectionId);
              return (
                <a
                  key={link.id}
                  href={link.targetType === 'section' ? `#${link.sectionId}` : link.externalUrl}
                  onClick={(e) => e.preventDefault()}
                  className="py-2 px-3 rounded-xl hover:bg-[var(--mix-base)]/20 flex items-center gap-2 transition-colors cursor-pointer"
                  style={{
                    color: textColor,
                    fontFamily: linkFontFamily,
                    fontSize: linkFontSize,
                    fontWeight: linkFontWeight,
                    letterSpacing: linkLetterSpacing,
                    textTransform: linkTextTransform as any,
                  }}
                >
                  <span>{link.label || targetSec?.label || 'Link'}</span>
                  {link.targetType === 'external_url' && <ExternalLink className="w-4 h-4 opacity-60" />}
                </a>
              );
            })
          ) : (
            <span className="text-sm opacity-60 italic p-2">Nenhum link configurado</span>
          )}
          {renderCtaButton(true)}
        </div>
      )}

      {/* Overlay de Tela Cheia do Menu Hambúrguer (Mobile — apenas na página real) */}
      {!isEditorMode && mobileMenuOpen && navbar.enableMobileHamburger !== false && (
        <div
          className={`fixed inset-0 z-[100] flex flex-col p-6 overflow-y-auto transition-all duration-300 md:hidden ${blurClass}`}
          style={{
            background: overlayBgColor,
            color: overlayTextColor,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabeçalho do Overlay: Logo + Botão Fechar X */}
          <div className="flex items-center justify-between w-full pb-6 border-b border-[var(--surface-border)]/40">
            <div className="flex items-center gap-2" style={{ height: logoHeightStr }}>
              <BrandLogo
                logoUrl={navbar?.customImageUrl || page?.logoUrl || theme?.logoUrl}
                logoConfig={page?.siteConfig?.logoConfig || (navbar?.customText ? { text: navbar.customText } : null)}
                faviconUrl={page?.faviconUrl || theme?.faviconUrl}
                title={navbar?.customText || page?.title}
                fallbackText="Psicologia"
                primaryStart={primaryStart}
                primaryEnd={primaryEnd}
                contrastColor={overlayTextColor}
                fontHeading={theme?.fontHeading}
                height={logoHeightNum}
                size="sm"
              />
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-xl border border-[var(--surface-border)] hover:bg-[var(--mix-base)]/40 transition-colors cursor-pointer"
              title="Fechar menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Links de Navegação */}
          <div className={`flex-1 py-8 flex flex-col ${alignClass}`}>
            <nav className={`flex flex-col gap-4 w-full text-base font-bold ${alignClass}`}>
              {navbar.links && navbar.links.length > 0 ? (
                navbar.links.map((link) => {
                  const targetSec = sections.find((s) => s.id === link.sectionId);
                  return (
                    <a
                      key={link.id}
                      href={link.targetType === 'section' ? `#${link.sectionId}` : link.externalUrl}
                      onClick={(e) => {
                        e.preventDefault();
                        setMobileMenuOpen(false);
                      }}
                      className="py-3 px-4 rounded-xl hover:bg-[var(--mix-base)]/20 flex items-center gap-2 transition-colors cursor-pointer"
                      style={{
                        color: overlayTextColor,
                        fontFamily: linkFontFamily,
                        fontSize: linkFontSize,
                        fontWeight: linkFontWeight,
                        letterSpacing: linkLetterSpacing,
                        textTransform: linkTextTransform as any,
                      }}
                    >
                      <span>{link.label || targetSec?.label || 'Link'}</span>
                      {link.targetType === 'external_url' && <ExternalLink className="w-4 h-4 opacity-60" />}
                    </a>
                  );
                })
              ) : (
                <span className="text-sm opacity-60 italic p-2">Nenhum link configurado</span>
              )}
            </nav>
          </div>

          {/* Botão CTA do Overlay */}
          <div className="pt-4 border-t border-[var(--surface-border)]/40 w-full">
            {renderCtaButton(true)}
          </div>
        </div>
      )}
    </header>
  );
}
