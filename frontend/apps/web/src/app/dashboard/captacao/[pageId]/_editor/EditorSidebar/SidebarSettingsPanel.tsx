'use client';

import React, { useEffect } from 'react';
import { Palette, Type, Maximize2, Image as ImageIcon, Globe, Sliders, Plus } from 'lucide-react';
import { AccordionItem } from '../PropertiesPanel/components/AccordionSection';
import { GlobalColorPicker } from '../PropertiesPanel/components/GlobalColorPicker';
import { GlobalTypographyPicker } from '../PropertiesPanel/components/GlobalTypographyPicker';
import { SliderNumberInput } from '../PropertiesPanel/components/SliderNumberInput';
import { FontPicker } from '@/components/FontPicker';
import { ImageUploader } from '../components/ImageUploader';
import { loadGoogleFonts } from '../utils/googleFonts';
import { getThemeColors, getThemeTypography } from '../utils/colorHelpers';
import { Input } from '@psi/ui';
import { CapturePage } from '@/lib/api';
import { ViewportMode } from '../types';

interface SidebarSettingsPanelProps {
  page?: CapturePage | null;
  viewportMode?: ViewportMode;
  onUpdateSiteConfig?: (patch: any) => void;
  onUpdatePage?: (patch: Partial<CapturePage>) => void;
}

export function SidebarSettingsPanel({
  page,
  viewportMode = 'desktop',
  onUpdateSiteConfig,
  onUpdatePage,
}: SidebarSettingsPanelProps) {
  if (!page) {
    return (
      <div className="p-4 text-center text-xs text-slate-500">
        Nenhuma página carregada.
      </div>
    );
  }

  const isMobile = viewportMode === 'mobile';
  const theme = page.siteConfig?.theme || {};
  const mobileTheme = theme.mobile || {};

  // Em modo mobile, preferir os valores do override de mobile
  const effectiveTheme = isMobile ? { ...theme, ...mobileTheme } : theme;
  const { primaryStart, primaryEnd, contrast, siteBg } = getThemeColors(page);
  const containerMaxWidth = page.siteConfig?.containerMaxWidth || page.siteConfig?.layoutWidth || '1200px';



  const seo = page.seoConfig || {
    metaTitle: page.title || '',
    metaDescription: '',
    keywords: '',
    socialImage: '',
  };

  useEffect(() => {
    loadGoogleFonts([effectiveTheme.fontHeading, effectiveTheme.fontBody]);
  }, [effectiveTheme.fontHeading, effectiveTheme.fontBody]);

  // Handler genérico que trata Desktop vs Mobile Overrides
  const handleThemeUpdate = (patch: Record<string, any>) => {
    if (!onUpdateSiteConfig) return;
    if (isMobile) {
      onUpdateSiteConfig({
        theme: {
          ...theme,
          mobile: {
            ...mobileTheme,
            ...patch,
          },
        },
      });
    } else {
      onUpdateSiteConfig({
        theme: {
          ...theme,
          ...patch,
        },
      });
    }
  };

  const handleColorChange = (key: string, value: string) => {
    handleThemeUpdate({ [key]: value });
  };

  const handleFontChange = (type: 'heading' | 'body', font: string) => {
    const updatedHeading = type === 'heading' ? font : effectiveTheme.fontHeading;
    const updatedBody = type === 'body' ? font : effectiveTheme.fontBody;
    loadGoogleFonts([updatedHeading, updatedBody]);
    handleThemeUpdate({
      [type === 'heading' ? 'fontHeading' : 'fontBody']: font,
    });
  };

  const handleMaxWidthChange = (val: string) => {
    onUpdateSiteConfig?.({
      containerMaxWidth: val,
      layoutWidth: val,
    });
  };

  const globalLevels = [
    { key: 'h1', label: 'H1 — Título Principal', category: 'heading' as const },
    { key: 'h2', label: 'H2 — Título de Seção', category: 'heading' as const },
    { key: 'h3', label: 'H3 — Subseção', category: 'heading' as const },
    { key: 'h4', label: 'H4 — Etiqueta / Card', category: 'heading' as const },
    { key: 'paragraph', label: 'Parágrafo / Corpo', category: 'body' as const },
    { key: 'links', label: 'Links de Conteúdo', category: 'body' as const },
    { key: 'nav_links', label: 'Link de Navegação (Navbar Menu)', category: 'body' as const },
    { key: 'buttons', label: 'Texto de Botões CTA', category: 'body' as const },
  ];

  return (
    <div className="p-3 space-y-3 custom-scrollbar overflow-y-auto">
      {/* Indicator de Modo de Edição (Desktop vs Mobile) */}
      {isMobile && (
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 shrink-0" />
          <span>Editando Overrides para Dispositivos Mobile</span>
        </div>
      )}

      {/* 🎨 ACCORDEON 1: TEMA & CORES GLOBAIS */}
      <AccordionItem id="acc-theme-colors" title="Cores Globais & Tema" icon={Palette} defaultOpen={true}>
        <div className="space-y-3">
          <GlobalColorPicker
            label="Cor de Fundo do Site (Background)"
            value={effectiveTheme.siteBg || siteBg}
            onChange={(c) => handleColorChange('siteBg', c)}
            page={page}
          />
          <GlobalColorPicker
            label="Cor Primária Inicial (Gradiente)"
            value={effectiveTheme.primaryStart || primaryStart}
            onChange={(c) => handleColorChange('primaryStart', c)}
            page={page}
          />
          <GlobalColorPicker
            label="Cor Primária Final (Gradiente)"
            value={effectiveTheme.primaryEnd || primaryEnd}
            onChange={(c) => handleColorChange('primaryEnd', c)}
            page={page}
          />
          <GlobalColorPicker
            label="Cor de Contraste / Destaque"
            value={effectiveTheme.contrast || contrast}
            onChange={(c) => handleColorChange('contrast', c)}
            page={page}
          />
        </div>
      </AccordionItem>

      {/* 🔤 ACCORDEON 2: TIPOGRAFIA GLOBAL (8 NÍVEIS COM COMPONENTE NATIVO) */}
      <AccordionItem id="acc-typography" title="Tipografia & Fontes Globais" icon={Type} defaultOpen={true}>
        <div className="space-y-4">
          {/* Fontes Principais */}
          <div className="space-y-3">
            <FontPicker
              label="Fonte dos Títulos (H1 - H6)"
              type="heading"
              value={effectiveTheme.fontHeading || 'Plus Jakarta Sans'}
              onChange={(f) => handleFontChange('heading', f)}
            />

            <FontPicker
              label="Fonte do Corpo de Texto"
              type="body"
              value={effectiveTheme.fontBody || 'Inter'}
              onChange={(f) => handleFontChange('body', f)}
            />
          </div>

          {/* Escala Matemática Base com SliderNumberInput */}
          <div className="pt-2 border-t border-[var(--surface-border)] space-y-3">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Escala Tipográfica Base</h4>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tamanho Base da Fonte</label>
              <SliderNumberInput
                value={effectiveTheme.baseFontSize ? `${effectiveTheme.baseFontSize}px` : '16px'}
                onChange={(val) => handleThemeUpdate({ baseFontSize: parseInt(val, 10) || 16 })}
                min={10}
                max={32}
                defaultUnit="px"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Razão de Proporção (Type Scale)</label>
              <SliderNumberInput
                value={effectiveTheme.typeScaleRatio ? String(effectiveTheme.typeScaleRatio) : '1.25'}
                onChange={(val) => handleThemeUpdate({ typeScaleRatio: parseFloat(val) || 1.25 })}
                min={1.0}
                max={2.0}
                step={0.005}
                defaultUnit=""
                unitOptions={['']}
              />
            </div>
          </div>

          {/* 8 Níveis Tipográficos com GlobalTypographyPicker */}
          <div className="pt-2 border-t border-[var(--surface-border)] space-y-2">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Níveis Tipográficos Globais (8 Níveis)
            </h4>
            <p className="text-[10px] text-slate-500 mb-3">
              Personalize fonte, peso e tamanhos de cada nível. Os elementos herdam estas configurações e utilizam a cor do tema automaticamente.
            </p>

            <div className="space-y-2">
              {globalLevels.map((lvl) => (
                <div key={lvl.key} className="space-y-1">
                  <GlobalTypographyPicker
                    label={lvl.label}
                    typoPreset={lvl.key}
                    defaultFontCategory={lvl.category}
                    page={page}
                    viewportMode={viewportMode}
                    onUpdateSiteConfig={onUpdateSiteConfig}
                    onChangeTypography={(patch) => {
                      const currentLevels = (isMobile ? mobileTheme.levels : theme.levels) || {};
                      const existingTarget = { ...(currentLevels[lvl.key] || {}) };
                      Object.entries(patch).forEach(([k, v]) => {
                        if (v === '' || v === undefined) {
                          delete (existingTarget as any)[k];
                        } else {
                          (existingTarget as any)[k] = v;
                        }
                      });
                      if (isMobile) {
                        onUpdateSiteConfig?.({
                          theme: {
                            ...theme,
                            mobile: {
                              ...mobileTheme,
                              levels: {
                                ...currentLevels,
                                [lvl.key]: existingTarget,
                              },
                            },
                          },
                        });
                      } else {
                        onUpdateSiteConfig?.({
                          theme: {
                            ...theme,
                            levels: {
                              ...currentLevels,
                              [lvl.key]: existingTarget,
                            },
                          },
                        });
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </AccordionItem>



      {/* 📐 ACCORDEON 4: LARGURA MÁXIMA DO CONTEÚDO */}
      <AccordionItem id="acc-max-width" title="Largura Máxima do Conteúdo" icon={Maximize2} defaultOpen={false}>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase block">Largura Máxima das Seções</label>
            <p className="text-[10px] text-slate-500">Define o limite de largura (`max-width`) do container interno das seções.</p>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {['1140px', '1200px', '1280px', '1400px'].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => handleMaxWidthChange(w)}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  containerMaxWidth === w
                    ? 'brand-accent text-white border-[var(--brand-gradient-start)]'
                    : 'glass-sm border-[var(--surface-border)] text-slate-600 dark:text-slate-300 hover:border-[var(--brand-gradient-start)]'
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase">Personalizado</label>
            <SliderNumberInput
              value={containerMaxWidth}
              onChange={(val) => handleMaxWidthChange(val)}
              min={800}
              max={1920}
              defaultUnit="px"
            />
          </div>
        </div>
      </AccordionItem>

      {/* 🖼️ ACCORDEON 5: LOGOTIPO PRINCIPAL */}
      <AccordionItem id="acc-logo" title="Logotipo da Página" icon={ImageIcon} defaultOpen={false}>
        <div className="space-y-3">
          <ImageUploader
            label="Logotipo Principal"
            value={page.logoUrl || ''}
            onChange={(url) => onUpdateSiteConfig?.({ logoUrl: url })}
            tenantId={page.tenantId}
            targetWidth={300}
            targetHeight={100}
            aspectRatio={3}
            isLogo={true}
            logoConfig={page.siteConfig?.logoConfig}
            onLogoConfigChange={(cfg) => onUpdateSiteConfig?.({ logoConfig: cfg })}
            defaultLogoText={page.title || 'PSI'}
            gradientStart={effectiveTheme.primaryStart || primaryStart}
            gradientEnd={effectiveTheme.primaryEnd || primaryEnd}
            contrastColor={effectiveTheme.contrast || contrast}
            headingFont={effectiveTheme.fontHeading}
          />
        </div>
      </AccordionItem>

      {/* 🌐 ACCORDEON 6: SEO & IDENTIFICAÇÃO */}
      <AccordionItem id="acc-seo" title="Identificação & SEO" icon={Globe} defaultOpen={false}>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Título da Página</label>
            <Input
              type="text"
              value={page.title || ''}
              onChange={(e) => onUpdatePage?.({ title: e.target.value })}
              placeholder="Título da página..."
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Slug da URL</label>
            <Input
              type="text"
              value={page.slug || ''}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '');
                onUpdatePage?.({ slug: val });
              }}
              placeholder="slug-da-pagina"
              className="text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Meta Descrição (SEO)</label>
            <textarea
              value={seo.metaDescription || ''}
              onChange={(e) =>
                onUpdatePage?.({
                  seoConfig: {
                    ...seo,
                    metaDescription: e.target.value,
                  },
                })
              }
              placeholder="Descrição para buscadores..."
              rows={3}
              className="w-full p-2 text-xs rounded-xl border border-[var(--surface-border)] glass-sm outline-none focus:border-[var(--brand-gradient-start)] resize-none"
            />
          </div>
        </div>
      </AccordionItem>
    </div>
  );
}
