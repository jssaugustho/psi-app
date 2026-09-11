'use client';

import React, { useState } from 'react';
import { AtomicComponent, ComponentStyle, ViewportMode } from '../types';
import { Button } from '@psi/ui';
import {
  Trash2,
  ArrowLeft,
  Eye,
  EyeOff,
  FileEdit,
  Paintbrush2,
} from 'lucide-react';
import { SizeControl } from './components/SizeControl';
import { BorderControl } from './components/BorderControl';
import { SliderNumberInput } from './components/SliderNumberInput';
import { TypographyControl } from './components/TypographyControl';
import { GlobalColorPicker } from './components/GlobalColorPicker';
import { ContentPropsPanel, hasContentProps } from './ContentPropsPanel';

interface ComponentPropertiesProps {
  component: AtomicComponent;
  viewportMode?: ViewportMode;
  page?: any;
  onUpdateComponent: (id: string, patch: Partial<AtomicComponent>) => void;
  onRemoveComponent: (id: string) => void;
  onDeselect?: () => void;
}

export function ComponentProperties({
  component,
  viewportMode = 'desktop',
  page,
  onUpdateComponent,
  onRemoveComponent,
  onDeselect,
}: ComponentPropertiesProps) {
  const isMobile = viewportMode === 'mobile';
  const showContentTab = hasContentProps(component.type);

  // Tipos sem aba de conteudo abrem direto no Estilo
  const [activeTab, setActiveTab] = useState<'content' | 'style'>(
    showContentTab ? 'content' : 'style'
  );

  const props = component.props || {};
  const style = component.style || {};

  const effectiveProps = isMobile
    ? { ...props, ...(component.mobile?.props || {}) }
    : props;
  const effectiveStyle = isMobile
    ? { ...style, ...(component.mobile?.style || {}) }
    : style;

  const isHidden = isMobile
    ? (component.mobile?.hidden ?? component.hidden ?? false)
    : (component.hidden ?? false);

  const handlePropChange = (key: string, value: any) => {
    if (isMobile) {
      onUpdateComponent(component.id, {
        mobile: {
          ...(component.mobile || {}),
          props: {
            ...(component.mobile?.props || {}),
            [key]: value,
          },
        },
      });
    } else {
      onUpdateComponent(component.id, {
        props: {
          ...props,
          [key]: value,
        },
      });
    }
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

  const handleDelete = () => {
    onRemoveComponent(component.id);
    if (onDeselect) onDeselect();
  };

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
          {isMobile && (
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
              Mobile
            </span>
          )}
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
            {component.label || component.type}
          </span>
        </div>
      </div>

      {/* Tabs — so aparece se tiver aba de conteudo */}
      {showContentTab && (
        <div className="flex border-b border-[var(--surface-border)] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold transition-colors cursor-pointer ${
              activeTab === 'content'
                ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-500/5'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FileEdit className="w-3 h-3" />
            Conteudo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('style')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold transition-colors cursor-pointer ${
              activeTab === 'style'
                ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-500/5'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Paintbrush2 className="w-3 h-3" />
            Estilo
          </button>
        </div>
      )}

      {/* Conteudo scrollavel */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">

        {/* ================================================================
            ABA CONTEUDO
        ================================================================ */}
        {activeTab === 'content' && showContentTab && (
          <ContentPropsPanel
            component={component}
            isMobile={isMobile}
            effectiveProps={effectiveProps}
            page={page}
            onPropChange={handlePropChange}
          />
        )}

        {/* ================================================================
            ABA ESTILO
        ================================================================ */}
        {(activeTab === 'style' || !showContentTab) && (
          <>
            {/* Visibilidade */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--surface-border)] glass-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Visibilidade</span>
              <button
                type="button"
                onClick={handleToggleVisibility}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  isHidden
                    ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                }`}
              >
                {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{isHidden ? 'Oculto' : 'Visivel'}</span>
              </button>
            </div>

            {/* Tamanho */}
            <SizeControl
              width={effectiveStyle.width || 'auto'}
              height={effectiveStyle.height || 'auto'}
              minWidth={effectiveStyle.minWidth}
              maxWidth={effectiveStyle.maxWidth}
              minHeight={effectiveStyle.minHeight}
              aspectRatio={effectiveProps.aspectRatio || (effectiveStyle as any).aspectRatio}
              objectFit={effectiveProps.objectFit || (effectiveStyle as any).objectFit}
              showImageControls={component.type === 'image'}
              onChangeWidth={(w) => handleStyleChange('width', w)}
              onChangeHeight={(h) => handleStyleChange('height', h)}
              onChangeMinMax={(minMax) => {
                Object.entries(minMax).forEach(([k, v]) => handleStyleChange(k as any, v));
              }}
              onChangeAspectRatio={(ar) => handlePropChange('aspectRatio', ar)}
              onChangeObjectFit={(of) => handlePropChange('objectFit', of)}
              isMobileOverride={isMobile}
            />

            {/* Tipografia externa (estilo do bloco) */}
            <TypographyControl
              style={effectiveStyle}
              defaultFontCategory={['heading', 'label'].includes(component.type) ? 'heading' : 'body'}
              page={page}
              onChangeStyle={handleStyleChange}
              isMobileOverride={isMobile}
            />

            {/* Cor de Fundo */}
            <GlobalColorPicker
              label="Cor de Fundo / Preenchimento"
              value={effectiveStyle.backgroundColor || ''}
              onChange={(val) => handleStyleChange('backgroundColor', val)}
              page={page}
            />

            {/* Borda */}
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
                  borderStyle={effectiveStyle.borderStyle || defaultBorderStyle}
                  borderWidth={effectiveStyle.borderWidth || defaultBorderWidth}
                  borderColor={effectiveStyle.borderColor || defaultBorderColor}
                  borderRadius={effectiveStyle.borderRadius || defaultBorderRadius}
                  page={page}
                  onChangeBorderStyle={(s) => handleStyleChange('borderStyle', s)}
                  onChangeBorderWidth={(w) => handleStyleChange('borderWidth', w)}
                  onChangeBorderColor={(c) => handleStyleChange('borderColor', c)}
                  onChangeBorderRadius={(r) => handleStyleChange('borderRadius', r)}
                />
              );
            })()}

            {/* Align Self */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Posicionamento no Container (Align Self)</label>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { value: 'auto', label: 'Auto' },
                  { value: 'flex-start', label: 'Inicio' },
                  { value: 'center', label: 'Centro' },
                  { value: 'flex-end', label: 'Fim' },
                  { value: 'stretch', label: 'Esticar' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleStyleChange('alignSelf', item.value as any)}
                    className={`py-1.5 rounded-lg border text-[9px] font-bold cursor-pointer transition-all ${
                      effectiveStyle.alignSelf === item.value
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                        : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Delete */}
            <div className="pt-4 border-t border-[var(--surface-border)]">
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
          </>
        )}
      </div>
    </div>
  );
}