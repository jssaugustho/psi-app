'use client';

import React from 'react';
import { NavbarConfig, Section } from '../types';
import { Compass, ExternalLink } from 'lucide-react';
import { BrandLogo } from '@psi/ui';
import { getThemeColors } from '../utils/colorHelpers';

interface SiteNavbarWrapperProps {
  navbar?: NavbarConfig;
  sections: Section[];
  isSelected: boolean;
  onSelect: (id: string, type: any) => void;
  page?: any;
}

export function SiteNavbarWrapper({
  navbar,
  sections,
  isSelected,
  onSelect,
  page,
}: SiteNavbarWrapperProps) {
  if (!navbar || !navbar.enabled) return null;

  const { primaryStart, primaryEnd, contrast, siteBg } = getThemeColors(page);
  const theme = page?.siteConfig?.theme || {};

  return (
    <header
      onClick={(e) => {
        e.stopPropagation();
        onSelect('navbar-root', 'navbar');
      }}
      className={`w-full py-3 px-6 rounded-2xl border border-[var(--surface-border)] backdrop-blur-md transition-all duration-200 cursor-pointer flex items-center justify-between mb-6 shadow-sm select-none ${
        isSelected
          ? 'outline outline-2 outline-emerald-500 -outline-offset-2'
          : 'hover:outline hover:outline-1 hover:outline-emerald-400/60 hover:-outline-offset-1'
      }`}
      style={{
        backgroundColor: `color-mix(in srgb, ${primaryStart} 4%, ${siteBg})`,
        color: contrast,
      }}
    >
      {/* Logotipo da Navbar (Consome as regras padrão via BrandLogo) */}
      <div className="flex items-center gap-2">
        <BrandLogo
          logoUrl={navbar?.customImageUrl || page?.logoUrl || theme?.logoUrl}
          logoConfig={page?.siteConfig?.logoConfig || (navbar?.customText ? { text: navbar.customText } : null)}
          faviconUrl={page?.faviconUrl || theme?.faviconUrl}
          title={navbar?.customText || page?.title}
          fallbackText="Psicologia"
          primaryStart={primaryStart}
          primaryEnd={primaryEnd}
          contrastColor={contrast}
          fontHeading={theme?.fontHeading}
          size="sm"
        />
      </div>

      {/* Links de Navegação do Menu Mapeados para Seções */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-semibold" style={{ color: contrast }}>
        {navbar.links && navbar.links.length > 0 ? (
          navbar.links.map((link) => {
            const targetSec = sections.find((s) => s.id === link.sectionId);
            return (
              <a
                key={link.id}
                href={link.targetType === 'section' ? `#${link.sectionId}` : link.externalUrl}
                onClick={(e) => e.preventDefault()}
                className="hover:opacity-80 transition-opacity flex items-center gap-1"
                style={{ color: contrast }}
              >
                <span>{link.label || targetSec?.label || 'Link'}</span>
                {link.targetType === 'external_url' && <ExternalLink className="w-2.5 h-2.5 opacity-60" />}
              </a>
            );
          })
        ) : (
          <span className="text-[10px] opacity-60 italic" style={{ color: contrast }}>
            Nenhum link configurado na Navbar
          </span>
        )}
      </nav>

      {/* Botão CTA do Topo */}
      {navbar.showCtaButton && (
        <button
          type="button"
          className="px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${primaryStart}, ${primaryEnd})`,
            color: '#FFFFFF',
          }}
        >
          {navbar.ctaButtonText || 'Agendar Consulta'}
        </button>
      )}
    </header>
  );
}

