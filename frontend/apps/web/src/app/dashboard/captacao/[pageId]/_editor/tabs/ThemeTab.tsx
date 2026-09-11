'use client';

import React, { useEffect } from 'react';
import { FontPicker } from '@/components/FontPicker';
import { ImageUploader } from '../components/ImageUploader';
import { Input } from '@psi/ui';
import { Palette, Sparkles } from 'lucide-react';
import { CapturePage } from '@/lib/api';

import { loadGoogleFonts } from '../utils/googleFonts';
import { GlobalColorPicker } from '../PropertiesPanel/components/GlobalColorPicker';
import { getThemeColors } from '../utils/colorHelpers';

interface ThemeTabProps {
  page: CapturePage;
  onUpdateSiteConfig: (patch: any) => void;
  tenant: any;
}

export function ThemeTab({ page, onUpdateSiteConfig, tenant }: ThemeTabProps) {
  const theme = page.siteConfig?.theme || {};
  const { primaryStart, primaryEnd, contrast, siteBg } = getThemeColors(page);

  useEffect(() => {
    loadGoogleFonts([theme.fontHeading, theme.fontBody]);
  }, [theme.fontHeading, theme.fontBody]);

  const handleColorChange = (key: string, value: string) => {
    onUpdateSiteConfig({
      theme: {
        ...theme,
        [key]: value,
      },
    });
  };

  const handleFontChange = (type: 'heading' | 'body', font: string) => {
    const updatedHeading = type === 'heading' ? font : theme.fontHeading;
    const updatedBody = type === 'body' ? font : theme.fontBody;
    loadGoogleFonts([updatedHeading, updatedBody]);
    onUpdateSiteConfig({
      theme: {
        ...theme,
        [type === 'heading' ? 'fontHeading' : 'fontBody']: font,
      },
    });
  };

  const handleLogoChange = (logoUrl: string) => {
    onUpdateSiteConfig({
      logoUrl,
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--surface-border)] pb-4">
        <div className="p-2.5 rounded-xl brand-accent text-white shadow-md">
          <Palette className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Identidade Visual & Cores</h2>
          <p className="text-xs text-slate-500">Personalize a paleta de cores, tipografia e logotipo desta página de captura.</p>
        </div>
      </div>

      {/* Grid de Seções de Configuração */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logotipo */}
        <div className="glass-card p-5 rounded-2xl border border-[var(--surface-border)] space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--brand-gradient-start)]" />
            Logotipo da Página
          </h3>
          <ImageUploader
            label="Logotipo Principal"
            value={page.logoUrl || ''}
            onChange={handleLogoChange}
            tenantId={page.tenantId}
            isLogo={true}
            logoConfig={page.siteConfig?.logoConfig}
            onLogoConfigChange={(cfg) => onUpdateSiteConfig({ logoConfig: cfg })}
            defaultLogoText={tenant?.name || ''}
            gradientStart={theme.primaryStart || primaryStart}
            gradientEnd={theme.primaryEnd || primaryEnd}
            contrastColor={theme.contrast || contrast}
            headingFont={theme.fontHeading}
          />
        </div>

        {/* Tipografia */}
        <div className="glass-card p-5 rounded-2xl border border-[var(--surface-border)] space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            Tipografia & Fontes
          </h3>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <FontPicker
                label="Fonte dos Títulos"
                type="heading"
                value={theme.fontHeading || 'Playfair Display'}
                onChange={(font) => handleFontChange('heading', font)}
              />
            </div>

            <div className="space-y-1">
              <FontPicker
                label="Fonte do Corpo"
                type="body"
                value={theme.fontBody || 'Plus Jakarta Sans'}
                onChange={(font) => handleFontChange('body', font)}
              />
            </div>
          </div>
        </div>

        {/* Paleta de Cores */}
        <div className="glass-card p-5 rounded-2xl border border-[var(--surface-border)] space-y-4 md:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            Paleta de Cores do Tema
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlobalColorPicker
              label="Degradê Inicial"
              value={theme.primaryStart || primaryStart}
              onChange={(val) => handleColorChange('primaryStart', val)}
              page={page}
            />

            <GlobalColorPicker
              label="Degradê Final"
              value={theme.primaryEnd || primaryEnd}
              onChange={(val) => handleColorChange('primaryEnd', val)}
              page={page}
            />

            <GlobalColorPicker
              label="Cor de Destaque / Contraste"
              value={theme.contrast || contrast}
              onChange={(val) => handleColorChange('contrast', val)}
              page={page}
            />

            <GlobalColorPicker
              label="Fundo do Site"
              value={theme.siteBg || theme.cardBg || siteBg}
              onChange={(val) => {
                onUpdateSiteConfig({
                  theme: {
                    ...theme,
                    siteBg: val,
                    cardBg: val,
                  },
                });
              }}
              page={page}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

