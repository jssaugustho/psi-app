'use client';

import React from 'react';
import { CanvasData, ComponentStyle, Section, ViewportMode } from '../types';
import { Button, Input } from '@psi/ui';
import { sanitizeUriSlug, getSectionDisplayName } from '@psi/canvas-renderer';
import {
  Trash2,
  ArrowLeft,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  MoveHorizontal,
  MoveVertical,
  Eye,
  EyeOff,
  LayoutGrid,
  Ruler,
  Maximize,
  Palette,
  Square,
  ChevronUp,
  ChevronDown,
  Pin,
  Sun,
  Sparkles,
  Zap,
  Sliders,
  Tag,
  Hash,
  Link2,
  Layers,
} from 'lucide-react';
import { SizeControl } from './components/SizeControl';
import { PaddingControl } from './components/PaddingControl';
import { BorderControl } from './components/BorderControl';
import { SliderNumberInput } from './components/SliderNumberInput';
import { BackgroundControl } from './components/BackgroundControl';
import { AccordionItem } from './components/AccordionSection';
import { TransformControl } from './components/TransformControl';
import { TransitionControl } from './components/TransitionControl';
import { PositioningControl } from './components/PositioningControl';
import { ParallaxControl } from './components/ParallaxControl';

interface SectionPropertiesProps {
  section: Section;
  canvasData?: CanvasData | null;
  viewportMode?: ViewportMode;
  page?: any;
  onUpdateSection: (id: string, patch: Partial<Section>) => void;
  onRemoveSection: (id: string) => void;
  onMoveSection?: (fromIndex: number, toIndex: number) => void;
  onDeselect?: () => void;
}

export function SectionProperties({
  section,
  canvasData,
  viewportMode = 'desktop',
  page,
  onUpdateSection,
  onRemoveSection,
  onMoveSection,
  onDeselect,
}: SectionPropertiesProps) {
  const [stateTab, setStateTab] = React.useState<'normal' | 'hover'>('normal');
  const isMobile = viewportMode === 'mobile';

  const effectiveLayout = isMobile
    ? { ...section.layout, ...(section.mobile || {}) }
    : section.layout;
  const effectiveBorder = isMobile
    ? { ...(section.border || {}), ...(section.mobile?.border || {}) }
    : (section.border || {});
  const effectiveStyle = (section as any).style || {};
  const activeSectionIdRef = React.useRef(section.id);
  const onUpdateSectionRef = React.useRef(onUpdateSection);
  const styleRef = React.useRef(effectiveStyle);
  const prevSectionIdRef = React.useRef(section.id);

  React.useEffect(() => {
    activeSectionIdRef.current = section.id;
    onUpdateSectionRef.current = onUpdateSection;
    styleRef.current = effectiveStyle;
  });

  React.useEffect(() => {
    if (prevSectionIdRef.current && prevSectionIdRef.current !== section.id) {
      if (onUpdateSection && (styleRef.current as any)?.__isPreviewingHover) {
        onUpdateSection(prevSectionIdRef.current, {
          style: { ...(styleRef.current || {}), __isPreviewingHover: undefined },
        } as any);
      }
      prevSectionIdRef.current = section.id;
      setStateTab('normal');
    }
  }, [section.id]);

  React.useEffect(() => {
    if (stateTab === 'hover' && !effectiveStyle.__isPreviewingHover) {
      handleStyleChange('__isPreviewingHover', true);
    } else if (stateTab === 'normal' && effectiveStyle.__isPreviewingHover) {
      handleStyleChange('__isPreviewingHover', undefined);
    }
  }, [stateTab, section.id]);

  React.useEffect(() => {
    return () => {
      if (onUpdateSectionRef.current && activeSectionIdRef.current) {
        const curStyle = styleRef.current || {};
        if ((curStyle as any)?.__isPreviewingHover) {
          onUpdateSectionRef.current(activeSectionIdRef.current, {
            style: { ...curStyle, __isPreviewingHover: undefined },
          } as any);
        }
      }
    };
  }, []);
  const isHidden = isMobile ? (section.mobile?.hidden ?? section.hidden ?? false) : (section.hidden ?? false);

  const bg = section.background;
  const isHorizontal = effectiveLayout.flexDirection === 'row';

  const activeStyle: ComponentStyle = stateTab === 'hover'
    ? {
        ...effectiveStyle,
        backgroundColor: effectiveStyle.hoverBackgroundColor !== undefined ? effectiveStyle.hoverBackgroundColor : effectiveStyle.backgroundColor,
        color: effectiveStyle.hoverColor !== undefined ? effectiveStyle.hoverColor : effectiveStyle.color,
        borderStyle: (effectiveStyle.hoverBorderStyle !== undefined ? effectiveStyle.hoverBorderStyle : effectiveStyle.borderStyle) as any,
        borderColor: effectiveStyle.hoverBorderColor !== undefined ? effectiveStyle.hoverBorderColor : effectiveStyle.borderColor,
        borderWidth: effectiveStyle.hoverBorderWidth !== undefined ? effectiveStyle.hoverBorderWidth : effectiveStyle.borderWidth,
        borderRadius: effectiveStyle.hoverBorderRadius !== undefined ? effectiveStyle.hoverBorderRadius : effectiveStyle.borderRadius,
        boxShadow: effectiveStyle.hoverBoxShadow !== undefined ? effectiveStyle.hoverBoxShadow : effectiveStyle.boxShadow,
        opacity: effectiveStyle.hoverOpacity !== undefined ? effectiveStyle.hoverOpacity : effectiveStyle.opacity,
        scale: effectiveStyle.hoverScale !== undefined ? effectiveStyle.hoverScale : effectiveStyle.scale,
        translateX: effectiveStyle.hoverTranslateX !== undefined ? effectiveStyle.hoverTranslateX : effectiveStyle.translateX,
        translateY: effectiveStyle.hoverTranslateY !== undefined ? effectiveStyle.hoverTranslateY : effectiveStyle.translateY,
        rotate: effectiveStyle.hoverRotate !== undefined ? effectiveStyle.hoverRotate : effectiveStyle.rotate,
      }
    : effectiveStyle;

  const handleStyleChange = (key: any, value: any) => {
    onUpdateSection(section.id, {
      style: {
        ...((section as any).style || {}),
        [key]: value,
      },
    } as any);
  };

  const handleSmartStyleChange = (key: keyof ComponentStyle, value: any) => {
    if (stateTab === 'hover') {
      const hoverKeyMap: Record<string, keyof ComponentStyle> = {
        backgroundColor: 'hoverBackgroundColor',
        color: 'hoverColor',
        borderStyle: 'hoverBorderStyle',
        borderColor: 'hoverBorderColor',
        borderWidth: 'hoverBorderWidth',
        borderRadius: 'hoverBorderRadius',
        boxShadow: 'hoverBoxShadow',
        opacity: 'hoverOpacity',
        scale: 'hoverScale',
        translateX: 'hoverTranslateX',
        translateY: 'hoverTranslateY',
        rotate: 'hoverRotate',
        transitionDurationMs: 'transitionDurationMs',
        transitionTimingFunction: 'transitionTimingFunction',
      };
      const targetKey = hoverKeyMap[key] || key;
      handleStyleChange(targetKey, value);
    } else {
      handleStyleChange(key, value);
    }
  };

  const handleLayoutChange = (key: string, value: any) => {
    if (isMobile) {
      onUpdateSection(section.id, {
        mobile: {
          ...(section.mobile || {}),
          [key]: value,
        },
      });
    } else {
      onUpdateSection(section.id, {
        layout: {
          ...section.layout,
          [key]: value,
        },
      });
    }
  };

  const handleMultiLayoutChange = (patch: Record<string, any>) => {
    if (isMobile) {
      onUpdateSection(section.id, {
        mobile: {
          ...(section.mobile || {}),
          ...patch,
        },
      });
    } else {
      onUpdateSection(section.id, {
        layout: {
          ...section.layout,
          ...patch,
        },
      });
    }
  };

  const handleBorderChange = (key: string, value: any) => {
    if (stateTab === 'hover') {
      const hoverKeyMap: Record<string, keyof ComponentStyle> = {
        borderStyle: 'hoverBorderStyle',
        borderWidth: 'hoverBorderWidth',
        borderColor: 'hoverBorderColor',
        borderRadius: 'hoverBorderRadius',
      };
      const targetKey = hoverKeyMap[key] || (key as any);
      handleStyleChange(targetKey, value);
    } else {
      const stylePatchKeyMap: Record<string, keyof ComponentStyle> = {
        borderStyle: 'borderStyle',
        borderWidth: 'borderWidth',
        borderColor: 'borderColor',
        borderRadius: 'borderRadius',
      };
      const styleKey = stylePatchKeyMap[key];
      const borderPatch: Record<string, any> = { [key]: value };
      if (key === 'borderColor') borderPatch.color = value;
      if (key === 'color') borderPatch.borderColor = value;
      if (key === 'borderWidth') borderPatch.width = value;
      if (key === 'borderStyle') borderPatch.style = value;

      if (isMobile) {
        onUpdateSection(section.id, {
          mobile: {
            ...(section.mobile || {}),
            border: {
              ...(section.mobile?.border || section.border || {}),
              ...borderPatch,
            },
            ...(styleKey ? {
              style: {
                ...(section.mobile?.style || (section as any).style || {}),
                [styleKey]: value,
              },
            } : {}),
          },
        });
      } else {
        onUpdateSection(section.id, {
          border: {
            ...(section.border || {}),
            ...borderPatch,
          },
          ...(styleKey ? {
            style: {
              ...((section as any).style || {}),
              [styleKey]: value,
            },
          } : {}),
        } as any);
      }
    }
  };

  const handleToggleVisibility = () => {
    if (isMobile) {
      onUpdateSection(section.id, {
        mobile: {
          ...(section.mobile || {}),
          hidden: !isHidden,
        },
      });
    } else {
      onUpdateSection(section.id, { hidden: !isHidden });
    }
  };

  const handleDelete = () => {
    onRemoveSection(section.id);
  };

  const hasAnyHoverOverride =
    effectiveStyle.hoverBackgroundColor !== undefined ||
    effectiveStyle.hoverColor !== undefined ||
    effectiveStyle.hoverBorderColor !== undefined ||
    effectiveStyle.hoverBorderWidth !== undefined ||
    effectiveStyle.hoverBorderRadius !== undefined ||
    effectiveStyle.hoverBoxShadow !== undefined ||
    effectiveStyle.hoverOpacity !== undefined ||
    effectiveStyle.hoverScale !== undefined ||
    effectiveStyle.hoverTranslateX !== undefined ||
    effectiveStyle.hoverTranslateY !== undefined ||
    effectiveStyle.hoverRotate !== undefined;

  return (
    <div className="flex flex-col h-full text-xs select-none">
      {/* Top Header */}
      <div className="p-3 border-b border-[var(--surface-border)] flex items-center justify-between glass-sm shrink-0">
        <button
          type="button"
          onClick={onDeselect}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[var(--brand-gradient-start)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Elementos</span>
        </button>

        <div className="flex items-center gap-1.5">
          {isMobile && (
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
              📱 Mobile
            </span>
          )}
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] border border-[var(--brand-gradient-start)]/20">
            Seção
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
        {/* Identificação da Seção (Nome & Âncora de URI) */}
        <div className="p-3 rounded-xl border border-[var(--surface-border)] glass-sm space-y-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
            <Tag className="w-3.5 h-3.5 text-[var(--brand-gradient-start)]" />
            <span>Nome & Identificador da Seção</span>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Nome da Seção (Rótulo)</label>
            <Input
              type="text"
              value={section.label || ''}
              onChange={(e) => {
                const newLabel = e.target.value;
                const autoAnchor = !section.anchorId ? sanitizeUriSlug(newLabel) : section.anchorId;
                onUpdateSection(section.id, {
                  label: newLabel,
                  ...(autoAnchor ? { anchorId: autoAnchor } : {}),
                });
              }}
              placeholder={canvasData ? getSectionDisplayName(section, canvasData.sections.findIndex((s) => s.id === section.id)) : 'Ex: Hero Header'}
              className="text-xs font-bold"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Âncora de URI (#ID)</label>
              <span className="text-[9px] font-mono text-purple-600 dark:text-purple-400 font-semibold">
                Validação URI
              </span>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-slate-400 font-mono text-xs select-none">#</span>
              <Input
                type="text"
                value={section.anchorId || ''}
                onChange={(e) => {
                  const sanitized = sanitizeUriSlug(e.target.value);
                  onUpdateSection(section.id, { anchorId: sanitized });
                }}
                onBlur={(e) => {
                  const sanitized = sanitizeUriSlug(e.target.value);
                  onUpdateSection(section.id, { anchorId: sanitized });
                }}
                placeholder={sanitizeUriSlug(section.label || section.id)}
                className="text-xs font-mono pl-6"
              />
            </div>
            <p className="text-[9px] text-slate-400 flex items-center gap-1 pt-0.5">
              <Link2 className="w-3 h-3 text-purple-500 shrink-0" />
              <span>Rolagem direta: <code className="font-mono text-purple-600 dark:text-purple-300 font-bold">#{section.anchorId || sanitizeUriSlug(section.label || section.id)}</code></span>
            </p>
          </div>
        </div>

        {/* Basic Metadata (Visibilidade & Posição) */}
        <div className="p-3 rounded-xl border border-[var(--surface-border)] glass-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Visibilidade</span>
            <button
              type="button"
              onClick={handleToggleVisibility}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                isHidden
                  ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
              }`}
            >
              {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isHidden ? 'Oculto' : 'Visível'}</span>
            </button>
          </div>

          {canvasData && canvasData.sections.length > 1 && (() => {
            const secIdx = canvasData.sections.findIndex((s) => s.id === section.id);
            if (secIdx === -1) return null;
            return (
              <div className="pt-2 border-t border-[var(--surface-border)]/60 flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                  Posição ({secIdx + 1} de {canvasData.sections.length})
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={secIdx <= 0}
                    onClick={() => onMoveSection?.(secIdx, secIdx - 1)}
                    className="px-2 py-1 rounded-lg border border-[var(--surface-border)] hover:bg-[var(--mix-base)] text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer flex items-center gap-1 text-[10px] font-bold transition-colors"
                    title="Mover Seção para Cima"
                  >
                    <ChevronUp className="w-3.5 h-3.5 text-[var(--brand-gradient-start)]" />
                    <span>Subir</span>
                  </button>
                  <button
                    type="button"
                    disabled={secIdx >= canvasData.sections.length - 1}
                    onClick={() => onMoveSection?.(secIdx, secIdx + 1)}
                    className="px-2 py-1 rounded-lg border border-[var(--surface-border)] hover:bg-[var(--mix-base)] text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer flex items-center gap-1 text-[10px] font-bold transition-colors"
                    title="Mover Seção para Baixo"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-[var(--brand-gradient-start)]" />
                    <span>Descer</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* 📐 ACCORDION: DISPOSIÇÃO & ALINHAMENTO */}
        <AccordionItem
          id="sec-layout"
          title="Disposição & Alinhamento"
          icon={LayoutGrid}
          defaultOpen={false}
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Organização dos Elementos</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleLayoutChange('flexDirection', 'row')}
                className={`p-2 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer transition-all ${
                  isHorizontal
                    ? 'border-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)]'
                    : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                }`}
              >
                <MoveHorizontal className="w-3.5 h-3.5" />
                <span>Lado a Lado</span>
              </button>
              <button
                type="button"
                onClick={() => handleLayoutChange('flexDirection', 'column')}
                className={`p-2 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer transition-all ${
                  !isHorizontal
                    ? 'border-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)]'
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
                  onClick={() => handleLayoutChange('justifyContent', item.value)}
                  className={`py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                    (effectiveLayout.justifyContent || 'flex-start') === item.value
                      ? 'border-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] font-extrabold'
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
                  onClick={() => handleLayoutChange('alignItems', item.value)}
                  className={`py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                    (effectiveLayout.alignItems || 'flex-start') === item.value
                      ? 'border-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] font-extrabold'
                      : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Alinhamento do Texto na Seção</label>
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
                    onClick={() => handleLayoutChange('textAlign', item.value)}
                    className={`p-2 rounded-lg border flex items-center justify-center cursor-pointer transition-all ${
                      effectiveLayout.textAlign === item.value
                        ? 'border-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] font-extrabold'
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
              value={effectiveLayout.gap || '24px'}
              onChange={(val) => handleLayoutChange('gap', val)}
              min={0}
              max={96}
              defaultUnit="px"
            />
          </div>
        </AccordionItem>

        {/* 📏 ACCORDION: DIMENSÕES & MEDIDAS DA SEÇÃO */}
        <AccordionItem
          id="sec-dimensions"
          title="Dimensões & Medidas da Seção"
          icon={Ruler}
          defaultOpen={false}
        >
          {(() => {
            const hasFullWidth = effectiveLayout.fullWidth !== false;
            return (
              <div className="space-y-3 text-xs">
                <div className="space-y-1.5 p-2.5 rounded-xl border border-[var(--surface-border)] glass-sm">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      Largura Total da Tela (Full Width)
                    </label>
                    <input
                      type="checkbox"
                      checked={hasFullWidth}
                      onChange={(e) => handleLayoutChange('fullWidth', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 accent-[var(--brand-gradient-start)] cursor-pointer"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 leading-tight">
                    Quando ativado, o fundo da seção se estende por 100% da largura do navegador.
                  </p>
                </div>

                {!hasFullWidth && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Largura Máxima do Conteúdo</label>
                    <SliderNumberInput
                      value={effectiveLayout.maxContentWidth || '1200px'}
                      onChange={(val) => handleLayoutChange('maxContentWidth', val)}
                      min={600}
                      max={1920}
                      step={20}
                      defaultUnit="px"
                      unitOptions={['px', '%', 'vw']}
                    />
                  </div>
                )}

                <SizeControl
                  width={effectiveLayout.width || '100%'}
                  height={effectiveLayout.height || 'auto'}
                  minWidth={effectiveLayout.minWidth}
                  maxWidth={effectiveLayout.maxWidth}
                  minHeight={effectiveLayout.minHeight || 'auto'}
                  maxHeight={effectiveLayout.maxHeight}
                  onChangeWidth={(w) => handleLayoutChange('width', w)}
                  onChangeHeight={(h) => handleLayoutChange('height', h)}
                  onChangeMinMax={(minMax) => handleMultiLayoutChange(minMax)}
                  isMobileOverride={isMobile}
                />
              </div>
            );
          })()}
        </AccordionItem>

        {/* 📦 ACCORDION: ESPAÇAMENTO (PADDING) */}
        <AccordionItem
          id="sec-padding"
          title="Espaçamento (Padding)"
          icon={Maximize}
          defaultOpen={false}
        >
          <PaddingControl
            paddingTop={effectiveLayout.paddingTop !== undefined ? effectiveLayout.paddingTop : '0px'}
            paddingRight={effectiveLayout.paddingRight !== undefined ? effectiveLayout.paddingRight : '0px'}
            paddingBottom={effectiveLayout.paddingBottom !== undefined ? effectiveLayout.paddingBottom : '0px'}
            paddingLeft={effectiveLayout.paddingLeft !== undefined ? effectiveLayout.paddingLeft : '0px'}
            onChangePadding={(patch) => handleMultiLayoutChange(patch)}
            isMobileOverride={isMobile}
          />
        </AccordionItem>

        {/* 📌 ACCORDION: POSICIONAMENTO (STICKY / FIXED) */}
        <AccordionItem
          id="sec-position"
          title="Posicionamento & Fixação Avançada"
          icon={Pin}
          defaultOpen={false}
        >
          <PositioningControl
            layout={effectiveLayout}
            mobileOverride={section.mobile}
            onChange={(patch) => handleMultiLayoutChange(patch)}
            isMobile={isMobile}
          />
        </AccordionItem>

        {/* 🏔️ ACCORDION: EFEITO PARALLAX */}
        <AccordionItem
          id="sec-parallax"
          title="Efeito Parallax & Velocidade de Scroll"
          icon={Layers}
          defaultOpen={false}
        >
          <ParallaxControl
            parallaxSpeed={effectiveLayout.parallaxSpeed}
            disableParallaxMobile={effectiveLayout.disableParallaxMobile}
            onChangeSpeed={(speed) => handleLayoutChange('parallaxSpeed', speed)}
            onChangeDisableMobile={(disable) => handleLayoutChange('disableParallaxMobile', disable)}
          />
        </AccordionItem>

        {/* 🎨 SEÇÃO DE APARÊNCIA & HOVER OVERRIDES */}
        <div className="pt-3 border-t border-[var(--surface-border)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              Aparência & Interatividade
            </span>
          </div>

          {/* Seletor de Estado: Normal vs Hover */}
          <div className="flex items-center p-1 rounded-xl glass-sm border border-[var(--surface-border)]">
            <button
              type="button"
              onClick={() => setStateTab('normal')}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                stateTab === 'normal'
                  ? 'brand-accent text-white shadow-sm font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Estado Normal</span>
            </button>

            <button
              type="button"
              onClick={() => setStateTab('hover')}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                stateTab === 'hover'
                  ? 'brand-accent text-white shadow-sm font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Estado Hover</span>
            </button>
          </div>

          {/* Indicador de Estado Hover & Reset */}
          {stateTab === 'hover' && (
            <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Editando Overrides do Hover
              </span>
              {hasAnyHoverOverride && (
                <button
                  type="button"
                  onClick={() => {
                    handleStyleChange('hoverBackgroundColor', undefined);
                    handleStyleChange('hoverColor', undefined);
                    handleStyleChange('hoverBorderColor', undefined);
                    handleStyleChange('hoverBorderWidth', undefined);
                    handleStyleChange('hoverBorderRadius', undefined);
                    handleStyleChange('hoverBoxShadow', undefined);
                    handleStyleChange('hoverOpacity', undefined);
                    handleStyleChange('hoverScale', undefined);
                    handleStyleChange('hoverTranslateX', undefined);
                    handleStyleChange('hoverTranslateY', undefined);
                    handleStyleChange('hoverRotate', undefined);
                  }}
                  className="text-[9px] font-bold text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 cursor-pointer underline"
                >
                  Limpar Overrides
                </button>
              )}
            </div>
          )}

          {/* 🎨 ACCORDION: FUNDO & CORES */}
          <AccordionItem
            id="sec-background"
            title="Fundo & Cores"
            icon={Palette}
            defaultOpen={false}
          >
            <BackgroundControl
              label="Fundo da Seção & Efeitos de Vidro"
              background={bg}
              onChange={(patch) =>
                onUpdateSection(section.id, {
                  background: {
                    ...bg,
                    ...patch,
                  },
                })
              }
              page={page}
              targetWidth={1920}
              targetHeight={1080}
              aspectRatio={16 / 9}
            />
          </AccordionItem>

          {/* 🖼️ ACCORDION: BORDAS & ARREDONDAMENTO */}
          <AccordionItem
            id="sec-border"
            title="Bordas & Arredondamento"
            icon={Square}
            defaultOpen={false}
          >
            <BorderControl
              borderStyle={activeStyle.borderStyle || effectiveBorder.borderStyle || (section.border?.style as any) || 'none'}
              borderWidth={activeStyle.borderWidth || effectiveBorder.borderWidth || section.border?.borderWidth || section.border?.topWidth || '1px'}
              borderColor={activeStyle.borderColor || effectiveBorder.borderColor || section.border?.color || '#E2E8F0'}
              borderRadius={activeStyle.borderRadius || effectiveBorder.borderRadius || section.border?.radiusTopLeft || '0px'}
              page={page}
              onChangeBorderStyle={(style) => handleBorderChange('borderStyle', style)}
              onChangeBorderWidth={(w) => handleBorderChange('borderWidth', w)}
              onChangeBorderColor={(c) => handleBorderChange('borderColor', c)}
              onChangeBorderRadius={(r) => handleBorderChange('borderRadius', r)}
            />
          </AccordionItem>

          {/* ⚡ ACCORDION: EFEITOS & TRANSFORMAÇÕES */}
          <AccordionItem
            id="sec-transform"
            title="Efeitos & Transformações"
            icon={Zap}
            defaultOpen={false}
          >
            <TransformControl
              style={activeStyle}
              isHoverTab={stateTab === 'hover'}
              onChangeStyle={handleSmartStyleChange}
            />
          </AccordionItem>

          {/* ⏱️ ACCORDION: TRANSIÇÃO & VELOCIDADE */}
          <AccordionItem
            id="sec-transition"
            title="Transição & Velocidade"
            icon={Sliders}
            defaultOpen={false}
          >
            <TransitionControl
              style={effectiveStyle}
              onChangeStyle={handleStyleChange}
            />
          </AccordionItem>
        </div>

        {/* 🚨 BOTÃO DE EXCLUSÃO */}
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            className="w-full text-xs text-red-600 border-red-500/30 hover:bg-red-500/10 flex items-center justify-center gap-2 cursor-pointer font-bold py-2.5 rounded-xl"
          >
            <Trash2 className="w-4 h-4" />
            Excluir Seção e todos os filhos
          </Button>
        </div>
      </div>
    </div>
  );
}
