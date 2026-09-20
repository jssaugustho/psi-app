'use client';

import React from 'react';
import { CanvasData, NavbarConfig, NavbarLink } from '../types';
import { getSectionDisplayName, sanitizeUriSlug } from '@psi/canvas-renderer';
import { Input, Select } from '@psi/ui';
import {
  Compass,
  Plus,
  Trash2,
  Sparkles,
  Sliders,
  Menu,
  Palette,
  Image as ImageIcon,
  Type,
  MousePointerClick,
  RotateCcw,
} from 'lucide-react';
import { AccordionItem } from '../PropertiesPanel/components/AccordionSection';
import { GlobalColorPicker } from '../PropertiesPanel/components/GlobalColorPicker';
import { GlobalTypographyPicker, TypographyPatch } from '../PropertiesPanel/components/GlobalTypographyPicker';
import { ImageUploader } from '../components/ImageUploader';
import { FontPicker } from '@/components/FontPicker';
import { getThemeColors, getThemeTypography, getThemeButtonDefaults } from '../utils/colorHelpers';
import { loadGoogleFonts } from '../utils/googleFonts';
import { TransformControl } from '../PropertiesPanel/components/TransformControl';
import { TransitionControl } from '../PropertiesPanel/components/TransitionControl';
import { IconPicker } from '../PropertiesPanel/components/IconPicker';

interface NavbarPanelProps {
  canvasData: CanvasData | null;
  page?: any;
  onUpdateNavbar: (patch: Partial<NavbarConfig>) => void;
  onUpdateSiteConfig?: (patch: any) => void;
}

const COLOR_PALETTES = [
  { name: 'Índigo & Roxo (Tranquilidade)', start: '#4F46E5', end: '#7C3AED', contrast: '#18181B', bg: '#FFFFFF' },
  { name: 'Esmeralda & Menta (Saúde)', start: '#059669', end: '#10B981', contrast: '#064E3B', bg: '#F0FDF4' },
  { name: 'Rosa & Terracota (Acolhimento)', start: '#E11D48', end: '#F43F5E', contrast: '#881337', bg: '#FFF1F2' },
  { name: 'Oceanic & Sereno (Clareza)', start: '#0284C7', end: '#38BDF8', contrast: '#0C4A6E', bg: '#F0F9FF' },
  { name: 'Dourado & Âmbar (Elegância)', start: '#D97706', end: '#F59E0B', contrast: '#451A03', bg: '#FFFBEB' },
];

const TYPE_SCALE_OPTIONS = [
  { value: '1.2', label: '1.20 - Minor Third (Suave)' },
  { value: '1.25', label: '1.25 - Major Third (Recomendado)' },
  { value: '1.333', label: '1.333 - Perfect Fourth (Equilibrado)' },
  { value: '1.414', label: '1.414 - Augmented Fourth (Dramático)' },
  { value: '1.5', label: '1.50 - Perfect Fifth (Grandioso)' },
];

const TYPOGRAPHY_LEVELS: Array<{
  key: 'h1' | 'h2' | 'h3' | 'h4' | 'paragraph' | 'links' | 'buttons';
  title: string;
  category: 'heading' | 'body';
}> = [
  { key: 'h1', title: 'H1 Principal', category: 'heading' },
  { key: 'h2', title: 'H2 Seção', category: 'heading' },
  { key: 'h3', title: 'H3 Subseção', category: 'heading' },
  { key: 'h4', title: 'H4 Etiqueta / Card', category: 'heading' },
  { key: 'paragraph', title: 'Parágrafo / Corpo', category: 'body' },
  { key: 'links', title: 'Links & Navegação', category: 'body' },
  { key: 'buttons', title: 'Texto de Botões', category: 'body' },
];

export function NavbarPanel({ canvasData, page, onUpdateNavbar, onUpdateSiteConfig }: NavbarPanelProps) {
  const tenantId = page?.tenantId || page?.workspaceId || '';
  const theme = page?.siteConfig?.theme || {};
  const { primaryStart, primaryEnd, contrast, siteBg } = getThemeColors(page);
  const themeTypo = getThemeTypography(page);
  const themeButton = getThemeButtonDefaults(page);
  const savedLevels = theme.levels || theme.typographyLevels || {};

  const handleButtonDefaultsChange = (patch: any) => {
    const currentButtons = theme.buttons || theme.buttonDefaults || {};
    handleThemeChange({
      buttons: {
        ...currentButtons,
        ...patch,
      },
    });
  };

  const navbar: NavbarConfig = canvasData?.navbar || {
    enabled: true,
    logoMode: 'workspace',
    positionMode: 'sticky',
    sticky: true,
    links: [],
    showCtaButton: true,
    ctaButtonText: 'Agendar Consulta',
    ctaButtonAction: 'cta_primary',
    enableMobileHamburger: true,
  };

  const sections = canvasData?.sections || [];

  const handleThemeChange = (patch: any) => {
    onUpdateSiteConfig?.({
      theme: {
        ...theme,
        ...patch,
      },
    });
  };

  const handleLevelTypographyChange = (
    levelKey: 'h1' | 'h2' | 'h3' | 'h4' | 'paragraph' | 'links' | 'buttons',
    patch: TypographyPatch
  ) => {
    const currentLevels = theme.levels || theme.typographyLevels || {};
    handleThemeChange({
      levels: {
        ...currentLevels,
        [levelKey]: {
          ...(currentLevels[levelKey] || {}),
          ...patch,
        },
      },
    });
  };

  const handleResetLevelTypography = (
    levelKey: 'h1' | 'h2' | 'h3' | 'h4' | 'paragraph' | 'links' | 'buttons'
  ) => {
    const currentLevels = { ...(theme.levels || theme.typographyLevels || {}) };
    delete currentLevels[levelKey];
    handleThemeChange({
      levels: currentLevels,
    });
  };

  const handleLogoChange = (logoUrl: string) => {
    onUpdateSiteConfig?.({
      logoUrl,
    });
  };

  const handleFontChange = (type: 'heading' | 'body', font: string) => {
    const updatedHeading = type === 'heading' ? font : themeTypo.fontHeading;
    const updatedBody = type === 'body' ? font : themeTypo.fontBody;
    loadGoogleFonts([updatedHeading, updatedBody]);
    handleThemeChange({
      [type === 'heading' ? 'fontHeading' : 'fontBody']: font,
    });
  };

  // Mapeia todas as seções ativas da página para o menu
  const handleMapAllSections = () => {
    const links: NavbarLink[] = sections.map((sec, idx) => ({
      id: crypto.randomUUID(),
      label: sec.label || `Seção ${idx + 1}`,
      targetType: 'section',
      sectionId: sec.id,
    }));

    onUpdateNavbar({ links });
  };

  const handleToggleSectionLink = (secId: string, secLabel: string) => {
    const existingIndex = navbar.links.findIndex((l) => l.sectionId === secId);
    let updatedLinks = [...navbar.links];

    if (existingIndex !== -1) {
      updatedLinks.splice(existingIndex, 1);
    } else {
      updatedLinks.push({
        id: crypto.randomUUID(),
        label: secLabel,
        targetType: 'section',
        sectionId: secId,
      });
    }

    onUpdateNavbar({ links: updatedLinks });
  };

  const handleUpdateSectionLinkLabel = (secId: string, newLabel: string) => {
    const links = navbar.links.map((l) => {
      if (l.sectionId === secId) {
        return { ...l, label: newLabel };
      }
      return l;
    });
    onUpdateNavbar({ links });
  };

  const handleAddCustomLink = () => {
    const newLink: NavbarLink = {
      id: crypto.randomUUID(),
      label: 'Novo Link',
      targetType: 'external_url',
      externalUrl: 'https://',
    };
    onUpdateNavbar({ links: [...navbar.links, newLink] });
  };

  const handleUpdateLink = (linkId: string, patch: Partial<NavbarLink>) => {
    const links = navbar.links.map((l) => (l.id === linkId ? { ...l, ...patch } : l));
    onUpdateNavbar({ links });
  };

  const handleRemoveLink = (linkId: string) => {
    const links = navbar.links.filter((l) => l.id !== linkId);
    onUpdateNavbar({ links });
  };

  return (
    <div className="p-4 space-y-4 text-xs select-none">
      {/* Header do Painel de Configurações */}
      <div className="flex items-center gap-2.5 border-b border-[var(--surface-border)] pb-3">
        <div className="p-2 rounded-xl brand-accent text-white shadow-sm">
          <Sliders className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-xs">Configurações Gerais</h3>
          <p className="text-[10px] text-slate-500">Personalize navegação, cores, logo e tipografia da página.</p>
        </div>
      </div>

      {/* 🟢 ACCORDION 1: MENU DE NAVEGAÇÃO (NAVBAR SIMPLIFICADA) */}
      <AccordionItem
        id="nav-links"
        title="Menu de Navegação (Navbar)"
        icon={Compass}
        defaultOpen={false}
      >
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer font-bold text-slate-800 dark:text-slate-200 p-2.5 rounded-xl border border-[var(--surface-border)] glass-sm">
            <span>Exibir Cabeçalho no Site</span>
            <input
              type="checkbox"
              checked={navbar.enabled !== false}
              onChange={(e) => onUpdateNavbar({ enabled: e.target.checked })}
              className="w-4 h-4 rounded text-[var(--brand-gradient-start)] cursor-pointer"
            />
          </label>

          {navbar.enabled !== false && (
            <>
              {/* Seções & Nomes no Menu */}
              <div className="space-y-2 pt-2 border-t border-[var(--surface-border)]/60">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Seções & Nomes no Menu
                  </h4>
                  <button
                    type="button"
                    onClick={handleMapAllSections}
                    className="text-[9px] font-bold text-[var(--brand-gradient-start)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Mapear Todas
                  </button>
                </div>

                {sections.length > 0 ? (
                  <div className="space-y-2">
                    {sections.map((sec, idx) => {
                      const mappedLink = navbar.links.find((l) => l.sectionId === sec.id);
                      const isMapped = !!mappedLink;

                      return (
                        <div
                          key={sec.id}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                            isMapped
                              ? 'border-blue-500/50 bg-blue-500/5'
                              : 'border-[var(--surface-border)] glass-sm opacity-70'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isMapped}
                            onChange={() => handleToggleSectionLink(sec.id, sec.label || `Seção ${idx + 1}`)}
                            className="w-4 h-4 rounded text-blue-600 cursor-pointer shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            {isMapped ? (
                              <Input
                                type="text"
                                value={mappedLink?.label || ''}
                                onChange={(e) => handleUpdateSectionLinkLabel(sec.id, e.target.value)}
                                placeholder="Rótulo no Menu"
                                className="text-xs font-bold py-1 px-2"
                              />
                            ) : (
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate block">
                                {sec.label || `Seção ${idx + 1}`}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400">Nenhuma seção criada na página.</p>
                )}
              </div>

              {/* Links Personalizados Extras */}
              <div className="space-y-2 pt-2 border-t border-[var(--surface-border)]/60">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Links Externos Extras
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddCustomLink}
                    className="text-[9px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Novo Link
                  </button>
                </div>

                {navbar.links.filter((l) => l.targetType === 'external_url').length > 0 && (
                  <div className="space-y-2">
                    {navbar.links
                      .filter((l) => l.targetType === 'external_url')
                      .map((link) => (
                        <div
                          key={link.id}
                          className="p-2.5 rounded-xl border border-[var(--surface-border)] glass-sm space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Input
                              type="text"
                              value={link.label}
                              onChange={(e) => handleUpdateLink(link.id, { label: e.target.value })}
                              placeholder="Título do Link"
                              className="text-xs font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveLink(link.id)}
                              className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <Input
                            type="text"
                            value={link.externalUrl || ''}
                            onChange={(e) => handleUpdateLink(link.id, { externalUrl: e.target.value })}
                            placeholder="https://..."
                            className="text-[10px] font-mono"
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Comportamento da Navbar */}
              <div className="space-y-3 pt-2 border-t border-[var(--surface-border)]/60">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Comportamento da Navbar
                </h4>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500">Modo de Posicionamento</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { value: 'static', label: 'Padrão' },
                      { value: 'sticky', label: 'Sticky (rola)' },
                      { value: 'fixed', label: 'Fixed (topo)' },
                    ].map((opt) => {
                      const currentMode = navbar.positionMode || (navbar.sticky ? 'sticky' : 'static');
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            onUpdateNavbar({
                              positionMode: opt.value as any,
                              sticky: opt.value === 'sticky' || opt.value === 'fixed',
                            })
                          }
                          className={`py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                            currentMode === opt.value
                              ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                              : 'border-[var(--surface-border)] text-slate-500'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--surface-border)]/60 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Menu className="w-3.5 h-3.5 text-purple-500" />
                      <span>Menu Hambúrguer no Mobile</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={navbar.enableMobileHamburger !== false}
                      onChange={(e) => onUpdateNavbar({ enableMobileHamburger: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                    />
                  </label>

                  {navbar.enableMobileHamburger !== false && (
                    <div className="space-y-3 p-3 rounded-xl border border-[var(--surface-border)] glass-sm">
                      <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        📱 Overlay Fullscreen (Mobile)
                      </h5>

                      <GlobalColorPicker
                        label="Cor de Fundo do Overlay"
                        value={navbar.mobileOverlayBgColor || ''}
                        onChange={(v) => onUpdateNavbar({ mobileOverlayBgColor: v })}
                        page={page}
                      />

                      <GlobalColorPicker
                        label="Cor dos Textos do Overlay"
                        value={navbar.mobileOverlayTextColor || ''}
                        onChange={(v) => onUpdateNavbar({ mobileOverlayTextColor: v })}
                        page={page}
                      />

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500">Alinhamento dos Links</label>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { value: 'left', label: 'Esquerda' },
                            { value: 'center', label: 'Centro' },
                            { value: 'right', label: 'Direita' },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => onUpdateNavbar({ mobileMenuAlign: opt.value as any })}
                              className={`py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                                (navbar.mobileMenuAlign || 'center') === opt.value
                                  ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                                  : 'border-[var(--surface-border)] text-slate-500'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500">Desfocagem de Fundo (Backdrop Blur)</label>
                        <Select
                          value={navbar.mobileOverlayBackdropBlur || 'md'}
                          onChange={(e) => onUpdateNavbar({ mobileOverlayBackdropBlur: e.target.value as any })}
                          options={[
                            { value: 'none', label: 'Nenhum' },
                            { value: 'sm', label: 'Suave (sm)' },
                            { value: 'md', label: 'Médio (md)' },
                            { value: 'lg', label: 'Forte (lg)' },
                          ]}
                          variant="glass"
                        />
                      </div>

                      <label className="flex items-center justify-between cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300 pt-1">
                        <span>Exibir Botão CTA no Overlay</span>
                        <input
                          type="checkbox"
                          checked={navbar.showMobileCtaButton !== false}
                          onChange={(e) => onUpdateNavbar({ showMobileCtaButton: e.target.checked })}
                          className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Logotipo da Navbar */}
              <div className="space-y-3 pt-2 border-t border-[var(--surface-border)]/60">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Logotipo da Navbar
                </h4>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500">Tamanho do Logotipo (px)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={20}
                      max={72}
                      step={2}
                      value={typeof navbar.logoHeight === 'number' ? navbar.logoHeight : parseInt(String(navbar.logoHeight || '32'), 10) || 32}
                      onChange={(e) => onUpdateNavbar({ logoHeight: Number(e.target.value) })}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 min-w-[36px] text-right">
                      {navbar.logoHeight || 32}px
                    </span>
                  </div>
                </div>
              </div>

              {/* Botão CTA da Navbar & Controle de Destino */}
              {/* Botão CTA da Navbar & Controle de Destino */}
              <div className="space-y-3 pt-2 border-t border-[var(--surface-border)]/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                      Botão CTA da Navbar
                    </h4>
                    {Boolean(
                      navbar.ctaVariant ||
                      navbar.ctaBgColor ||
                      navbar.ctaTextColor ||
                      navbar.ctaBorderRadius ||
                      navbar.ctaBorderWidth ||
                      navbar.ctaBorderColor ||
                      navbar.ctaBorderStyle ||
                      navbar.ctaFontSize ||
                      navbar.ctaFontWeight ||
                      navbar.ctaFontFamily ||
                      navbar.ctaLetterSpacing ||
                      navbar.ctaTextTransform ||
                      navbar.ctaPaddingX ||
                      navbar.ctaPaddingY
                    ) ? (
                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
                        ✏️ Custom
                      </span>
                    ) : (
                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                        ✨ Herdando Tema
                      </span>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={navbar.showCtaButton !== false}
                    onChange={(e) => onUpdateNavbar({ showCtaButton: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer shrink-0"
                  />
                </div>

                {navbar.showCtaButton !== false && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500">Texto do Botão</label>
                      <Input
                        type="text"
                        value={navbar.ctaButtonText || 'Agendar Consulta'}
                        onChange={(e) => onUpdateNavbar({ ctaButtonText: e.target.value })}
                        className="text-xs font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500">Destino / Ação do Botão</label>
                      <Select
                        value={navbar.ctaButtonAction || 'cta_primary'}
                        onChange={(e) => onUpdateNavbar({ ctaButtonAction: e.target.value as any })}
                        options={[
                          { value: 'cta_primary', label: 'Formulário de Agendamento (Modal)' },
                          { value: 'whatsapp', label: 'Mensagem no WhatsApp' },
                          { value: 'scroll_to', label: 'Rolar até uma Seção' },
                          { value: 'external_url', label: 'Abrir Link / URL Externa' },
                        ]}
                        variant="glass"
                      />
                    </div>

                    {navbar.ctaButtonAction === 'whatsapp' && (
                      <div className="space-y-2 p-2.5 rounded-xl border border-[var(--surface-border)] glass-sm">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500">Número do WhatsApp (com DDD)</label>
                          <Input
                            type="text"
                            value={navbar.ctaWhatsappNumber || ''}
                            onChange={(e) => onUpdateNavbar({ ctaWhatsappNumber: e.target.value })}
                            placeholder="Ex: 11999998888"
                            className="text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500">Mensagem Inicial</label>
                          <textarea
                            rows={2}
                            value={navbar.ctaWhatsappMessage || ''}
                            onChange={(e) => onUpdateNavbar({ ctaWhatsappMessage: e.target.value })}
                            placeholder="Olá, gostaria de agendar uma consulta..."
                            className="w-full p-2 text-xs rounded-lg border border-[var(--surface-border)] bg-transparent outline-none resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {navbar.ctaButtonAction === 'scroll_to' && (
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500">Seção de Destino</label>
                        <Select
                          value={navbar.ctaScrollTargetId || ''}
                          onChange={(e) => onUpdateNavbar({ ctaScrollTargetId: e.target.value })}
                          options={[
                            { value: '', label: 'Selecione uma seção...' },
                            ...sections.map((s, idx) => {
                              const anchor = s.anchorId || sanitizeUriSlug(s.label || s.id);
                              const name = getSectionDisplayName(s, idx);
                              return {
                                value: anchor,
                                label: `🎯 ${name} (#${anchor})`,
                              };
                            }),
                          ]}
                          variant="glass"
                        />
                      </div>
                    )}

                    {navbar.ctaButtonAction === 'external_url' && (
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500">URL Externa</label>
                        <Input
                          type="text"
                          value={navbar.ctaExternalUrl || ''}
                          onChange={(e) => onUpdateNavbar({ ctaExternalUrl: e.target.value })}
                          placeholder="https://..."
                          className="text-xs font-mono"
                        />
                      </div>
                    )}

                    <div className="pt-2 border-t border-[var(--surface-border)]/60 space-y-3">
                      {/* Botão de Redefinir para Padrões Globais */}
                      {Boolean(
                        navbar.ctaVariant ||
                        navbar.ctaBgColor ||
                        navbar.ctaTextColor ||
                        navbar.ctaBorderRadius ||
                        navbar.ctaBorderWidth ||
                        navbar.ctaBorderColor ||
                        navbar.ctaBorderStyle ||
                        navbar.ctaFontSize ||
                        navbar.ctaFontWeight ||
                        navbar.ctaFontFamily ||
                        navbar.ctaLetterSpacing ||
                        navbar.ctaTextTransform ||
                        navbar.ctaPaddingX ||
                        navbar.ctaPaddingY
                      ) && (
                        <button
                          type="button"
                          onClick={() => onUpdateNavbar({
                            ctaVariant: undefined,
                            ctaBgColor: undefined,
                            ctaTextColor: undefined,
                            ctaBorderRadius: undefined,
                            ctaBorderWidth: undefined,
                            ctaBorderColor: undefined,
                            ctaBorderStyle: undefined,
                            ctaFontSize: undefined,
                            ctaFontWeight: undefined,
                            ctaFontFamily: undefined,
                            ctaLetterSpacing: undefined,
                            ctaTextTransform: undefined,
                            ctaPaddingX: undefined,
                            ctaPaddingY: undefined,
                            ctaIconLeft: undefined,
                            ctaIconRight: undefined,
                          })}
                          className="w-full py-1.5 px-3 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Restaurar 100% o Estilo Padrão do Tema Global para o CTA da Navbar"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restaurar Estilo Padrão do Tema Global</span>
                        </button>
                      )}

                      {/* Variante Visual do Botão CTA */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Estilo Visual (Variante)
                          </label>
                          {!navbar.ctaVariant && (
                            <span className="text-[9px] text-emerald-600 font-medium">
                              ✨ Tema: {themeButton.variant || 'gradient'}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { value: 'gradient', label: 'Gradiente' },
                            { value: 'solid', label: 'Sólido' },
                            { value: 'glass', label: 'Glass' },
                            { value: 'outline', label: 'Outline' },
                            { value: 'soft', label: 'Soft' },
                          ].map((item) => {
                            const activeVariant = navbar.ctaVariant || themeButton.variant || 'gradient';
                            return (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() => onUpdateNavbar({ ctaVariant: item.value as any })}
                                className={`py-1.5 rounded-lg border text-[9px] font-bold transition-all cursor-pointer ${
                                  activeVariant === item.value
                                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-extrabold'
                                    : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Cores */}
                      <GlobalColorPicker
                        label="Cor de Fundo do Botão CTA"
                        value={navbar.ctaBgColor || (themeButton.variant === 'solid' ? themeButton.backgroundColor : themeButton.gradientString) || primaryStart}
                        onChange={(v) => onUpdateNavbar({ ctaBgColor: v })}
                        page={page}
                      />

                      <GlobalColorPicker
                        label="Cor do Texto do Botão CTA"
                        value={navbar.ctaTextColor || themeButton.color || '#FFFFFF'}
                        onChange={(v) => onUpdateNavbar({ ctaTextColor: v })}
                        page={page}
                      />

                      {/* Border Radius do Botão CTA */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Formato dos Cantos (Border Radius)
                          </label>
                          {!navbar.ctaBorderRadius && (
                            <span className="text-[9px] text-emerald-600 font-medium">
                              ✨ Tema: {themeButton.borderRadius || '12px'}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { value: '0px', label: 'Quadrado' },
                            { value: '8px', label: 'Suave' },
                            { value: '12px', label: 'Arredondado' },
                            { value: '9999px', label: 'Cápsula' },
                          ].map((item) => {
                            const activeRadius = navbar.ctaBorderRadius || themeButton.borderRadius || '12px';
                            return (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() => onUpdateNavbar({ ctaBorderRadius: item.value })}
                                className={`py-1.5 rounded-lg border text-[9px] font-bold transition-all cursor-pointer ${
                                  activeRadius === item.value
                                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-extrabold'
                                    : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Borda do Botão CTA */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Borda do Botão CTA
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400">Estilo</label>
                            <select
                              value={navbar.ctaBorderStyle || themeButton.borderStyle || 'none'}
                              onChange={(e) => onUpdateNavbar({ ctaBorderStyle: e.target.value as any })}
                              className="w-full text-[10px] rounded-lg border border-[var(--surface-border)] bg-transparent p-1.5 outline-none"
                            >
                              <option value="none">Nenhuma</option>
                              <option value="solid">Sólida</option>
                              <option value="dashed">Tracejada</option>
                              <option value="dotted">Pontilhada</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400">Espessura</label>
                            <select
                              value={navbar.ctaBorderWidth || themeButton.borderWidth || '1px'}
                              onChange={(e) => onUpdateNavbar({ ctaBorderWidth: e.target.value })}
                              className="w-full text-[10px] rounded-lg border border-[var(--surface-border)] bg-transparent p-1.5 outline-none"
                            >
                              <option value="1px">1px</option>
                              <option value="2px">2px</option>
                              <option value="3px">3px</option>
                              <option value="4px">4px</option>
                            </select>
                          </div>
                        </div>
                        {((navbar.ctaBorderStyle || themeButton.borderStyle) && (navbar.ctaBorderStyle || themeButton.borderStyle) !== 'none') && (
                          <GlobalColorPicker
                            label="Cor da Borda"
                            value={navbar.ctaBorderColor || themeButton.borderColor || ''}
                            onChange={(v) => onUpdateNavbar({ ctaBorderColor: v })}
                            page={page}
                          />
                        )}
                      </div>

                      {/* Tipografia do Botão CTA */}
                      <GlobalTypographyPicker
                        label="Tipografia do Botão CTA"
                        typoPreset={navbar.ctaFontSize ? 'custom' : 'links'}
                        fontFamily={navbar.ctaFontFamily}
                        fontSize={navbar.ctaFontSize}
                        fontWeight={navbar.ctaFontWeight}
                        letterSpacing={navbar.ctaLetterSpacing}
                        textTransform={navbar.ctaTextTransform}
                        page={page}
                        onUpdateSiteConfig={onUpdateSiteConfig}
                        defaultFontCategory="body"
                        onClearOverrides={() => {
                          onUpdateNavbar({
                            ctaFontFamily: undefined,
                            ctaFontSize: undefined,
                            ctaFontWeight: undefined,
                            ctaLetterSpacing: undefined,
                            ctaTextTransform: undefined,
                          });
                        }}
                        onChangeTypography={(patch) => {
                          const updated: Partial<NavbarConfig> = {};
                          if (patch.fontFamily !== undefined) updated.ctaFontFamily = patch.fontFamily;
                          if (patch.fontSize !== undefined) updated.ctaFontSize = patch.fontSize;
                          if (patch.fontWeight !== undefined) updated.ctaFontWeight = patch.fontWeight;
                          if (patch.letterSpacing !== undefined) updated.ctaLetterSpacing = patch.letterSpacing;
                          if (patch.textTransform !== undefined) updated.ctaTextTransform = patch.textTransform as any;
                          onUpdateNavbar(updated);
                        }}
                      />

                      {/* Ícones do Botão CTA */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Ícones do Botão CTA
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400">Esquerda</label>
                            <IconPicker
                              selectedName={navbar.ctaIconLeft || ''}
                              onSelectIcon={(iconName: string) => onUpdateNavbar({ ctaIconLeft: iconName })}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400">Direita</label>
                            <IconPicker
                              selectedName={navbar.ctaIconRight || ''}
                              onSelectIcon={(iconName: string) => onUpdateNavbar({ ctaIconRight: iconName })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cores Gerais da Navbar + Tipografia dos Links */}
              <div className="pt-2 border-t border-[var(--surface-border)]/60 space-y-3">
                <GlobalColorPicker
                  label="Cor de Fundo da Navbar"
                  value={navbar.backgroundColor || ''}
                  onChange={(v) => onUpdateNavbar({ backgroundColor: v })}
                  page={page}
                />

                <GlobalColorPicker
                  label="Cor dos Textos & Links da Navbar"
                  value={navbar.textColor || ''}
                  onChange={(v) => onUpdateNavbar({ textColor: v })}
                  page={page}
                />

                {/* Tipografia dos Links da Navbar */}
                <div className="pt-2 border-t border-[var(--surface-border)]/60 space-y-1">
                  <GlobalTypographyPicker
                    label="Tipografia dos Links do Menu"
                    typoPreset={navbar.linkFontSize ? 'custom' : 'links'}
                    fontFamily={navbar.linkFontFamily}
                    fontSize={navbar.linkFontSize}
                    fontWeight={navbar.linkFontWeight}
                    letterSpacing={navbar.linkLetterSpacing}
                    textTransform={navbar.linkTextTransform}
                    defaultFontCategory="body"
                    page={page}
                    onClearOverrides={() => {
                      onUpdateNavbar({
                        linkFontFamily: undefined,
                        linkFontSize: undefined,
                        linkFontWeight: undefined,
                        linkLetterSpacing: undefined,
                        linkTextTransform: undefined,
                      });
                    }}
                    onChangeTypography={(patch) => {
                      const updated: Partial<NavbarConfig> = {};
                      if (patch.fontFamily !== undefined) updated.linkFontFamily = patch.fontFamily;
                      if (patch.fontSize !== undefined) updated.linkFontSize = patch.fontSize;
                      if (patch.fontWeight !== undefined) updated.linkFontWeight = patch.fontWeight;
                      if (patch.letterSpacing !== undefined) updated.linkLetterSpacing = patch.letterSpacing;
                      if (patch.textTransform !== undefined) updated.linkTextTransform = patch.textTransform as any;
                      onUpdateNavbar(updated);
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </AccordionItem>

      {/* 🔵 ACCORDION 2: LOGOTIPO & IDENTIDADE VISUAL */}
      <AccordionItem
        id="page-logo-identity"
        title="Logotipo & Identidade Visual"
        icon={ImageIcon}
        defaultOpen={false}
      >
        <div className="space-y-4">
          <ImageUploader
            label="Logotipo Principal da Página"
            value={page?.logoUrl || ''}
            onChange={handleLogoChange}
            tenantId={tenantId}
            targetWidth={300}
            targetHeight={100}
            aspectRatio={3}
            isLogo={true}
            logoConfig={page?.siteConfig?.logoConfig}
            onLogoConfigChange={(cfg) => onUpdateSiteConfig?.({ logoConfig: cfg })}
            defaultLogoText={page?.workspace?.name || page?.tenant?.name || ''}
            gradientStart={theme.primaryStart || primaryStart}
            gradientEnd={theme.primaryEnd || primaryEnd}
            contrastColor={theme.contrast || contrast}
            headingFont={theme.fontHeading || themeTypo.fontHeading}
          />

          <div className="pt-2 border-t border-[var(--surface-border)]/60">
            <ImageUploader
              label="Favicon da Página (.ico / .png)"
              value={theme.faviconUrl || ''}
              onChange={(url) => handleThemeChange({ faviconUrl: url })}
              tenantId={tenantId}
              targetWidth={64}
              targetHeight={64}
              allowTransparency={true}
            />
          </div>
        </div>
      </AccordionItem>

      {/* 🟣 ACCORDION 3: PALETA DE CORES DO TEMA */}
      <AccordionItem
        id="theme-colors-palette"
        title="Paleta de Cores do Tema"
        icon={Palette}
        defaultOpen={false}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <GlobalColorPicker
              label="Degradê Inicial"
              value={theme.primaryStart || primaryStart}
              onChange={(val) => handleThemeChange({ primaryStart: val })}
              page={page}
            />

            <GlobalColorPicker
              label="Degradê Final"
              value={theme.primaryEnd || primaryEnd}
              onChange={(val) => handleThemeChange({ primaryEnd: val })}
              page={page}
            />

            <GlobalColorPicker
              label="Contraste / Texto"
              value={theme.contrast || contrast}
              onChange={(val) => handleThemeChange({ contrast: val })}
              page={page}
            />

            <GlobalColorPicker
              label="Fundo do Site"
              value={theme.siteBg || theme.cardBg || siteBg}
              onChange={(val) => {
                handleThemeChange({
                  siteBg: val,
                  cardBg: val,
                });
              }}
              page={page}
            />
          </div>

          {/* Paletas de Cores Prontas da Saúde Mental / Clínica */}
          <div className="pt-3 border-t border-[var(--surface-border)]/60 space-y-2">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Paletas Recomendadas para Saúde
            </h4>
            <div className="space-y-1.5">
              {COLOR_PALETTES.map((pal, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    handleThemeChange({
                      primaryStart: pal.start,
                      primaryEnd: pal.end,
                      contrast: pal.contrast,
                      siteBg: pal.bg,
                      cardBg: pal.bg,
                    })
                  }
                  className="w-full p-2 rounded-xl border border-[var(--surface-border)] glass-sm hover:border-[var(--brand-gradient-start)] flex items-center justify-between transition-all cursor-pointer group"
                >
                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white truncate">
                    {pal.name}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: pal.start }} />
                    <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: pal.end }} />
                    <span className="w-3.5 h-3.5 rounded-full shadow-sm border border-slate-300 dark:border-slate-700" style={{ backgroundColor: pal.bg }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </AccordionItem>

      {/* 🟠 ACCORDION 4: TIPOGRAFIA GLOBAL & DIMENSÕES DO SITE */}
      <AccordionItem
        id="theme-typography"
        title="Tipografia Global & Dimensões do Site"
        icon={Type}
        defaultOpen={false}
      >
        <div className="space-y-4">
          {/* Largura Máxima do Conteúdo do Site (Desktop) */}
          <div className="space-y-2 pb-2 border-b border-[var(--surface-border)]/60">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Largura Máxima do Conteúdo (Desktop)
              </label>
              <span className="text-xs font-mono font-bold text-[var(--brand-gradient-start)]">
                {theme.contentMaxWidth || theme.containerMaxWidth || '1200px'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {[
                { label: '1024px', val: '1024px' },
                { label: '1140px', val: '1140px' },
                { label: '1200px (Padrão)', val: '1200px' },
                { label: '1280px', val: '1280px' },
                { label: '1400px', val: '1400px' },
                { label: '1600px', val: '1600px' },
              ].map((item) => {
                const currentWidth = theme.contentMaxWidth || theme.containerMaxWidth || '1200px';
                return (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => handleThemeChange({ contentMaxWidth: item.val, containerMaxWidth: item.val })}
                    className={`py-1.5 text-[9px] font-bold rounded-lg border cursor-pointer transition-all ${
                      currentWidth === item.val
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-extrabold'
                        : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="range"
                min={960}
                max={1600}
                step={20}
                value={parseInt(String(theme.contentMaxWidth || theme.containerMaxWidth || '1200px'), 10) || 1200}
                onChange={(e) => {
                  const val = `${e.target.value}px`;
                  handleThemeChange({ contentMaxWidth: val, containerMaxWidth: val });
                }}
                className="w-full accent-[var(--brand-gradient-start)] cursor-pointer"
              />
            </div>
            <p className="text-[9px] text-slate-400">
              Todas as seções de nível 1 herdam esta largura máxima no desktop por padrão (1200px).
            </p>
          </div>

          <FontPicker
            label="Fonte dos Títulos"
            type="heading"
            value={theme.fontHeading || themeTypo.fontHeading}
            onChange={(font) => handleFontChange('heading', font)}
          />

          <FontPicker
            label="Fonte do Corpo & Textos"
            type="body"
            value={theme.fontBody || themeTypo.fontBody}
            onChange={(font) => handleFontChange('body', font)}
          />

          {/* Tamanho Base (Base Font Size) */}
          <div className="space-y-1.5 pt-2 border-t border-[var(--surface-border)]/60">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Tamanho Base (Base Size)
              </label>
              <span className="text-xs font-mono font-bold text-[var(--brand-gradient-start)]">
                {themeTypo.baseFontSize}px
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={12}
                max={24}
                step={1}
                value={themeTypo.baseFontSize}
                onChange={(e) => handleThemeChange({ baseFontSize: Number(e.target.value) })}
                className="w-full accent-[var(--brand-gradient-start)] cursor-pointer"
              />
            </div>
          </div>

          {/* Razão da Escala Matemática (Modular Scale) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Razão da Escala Proporcional
            </label>
            <Select
              value={String(themeTypo.typeScaleRatio)}
              onChange={(e) => handleThemeChange({ typeScaleRatio: Number(e.target.value) })}
              options={TYPE_SCALE_OPTIONS}
              variant="glass"
            />
          </div>

          {/* Card de Visualização & Personalização da Escala Matemática */}
          <div className="pt-2 border-t border-[var(--surface-border)]/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Personalização por Nível (H1..H4, Corpo, Links)
              </h4>
              {Object.keys(savedLevels).length > 0 && (
                <button
                  type="button"
                  onClick={() => handleThemeChange({ levels: {} })}
                  className="text-[9px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                  title="Restaurar todos os níveis para a escala matemática padrão"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restaurar Todos
                </button>
              )}
            </div>

            <div className="space-y-2">
              {TYPOGRAPHY_LEVELS.map((lvl) => {
                const levelConfig = themeTypo.levels[lvl.key];
                const hasOverride = Boolean(savedLevels[lvl.key] && Object.keys(savedLevels[lvl.key]).length > 0);

                return (
                  <div
                    key={lvl.key}
                    className="p-2.5 rounded-xl border border-[var(--surface-border)]/60 glass-sm space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                          {lvl.title}
                        </span>
                        {hasOverride && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                            Customizado
                          </span>
                        )}
                      </div>
                      {hasOverride && (
                        <button
                          type="button"
                          onClick={() => handleResetLevelTypography(lvl.key)}
                          className="text-[10px] text-slate-400 hover:text-amber-500 flex items-center gap-1 transition-colors"
                          title="Restaurar escala matemática para este nível"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restaurar</span>
                        </button>
                      )}
                    </div>

                    <GlobalTypographyPicker
                      fontFamily={levelConfig.fontFamily}
                      fontSize={levelConfig.fontSize}
                      fontWeight={levelConfig.fontWeight}
                      lineHeight={levelConfig.lineHeight}
                      letterSpacing={levelConfig.letterSpacing}
                      textTransform={levelConfig.textTransform}
                      defaultFontCategory={lvl.category}
                      page={page}
                      onChangeTypography={(patch) => handleLevelTypographyChange(lvl.key, patch)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AccordionItem>

      {/* 🟣 ACCORDION 5: ESTILO GLOBAL DE BOTÕES & HOVER */}
      <AccordionItem
        id="theme-buttons"
        title="Estilo Global de Botões & Hover"
        icon={MousePointerClick}
        defaultOpen={false}
      >
        <div className="space-y-4">
          {/* Preset de Aparência do Botão */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Variante Padrão
            </label>
            <Select
              value={themeButton.variant}
              onChange={(e) => handleButtonDefaultsChange({ variant: e.target.value })}
              options={[
                { value: 'gradient', label: '✨ Gradiente da Marca' },
                { value: 'solid', label: '🎨 Cor Sólida' },
                { value: 'glass', label: '💎 Glassmorphism (Translúcido)' },
                { value: 'outline', label: '🔲 Outline (Apenas Borda)' },
                { value: 'soft', label: '☁️ Soft (Fundo Suave)' },
              ]}
              variant="glass"
            />
          </div>

          {/* Formato / Radius */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Formato dos Cantos (Border Radius)
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { value: '0px', label: 'Quadrado' },
                { value: '8px', label: 'Suave' },
                { value: '12px', label: 'Arredondado' },
                { value: '9999px', label: 'Cápsula' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleButtonDefaultsChange({ borderRadius: item.value })}
                  className={`py-1.5 rounded-lg border text-[9px] font-bold transition-all cursor-pointer ${
                    (themeButton.borderRadius || '12px') === item.value
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-extrabold'
                      : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cor do Botão & Cor do Texto */}
          <div className="space-y-2 pt-2 border-t border-[var(--surface-border)]/60">
            <GlobalColorPicker
              label="Cor de Fundo do Botão"
              value={themeButton.backgroundColor || primaryStart}
              onChange={(color) => handleButtonDefaultsChange({ backgroundColor: color })}
              page={page}
            />

            <GlobalColorPicker
              label="Cor do Texto do Botão"
              value={themeButton.color || '#FFFFFF'}
              onChange={(color) => handleButtonDefaultsChange({ color })}
              page={page}
            />
          </div>

          {/* Borda Global dos Botões */}
          <div className="pt-2 border-t border-[var(--surface-border)]/60 space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Borda dos Botões
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400">Estilo</label>
                <select
                  value={themeButton.borderStyle || 'none'}
                  onChange={(e) => handleButtonDefaultsChange({ borderStyle: e.target.value })}
                  className="w-full text-[10px] rounded-lg border border-[var(--surface-border)] bg-transparent p-1.5 outline-none"
                >
                  <option value="none">Nenhuma</option>
                  <option value="solid">Sólida</option>
                  <option value="dashed">Tracejada</option>
                  <option value="dotted">Pontilhada</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400">Espessura</label>
                <select
                  value={themeButton.borderWidth || '1px'}
                  onChange={(e) => handleButtonDefaultsChange({ borderWidth: e.target.value })}
                  className="w-full text-[10px] rounded-lg border border-[var(--surface-border)] bg-transparent p-1.5 outline-none"
                >
                  <option value="1px">1px</option>
                  <option value="2px">2px</option>
                  <option value="3px">3px</option>
                  <option value="4px">4px</option>
                </select>
              </div>
            </div>
            {(themeButton.borderStyle && themeButton.borderStyle !== 'none') && (
              <GlobalColorPicker
                label="Cor da Borda"
                value={themeButton.borderColor || ''}
                onChange={(color) => handleButtonDefaultsChange({ borderColor: color })}
                page={page}
              />
            )}
          </div>

          {/* Padding Global dos Botões */}
          <div className="pt-2 border-t border-[var(--surface-border)]/60 space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Espaçamento Interno (Padding)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400">Vertical (Cima/Baixo)</label>
                <select
                  value={themeButton.paddingY || '12px'}
                  onChange={(e) => handleButtonDefaultsChange({ paddingY: e.target.value })}
                  className="w-full text-[10px] rounded-lg border border-[var(--surface-border)] bg-transparent p-1.5 outline-none"
                >
                  <option value="6px">Compacto (6px)</option>
                  <option value="8px">Pequeno (8px)</option>
                  <option value="10px">Médio (10px)</option>
                  <option value="12px">Padrão (12px)</option>
                  <option value="14px">Grande (14px)</option>
                  <option value="18px">Extra Grande (18px)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400">Horizontal (Esq/Dir)</label>
                <select
                  value={themeButton.paddingX || '24px'}
                  onChange={(e) => handleButtonDefaultsChange({ paddingX: e.target.value })}
                  className="w-full text-[10px] rounded-lg border border-[var(--surface-border)] bg-transparent p-1.5 outline-none"
                >
                  <option value="12px">Compacto (12px)</option>
                  <option value="16px">Pequeno (16px)</option>
                  <option value="20px">Médio (20px)</option>
                  <option value="24px">Padrão (24px)</option>
                  <option value="32px">Grande (32px)</option>
                  <option value="48px">Extra Grande (48px)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tipografia Global do Botão */}
          <div className="pt-2 border-t border-[var(--surface-border)]/60 space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Tipografia Padrão dos Botões
            </label>
            <GlobalTypographyPicker
              fontFamily={themeButton.fontFamily}
              fontSize={themeButton.fontSize}
              fontWeight={themeButton.fontWeight}
              letterSpacing={themeButton.letterSpacing}
              textTransform={themeButton.textTransform}
              defaultFontCategory="body"
              page={page}
              onChangeTypography={(patch) => handleButtonDefaultsChange(patch)}
            />
          </div>

          {/* Efeitos & Transformações Globais dos Botões */}
          <div className="space-y-3 pt-2 border-t border-[var(--surface-border)]/60">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Efeitos & Transformações Globais
            </h4>
            <TransformControl
              style={themeButton as any}
              onChangeStyle={(key, value) => handleButtonDefaultsChange({ [key]: value })}
            />
            <div className="pt-2 border-t border-[var(--surface-border)]/60">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Velocidade de Transição Global
              </h4>
              <TransitionControl
                style={themeButton as any}
                onChangeStyle={(key, value) => handleButtonDefaultsChange({ [key]: value })}
              />
            </div>
          </div>
        </div>
      </AccordionItem>
    </div>
  );
}
