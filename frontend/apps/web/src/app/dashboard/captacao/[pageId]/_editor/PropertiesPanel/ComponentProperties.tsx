'use client';

import React from 'react';
import { AtomicComponent, ComponentStyle, ViewportMode, CanvasData } from '../types';
import { getComponentTypeLabel } from '../utils/canvasHelpers';
import { Button } from '@psi/ui';
import {
  Trash2,
  ArrowLeft,
  Eye,
  EyeOff,
  Ruler,
  Maximize,
  Palette,
  Square,
  Sparkles,
  Sun,
  Zap,
  Sliders
} from 'lucide-react';
import { SizeControl } from './components/SizeControl';
import { PaddingControl } from './components/PaddingControl';
import { BorderControl } from './components/BorderControl';
import { GlobalColorPicker } from './components/GlobalColorPicker';
import { ContentPropsPanel, hasContentProps } from './ContentPropsPanel';
import { AccordionItem } from './components/AccordionSection';
import { TransformControl } from './components/TransformControl';
import { TransitionControl } from './components/TransitionControl';

interface ComponentPropertiesProps {
  component: AtomicComponent;
  canvasData?: CanvasData | null;
  viewportMode?: ViewportMode;
  page?: any;
  onUpdateComponent: (id: string, patch: Partial<AtomicComponent>) => void;
  onRemoveComponent: (id: string) => void;
  onDeselect?: () => void;
  onUpdateSiteConfig?: (patch: any) => void;
}

export function ComponentProperties({
  component,
  canvasData,
  viewportMode = 'desktop',
  page,
  onUpdateComponent,
  onRemoveComponent,
  onDeselect,
  onUpdateSiteConfig,
}: ComponentPropertiesProps) {
  const [stateTab, setStateTab] = React.useState<'normal' | 'hover'>('normal');
  const isMobile = viewportMode === 'mobile';
  const showContentTab = hasContentProps(component.type);

  const props = component.props || {};
  const style = component.style || {};

  const activeComponentIdRef = React.useRef(component.id);
  const onUpdateComponentRef = React.useRef(onUpdateComponent);
  const styleRef = React.useRef(style);
  const prevComponentIdRef = React.useRef(component.id);

  React.useEffect(() => {
    activeComponentIdRef.current = component.id;
    onUpdateComponentRef.current = onUpdateComponent;
    styleRef.current = style;
  });

  React.useEffect(() => {
    if (prevComponentIdRef.current && prevComponentIdRef.current !== component.id) {
      if (onUpdateComponent && (styleRef.current as any)?.__isPreviewingHover) {
        onUpdateComponent(prevComponentIdRef.current, {
          style: { ...(styleRef.current || {}), __isPreviewingHover: undefined },
        });
      }
      prevComponentIdRef.current = component.id;
      setStateTab('normal');
    }
  }, [component.id]);

  React.useEffect(() => {
    if (stateTab === 'hover' && !style.__isPreviewingHover) {
      handleStyleChange('__isPreviewingHover', true);
    } else if (stateTab === 'normal' && style.__isPreviewingHover) {
      handleStyleChange('__isPreviewingHover', undefined);
    }
  }, [stateTab, component.id]);

  React.useEffect(() => {
    return () => {
      if (onUpdateComponentRef.current && activeComponentIdRef.current) {
        const curStyle = styleRef.current || {};
        if ((curStyle as any)?.__isPreviewingHover) {
          onUpdateComponentRef.current(activeComponentIdRef.current, {
            style: { ...curStyle, __isPreviewingHover: undefined },
          });
        }
      }
    };
  }, []);

  const effectiveProps = isMobile
    ? { ...props, ...(component.mobile?.props || {}) }
    : props;
  const effectiveStyle = isMobile
    ? { ...style, ...(component.mobile?.style || {}) }
    : style;

  const isHidden = isMobile
    ? (component.mobile?.hidden ?? component.hidden ?? false)
    : (component.hidden ?? false);

  const activeStyle: ComponentStyle = stateTab === 'hover'
    ? {
        ...effectiveStyle,
        backgroundColor: effectiveStyle.hoverBackgroundColor !== undefined ? effectiveStyle.hoverBackgroundColor : effectiveStyle.backgroundColor,
        color: effectiveStyle.hoverColor !== undefined ? effectiveStyle.hoverColor : effectiveStyle.color,
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

  const activeProps = stateTab === 'hover'
    ? {
        ...effectiveProps,
        color: (effectiveStyle as any).hoverColor !== undefined ? (effectiveStyle as any).hoverColor : effectiveProps.color,
        textColor: (effectiveStyle as any).hoverTextColor !== undefined ? (effectiveStyle as any).hoverTextColor : ((effectiveStyle as any).hoverColor !== undefined ? (effectiveStyle as any).hoverColor : (effectiveProps.textColor || effectiveProps.color)),
        titleColor: (effectiveStyle as any).hoverTitleColor !== undefined ? (effectiveStyle as any).hoverTitleColor : effectiveProps.titleColor,
        bodyColor: (effectiveStyle as any).hoverBodyColor !== undefined ? (effectiveStyle as any).hoverBodyColor : effectiveProps.bodyColor,
        questionColor: (effectiveStyle as any).hoverQuestionColor !== undefined ? (effectiveStyle as any).hoverQuestionColor : effectiveProps.questionColor,
        answerColor: (effectiveStyle as any).hoverAnswerColor !== undefined ? (effectiveStyle as any).hoverAnswerColor : effectiveProps.answerColor,
        valueColor: (effectiveStyle as any).hoverValueColor !== undefined ? (effectiveStyle as any).hoverValueColor : effectiveProps.valueColor,
        labelColor: (effectiveStyle as any).hoverLabelColor !== undefined ? (effectiveStyle as any).hoverLabelColor : effectiveProps.labelColor,
        quoteColor: (effectiveStyle as any).hoverQuoteColor !== undefined ? (effectiveStyle as any).hoverQuoteColor : effectiveProps.quoteColor,
        authorNameColor: (effectiveStyle as any).hoverAuthorNameColor !== undefined ? (effectiveStyle as any).hoverAuthorNameColor : effectiveProps.authorNameColor,
        authorTitleColor: (effectiveStyle as any).hoverAuthorTitleColor !== undefined ? (effectiveStyle as any).hoverAuthorTitleColor : effectiveProps.authorTitleColor,
      }
    : effectiveProps;

  const handlePropsBatchChange = (patch: Record<string, any>) => {
    if (isMobile) {
      const currentMobileProps = { ...(component.mobile?.props || {}) };
      Object.entries(patch).forEach(([k, v]) => {
        if (v === undefined) {
          delete currentMobileProps[k];
        } else {
          currentMobileProps[k] = v;
        }
      });
      onUpdateComponent(component.id, {
        mobile: {
          ...(component.mobile || {}),
          props: currentMobileProps,
        },
      });
    } else {
      const currentProps = { ...props };
      Object.entries(patch).forEach(([k, v]) => {
        if (v === undefined) {
          delete currentProps[k];
        } else {
          currentProps[k] = v;
        }
      });
      onUpdateComponent(component.id, {
        props: currentProps,
      });
    }
  };

  const handlePropChange = (key: string, value: any) => {
    handlePropsBatchChange({ [key]: value });
  };

  const handleStyleChange = (key: keyof ComponentStyle, value: any) => {
    if (isMobile) {
      onUpdateComponent(component.id, {
        mobile: {
          ...(component.mobile || {}),
          style: {
            ...(component.mobile?.style || {}),
            [key]: value,
          },
        },
      });
    } else {
      onUpdateComponent(component.id, {
        style: {
          ...style,
          [key]: value,
        },
      });
    }
  };

  const handleMultiStyleChange = (patch: Record<string, any>) => {
    if (isMobile) {
      onUpdateComponent(component.id, {
        mobile: {
          ...(component.mobile || {}),
          style: {
            ...(component.mobile?.style || style || {}),
            ...patch,
          },
        },
      });
    } else {
      onUpdateComponent(component.id, {
        style: {
          ...style,
          ...patch,
        },
      });
    }
  };

  const hoverStyleKeyMap: Record<string, string> = {
    backgroundColor: 'hoverBackgroundColor',
    color: 'hoverColor',
    textColor: 'hoverTextColor',
    titleColor: 'hoverTitleColor',
    bodyColor: 'hoverBodyColor',
    questionColor: 'hoverQuestionColor',
    answerColor: 'hoverAnswerColor',
    valueColor: 'hoverValueColor',
    labelColor: 'hoverLabelColor',
    quoteColor: 'hoverQuoteColor',
    authorNameColor: 'hoverAuthorNameColor',
    authorTitleColor: 'hoverAuthorTitleColor',
    iconColor: 'hoverIconColor',
    borderColor: 'hoverBorderColor',
    borderWidth: 'hoverBorderWidth',
    borderRadius: 'hoverBorderRadius',
    boxShadow: 'hoverBoxShadow',
    opacity: 'hoverOpacity',
    scale: 'hoverScale',
    translateX: 'hoverTranslateX',
    translateY: 'hoverTranslateY',
    rotate: 'hoverRotate',
    fontSize: 'hoverFontSize',
    fontWeight: 'hoverFontWeight',
    letterSpacing: 'hoverLetterSpacing',
    transitionDurationMs: 'transitionDurationMs',
    transitionTimingFunction: 'transitionTimingFunction',
  };

  const handleSmartStyleChange = (key: keyof ComponentStyle, value: any) => {
    if (stateTab === 'hover') {
      const targetKey = (hoverStyleKeyMap[key as string] || key) as keyof ComponentStyle;
      handleStyleChange(targetKey, value);
    } else {
      handleStyleChange(key, value);
    }
  };

  const handleSmartMultiStyleChange = (patch: Record<string, any>) => {
    if (stateTab === 'hover') {
      const mappedPatch: Record<string, any> = {};
      Object.entries(patch).forEach(([k, v]) => {
        const targetKey = hoverStyleKeyMap[k] || k;
        mappedPatch[targetKey] = v;
      });
      handleMultiStyleChange(mappedPatch);
    } else {
      handleMultiStyleChange(patch);
    }
  };

  const handleSmartPropsBatchChange = (patch: Record<string, any>) => {
    if (stateTab === 'hover') {
      const stylePatch: Record<string, any> = {};
      const propPatch: Record<string, any> = {};

      Object.entries(patch).forEach(([k, v]) => {
        const hoverKey = hoverStyleKeyMap[k];
        if (hoverKey) {
          stylePatch[hoverKey] = v;
        } else {
          propPatch[k] = v;
        }
      });

      if (Object.keys(stylePatch).length > 0) {
        handleMultiStyleChange(stylePatch);
      }
      if (Object.keys(propPatch).length > 0) {
        handlePropsBatchChange(propPatch);
      }
    } else {
      handlePropsBatchChange(patch);
    }
  };

  const handleSmartPropChange = (key: string, value: any) => {
    handleSmartPropsBatchChange({ [key]: value });
  };

  const handleToggleVisibility = () => {
    if (isMobile) {
      onUpdateComponent(component.id, {
        mobile: {
          ...(component.mobile || {}),
          hidden: !isHidden,
        },
      });
    } else {
      onUpdateComponent(component.id, { hidden: !isHidden });
    }
  };

  const handleClearTypography = (prefix: string = '') => {
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

    if (isMobile) {
      const currentMobileProps = { ...(component.mobile?.props || {}) };
      const currentMobileStyle = { ...(component.mobile?.style || {}) };
      keysToClear.forEach((k) => {
        const fullKey = prefix ? `${prefix}${k.charAt(0).toUpperCase()}${k.slice(1)}` : k;
        delete currentMobileProps[fullKey];
        if (!prefix) delete (currentMobileStyle as any)[k];
      });
      onUpdateComponent(component.id, {
        mobile: {
          ...(component.mobile || {}),
          props: currentMobileProps,
          style: currentMobileStyle,
        },
      });
    } else {
      const currentProps = { ...props };
      const currentStyle = { ...style };
      keysToClear.forEach((k) => {
        const fullKey = prefix ? `${prefix}${k.charAt(0).toUpperCase()}${k.slice(1)}` : k;
        delete currentProps[fullKey];
        if (!prefix) delete (currentStyle as any)[k];
      });
      onUpdateComponent(component.id, {
        props: currentProps,
        style: currentStyle,
      });
    }
  };

  const handleDelete = () => {
    onRemoveComponent(component.id);
  };

  const hasAnyHoverOverride =
    effectiveStyle.hoverBackgroundColor !== undefined ||
    effectiveStyle.hoverColor !== undefined ||
    (effectiveStyle as any).hoverTextColor !== undefined ||
    (effectiveStyle as any).hoverTitleColor !== undefined ||
    (effectiveStyle as any).hoverBodyColor !== undefined ||
    (effectiveStyle as any).hoverQuestionColor !== undefined ||
    (effectiveStyle as any).hoverAnswerColor !== undefined ||
    (effectiveStyle as any).hoverValueColor !== undefined ||
    (effectiveStyle as any).hoverLabelColor !== undefined ||
    (effectiveStyle as any).hoverQuoteColor !== undefined ||
    (effectiveStyle as any).hoverAuthorNameColor !== undefined ||
    (effectiveStyle as any).hoverAuthorTitleColor !== undefined ||
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
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleVisibility}
            title={isHidden ? 'Componente oculto nesta visualização. Clique para exibir.' : 'Componente visível. Clique para ocultar.'}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-colors cursor-pointer border ${
              isHidden
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            }`}
          >
            {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{isHidden ? 'Oculto' : 'Visível'}</span>
          </button>
          {isMobile && (
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
              Mobile
            </span>
          )}
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
            {getComponentTypeLabel(component.type)}
          </span>
        </div>
      </div>

      {/* Content scroll container */}
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

        {/* 📝 CONTEÚDO & TIPOGRAFIA ESPECÍFICA DO COMPONENTE */}
        {showContentTab && (
          <ContentPropsPanel
            component={component}
            isMobile={isMobile}
            effectiveProps={activeProps}
            page={page}
            canvasData={canvasData}
            onPropChange={handleSmartPropChange}
            onPropsBatchChange={handleSmartPropsBatchChange}
            onClearTypography={handleClearTypography}
            onUpdateSiteConfig={onUpdateSiteConfig}
          />
        )}

        {/* 📏 ACCORDION: DIMENSÕES & MEDIDAS */}
        <AccordionItem
          id="cmp-dimensions"
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
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                      : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <SizeControl
            width={activeStyle.width || 'auto'}
            height={activeStyle.height || 'auto'}
            minWidth={activeStyle.minWidth}
            maxWidth={activeStyle.maxWidth}
            minHeight={activeStyle.minHeight}
            aspectRatio={effectiveProps.aspectRatio || (activeStyle as any).aspectRatio}
            objectFit={effectiveProps.objectFit || (activeStyle as any).objectFit}
            showImageControls={component.type === 'image'}
            onChangeWidth={(w) => handleSmartStyleChange('width', w)}
            onChangeHeight={(h) => handleSmartStyleChange('height', h)}
            onChangeMinMax={(minMax) => {
              Object.entries(minMax).forEach(([k, v]) => handleSmartStyleChange(k as any, v));
            }}
            onChangeAspectRatio={(ar) => handlePropChange('aspectRatio', ar)}
            onChangeObjectFit={(of) => handlePropChange('objectFit', of)}
            isMobileOverride={isMobile}
          />
        </AccordionItem>

        {/* 📦 ACCORDION: ESPAÇAMENTO (PADDING) */}
        <AccordionItem
          id="cmp-padding"
          title="Espaçamento (Padding)"
          icon={Maximize}
          defaultOpen={false}
        >
          <PaddingControl
            paddingTop={activeStyle.paddingTop || '0px'}
            paddingRight={activeStyle.paddingRight || '0px'}
            paddingBottom={activeStyle.paddingBottom || '0px'}
            paddingLeft={activeStyle.paddingLeft || '0px'}
            onChangePadding={(patch) => handleSmartMultiStyleChange(patch)}
            isMobileOverride={isMobile}
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
                  ? 'brand-accent text-white shadow-sm font-bold'
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
                    handleMultiStyleChange({
                      hoverBackgroundColor: undefined,
                      hoverColor: undefined,
                      hoverTextColor: undefined,
                      hoverTitleColor: undefined,
                      hoverBodyColor: undefined,
                      hoverQuestionColor: undefined,
                      hoverAnswerColor: undefined,
                      hoverValueColor: undefined,
                      hoverLabelColor: undefined,
                      hoverQuoteColor: undefined,
                      hoverAuthorNameColor: undefined,
                      hoverAuthorTitleColor: undefined,
                      hoverBorderColor: undefined,
                      hoverBorderWidth: undefined,
                      hoverBorderRadius: undefined,
                      hoverBoxShadow: undefined,
                      hoverOpacity: undefined,
                      hoverScale: undefined,
                      hoverTranslateX: undefined,
                      hoverTranslateY: undefined,
                      hoverRotate: undefined,
                    });
                  }}
                  className="text-[9px] font-bold text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 cursor-pointer underline"
                >
                  Limpar Overrides
                </button>
              )}
            </div>
          )}

          {/* 🎨 ACCORDION: CORES & PREENCHIMENTO */}
          <AccordionItem
            id="cmp-colors"
            title="Cores & Preenchimento"
            icon={Palette}
            defaultOpen={false}
          >
            <div className="space-y-3">
              {/* Componentes com Cor do Texto Única */}
              {['heading', 'paragraph', 'label', 'badge', 'button', 'divider', 'navbar_links', 'social_links', 'logo', 'icon'].includes(component.type) && (
                <GlobalColorPicker
                  label={
                    component.type === 'divider'
                      ? 'Cor da Linha'
                      : component.type === 'social_links' || component.type === 'icon'
                      ? 'Cor dos Ícones'
                      : 'Cor do Texto'
                  }
                  value={activeProps.textColor || activeProps.color || activeStyle.color || ''}
                  onChange={(val) => {
                    if (component.type === 'button') {
                      handleSmartPropsBatchChange({ textColor: val, color: val });
                    } else {
                      handleSmartPropChange('color', val);
                    }
                  }}
                  page={page}
                />
              )}

              {/* Componentes Multi-Texto: Card */}
              {component.type === 'card' && (
                <>
                  <GlobalColorPicker
                    label="Cor do Título do Card"
                    value={activeProps.titleColor || ''}
                    onChange={(val) => handleSmartPropChange('titleColor', val)}
                    page={page}
                  />
                  <GlobalColorPicker
                    label="Cor da Descrição do Card"
                    value={activeProps.bodyColor || ''}
                    onChange={(val) => handleSmartPropChange('bodyColor', val)}
                    page={page}
                  />
                </>
              )}

              {/* Componentes Multi-Texto: FAQ Item */}
              {component.type === 'faq_item' && (
                <>
                  <GlobalColorPicker
                    label="Cor da Pergunta"
                    value={activeProps.questionColor || ''}
                    onChange={(val) => handleSmartPropChange('questionColor', val)}
                    page={page}
                  />
                  <GlobalColorPicker
                    label="Cor da Resposta"
                    value={activeProps.answerColor || ''}
                    onChange={(val) => handleSmartPropChange('answerColor', val)}
                    page={page}
                  />
                </>
              )}

              {/* Componentes Multi-Texto: List */}
              {component.type === 'list' && (
                <>
                  <GlobalColorPicker
                    label="Cor dos Tópicos / Texto"
                    value={activeProps.textColor || activeProps.color || ''}
                    onChange={(val) => handleSmartPropChange('textColor', val)}
                    page={page}
                  />
                  <GlobalColorPicker
                    label="Cor dos Ícones da Lista"
                    value={activeProps.iconColor || ''}
                    onChange={(val) => handleSmartPropChange('iconColor', val)}
                    page={page}
                  />
                </>
              )}

              {/* Componentes Multi-Texto: Stat Counter */}
              {component.type === 'stat_counter' && (
                <>
                  <GlobalColorPicker
                    label="Cor do Número / Valor"
                    value={activeProps.valueColor || ''}
                    onChange={(val) => handleSmartPropChange('valueColor', val)}
                    page={page}
                  />
                  <GlobalColorPicker
                    label="Cor do Rótulo / Descrição"
                    value={activeProps.labelColor || ''}
                    onChange={(val) => handleSmartPropChange('labelColor', val)}
                    page={page}
                  />
                  <GlobalColorPicker
                    label="Cor do Ícone Decorativo"
                    value={activeProps.iconColor || ''}
                    onChange={(val) => handleSmartPropChange('iconColor', val)}
                    page={page}
                  />
                </>
              )}

              {/* Componentes Multi-Texto: Testimonial */}
              {component.type === 'testimonial' && (
                <>
                  <GlobalColorPicker
                    label="Cor da Citação"
                    value={activeProps.quoteColor || ''}
                    onChange={(val) => handleSmartPropChange('quoteColor', val)}
                    page={page}
                  />
                  <GlobalColorPicker
                    label="Cor do Nome do Autor"
                    value={activeProps.authorNameColor || ''}
                    onChange={(val) => handleSmartPropChange('authorNameColor', val)}
                    page={page}
                  />
                  <GlobalColorPicker
                    label="Cor do Cargo / Título do Autor"
                    value={activeProps.authorTitleColor || ''}
                    onChange={(val) => handleSmartPropChange('authorTitleColor', val)}
                    page={page}
                  />
                </>
              )}

              {/* Cor de Fundo / Preenchimento */}
              <GlobalColorPicker
                label="Cor de Fundo / Preenchimento"
                value={activeStyle.backgroundColor || ''}
                onChange={(val) => handleSmartStyleChange('backgroundColor', val)}
                page={page}
              />
            </div>
          </AccordionItem>

          {/* 🖼️ ACCORDION: BORDAS & ARREDONDAMENTO */}
          <AccordionItem
            id="cmp-border"
            title="Bordas & Arredondamento"
            icon={Square}
            defaultOpen={false}
          >
            {(() => {
              const isButtonOutline = component.type === 'button' && effectiveProps.variant === 'outline';
              const isCardLike = ['card', 'testimonial'].includes(component.type);
              const isFaqItem = component.type === 'faq_item';

              let defaultBorderStyle: 'none' | 'solid' | 'dashed' | 'dotted' = 'none';
              let defaultBorderWidth = '1px';
              let defaultBorderColor = 'var(--surface-border)';
              let defaultBorderRadius = '0px';

              if (isButtonOutline) {
                defaultBorderStyle = 'solid';
                defaultBorderColor = page?.siteConfig?.theme?.primaryStart || 'var(--brand-gradient-start)';
              } else if (isCardLike) {
                defaultBorderStyle = 'solid';
                defaultBorderRadius = '16px';
              } else if (isFaqItem) {
                defaultBorderStyle = 'solid';
                defaultBorderRadius = '12px';
              }

              return (
                <BorderControl
                  borderStyle={activeStyle.borderStyle || ((component as any).border?.borderStyle || (component as any).border?.style) || defaultBorderStyle}
                  borderWidth={activeStyle.borderWidth || ((component as any).border?.borderWidth || (component as any).border?.width) || defaultBorderWidth}
                  borderColor={activeStyle.borderColor || ((component as any).border?.borderColor || (component as any).border?.color) || defaultBorderColor}
                  borderRadius={activeStyle.borderRadius || ((component as any).border?.borderRadius || (component as any).border?.radiusTopLeft) || defaultBorderRadius}
                  page={page}
                  onChangeBorderStyle={(s) => handleSmartStyleChange('borderStyle', s)}
                  onChangeBorderWidth={(w) => handleSmartStyleChange('borderWidth', w)}
                  onChangeBorderColor={(c) => handleSmartStyleChange('borderColor', c)}
                  onChangeBorderRadius={(r) => handleSmartStyleChange('borderRadius', r)}
                />
              );
            })()}
          </AccordionItem>

          {/* ⚡ ACCORDION: EFEITOS & TRANSFORMAÇÕES */}
          <AccordionItem
            id="cmp-transform"
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
            id="cmp-transition"
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

        {/* Delete */}
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            className="w-full text-xs text-red-600 border-red-500/30 hover:bg-red-500/10 flex items-center justify-center gap-2 cursor-pointer font-bold py-2.5 rounded-xl"
          >
            <Trash2 className="w-4 h-4" />
            Excluir Componente
          </Button>
        </div>
      </div>
    </div>
  );
}