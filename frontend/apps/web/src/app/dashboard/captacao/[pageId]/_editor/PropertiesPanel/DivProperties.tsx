'use client';

import React from 'react';
import { CanvasData, ComponentStyle, DivComponent, ViewportMode } from '../types';
import { findElementInCanvas } from '../utils/canvasHelpers';
import { Button } from '@psi/ui';
import {
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
  Sun,
  Sparkles,
  Pin,
  Zap,
  Sliders,
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
import { GlobalColorPicker } from './components/GlobalColorPicker';

interface DivPropertiesProps {
  divComponent: DivComponent;
  canvasData?: CanvasData | null;
  viewportMode?: ViewportMode;
  page?: any;
  onUpdateComponent: (id: string, patch: Partial<DivComponent>) => void;
  onRemoveComponent: (id: string) => void;
  onDeselect?: () => void;
}

export function DivProperties({
  divComponent,
  canvasData,
  viewportMode = 'desktop',
  page,
  onUpdateComponent,
  onRemoveComponent,
  onDeselect,
}: DivPropertiesProps) {
  const [stateTab, setStateTab] = React.useState<'normal' | 'hover'>('normal');
  const isMobile = viewportMode === 'mobile';

  const effectiveLayout = isMobile
    ? { ...divComponent.layout, ...(divComponent.mobile || {}) }
    : divComponent.layout;
  const effectiveBorder = isMobile
    ? { ...(divComponent.border || {}), ...(divComponent.mobile?.border || {}) }
    : (divComponent.border || {});
  const effectiveStyle = divComponent.style || {};

  const activeDivIdRef = React.useRef(divComponent.id);
  const onUpdateComponentRef = React.useRef(onUpdateComponent);
  const styleRef = React.useRef(effectiveStyle);
  const prevDivIdRef = React.useRef(divComponent.id);

  React.useEffect(() => {
    activeDivIdRef.current = divComponent.id;
    onUpdateComponentRef.current = onUpdateComponent;
    styleRef.current = effectiveStyle;
  });

  React.useEffect(() => {
    if (prevDivIdRef.current && prevDivIdRef.current !== divComponent.id) {
      if (onUpdateComponent && (styleRef.current as any)?.__isPreviewingHover) {
        onUpdateComponent(prevDivIdRef.current, {
          style: { ...(styleRef.current || {}), __isPreviewingHover: undefined },
        });
      }
      prevDivIdRef.current = divComponent.id;
      setStateTab('normal');
    }
  }, [divComponent.id]);

  React.useEffect(() => {
    if (stateTab === 'hover' && !effectiveStyle.__isPreviewingHover) {
      handleStyleChange('__isPreviewingHover', true);
    } else if (stateTab === 'normal' && effectiveStyle.__isPreviewingHover) {
      handleStyleChange('__isPreviewingHover', undefined);
    }
  }, [stateTab, divComponent.id]);

  React.useEffect(() => {
    return () => {
      if (onUpdateComponentRef.current && activeDivIdRef.current) {
        const curStyle = styleRef.current || {};
        if ((curStyle as any)?.__isPreviewingHover) {
          onUpdateComponentRef.current(activeDivIdRef.current, {
            style: { ...curStyle, __isPreviewingHover: undefined },
          });
        }
      }
    };
  }, []);
  const isHidden = isMobile ? (divComponent.mobile?.hidden ?? divComponent.hidden ?? false) : (divComponent.hidden ?? false);

  const parsePxOrNum = (val?: number | string): number | undefined => {
    if (typeof val === 'number') return val;
    if (!val) return undefined;
    if (typeof val === 'string') {
      const cleaned = val.replace('px', '').trim();
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num > 0) return num;
    }
    return undefined;
  };

  const containerWidth =
    parsePxOrNum(effectiveLayout.width) ||
    parsePxOrNum(effectiveLayout.maxWidth) ||
    parsePxOrNum(effectiveLayout.minWidth) ||
    1200;

  const containerHeight =
    parsePxOrNum(effectiveLayout.height) ||
    parsePxOrNum(effectiveLayout.minHeight);

  const containerRatio = effectiveStyle.aspectRatio || (effectiveLayout as any)?.aspectRatio;

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
    onUpdateComponent(divComponent.id, {
      style: {
        ...(divComponent.style || {}),
        [key]: value,
      },
    });
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
      onUpdateComponent(divComponent.id, {
        mobile: {
          ...(divComponent.mobile || {}),
          [key]: value,
        },
      });
    } else {
      onUpdateComponent(divComponent.id, {
        layout: {
          ...divComponent.layout,
          [key]: value,
        },
      });
    }
  };

  const handleMultiLayoutChange = (patch: Record<string, any>) => {
    if (isMobile) {
      onUpdateComponent(divComponent.id, {
        mobile: {
          ...(divComponent.mobile || {}),
          ...patch,
        },
      });
    } else {
      onUpdateComponent(divComponent.id, {
        layout: {
          ...divComponent.layout,
          ...patch,
        },
      });
    }
  };

  const handleWidthChangeWithSiblingBalance = (w: string) => {
    const isPercent = w.endsWith('%');
    const numericPercent = isPercent ? parseFloat(w) : NaN;
    const isFixedOrRelative = w !== '100%' && w !== 'auto';

    const patch: any = {
      width: w,
      flexGrow: w === '100%' ? 1 : 0,
      flexShrink: w === '100%' ? 1 : 0,
      flexBasis: isFixedOrRelative ? 'auto' : effectiveLayout.flexBasis,
    };

    handleMultiLayoutChange(patch);

    if (isPercent && !isNaN(numericPercent) && canvasData) {
      const found = findElementInCanvas(canvasData, divComponent.id);
      if (found && found.parent) {
        const parentLayout = (found.parent as any).layout || {};
        const isParentRow = (parentLayout.flexDirection || 'row') === 'row';

        if (isParentRow) {
          const siblings = (found.parent as any).components || [];
          const divSiblings = siblings.filter((c: any) => c.type === 'div' && c.id !== divComponent.id);

          if (divSiblings.length === 1) {
            const sibling = divSiblings[0];
            const remainingPercent = Math.max(0, Math.min(100, Number((100 - numericPercent).toFixed(1))));
            const siblingPatch = {
              layout: {
                ...(sibling.layout || {}),
                width: `${remainingPercent}%`,
                flexGrow: 0,
                flexShrink: 0,
                flexBasis: 'auto',
              },
            };
            onUpdateComponent(sibling.id, siblingPatch as any);
          }
        }
      }
    }
  };

  const effectiveBackground = isMobile
    ? { ...(divComponent.background || {}), ...(divComponent.mobile?.background || {}) }
    : (divComponent.background || {});

  const handleBorderChange = (patch: any) => {
    if (stateTab === 'hover') {
      const hoverPatch: Record<string, any> = {};
      if (patch.borderStyle !== undefined || patch.style !== undefined) hoverPatch.hoverBorderStyle = patch.borderStyle || patch.style;
      if (patch.borderWidth !== undefined || patch.width !== undefined) hoverPatch.hoverBorderWidth = patch.borderWidth || patch.width;
      if (patch.borderColor !== undefined || patch.color !== undefined) hoverPatch.hoverBorderColor = patch.borderColor || patch.color;
      if (patch.borderRadius !== undefined || patch.radius !== undefined) hoverPatch.hoverBorderRadius = patch.borderRadius || patch.radius;

      if (isMobile) {
        onUpdateComponent(divComponent.id, {
          mobile: {
            ...(divComponent.mobile || {}),
            style: {
              ...(divComponent.mobile?.style || divComponent.style || {}),
              ...hoverPatch,
            },
          },
        });
      } else {
        onUpdateComponent(divComponent.id, {
          style: {
            ...(divComponent.style || {}),
            ...hoverPatch,
          },
        });
      }
    } else {
      const stylePatch: Record<string, any> = {};
      if (patch.borderStyle !== undefined) stylePatch.borderStyle = patch.borderStyle;
      if (patch.borderWidth !== undefined) stylePatch.borderWidth = patch.borderWidth;
      if (patch.borderColor !== undefined) stylePatch.borderColor = patch.borderColor;
      if (patch.borderRadius !== undefined) stylePatch.borderRadius = patch.borderRadius;

      const borderPatch = {
        ...patch,
        ...(patch.borderColor !== undefined ? { color: patch.borderColor, borderColor: patch.borderColor } : {}),
        ...(patch.borderWidth !== undefined ? { width: patch.borderWidth, borderWidth: patch.borderWidth } : {}),
        ...(patch.borderStyle !== undefined ? { style: patch.borderStyle, borderStyle: patch.borderStyle } : {}),
      };

      if (isMobile) {
        onUpdateComponent(divComponent.id, {
          mobile: {
            ...(divComponent.mobile || {}),
            border: {
              ...(divComponent.mobile?.border || divComponent.border || {}),
              ...borderPatch,
            },
            style: {
              ...(divComponent.mobile?.style || divComponent.style || {}),
              ...stylePatch,
            },
          },
        });
      } else {
        onUpdateComponent(divComponent.id, {
          border: {
            ...(divComponent.border || {}),
            ...borderPatch,
          },
          style: {
            ...(divComponent.style || {}),
            ...stylePatch,
          },
        });
      }
    }
  };

  const handleToggleVisibility = () => {
    if (isMobile) {
      onUpdateComponent(divComponent.id, {
        mobile: {
          ...(divComponent.mobile || {}),
          hidden: !isHidden,
        },
      });
    } else {
      onUpdateComponent(divComponent.id, { hidden: !isHidden });
    }
  };

  const handleDelete = () => {
    onRemoveComponent(divComponent.id);
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
      {/* Header */}
      <div className="p-3 border-b border-[var(--surface-border)] flex items-center justify-between glass-sm shrink-0">
        <button
          type="button"
          onClick={onDeselect}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-purple-600 transition-colors cursor-pointer"
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
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
            Container (Div)
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
        {/* Top Metadata */}
        <div className="p-3 rounded-xl border border-[var(--surface-border)] glass-sm flex items-center justify-between">
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

        {/* 📐 ACCORDION: DISPOSIÇÃO & ALINHAMENTO */}
        <AccordionItem
          id="div-layout"
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
                    ? 'border-purple-500 bg-purple-500/10 text-purple-600 font-extrabold'
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
                    ? 'border-purple-500 bg-purple-500/10 text-purple-600 font-extrabold'
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
                      ? 'border-purple-500 bg-purple-500/10 text-purple-600 font-extrabold'
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
                      ? 'border-purple-500 bg-purple-500/10 text-purple-600 font-extrabold'
                      : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Alinhamento do Texto na Div</label>
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
                        ? 'border-purple-500 bg-purple-500/10 text-purple-600 font-extrabold'
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
              value={effectiveLayout.gap || '16px'}
              onChange={(val) => handleLayoutChange('gap', val)}
              min={0}
              max={96}
              defaultUnit="px"
            />
          </div>
        </AccordionItem>

        {/* 📏 ACCORDION: DIMENSÕES & MEDIDAS */}
        <AccordionItem
          id="div-dimensions"
          title="Dimensões & Medidas"
          icon={Ruler}
          defaultOpen={false}
        >
          <div className="space-y-1 mb-3 pb-3 border-b border-[var(--surface-border)]">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Alinhamento no Container (Align Self)</label>
            <div className="grid grid-cols-5 gap-1">
              {[
                { value: 'auto', label: 'Auto' },
                { value: 'flex-start', label: 'Início' },
                { value: 'center', label: 'Centro' },
                { value: 'flex-end', label: 'Fim' },
                { value: 'stretch', label: 'Esticar' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleSmartStyleChange('alignSelf', item.value as any)}
                  className={`py-1 rounded-lg border text-[9px] font-bold cursor-pointer transition-all ${
                    activeStyle.alignSelf === item.value
                      ? 'border-purple-500 bg-purple-500/10 text-purple-600 font-extrabold'
                      : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <SizeControl
            width={effectiveLayout.width || 'auto'}
            height={effectiveLayout.height || 'auto'}
            minWidth={effectiveLayout.minWidth}
            maxWidth={effectiveLayout.maxWidth}
            minHeight={effectiveLayout.minHeight}
            maxHeight={effectiveLayout.maxHeight}
            onChangeWidth={(w) => handleWidthChangeWithSiblingBalance(w)}
            onChangeHeight={(h) => handleLayoutChange('height', h)}
            onChangeMinMax={(minMax) => handleMultiLayoutChange(minMax)}
            isMobileOverride={isMobile}
          />

          {/* CONTROLES FLEXBOX AVANÇADOS (FLEX GROW / SHRINK / BASIS) */}
          <div className="space-y-2 pt-3 border-t border-[var(--surface-border)] mt-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Comportamento Flexbox do Container</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 block font-semibold">Crescimento (flexGrow)</span>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { label: 'Não (0)', val: 0 },
                    { label: 'Sim (1)', val: 1 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleLayoutChange('flexGrow', opt.val)}
                      className={`py-1 rounded-lg border text-[9px] font-bold cursor-pointer transition-all ${
                        (effectiveLayout.flexGrow ?? 1) === opt.val
                          ? 'border-purple-500 bg-purple-500/10 text-purple-600 font-extrabold'
                          : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 block font-semibold">Encolhimento (flexShrink)</span>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { label: 'Não (0)', val: 0 },
                    { label: 'Sim (1)', val: 1 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleLayoutChange('flexShrink', opt.val)}
                      className={`py-1 rounded-lg border text-[9px] font-bold cursor-pointer transition-all ${
                        (effectiveLayout.flexShrink ?? 1) === opt.val
                          ? 'border-purple-500 bg-purple-500/10 text-purple-600 font-extrabold'
                          : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1 mt-2">
              <span className="text-[9px] text-slate-400 block font-semibold">Tamanho Base Flex (flexBasis)</span>
              <SliderNumberInput
                value={effectiveLayout.flexBasis || 'auto'}
                onChange={(val) => handleLayoutChange('flexBasis', val)}
                min={0}
                max={1200}
                defaultUnit="px"
                unitOptions={['auto', 'px', 'rem', 'em', 'vw', 'vh', '%']}
                placeholder="Ex: auto ou 50%"
              />
            </div>
          </div>
        </AccordionItem>

        {/* 📦 ACCORDION: ESPAÇAMENTO (PADDING) */}
        <AccordionItem
          id="div-padding"
          title="Espaçamento (Padding)"
          icon={Maximize}
          defaultOpen={false}
        >
          <PaddingControl
            paddingTop={effectiveLayout.paddingTop}
            paddingRight={effectiveLayout.paddingRight}
            paddingBottom={effectiveLayout.paddingBottom}
            paddingLeft={effectiveLayout.paddingLeft}
            onChangePadding={(patch) => handleMultiLayoutChange(patch)}
            isMobileOverride={isMobile}
          />
        </AccordionItem>

        {/* 📌 ACCORDION: POSICIONAMENTO (STICKY / FIXED) */}
        <AccordionItem
          id="div-position"
          title="Posicionamento & Fixação Avançada"
          icon={Pin}
          defaultOpen={false}
        >
          <PositioningControl
            layout={effectiveLayout}
            mobileOverride={divComponent.mobile}
            onChange={(patch) => handleMultiLayoutChange(patch)}
            isMobile={isMobile}
          />
        </AccordionItem>

        {/* 🏔️ ACCORDION: EFEITO PARALLAX */}
        <AccordionItem
          id="div-parallax"
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
            id="div-background"
            title="Fundo & Cores"
            icon={Palette}
            defaultOpen={false}
          >
            <div className="space-y-3">
              <GlobalColorPicker
                label="Cor do Texto / Conteúdo"
                value={activeStyle.color || ''}
                onChange={(val) => handleSmartStyleChange('color', val)}
                page={page}
              />
              <BackgroundControl
                label="Fundo & Efeitos de Vidro"
                background={effectiveBackground}
                onChange={(patch) => {
                  const updatedBg = {
                    ...(effectiveBackground || {}),
                    ...patch,
                    type: patch.type || effectiveBackground.type || 'none',
                  };
                  if (isMobile) {
                    onUpdateComponent(divComponent.id, {
                      mobile: {
                        ...(divComponent.mobile || {}),
                        background: updatedBg as any,
                      },
                    });
                  } else {
                    onUpdateComponent(divComponent.id, {
                      background: updatedBg as any,
                    });
                  }
                }}
                page={page}
                targetWidth={containerWidth}
                targetHeight={containerHeight}
                aspectRatio={containerRatio}
              />
            </div>
          </AccordionItem>

          {/* 🖼️ ACCORDION: BORDAS & ARREDONDAMENTO */}
          <AccordionItem
            id="div-border"
            title="Bordas & Arredondamento"
            icon={Square}
            defaultOpen={false}
          >
            <BorderControl
              borderStyle={activeStyle.borderStyle || effectiveBorder.borderStyle || (divComponent.border?.style as any) || 'none'}
              borderWidth={activeStyle.borderWidth || effectiveBorder.borderWidth || divComponent.border?.width || '1px'}
              borderColor={activeStyle.borderColor || effectiveBorder.borderColor || divComponent.border?.color || '#E2E8F0'}
              borderRadius={activeStyle.borderRadius || effectiveBorder.borderRadius || divComponent.border?.radiusTopLeft || '0px'}
              page={page}
              onChangeBorderStyle={(style) => handleBorderChange({ borderStyle: style })}
              onChangeBorderWidth={(w) => handleBorderChange({ borderWidth: w })}
              onChangeBorderColor={(c) => handleBorderChange({ borderColor: c })}
              onChangeBorderRadius={(r) => handleBorderChange({ borderRadius: r })}
            />
          </AccordionItem>

          {/* ⚡ ACCORDION: EFEITOS & TRANSFORMAÇÕES */}
          <AccordionItem
            id="div-transform"
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
            id="div-transition"
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
      </div>
    </div>
  );
}
