'use client';

import React from 'react';
import { AtomicComponent, MenuLinkItem, CanvasData } from '../types';
import { getSectionDisplayName, sanitizeUriSlug, ElementRegistry } from '@psi/canvas-renderer';
import { DynamicPropertyRenderer } from './DynamicPropertyRenderer';
import { Input, Select } from '@psi/ui';
import { IconPicker } from './components/IconPicker';
import { GlobalColorPicker } from './components/GlobalColorPicker';
import { GlobalTypographyPicker, TypographyPatch } from './components/GlobalTypographyPicker';
import { ListItemsEditor, ListItem } from './components/ListItemsEditor';
import { AccordionItem } from './components/AccordionSection';
import { SliderNumberInput } from './components/SliderNumberInput';
import { ImageUploader } from '../components/ImageUploader';
import { loadGoogleFonts } from '../utils/googleFonts';
import { getThemeColors, getThemeTypography, getDefaultButtonTemplates } from '../utils/colorHelpers';
import {
  FileText,
  MousePointerClick,
  Sparkles,
  Type,
  List,
  Image as ImageIcon,
  Sliders,
  MessageSquare,
  Palette,
  Trash2,
  LayoutGrid,
  MoveHorizontal,
  MoveVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  UserCheck,
} from 'lucide-react';

interface ContentPropsPanelProps {
  component: AtomicComponent;
  isMobile: boolean;
  effectiveProps: Record<string, any>;
  page?: any;
  canvasData?: CanvasData | null;
  onPropChange: (key: string, value: any) => void;
  onPropsBatchChange?: (patch: Record<string, any>) => void;
  onClearTypography?: (prefix?: string) => void;
  onUpdateSiteConfig?: (patch: any) => void;
}

/** Retorna true para tipos que possuem props internas editáveis */
export function hasContentProps(type: string): boolean {
  return ElementRegistry.get(type) !== undefined || ['heading', 'paragraph', 'label', 'badge', 'button', 'card', 'faq_item', 'list', 'stat_counter', 'image', 'testimonial', 'video', 'avatar', 'divider', 'navbar_links', 'social_links', 'logo'].includes(type);
}

export function ContentPropsPanel({
  component,
  isMobile,
  effectiveProps,
  page,
  canvasData,
  onPropChange,
  onPropsBatchChange,
  onClearTypography,
  onUpdateSiteConfig,
}: ContentPropsPanelProps) {
  const type = component.type;
  const tenantId = page?.tenantId || page?.workspaceId || '';

  const handleTypographyChange = (patch: TypographyPatch) => {
    if (onPropsBatchChange) {
      onPropsBatchChange(patch);
    } else {
      Object.entries(patch).forEach(([key, val]) => {
        onPropChange(key, val);
      });
    }
  };

  const handlePrefixedTypographyChange = (prefix: string, patch: TypographyPatch) => {
    const prefixedPatch: Record<string, any> = {};
    Object.entries(patch).forEach(([key, val]) => {
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
      prefixedPatch[`${prefix}${capitalizedKey}`] = val;
    });

    if (onPropsBatchChange) {
      onPropsBatchChange(prefixedPatch);
    } else {
      Object.entries(prefixedPatch).forEach(([key, val]) => {
        onPropChange(key, val);
      });
    }
  };

  const clearTypographyOverrides = (prefix: string = '') => {
    if (onClearTypography) {
      onClearTypography(prefix);
      return;
    }

    const keysToClear = [
      'fontFamily',
      'fontSize',
      'fontWeight',
      'lineHeight',
      'letterSpacing',
      'textTransform',
      'textAlign',
      'color',
      'typoPreset',
    ];
    const patch: Record<string, any> = {};
    keysToClear.forEach((k) => {
      const fullKey = prefix ? `${prefix}${k.charAt(0).toUpperCase()}${k.slice(1)}` : k;
      patch[fullKey] = undefined;
    });

    if (onPropsBatchChange) {
      onPropsBatchChange(patch);
    } else {
      Object.entries(patch).forEach(([k, v]) => {
        onPropChange(k, v);
      });
    }
  };

  // -------------------------------------------------------------------------
  // HEADING
  // -------------------------------------------------------------------------
  if (type === 'heading') {
    return (
      <div className="space-y-3">
        <AccordionItem
          id="hdg-content"
          title="Texto & Nível"
          icon={FileText}
          defaultOpen={false}
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Texto do Título</label>
            <Input
              type="text"
              value={effectiveProps.text || ''}
              onChange={(e) => onPropChange('text', e.target.value)}
              className="text-xs font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Nível (H1 a H4)</label>
            <Select
              value={String(effectiveProps.level || 2)}
              onChange={(e) => {
                const newLevel = parseInt(e.target.value);
                const newPreset = `h${newLevel}`;
                if (onPropsBatchChange) {
                  onPropsBatchChange({ level: newLevel, typoPreset: newPreset });
                } else {
                  onPropChange('level', newLevel);
                }
              }}
              options={[
                { value: '1', label: 'H1 — Principal' },
                { value: '2', label: 'H2 — Seção' },
                { value: '3', label: 'H3 — Subseção' },
                { value: '4', label: 'H4' },
              ]}
              variant="glass"
            />
          </div>
        </AccordionItem>

        <AccordionItem
          id="hdg-typography"
          title="Tipografia do Título"
          icon={Type}
          defaultOpen={false}
        >
          <GlobalTypographyPicker
            label="Estilo de Tipografia"
            typoPreset={effectiveProps.typoPreset || (effectiveProps.level ? `h${effectiveProps.level}` : 'h2')}
            onChangePreset={(preset) => {
              const patch: Record<string, any> = { typoPreset: preset };
              if (preset.startsWith('h')) {
                const lvl = parseInt(preset.replace('h', ''));
                if (!isNaN(lvl)) {
                  patch.level = lvl;
                }
              }
              if (onPropsBatchChange) {
                onPropsBatchChange(patch);
              } else {
                onPropChange('typoPreset', preset);
              }
            }}
            onClearOverrides={() => clearTypographyOverrides()}
            fontFamily={effectiveProps.fontFamily}
            fontSize={effectiveProps.fontSize}
            fontWeight={effectiveProps.fontWeight}
            lineHeight={effectiveProps.lineHeight}
            letterSpacing={effectiveProps.letterSpacing}
            textTransform={effectiveProps.textTransform}
            textAlign={effectiveProps.textAlign}
            color={effectiveProps.color}
            page={page}
            onUpdateSiteConfig={onUpdateSiteConfig}
            defaultFontCategory="heading"
            onChangeTypography={handleTypographyChange}
          />
        </AccordionItem>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // PARAGRAPH
  // -------------------------------------------------------------------------
  if (type === 'paragraph') {
    return (
      <div className="space-y-3">
        <AccordionItem
          id="prg-content"
          title="Conteúdo do Parágrafo"
          icon={FileText}
          defaultOpen={false}
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Texto (HTML Básico)</label>
            <textarea
              rows={6}
              value={effectiveProps.html || ''}
              onChange={(e) => onPropChange('html', e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-[var(--surface-border)] bg-transparent text-slate-900 dark:text-white outline-none resize-y font-mono"
              placeholder="<p>Escreva seu texto aqui...</p>"
            />
            <p className="text-[9px] text-slate-400">Suporta HTML básico: &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;br&gt;</p>
          </div>
        </AccordionItem>

        <AccordionItem
          id="prg-typography"
          title="Tipografia do Parágrafo"
          icon={Type}
          defaultOpen={false}
        >
          <GlobalTypographyPicker
            label="Estilo de Tipografia"
            typoPreset={effectiveProps.typoPreset || 'paragraph'}
            onChangePreset={(preset) => onPropChange('typoPreset', preset)}
            onClearOverrides={() => clearTypographyOverrides()}
            fontFamily={effectiveProps.fontFamily}
            fontSize={effectiveProps.fontSize}
            fontWeight={effectiveProps.fontWeight}
            lineHeight={effectiveProps.lineHeight}
            letterSpacing={effectiveProps.letterSpacing}
            textTransform={effectiveProps.textTransform}
            textAlign={effectiveProps.textAlign}
            color={effectiveProps.color}
            page={page}
            onUpdateSiteConfig={onUpdateSiteConfig}
            defaultFontCategory="body"
            onChangeTypography={handleTypographyChange}
          />
        </AccordionItem>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // LABEL
  // -------------------------------------------------------------------------
  if (type === 'label') {
    return (
      <div className="space-y-3">
        <AccordionItem
          id="lbl-content"
          title="Texto & Tag HTML"
          icon={FileText}
          defaultOpen={false}
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Texto</label>
            <Input
              type="text"
              value={effectiveProps.text || ''}
              onChange={(e) => onPropChange('text', e.target.value)}
              className="text-xs uppercase font-bold tracking-wide"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Tag HTML</label>
            <Select
              value={effectiveProps.htmlTag || 'span'}
              onChange={(e) => onPropChange('htmlTag', e.target.value)}
              options={[
                { value: 'span', label: 'span (inline)' },
                { value: 'p', label: 'p (parágrafo)' },
                { value: 'small', label: 'small' },
                { value: 'strong', label: 'strong' },
              ]}
              variant="glass"
            />
          </div>
        </AccordionItem>

        <AccordionItem
          id="lbl-typography"
          title="Tipografia da Etiqueta"
          icon={Type}
          defaultOpen={false}
        >
          <GlobalTypographyPicker
            label="Estilo de Tipografia"
            typoPreset={effectiveProps.typoPreset || 'h4'}
            onChangePreset={(preset) => onPropChange('typoPreset', preset)}
            onClearOverrides={() => clearTypographyOverrides()}
            fontFamily={effectiveProps.fontFamily}
            fontSize={effectiveProps.fontSize}
            fontWeight={effectiveProps.fontWeight}
            lineHeight={effectiveProps.lineHeight}
            letterSpacing={effectiveProps.letterSpacing}
            textTransform={effectiveProps.textTransform}
            textAlign={effectiveProps.textAlign}
            color={effectiveProps.color}
            page={page}
            onUpdateSiteConfig={onUpdateSiteConfig}
            defaultFontCategory="heading"
            onChangeTypography={handleTypographyChange}
          />
        </AccordionItem>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // BADGE
  // -------------------------------------------------------------------------
  if (type === 'badge') {
    return (
      <div className="space-y-3">
        <AccordionItem
          id="bdg-content"
          title="Texto & Aparência"
          icon={FileText}
          defaultOpen={false}
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Texto</label>
            <Input
              type="text"
              value={effectiveProps.text || ''}
              onChange={(e) => onPropChange('text', e.target.value)}
              className="text-xs uppercase font-bold tracking-wide"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Formato</label>
            <div className="grid grid-cols-2 gap-1">
              {[
                { value: true, label: 'Pill (arredondado)' },
                { value: false, label: 'Quadrado' },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => onPropChange('rounded', opt.value)}
                  className={`py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                    (effectiveProps.rounded !== false) === opt.value
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                      : 'border-[var(--surface-border)] text-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Variante</label>
            <Select
              value={effectiveProps.variant || 'brand'}
              onChange={(e) => onPropChange('variant', e.target.value)}
              options={[
                { value: 'brand', label: 'Marca' },
                { value: 'success', label: 'Sucesso (verde)' },
                { value: 'warning', label: 'Aviso (amarelo)' },
                { value: 'info', label: 'Info (azul)' },
                { value: 'neutral', label: 'Neutro' },
              ]}
              variant="glass"
            />
          </div>

          <div className="space-y-1 pt-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Alinhamento do Conteúdo</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { value: 'left', label: 'Esquerda' },
                { value: 'center', label: 'Centro' },
                { value: 'right', label: 'Direita' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onPropChange('contentAlign', opt.value)}
                  className={`py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                    (effectiveProps.contentAlign || 'center') === opt.value
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                      : 'border-[var(--surface-border)] text-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </AccordionItem>

        <AccordionItem
          id="bdg-typography"
          title="Tipografia do Badge"
          icon={Type}
          defaultOpen={false}
        >
          <GlobalTypographyPicker
            label="Estilo de Tipografia"
            typoPreset={effectiveProps.typoPreset || 'h4'}
            onChangePreset={(preset) => onPropChange('typoPreset', preset)}
            onClearOverrides={() => clearTypographyOverrides()}
            fontFamily={effectiveProps.fontFamily}
            fontSize={effectiveProps.fontSize}
            fontWeight={effectiveProps.fontWeight}
            lineHeight={effectiveProps.lineHeight}
            letterSpacing={effectiveProps.letterSpacing}
            textTransform={effectiveProps.textTransform}
            textAlign={effectiveProps.textAlign}
            page={page}
            onUpdateSiteConfig={onUpdateSiteConfig}
            defaultFontCategory="body"
            onChangeTypography={handleTypographyChange}
          />
        </AccordionItem>

        <AccordionItem
          id="bdg-icon"
          title="Ícone Decorativo"
          icon={Sparkles}
          defaultOpen={false}
        >
          <IconPicker
            selectedName={effectiveProps.iconLeft !== undefined ? effectiveProps.iconLeft : 'Sparkles'}
            onSelectIcon={(name) => onPropChange('iconLeft', name)}
          />
        </AccordionItem>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // BUTTON
  // -------------------------------------------------------------------------
  if (type === 'button') {
    return (
      <div className="space-y-3">
        <AccordionItem
          id="btn-content"
          title="Rótulo & Tamanho"
          icon={FileText}
          defaultOpen={true}
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Rótulo do Botão</label>
            <Input
              type="text"
              value={effectiveProps.label || ''}
              onChange={(e) => onPropChange('label', e.target.value)}
              className="text-xs font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Tamanho</label>
            <div className="grid grid-cols-4 gap-1">
              {['sm', 'md', 'lg', 'xl'].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onPropChange('size', sz)}
                  className={`py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                    (effectiveProps.size || 'md') === sz
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                      : 'border-[var(--surface-border)] text-slate-500'
                  }`}
                >
                  {sz.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Ícone Esquerdo</label>
            <IconPicker
              selectedName={effectiveProps.iconLeft || ''}
              onSelectIcon={(name) => onPropChange('iconLeft', name)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Ícone Direito</label>
            <IconPicker
              selectedName={effectiveProps.iconRight || ''}
              onSelectIcon={(name) => onPropChange('iconRight', name)}
            />
          </div>

          <div className="space-y-1 pt-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Alinhamento do Conteúdo</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { value: 'left', label: 'Esquerda' },
                { value: 'center', label: 'Centro' },
                { value: 'right', label: 'Direita' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onPropChange('contentAlign', opt.value)}
                  className={`py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                    (effectiveProps.contentAlign || 'center') === opt.value
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                      : 'border-[var(--surface-border)] text-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </AccordionItem>

        <AccordionItem
          id="btn-typography"
          title="Tipografia do Botão"
          icon={Type}
          defaultOpen={false}
        >
          <GlobalTypographyPicker
            label="Estilo de Tipografia"
            typoPreset={effectiveProps.typoPreset || 'buttons'}
            onChangePreset={(preset) => onPropChange('typoPreset', preset)}
            onClearOverrides={() => clearTypographyOverrides()}
            fontFamily={effectiveProps.fontFamily}
            fontSize={effectiveProps.fontSize}
            fontWeight={effectiveProps.fontWeight}
            lineHeight={effectiveProps.lineHeight}
            letterSpacing={effectiveProps.letterSpacing}
            textTransform={effectiveProps.textTransform}
            textAlign={effectiveProps.textAlign}
            page={page}
            onUpdateSiteConfig={onUpdateSiteConfig}
            defaultFontCategory="body"
            onChangeTypography={handleTypographyChange}
          />
        </AccordionItem>

        <AccordionItem
          id="btn-action"
          title="Ação do Clique / Destino CTA"
          icon={MousePointerClick}
          defaultOpen={false}
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Destino do Botão</label>
              <Select
                value={effectiveProps.action || 'cta_primary'}
                onChange={(e) => onPropChange('action', e.target.value)}
                options={[
                  { value: 'cta_primary', label: '✨ Herdar Destino Global da Página (Padrão)' },
                  { value: 'whatsapp', label: '💬 WhatsApp Direto' },
                  { value: 'external_url', label: '🔗 Link / URL Externa' },
                  { value: 'scroll_to', label: '🎯 Rolar para Seção' },
                ]}
                variant="glass"
              />
            </div>

            {(!effectiveProps.action || effectiveProps.action === 'cta_primary') && (() => {
              const globalCtaType = page?.ctaType || 'form';
              let globalLabel = 'Formulário de Triagem / Agendamento (Modal)';
              if (globalCtaType === 'whatsapp') {
                globalLabel = `WhatsApp Direto (${page?.ctaWhatsappNumber || 'Número não configurado'})`;
              } else if (globalCtaType === 'external_url') {
                globalLabel = `URL Externa (${page?.ctaExternalUrl || 'URL não configurada'})`;
              }

              return (
                <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                    <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>Destino Global Herdado</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Este botão herda automaticamente a ação configurada na aba <strong>Destino</strong>:
                  </p>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-[var(--surface-border)] text-xs font-bold flex items-center justify-between gap-2">
                    <span className="truncate">{globalLabel}</span>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full brand-accent text-white shrink-0">
                      Herdado
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    Altere na aba "Destino" para mudar todos os botões da página simultaneamente.
                  </p>
                </div>
              );
            })()}

            {effectiveProps.action === 'scroll_to' && (() => {
              const sections = canvasData?.sections || page?.draftData?.canvas_data?.sections || page?.siteConfig?.canvas_data?.sections || [];
              const options = [
                { value: '', label: 'Selecione uma seção da página...' },
                ...sections.map((sec: any, idx: number) => {
                  const anchor = sec.anchorId || sanitizeUriSlug(sec.label || sec.id);
                  const name = getSectionDisplayName(sec, idx);
                  return {
                    value: anchor,
                    label: `🎯 ${name} (#${anchor})`,
                  };
                }),
              ];

              return (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Seção de Destino (Rolagem)</label>
                  {sections.length > 0 ? (
                    <Select
                      value={effectiveProps.scrollTargetId || ''}
                      onChange={(e) => onPropChange('scrollTargetId', e.target.value)}
                      options={options}
                      variant="glass"
                    />
                  ) : (
                    <Input
                      type="text"
                      value={effectiveProps.scrollTargetId || ''}
                      onChange={(e) => onPropChange('scrollTargetId', e.target.value)}
                      placeholder="ex: sec-about"
                      className="text-xs font-mono"
                    />
                  )}
                  {effectiveProps.scrollTargetId && (
                    <p className="text-[9px] text-slate-400 font-mono italic">
                      ID selecionado: #{effectiveProps.scrollTargetId}
                    </p>
                  )}
                </div>
              );
            })()}

            {effectiveProps.action === 'external_url' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">URL Externa</label>
                <Input
                  type="text"
                  value={effectiveProps.externalUrl || ''}
                  onChange={(e) => onPropChange('externalUrl', e.target.value)}
                  placeholder="https://..."
                  className="text-xs"
                />
              </div>
            )}

            {effectiveProps.action === 'whatsapp' && (
              <div className="space-y-2 p-2.5 rounded-xl border border-[var(--surface-border)] glass-sm">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Número do WhatsApp (com DDD)</label>
                  <Input
                    type="text"
                    value={effectiveProps.whatsappNumber || ''}
                    onChange={(e) => onPropChange('whatsappNumber', e.target.value)}
                    placeholder="Ex: 11999998888"
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Mensagem Personalizada</label>
                  <textarea
                    rows={2}
                    value={effectiveProps.whatsappMessage || ''}
                    onChange={(e) => onPropChange('whatsappMessage', e.target.value)}
                    placeholder="Olá, vim pelo botão..."
                    className="w-full p-2 text-xs rounded-lg border border-[var(--surface-border)] bg-transparent outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </AccordionItem>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // CARD
  // -------------------------------------------------------------------------
  if (type === 'card') {
    const isHorizontal = effectiveProps.flexDirection === 'row';

    return (
      <div className="space-y-3">
        <AccordionItem
          id="card-layout"
          title="Disposição & Alinhamento"
          icon={LayoutGrid}
          defaultOpen={false}
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Organização dos Elementos</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onPropChange('flexDirection', 'row')}
                className={`p-2 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer transition-all ${
                  isHorizontal
                    ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                    : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                }`}
              >
                <MoveHorizontal className="w-3.5 h-3.5" />
                <span>Lado a Lado</span>
              </button>
              <button
                type="button"
                onClick={() => onPropChange('flexDirection', 'column')}
                className={`p-2 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer transition-all ${
                  !isHorizontal
                    ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                    : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                }`}
              >
                <MoveVertical className="w-3.5 h-3.5" />
                <span>Empilhado</span>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              {isHorizontal ? 'Alinhamento Horizontal' : 'Alinhamento Vertical'}
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { value: 'flex-start', label: isHorizontal ? 'Esquerda' : 'Topo' },
                { value: 'center', label: 'Centro' },
                { value: 'flex-end', label: isHorizontal ? 'Direita' : 'Base' },
                { value: 'space-between', label: 'Espaçado' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onPropChange('justifyContent', item.value)}
                  className={`py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                    (effectiveProps.justifyContent || 'center') === item.value
                      ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                      : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              {isHorizontal ? 'Alinhamento Vertical dos Elementos' : 'Alinhamento Horizontal dos Elementos'}
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { value: 'flex-start', label: isHorizontal ? 'Topo' : 'Esquerda' },
                { value: 'center', label: 'Centro' },
                { value: 'flex-end', label: isHorizontal ? 'Base' : 'Direita' },
                { value: 'stretch', label: 'Esticar' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onPropChange('alignItems', item.value)}
                  className={`py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                    (effectiveProps.alignItems || 'flex-start') === item.value
                      ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                      : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Alinhamento do Texto</label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { value: 'left', icon: AlignLeft, label: 'Esquerda' },
                { value: 'center', icon: AlignCenter, label: 'Centro' },
                { value: 'right', icon: AlignRight, label: 'Direita' },
                { value: 'justify', icon: AlignJustify, label: 'Justificado' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => onPropChange('textAlign', item.value)}
                    className={`p-2 rounded-lg border flex items-center justify-center cursor-pointer transition-all ${
                      effectiveProps.textAlign === item.value
                        ? 'border-purple-500 bg-purple-500/10 text-purple-600 font-bold'
                        : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Espaço entre Elementos (Gap)</label>
            <SliderNumberInput
              value={effectiveProps.gap || '0px'}
              onChange={(val) => onPropChange('gap', val)}
              min={0}
              max={120}
              step={1}
            />
          </div>
        </AccordionItem>

        <AccordionItem
          id="card-text"
          title="Textos & Conteúdo"
          icon={FileText}
          defaultOpen={false}
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Título do Card</label>
            <Input
              type="text"
              value={effectiveProps.title || ''}
              onChange={(e) => onPropChange('title', e.target.value)}
              className="text-xs font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Descrição</label>
            <textarea
              rows={3}
              value={effectiveProps.body || ''}
              onChange={(e) => onPropChange('body', e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-[var(--surface-border)] bg-transparent text-slate-900 dark:text-white outline-none resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Variante Visual</label>
            <Select
              value={effectiveProps.variant || 'glass'}
              onChange={(e) => onPropChange('variant', e.target.value)}
              options={[
                { value: 'glass', label: 'Glass (translúcido)' },
                { value: 'flat', label: 'Flat (simples)' },
                { value: 'outlined', label: 'Outlined (borda)' },
                { value: 'elevated', label: 'Elevated (sombra)' },
              ]}
              variant="glass"
            />
          </div>
        </AccordionItem>

        <AccordionItem
          id="card-icon"
          title="Ícone / Logotipo / Imagem"
          icon={Sparkles}
          defaultOpen={false}
        >
          <ImageUploader
            label="Logotipo ou Imagem do Card (Opcional)"
            value={effectiveProps.imageUrl || ''}
            onChange={(url) => onPropChange('imageUrl', url)}
            tenantId={tenantId}
            targetWidth={120}
            targetHeight={120}
            allowTransparency={true}
          />

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Posição da Imagem no Card</label>
            <Select
              value={effectiveProps.imagePosition || 'top'}
              onChange={(e) => onPropChange('imagePosition', e.target.value)}
              options={[
                { value: 'top', label: 'Topo (Capa do Card)' },
                { value: 'left', label: 'Esquerda (Lado a Lado)' },
                { value: 'right', label: 'Direita (Lado a Lado)' },
                { value: 'icon', label: 'Dentro do Ícone' },
              ]}
              variant="glass"
            />
          </div>

          <div className="space-y-1 pt-2 border-t border-[var(--surface-border)]/50">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Seleção de Ícone Lucide (Alternativa)</label>
            <IconPicker
              selectedName={effectiveProps.iconName !== undefined ? effectiveProps.iconName : 'HeartHandshake'}
              onSelectIcon={(name) => onPropChange('iconName', name)}
            />
          </div>

          <GlobalColorPicker
            label="Cor do Ícone"
            value={effectiveProps.iconColor || ''}
            onChange={(v) => onPropChange('iconColor', v)}
            page={page}
          />

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Tamanho do Ícone / Logotipo</label>
            <SliderNumberInput
              value={effectiveProps.iconSize || '20px'}
              onChange={(val) => onPropChange('iconSize', val)}
              min={12}
              max={96}
              step={2}
              defaultUnit="px"
            />
          </div>

          <GlobalColorPicker
            label="Fundo do Ícone (Opcional)"
            value={effectiveProps.iconBgColor || ''}
            onChange={(v) => onPropChange('iconBgColor', v)}
            page={page}
          />

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Arredondamento do Ícone</label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { value: '0px', label: 'Reto' },
                { value: '8px', label: 'Suave' },
                { value: '16px', label: 'Redondo' },
                { value: '9999px', label: 'Círculo' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onPropChange('iconBorderRadius', opt.value)}
                  className={`py-1.5 rounded-lg border text-[9px] font-bold cursor-pointer transition-all ${
                    (effectiveProps.iconBorderRadius || '16px') === opt.value
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-extrabold'
                      : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Alinhamento do Ícone / Logotipo</label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { value: 'auto', label: 'Auto' },
                { value: 'left', label: 'Esquerda' },
                { value: 'center', label: 'Centro' },
                { value: 'right', label: 'Direita' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onPropChange('iconAlign', item.value === 'auto' ? undefined : item.value)}
                  className={`py-1.5 rounded-lg border text-[9px] font-bold cursor-pointer transition-all ${
                    (!effectiveProps.iconAlign && item.value === 'auto') || effectiveProps.iconAlign === item.value
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-extrabold'
                      : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </AccordionItem>

        <AccordionItem
          id="card-spacing"
          title="Espaçamentos Internos"
          icon={Sliders}
          defaultOpen={false}
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Espaço abaixo do Ícone</label>
            <SliderNumberInput
              value={effectiveProps.iconMarginBottom || '8px'}
              onChange={(val) => onPropChange('iconMarginBottom', val)}
              min={0}
              max={60}
              step={2}
              defaultUnit="px"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Espaço Título → Descrição</label>
            <SliderNumberInput
              value={effectiveProps.titleMarginBottom || '8px'}
              onChange={(val) => onPropChange('titleMarginBottom', val)}
              min={0}
              max={60}
              step={2}
              defaultUnit="px"
            />
          </div>
        </AccordionItem>

        <AccordionItem
          id="card-typography"
          title="Tipografia do Card"
          icon={Type}
          defaultOpen={false}
        >
          <div className="space-y-3">
            <GlobalTypographyPicker
              label="Tipografia do Título"
              typoPreset={effectiveProps.titleTypoPreset || 'h3'}
              onChangePreset={(preset) => onPropChange('titleTypoPreset', preset)}
              onClearOverrides={() => clearTypographyOverrides('title')}
              fontFamily={effectiveProps.titleFontFamily}
              fontSize={effectiveProps.titleFontSize}
              fontWeight={effectiveProps.titleFontWeight}
              lineHeight={effectiveProps.titleLineHeight}
              letterSpacing={effectiveProps.titleLetterSpacing}
              textTransform={effectiveProps.titleTextTransform}
              textAlign={effectiveProps.titleTextAlign}
              page={page}
              onUpdateSiteConfig={onUpdateSiteConfig}
              defaultFontCategory="heading"
              onChangeTypography={(patch) => handlePrefixedTypographyChange('title', patch)}
            />

            <div className="pt-3 border-t border-[var(--surface-border)]/50">
              <GlobalTypographyPicker
                label="Tipografia da Descrição"
                typoPreset={effectiveProps.bodyTypoPreset || 'paragraph'}
                onChangePreset={(preset) => onPropChange('bodyTypoPreset', preset)}
                onClearOverrides={() => clearTypographyOverrides('body')}
                fontFamily={effectiveProps.bodyFontFamily}
                fontSize={effectiveProps.bodyFontSize}
                fontWeight={effectiveProps.bodyFontWeight}
                lineHeight={effectiveProps.bodyLineHeight}
                letterSpacing={effectiveProps.bodyLetterSpacing}
                textTransform={effectiveProps.bodyTextTransform}
                textAlign={effectiveProps.bodyTextAlign}
                page={page}
                onUpdateSiteConfig={onUpdateSiteConfig}
                defaultFontCategory="body"
                onChangeTypography={(patch) => handlePrefixedTypographyChange('body', patch)}
              />
            </div>
          </div>
        </AccordionItem>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // FAQ ITEM
  // -------------------------------------------------------------------------
  if (type === 'faq_item') {
    return (
      <div className="space-y-3">
        <AccordionItem
          id="faq-content"
          title="Pergunta & Resposta"
          icon={MessageSquare}
          defaultOpen={false}
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Pergunta</label>
            <Input
              type="text"
              value={effectiveProps.question || ''}
              onChange={(e) => onPropChange('question', e.target.value)}
              className="text-xs font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Resposta</label>
            <textarea
              rows={4}
              value={effectiveProps.answer || ''}
              onChange={(e) => onPropChange('answer', e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-[var(--surface-border)] bg-transparent text-slate-900 dark:text-white outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Aberto por padrão</span>
            <button
              type="button"
              onClick={() => onPropChange('defaultOpen', !effectiveProps.defaultOpen)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                effectiveProps.defaultOpen
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                  : 'border-[var(--surface-border)] text-slate-500'
              }`}
            >
              {effectiveProps.defaultOpen ? 'Sim' : 'Não'}
            </button>
          </div>
        </AccordionItem>

        <AccordionItem
          id="faq-typography"
          title="Tipografia da FAQ"
          icon={Type}
          defaultOpen={false}
        >
          <div className="space-y-3">
            <GlobalTypographyPicker
              label="Tipografia da Pergunta"
              typoPreset={effectiveProps.questionTypoPreset || 'h3'}
              onChangePreset={(preset) => onPropChange('questionTypoPreset', preset)}
              onClearOverrides={() => clearTypographyOverrides('question')}
              fontFamily={effectiveProps.questionFontFamily}
              fontSize={effectiveProps.questionFontSize}
              fontWeight={effectiveProps.questionFontWeight}
              lineHeight={effectiveProps.questionLineHeight}
              letterSpacing={effectiveProps.questionLetterSpacing}
              textTransform={effectiveProps.questionTextTransform}
              textAlign={effectiveProps.questionTextAlign}
              page={page}
              onUpdateSiteConfig={onUpdateSiteConfig}
              defaultFontCategory="heading"
              onChangeTypography={(patch) => handlePrefixedTypographyChange('question', patch)}
            />

            <div className="pt-3 border-t border-[var(--surface-border)]/50">
              <GlobalTypographyPicker
                label="Tipografia da Resposta"
                typoPreset={effectiveProps.answerTypoPreset || 'paragraph'}
                onChangePreset={(preset) => onPropChange('answerTypoPreset', preset)}
                onClearOverrides={() => clearTypographyOverrides('answer')}
                fontFamily={effectiveProps.answerFontFamily}
                fontSize={effectiveProps.answerFontSize}
                fontWeight={effectiveProps.answerFontWeight}
                lineHeight={effectiveProps.answerLineHeight}
                letterSpacing={effectiveProps.answerLetterSpacing}
                textTransform={effectiveProps.answerTextTransform}
                textAlign={effectiveProps.answerTextAlign}
                page={page}
                onUpdateSiteConfig={onUpdateSiteConfig}
                defaultFontCategory="body"
                onChangeTypography={(patch) => handlePrefixedTypographyChange('answer', patch)}
              />
            </div>
          </div>
        </AccordionItem>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // STAT COUNTER
  // -------------------------------------------------------------------------
  if (type === 'stat_counter') {
    return (
      <div className="space-y-3">
        <AccordionItem
          id="stat-content"
          title="Valor & Rótulo"
          icon={FileText}
          defaultOpen={false}
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Valor Principal</label>
            <Input
              type="text"
              value={effectiveProps.value || ''}
              onChange={(e) => onPropChange('value', e.target.value)}
              className="text-xs font-mono font-bold"
              placeholder="ex: 01, +500, 10k"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Rótulo / Label</label>
            <Input
              type="text"
              value={effectiveProps.label || ''}
              onChange={(e) => onPropChange('label', e.target.value)}
              className="text-xs"
            />
          </div>
        </AccordionItem>

        <AccordionItem
          id="stat-animation"
          title="Animação ao Rolar"
          icon={Sliders}
          defaultOpen={false}
        >
          <label className="flex items-center justify-between cursor-pointer font-bold text-slate-800 dark:text-slate-200">
            <span>Animar ao Aparecer na Tela</span>
            <input
              type="checkbox"
              checked={effectiveProps.enableAnimation !== false}
              onChange={(e) => onPropChange('enableAnimation', e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
            />
          </label>

          {effectiveProps.enableAnimation !== false && (
            <div className="space-y-3 pt-2 border-t border-[var(--surface-border)]/50">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Valor Inicial</label>
                <Input
                  type="number"
                  value={effectiveProps.startValue ?? 0}
                  onChange={(e) => onPropChange('startValue', Number(e.target.value))}
                  className="text-xs font-mono"
                  placeholder="0"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Duração da Animação</label>
                <SliderNumberInput
                  value={effectiveProps.animationDuration ? `${effectiveProps.animationDuration}ms` : '2000ms'}
                  onChange={(val) => {
                    const parsed = typeof val === 'number' ? val : parseInt(val || '2000', 10);
                    onPropChange('animationDuration', parsed);
                  }}
                  min={500}
                  max={10000}
                  step={250}
                  defaultUnit="ms"
                  unitOptions={['ms', 's']}
                />
              </div>
            </div>
          )}
        </AccordionItem>

        <AccordionItem
          id="stat-icon"
          title="Ícone Decorativo"
          icon={Sparkles}
          defaultOpen={false}
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Ícone</label>
            <IconPicker
              selectedName={effectiveProps.iconName || ''}
              onSelectIcon={(name) => onPropChange('iconName', name)}
            />
            {effectiveProps.iconName && (
              <button
                type="button"
                onClick={() => onPropChange('iconName', '')}
                className="text-[9px] text-red-400 hover:text-red-600 cursor-pointer"
              >
                Remover ícone
              </button>
            )}
          </div>

          {effectiveProps.iconName && (
            <GlobalColorPicker
              label="Cor do Ícone"
              value={effectiveProps.iconColor || ''}
              onChange={(v) => onPropChange('iconColor', v)}
              page={page}
            />
          )}
        </AccordionItem>

        <AccordionItem
          id="stat-typography"
          title="Tipografia do Contador"
          icon={Type}
          defaultOpen={false}
        >
          <div className="space-y-3">
            <GlobalTypographyPicker
              label="Tipografia do Valor"
              typoPreset={effectiveProps.valueTypoPreset || 'h1'}
              onChangePreset={(preset) => onPropChange('valueTypoPreset', preset)}
              onClearOverrides={() => clearTypographyOverrides('value')}
              fontFamily={effectiveProps.valueFontFamily}
              fontSize={effectiveProps.valueFontSize}
              fontWeight={effectiveProps.valueFontWeight}
              lineHeight={effectiveProps.valueLineHeight}
              letterSpacing={effectiveProps.valueLetterSpacing}
              textTransform={effectiveProps.valueTextTransform}
              textAlign={effectiveProps.valueTextAlign}
              page={page}
              onUpdateSiteConfig={onUpdateSiteConfig}
              defaultFontCategory="heading"
              onChangeTypography={(patch) => handlePrefixedTypographyChange('value', patch)}
            />

            <div className="pt-3 border-t border-[var(--surface-border)]/50">
              <GlobalTypographyPicker
                label="Tipografia do Rótulo"
                typoPreset={effectiveProps.labelTypoPreset || 'h4'}
                onChangePreset={(preset) => onPropChange('labelTypoPreset', preset)}
                onClearOverrides={() => clearTypographyOverrides('label')}
                fontFamily={effectiveProps.labelFontFamily}
                fontSize={effectiveProps.labelFontSize}
                fontWeight={effectiveProps.labelFontWeight}
                lineHeight={effectiveProps.labelLineHeight}
                letterSpacing={effectiveProps.letterSpacing}
                textTransform={effectiveProps.labelTextTransform}
                textAlign={effectiveProps.labelTextAlign}
                page={page}
                onUpdateSiteConfig={onUpdateSiteConfig}
                defaultFontCategory="body"
                onChangeTypography={(patch) => handlePrefixedTypographyChange('label', patch)}
              />
            </div>
          </div>
        </AccordionItem>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // LIST
  // -------------------------------------------------------------------------
  if (type === 'list') {
    const items: ListItem[] = (effectiveProps.items || []).map((it: any) =>
      typeof it === 'string' ? { text: it } : it
    );

    return (
      <div className="space-y-3">
        <AccordionItem
          id="list-config"
          title="Tipo & Marcadores"
          icon={Sliders}
          defaultOpen={false}
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo de Lista</label>
            <Select
              value={effectiveProps.listType || 'check'}
              onChange={(e) => onPropChange('listType', e.target.value)}
              options={[
                { value: 'check', label: 'Check (marcador de verificação)' },
                { value: 'bullet', label: 'Bullet (ponto)' },
                { value: 'number', label: 'Numerado' },
                { value: 'icon', label: 'Ícone por item' },
              ]}
              variant="glass"
            />
          </div>
        </AccordionItem>

        <AccordionItem
          id="list-items"
          title="Itens da Lista"
          icon={List}
          defaultOpen={false}
        >
          <ListItemsEditor
            items={items}
            showIconPicker={effectiveProps.listType === 'icon'}
            onChange={(newItems) => onPropChange('items', newItems)}
          />
        </AccordionItem>

        <AccordionItem
          id="list-typography"
          title="Tipografia da Lista"
          icon={Type}
          defaultOpen={false}
        >
          <GlobalTypographyPicker
            label="Estilo de Tipografia"
            typoPreset={effectiveProps.typoPreset || 'paragraph'}
            onChangePreset={(preset) => onPropChange('typoPreset', preset)}
            onClearOverrides={() => clearTypographyOverrides()}
            fontFamily={effectiveProps.fontFamily}
            fontSize={effectiveProps.fontSize}
            fontWeight={effectiveProps.fontWeight}
            lineHeight={effectiveProps.lineHeight}
            letterSpacing={effectiveProps.letterSpacing}
            textTransform={effectiveProps.textTransform}
            textAlign={effectiveProps.textAlign}
            page={page}
            onUpdateSiteConfig={onUpdateSiteConfig}
            defaultFontCategory="body"
            onChangeTypography={handleTypographyChange}
          />
        </AccordionItem>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // IMAGE
  // -------------------------------------------------------------------------
  if (type === 'image') {
    const rawRatio = effectiveProps.aspectRatio;
    let numericRatio: number | undefined;
    if (rawRatio && rawRatio !== 'auto' && rawRatio !== 'original') {
      if (typeof rawRatio === 'number') {
        numericRatio = rawRatio;
      } else if (typeof rawRatio === 'string') {
        if (rawRatio.includes('/')) {
          const [w, h] = rawRatio.split('/').map(Number);
          if (w && h) numericRatio = w / h;
        } else if (rawRatio.includes(':')) {
          const [w, h] = rawRatio.split(':').map(Number);
          if (w && h) numericRatio = w / h;
        } else {
          const num = parseFloat(rawRatio);
          if (!isNaN(num)) numericRatio = num;
        }
      }
    }

    return (
      <div className="space-y-3">
        <AccordionItem
          id="img-source"
          title="Mídia & Origem"
          icon={ImageIcon}
          defaultOpen={false}
        >
          <ImageUploader
            label="Imagem da Biblioteca / Upload R2"
            value={effectiveProps.src || ''}
            onChange={(url) => onPropChange('src', url)}
            tenantId={tenantId}
            targetWidth={800}
            aspectRatio={numericRatio}
          />

          <div className="space-y-1 pt-2 border-t border-[var(--surface-border)]/50">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Texto Alternativo (ALT)</label>
            <Input
              type="text"
              value={effectiveProps.alt || ''}
              onChange={(e) => onPropChange('alt', e.target.value)}
              className="text-xs"
              placeholder="Descrição da imagem para SEO e acessibilidade"
            />
          </div>
        </AccordionItem>

        <AccordionItem
          id="img-fit"
          title="Proporção & Ajuste"
          icon={Sliders}
          defaultOpen={false}
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Proporção (Aspect Ratio)</label>
            <div className="grid grid-cols-4 gap-1">
              {['16/9', '4/3', '1/1', '3/4'].map((ar) => (
                <button
                  key={ar}
                  type="button"
                  onClick={() => onPropChange('aspectRatio', ar)}
                  className={`py-1.5 rounded-lg border text-[9px] font-bold cursor-pointer transition-all ${
                    (effectiveProps.aspectRatio || '16/9') === ar
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                      : 'border-[var(--surface-border)] text-slate-500'
                  }`}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Ajuste da Imagem</label>
            <Select
              value={effectiveProps.objectFit || 'cover'}
              onChange={(e) => onPropChange('objectFit', e.target.value)}
              options={[
                { value: 'cover', label: 'Cover (preenche)' },
                { value: 'contain', label: 'Contain (cabe tudo)' },
                { value: 'fill', label: 'Fill (estica)' },
              ]}
              variant="glass"
            />
          </div>
        </AccordionItem>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // TESTIMONIAL
  // -------------------------------------------------------------------------
  if (type === 'testimonial') {
    return (
      <div className="space-y-3">
        <AccordionItem
          id="tst-content"
          title="Depoimento & Autor"
          icon={FileText}
          defaultOpen={false}
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Depoimento</label>
            <textarea
              rows={3}
              value={effectiveProps.quote || ''}
              onChange={(e) => onPropChange('quote', e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-[var(--surface-border)] bg-transparent text-slate-900 dark:text-white outline-none resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Nome do Autor</label>
            <Input
              type="text"
              value={effectiveProps.authorName || ''}
              onChange={(e) => onPropChange('authorName', e.target.value)}
              className="text-xs font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Título / Cargo</label>
            <Input
              type="text"
              value={effectiveProps.authorTitle || ''}
              onChange={(e) => onPropChange('authorTitle', e.target.value)}
              className="text-xs"
            />
          </div>

          <ImageUploader
            label="Foto do Autor / Paciente"
            value={effectiveProps.authorAvatar || ''}
            onChange={(url) => onPropChange('authorAvatar', url)}
            tenantId={tenantId}
            targetWidth={200}
            targetHeight={200}
            allowTransparency={true}
          />

          <div className="space-y-1 pt-2 border-t border-[var(--surface-border)]/50">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Avaliação (Estrelas)</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => onPropChange('rating', star)}
                  className={`text-lg cursor-pointer transition-transform hover:scale-110 ${
                    (effectiveProps.rating || 5) >= star ? 'text-amber-400' : 'text-slate-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        </AccordionItem>

        <AccordionItem
          id="tst-typography"
          title="Tipografia do Depoimento"
          icon={Type}
          defaultOpen={false}
        >
          <div className="space-y-3">
            <GlobalTypographyPicker
              label="Tipografia da Citação"
              typoPreset={effectiveProps.quoteTypoPreset || 'h3'}
              onChangePreset={(preset) => onPropChange('quoteTypoPreset', preset)}
              onClearOverrides={() => clearTypographyOverrides('quote')}
              fontFamily={effectiveProps.quoteFontFamily}
              fontSize={effectiveProps.quoteFontSize}
              fontWeight={effectiveProps.quoteFontWeight}
              lineHeight={effectiveProps.quoteLineHeight}
              letterSpacing={effectiveProps.quoteLetterSpacing}
              textTransform={effectiveProps.quoteTextTransform}
              textAlign={effectiveProps.quoteTextAlign}
              page={page}
              onUpdateSiteConfig={onUpdateSiteConfig}
              defaultFontCategory="body"
              onChangeTypography={(patch) => handlePrefixedTypographyChange('quote', patch)}
            />

            <div className="pt-3 border-t border-[var(--surface-border)]/50">
              <GlobalTypographyPicker
                label="Tipografia do Nome do Autor"
                typoPreset={effectiveProps.authorNameTypoPreset || 'h4'}
                onChangePreset={(preset) => onPropChange('authorNameTypoPreset', preset)}
                onClearOverrides={() => clearTypographyOverrides('authorName')}
                fontFamily={effectiveProps.authorNameFontFamily}
                fontSize={effectiveProps.authorNameFontSize}
                fontWeight={effectiveProps.authorNameFontWeight}
                lineHeight={effectiveProps.authorNameLineHeight}
                letterSpacing={effectiveProps.authorNameLetterSpacing}
                textTransform={effectiveProps.authorNameTextTransform}
                textAlign={effectiveProps.authorNameTextAlign}
                page={page}
                onUpdateSiteConfig={onUpdateSiteConfig}
                defaultFontCategory="heading"
                onChangeTypography={(patch) => handlePrefixedTypographyChange('authorName', patch)}
              />
            </div>

            <div className="pt-3 border-t border-[var(--surface-border)]/50">
              <GlobalTypographyPicker
                label="Tipografia do Cargo / Título"
                typoPreset={effectiveProps.authorTitleTypoPreset || 'paragraph'}
                onChangePreset={(preset) => onPropChange('authorTitleTypoPreset', preset)}
                onClearOverrides={() => clearTypographyOverrides('authorTitle')}
                fontFamily={effectiveProps.authorTitleFontFamily}
                fontSize={effectiveProps.authorTitleFontSize}
                fontWeight={effectiveProps.authorTitleFontWeight}
                lineHeight={effectiveProps.authorTitleLineHeight}
                letterSpacing={effectiveProps.authorTitleLetterSpacing}
                textTransform={effectiveProps.authorTitleTextTransform}
                textAlign={effectiveProps.authorTitleTextAlign}
                page={page}
                onUpdateSiteConfig={onUpdateSiteConfig}
                defaultFontCategory="body"
                onChangeTypography={(patch) => handlePrefixedTypographyChange('authorTitle', patch)}
              />
            </div>
          </div>
        </AccordionItem>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // VIDEO
  // -------------------------------------------------------------------------
  if (type === 'video') {
    return (
      <div className="space-y-3">
        <AccordionItem
          id="video-config"
          title="Vídeo & Origem"
          icon={ImageIcon}
          defaultOpen={true}
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Origem do Vídeo</label>
              <Select
                value={effectiveProps.embedType || 'youtube'}
                onChange={(e) => onPropChange('embedType', e.target.value)}
                options={[
                  { value: 'youtube', label: 'YouTube (Link ou ID)' },
                  { value: 'vimeo', label: 'Vimeo (Link ou ID)' },
                  { value: 'upload', label: 'Upload Direto / MP4' },
                ]}
                variant="glass"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">URL do Vídeo</label>
              <Input
                type="text"
                value={effectiveProps.src || ''}
                onChange={(e) => onPropChange('src', e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Proporção da Tela (Aspect Ratio)</label>
              <Select
                value={effectiveProps.aspectRatio || '16/9'}
                onChange={(e) => onPropChange('aspectRatio', e.target.value)}
                options={[
                  { value: '16/9', label: '16:9 (Widescreen Padrão)' },
                  { value: '4/3', label: '4:3 (TV Tradicional)' },
                  { value: '1/1', label: '1:1 (Quadrado)' },
                  { value: '9/16', label: '9:16 (Vertical / Reels)' },
                ]}
                variant="glass"
              />
            </div>

            <div className="pt-2 border-t border-[var(--surface-border)]/50 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={effectiveProps.controls !== false}
                  onChange={(e) => onPropChange('controls', e.target.checked)}
                  className="rounded accent-blue-500"
                />
                Exibir Controles do Player
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={!!effectiveProps.autoplay}
                  onChange={(e) => onPropChange('autoplay', e.target.checked)}
                  className="rounded accent-blue-500"
                />
                Reproduzir Automaticamente (Autoplay)
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={!!effectiveProps.muted}
                  onChange={(e) => onPropChange('muted', e.target.checked)}
                  className="rounded accent-blue-500"
                />
                Iniciar Mutado (Sem Áudio)
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={!!effectiveProps.loop}
                  onChange={(e) => onPropChange('loop', e.target.checked)}
                  className="rounded accent-blue-500"
                />
                Repetição Contínua (Loop)
              </label>
            </div>
          </div>
        </AccordionItem>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // AVATAR
  // -------------------------------------------------------------------------
  if (type === 'avatar') {
    return (
      <div className="space-y-3">
        <AccordionItem
          id="avatar-config"
          title="Imagem & Formato"
          icon={Sparkles}
          defaultOpen={true}
        >
          <div className="space-y-3">
            <ImageUploader
              label="Foto do Avatar"
              value={effectiveProps.src || ''}
              onChange={(url) => onPropChange('src', url)}
              tenantId={tenantId}
              targetWidth={160}
              targetHeight={160}
              allowTransparency={true}
            />

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Formato do Avatar</label>
              <Select
                value={effectiveProps.shape || 'circle'}
                onChange={(e) => onPropChange('shape', e.target.value)}
                options={[
                  { value: 'circle', label: 'Círculo (9999px)' },
                  { value: 'rounded', label: 'Arredondado (12px)' },
                  { value: 'square', label: 'Quadrado (4px)' },
                ]}
                variant="glass"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tamanho (Largura e Altura)</label>
              <SliderNumberInput
                value={effectiveProps.size || '48px'}
                onChange={(val) => onPropChange('size', val)}
                min={24}
                max={240}
                step={4}
                defaultUnit="px"
              />
            </div>

            <GlobalColorPicker
              label="Cor da Borda"
              value={effectiveProps.borderColor || ''}
              onChange={(v) => onPropChange('borderColor', v)}
              page={page}
            />

            <div className="pt-2 border-t border-[var(--surface-border)]/50 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={effectiveProps.hasBorder !== false}
                  onChange={(e) => onPropChange('hasBorder', e.target.checked)}
                  className="rounded accent-blue-500"
                />
                Exibir Borda Externa
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={effectiveProps.hasShadow !== false}
                  onChange={(e) => onPropChange('hasShadow', e.target.checked)}
                  className="rounded accent-blue-500"
                />
                Exibir Sombra Projetada
              </label>
            </div>
          </div>
        </AccordionItem>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // DIVIDER
  // -------------------------------------------------------------------------
  if (type === 'divider') {
    return (
      <div className="space-y-3">
        <AccordionItem
          id="divider-config"
          title="Linha Divisória"
          icon={Sliders}
          defaultOpen={true}
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Estilo da Linha</label>
              <Select
                value={effectiveProps.style || 'solid'}
                onChange={(e) => onPropChange('style', e.target.value)}
                options={[
                  { value: 'solid', label: 'Sólida (Contínua)' },
                  { value: 'dashed', label: 'Tracejada (Dashed)' },
                  { value: 'dotted', label: 'Pontilhada (Dotted)' },
                ]}
                variant="glass"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Espessura da Linha</label>
              <SliderNumberInput
                value={effectiveProps.thickness || '1px'}
                onChange={(val) => onPropChange('thickness', val)}
                min={1}
                max={20}
                step={1}
                defaultUnit="px"
                placeholder="1px"
              />
            </div>

            <GlobalColorPicker
              label="Cor da Divisória"
              value={effectiveProps.color || ''}
              onChange={(v) => onPropChange('color', v)}
              page={page}
            />
          </div>
        </AccordionItem>
      </div>
    );
  }
  // -------------------------------------------------------------------------
  // LOGOTIPO / MARCA
  // -------------------------------------------------------------------------
  if (type === 'logo') {
    const logoMode = effectiveProps.mode || 'workspace';
    const align = effectiveProps.align || 'left';

    const activeLogoUrl = page?.logoUrl || page?.siteConfig?.logoUrl || page?.siteConfig?.theme?.logoUrl;
    const activeFaviconUrl = page?.faviconUrl || page?.siteConfig?.theme?.faviconUrl;
    const activeText = page?.siteConfig?.professional?.name || page?.siteConfig?.logoConfig?.text || page?.title || 'Psicologia';

    const currentBrandModeText = activeLogoUrl
      ? 'Logotipo em Imagem'
      : activeFaviconUrl
      ? 'Ícone + Texto'
      : 'Quadro Gradiente Ψ + Texto';

    return (
      <div className="space-y-3">
        <AccordionItem
          id="logo-content"
          title="Configuração do Logotipo"
          icon={UserCheck}
          defaultOpen={true}
        >
          <div className="space-y-3">
            {/* Card Informativo da Marca Centralizada */}
            <div className="p-3 rounded-xl border border-[var(--surface-border)] glass-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Status da Marca Global
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full brand-accent text-white">
                  {currentBrandModeText}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                Nome da Marca: <strong className="text-slate-800 dark:text-slate-200">{activeText}</strong>
              </p>
            </div>

            {/* Origem da Marca */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Origem da Marca</label>
              <Select
                value={logoMode}
                onChange={(e) => onPropChange('mode', e.target.value)}
                options={[
                  { value: 'workspace', label: 'Usar Marca Central da Página' },
                  { value: 'image', label: 'Imagem Específica neste Bloco' },
                ]}
                variant="glass"
              />
            </div>

            {logoMode === 'image' && (
              <ImageUploader
                label="Imagem do Logotipo"
                value={effectiveProps.imageUrl || ''}
                onChange={(url) => onPropChange('imageUrl', url)}
                tenantId={page?.tenantId}
                isLogo={true}
              />
            )}

            {/* Alinhamento no Container */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Alinhamento no Bloco</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { value: 'left', label: 'Esquerda', icon: AlignLeft },
                  { value: 'center', label: 'Centro', icon: AlignCenter },
                  { value: 'right', label: 'Direita', icon: AlignRight },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = align === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onPropChange('align', opt.value)}
                      className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        isSelected
                          ? 'brand-accent text-white border-transparent shadow-xs'
                          : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white glass-sm'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Largura do Logo */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Largura do Logo</label>
              <SliderNumberInput
                value={effectiveProps.width || '180px'}
                onChange={(val) => onPropChange('width', val)}
                min={60}
                max={450}
                step={2}
                defaultUnit="px"
                unitOptions={['px', 'rem', '%', 'vw']}
                placeholder="180px"
              />
            </div>
          </div>
        </AccordionItem>
      </div>
    );
  }
  // -------------------------------------------------------------------------
  // NAVBAR LINKS / MENU
  // -------------------------------------------------------------------------
  if (type === 'navbar_links') {
    const links: MenuLinkItem[] = Array.isArray(effectiveProps.links) && effectiveProps.links.length > 0
      ? effectiveProps.links
      : [
          { id: '1', label: 'Sobre Mim', targetType: 'section', sectionId: 'sec-about' },
          { id: '2', label: 'Especialidades', targetType: 'section', sectionId: 'sec-diagnostic' },
          { id: '3', label: 'Processo', targetType: 'section', sectionId: 'sec-process' },
          { id: '4', label: 'Dúvidas', targetType: 'section', sectionId: 'sec-faq' },
        ];

    const availableSections = Array.isArray(page?.siteConfig?.canvas_data?.sections)
      ? page.siteConfig.canvas_data.sections
      : Array.isArray(page?.canvas_data?.sections)
      ? page.canvas_data.sections
      : [];

    const handleUpdateLink = (idx: number, patch: Partial<MenuLinkItem>) => {
      const updated = [...links];
      updated[idx] = { ...updated[idx], ...patch };
      onPropChange('links', updated);
    };

    const handleAddLink = () => {
      const newLink: MenuLinkItem = {
        id: `link-${Date.now()}`,
        label: `Novo Link ${links.length + 1}`,
        targetType: 'section',
        sectionId: availableSections[0]?.id || '',
      };
      onPropChange('links', [...links, newLink]);
    };

    const handleRemoveLink = (idx: number) => {
      const updated = links.filter((_, i) => i !== idx);
      onPropChange('links', updated);
    };

    return (
      <div className="space-y-3">
        <AccordionItem
          id="nav-links-content"
          title="Itens do Menu de Navegação"
          icon={List}
          defaultOpen={true}
        >
          <div className="space-y-3">
            {links.map((link, idx) => (
              <div key={link.id || idx} className="p-3 rounded-xl border border-[var(--surface-border)] glass-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Item {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(idx)}
                    className="text-slate-400 hover:text-red-400 p-1 cursor-pointer transition-colors"
                    title="Excluir Link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase">Texto do Link</label>
                  <Input
                    type="text"
                    value={link.label || ''}
                    onChange={(e) => handleUpdateLink(idx, { label: e.target.value })}
                    className="text-xs font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => handleUpdateLink(idx, { targetType: 'section' })}
                    className={`py-1 text-[9px] font-bold rounded-lg border cursor-pointer transition-all ${
                      link.targetType === 'section'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                        : 'border-[var(--surface-border)] text-slate-500'
                    }`}
                  >
                    Seção da Página
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateLink(idx, { targetType: 'external_url' })}
                    className={`py-1 text-[9px] font-bold rounded-lg border cursor-pointer transition-all ${
                      link.targetType === 'external_url'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                        : 'border-[var(--surface-border)] text-slate-500'
                    }`}
                  >
                    Link Externo
                  </button>
                </div>

                {link.targetType === 'section' ? (
                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-slate-400 uppercase">Seção de Destino</label>
                    <Select
                      value={link.sectionId || ''}
                      onChange={(e) => handleUpdateLink(idx, { sectionId: e.target.value })}
                      options={[
                        { value: '', label: 'Selecione uma seção...' },
                        ...availableSections.map((s: any) => ({
                          value: s.id,
                          label: s.label || `Seção (${s.id})`,
                        })),
                      ]}
                      variant="glass"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-slate-400 uppercase">URL do Link</label>
                    <Input
                      type="text"
                      value={link.externalUrl || ''}
                      onChange={(e) => handleUpdateLink(idx, { externalUrl: e.target.value })}
                      placeholder="https://..."
                      className="text-xs"
                    />
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddLink}
              className="w-full py-2 rounded-xl border border-dashed border-[var(--brand-gradient-start)]/50 text-[11px] font-bold text-[var(--brand-gradient-start)] hover:bg-[var(--brand-gradient-start)]/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              + Adicionar Item de Menu
            </button>
          </div>
        </AccordionItem>

        <AccordionItem
          id="nav-links-typography"
          title="Tipografia dos Links"
          icon={Type}
          defaultOpen={false}
        >
          <GlobalTypographyPicker
            label="Tipografia dos Links"
            typoPreset={effectiveProps.typoPreset || 'nav_links'}
            onChangePreset={(preset) => onPropChange('typoPreset', preset)}
            onClearOverrides={() => clearTypographyOverrides()}
            fontFamily={effectiveProps.fontFamily}
            fontSize={effectiveProps.fontSize}
            fontWeight={effectiveProps.fontWeight}
            lineHeight={effectiveProps.lineHeight}
            letterSpacing={effectiveProps.letterSpacing}
            textTransform={effectiveProps.textTransform}
            textAlign={effectiveProps.textAlign}
            page={page}
            onUpdateSiteConfig={onUpdateSiteConfig}
            defaultFontCategory="body"
            onChangeTypography={handleTypographyChange}
          />
        </AccordionItem>

        <AccordionItem
          id="nav-links-style"
          title="Espaçamento do Menu"
          icon={Sliders}
          defaultOpen={false}
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Espaço entre os Links (Gap)</label>
            <SliderNumberInput
              value={effectiveProps.gap || '24px'}
              onChange={(val) => onPropChange('gap', val)}
              min={8}
              max={64}
              defaultUnit="px"
            />
          </div>
        </AccordionItem>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // REDES SOCIAIS (SOCIAL LINKS)
  // -------------------------------------------------------------------------
  if (type === 'social_links') {
    const links = Array.isArray(effectiveProps.links) && effectiveProps.links.length > 0
      ? effectiveProps.links
      : [
          { id: '1', platform: 'instagram', url: 'https://instagram.com' },
          { id: '2', platform: 'whatsapp', url: 'https://wa.me/' },
          { id: '3', platform: 'linkedin', url: 'https://linkedin.com' },
        ];

    const platforms = [
      { value: 'instagram', label: 'Instagram' },
      { value: 'whatsapp', label: 'WhatsApp' },
      { value: 'linkedin', label: 'LinkedIn' },
      { value: 'facebook', label: 'Facebook' },
      { value: 'youtube', label: 'YouTube' },
      { value: 'tiktok', label: 'TikTok' },
      { value: 'twitter', label: 'X / Twitter' },
      { value: 'email', label: 'E-mail' },
      { value: 'website', label: 'Website' },
    ];

    const handleUpdateLink = (idx: number, patch: any) => {
      const updated = [...links];
      updated[idx] = { ...updated[idx], ...patch };
      onPropChange('links', updated);
    };

    const handleAddLink = () => {
      const newLink = {
        id: `social-${Date.now()}`,
        platform: 'instagram',
        url: 'https://instagram.com',
      };
      onPropChange('links', [...links, newLink]);
    };

    const handleRemoveLink = (idx: number) => {
      const updated = links.filter((_, i) => i !== idx);
      onPropChange('links', updated);
    };

    return (
      <div className="space-y-3">
        <AccordionItem
          id="social-links-content"
          title="Links de Redes Sociais"
          icon={List}
          defaultOpen={true}
        >
          <div className="space-y-3">
            {links.map((link: any, idx: number) => (
              <div key={link.id || idx} className="p-3 rounded-xl border border-[var(--surface-border)] glass-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Rede {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(idx)}
                    className="text-slate-400 hover:text-red-400 p-1 cursor-pointer transition-colors"
                    title="Excluir Rede Social"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Plataforma</label>
                  <Select
                    value={link.platform || 'instagram'}
                    onChange={(val) => handleUpdateLink(idx, { platform: val })}
                    options={platforms}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Link URL</label>
                  <Input
                    value={link.url || ''}
                    onChange={(e) => handleUpdateLink(idx, { url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddLink}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[var(--brand-gradient-start)] text-[var(--brand-gradient-start)] hover:bg-[var(--brand-gradient-start)]/10 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              + Adicionar Rede Social
            </button>
          </div>
        </AccordionItem>

        <AccordionItem
          id="social-links-style"
          title="Estilo & Apresentação"
          icon={Sliders}
          defaultOpen={false}
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Estilo dos Ícones</label>
              <Select
                value={effectiveProps.variant || 'minimal'}
                onChange={(val) => onPropChange('variant', val)}
                options={[
                  { value: 'minimal', label: 'Apenas Ícone (Minimal)' },
                  { value: 'circle', label: 'Círculo de Fundo' },
                  { value: 'filled', label: 'Quadrado Arredondado' },
                  { value: 'outline', label: 'Borda com Contorno' },
                ]}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tamanho dos Ícones</label>
              <SliderNumberInput
                value={effectiveProps.iconSize || '20px'}
                onChange={(val) => onPropChange('iconSize', val)}
                min={14}
                max={48}
                defaultUnit="px"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Espaçamento (Gap)</label>
              <SliderNumberInput
                value={effectiveProps.gap || '16px'}
                onChange={(val) => onPropChange('gap', val)}
                min={8}
                max={48}
                defaultUnit="px"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Alinhamento</label>
              <Select
                value={effectiveProps.align || 'left'}
                onChange={(val) => onPropChange('align', val)}
                options={[
                  { value: 'left', label: 'Esquerda' },
                  { value: 'center', label: 'Centralizado' },
                  { value: 'right', label: 'Direita' },
                  { value: 'space-between', label: 'Espaçado (Justificado)' },
                ]}
              />
            </div>

          </div>
        </AccordionItem>
      </div>
    );
  }

  const elementDef = ElementRegistry.get(type);
  if (elementDef && elementDef.propControls && elementDef.propControls.length > 0) {
    return (
      <DynamicPropertyRenderer
        component={component}
        effectiveProps={effectiveProps}
        onPropChange={onPropChange}
        onPropsBatchChange={onPropsBatchChange}
        canvasData={canvasData}
        page={page}
      />
    );
  }

  return null;
}