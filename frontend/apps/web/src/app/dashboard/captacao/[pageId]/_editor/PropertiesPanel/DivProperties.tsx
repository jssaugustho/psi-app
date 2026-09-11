'use client';

import React from 'react';
import { DivComponent, ViewportMode } from '../types';
import { Input, Button } from '@psi/ui';
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
  Maximize2,
  Minimize2
} from 'lucide-react';
import { SizeControl } from './components/SizeControl';
import { BorderControl } from './components/BorderControl';
import { SliderNumberInput } from './components/SliderNumberInput';
import { GlobalColorPicker } from './components/GlobalColorPicker';
import { BackgroundControl } from './components/BackgroundControl';

interface DivPropertiesProps {
  divComponent: DivComponent;
  viewportMode?: ViewportMode;
  page?: any;
  onUpdateComponent: (id: string, patch: Partial<DivComponent>) => void;
  onRemoveComponent: (id: string) => void;
  onDeselect?: () => void;
}

export function DivProperties({
  divComponent,
  viewportMode = 'desktop',
  page,
  onUpdateComponent,
  onRemoveComponent,
  onDeselect,
}: DivPropertiesProps) {
  const isMobile = viewportMode === 'mobile';

  const effectiveLayout = isMobile
    ? { ...divComponent.layout, ...(divComponent.mobile || {}) }
    : divComponent.layout;
  const effectiveBorder = isMobile
    ? { ...(divComponent.border || {}), ...(divComponent.mobile?.border || {}) }
    : (divComponent.border || {});
  const isHidden = isMobile ? (divComponent.mobile?.hidden ?? divComponent.hidden ?? false) : (divComponent.hidden ?? false);

  const isHorizontal = effectiveLayout.flexDirection === 'row';

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

  const effectiveBackground = isMobile
    ? { ...(divComponent.background || {}), ...(divComponent.mobile?.background || {}) }
    : (divComponent.background || {});

  const handleBackgroundChange = (key: string, value: any) => {
    if (isMobile) {
      onUpdateComponent(divComponent.id, {
        mobile: {
          ...(divComponent.mobile || {}),
          background: {
            ...(divComponent.mobile?.background || divComponent.background || {}),
            [key]: value,
          },
        },
      });
    } else {
      onUpdateComponent(divComponent.id, {
        background: {
          ...(divComponent.background || { type: 'color' }),
          type: 'color',
          [key]: value,
        },
      });
    }
  };

  const handleBorderChange = (key: string, value: any) => {
    if (isMobile) {
      onUpdateComponent(divComponent.id, {
        mobile: {
          ...(divComponent.mobile || {}),
          border: {
            ...(divComponent.mobile?.border || divComponent.border || {}),
            [key]: value,
          },
        },
      });
    } else {
      onUpdateComponent(divComponent.id, {
        border: {
          ...(divComponent.border || {}),
          [key]: value,
        },
      });
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
    if (onDeselect) onDeselect();
  };

  return (
    <div className="flex flex-col h-full text-xs select-none">
      {/* Header do Painel com Botão de Voltar à Paleta */}
      <div className="p-3 border-b border-[var(--surface-border)] flex items-center justify-between glass-sm">
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

      {/* Conteúdo Unificado do Container */}
      <div className="flex-1 p-4 space-y-5 overflow-y-auto custom-scrollbar">
        {/* NOME DO CONTAINER */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Nome / Identificação</label>
          <Input
            type="text"
            value={divComponent.label || ''}
            onChange={(e) => onUpdateComponent(divComponent.id, { label: e.target.value })}
            className="text-xs"
            placeholder="Ex: Bloco de Destaque, Coluna 1"
          />
        </div>

        {/* 👁 VISIBILIDADE DO CONTAINER */}
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--surface-border)] glass-sm">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Visibilidade do Container</span>
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
            <span>{isHidden ? 'Oculto' : 'Visível'}</span>
          </button>
        </div>

        {/* ↔️ ↕️ DIREÇÃO DOS ELEMENTOS (HORIZONTAL VS VERTICAL) */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Organização dos Elementos</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleLayoutChange('flexDirection', 'row')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer transition-all ${
                isHorizontal
                  ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                  : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
              }`}
            >
              <MoveHorizontal className="w-4 h-4" />
              <span>Lado a Lado</span>
            </button>
            <button
              type="button"
              onClick={() => handleLayoutChange('flexDirection', 'column')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer transition-all ${
                !isHorizontal
                  ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                  : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
              }`}
            >
              <MoveVertical className="w-4 h-4" />
              <span>Empilhado</span>
            </button>
          </div>
        </div>

        {/* 🎯 ALINHAMENTO PRINCIPAL (JUSTIFY CONTENT SIMPLIFICADO) */}
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
                className={`py-2 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                  (effectiveLayout.justifyContent || 'flex-start') === item.value
                    ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                    : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 🎯 ALINHAMENTO CRUZADO (ALIGN ITEMS SIMPLIFICADO) */}
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
                className={`py-2 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                  (effectiveLayout.alignItems || 'flex-start') === item.value
                    ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                    : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 📝 ALINHAMENTO DE TEXTO */}
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
                  onClick={() => handleLayoutChange('textAlign', item.value)}
                  className={`p-2 rounded-lg border flex items-center justify-center cursor-pointer transition-all ${
                    effectiveLayout.textAlign === item.value
                      ? 'border-purple-500 bg-purple-500/10 text-purple-600 font-bold'
                      : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>

        {/* 📐 ESPAÇAMENTO INTERNO ENTRE ELEMENTOS (GAP) */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Espaço entre Elementos (Gap)</label>
          <SliderNumberInput
            value={effectiveLayout.gap || '16px'}
            onChange={(val) => handleLayoutChange('gap', val)}
            min={0}
            max={120}
            defaultUnit="px"
          />
        </div>

        {/* 📐 CONTROLE DE LARGURA E ALTURA DO CONTAINER (SINCRONIZADO) */}
        <SizeControl
          width={effectiveLayout.width || effectiveLayout.flexBasis || '100%'}
          height={effectiveLayout.height || effectiveLayout.minHeight || 'auto'}
          minWidth={effectiveLayout.minWidth}
          maxWidth={effectiveLayout.maxWidth}
          minHeight={effectiveLayout.minHeight}
          onChangeWidth={(w) => {
            const isFill = w === '100%';
            handleMultiLayoutChange({
              width: w,
              flexBasis: w,
              flexGrow: isFill ? 1 : 0,
            });
          }}
          onChangeHeight={(h) => {
            const isAuto = h === 'auto';
            handleMultiLayoutChange({
              height: h,
              minHeight: isAuto ? 'auto' : h,
            });
          }}
          onChangeMinMax={(minMax) => handleMultiLayoutChange(minMax)}
          isMobileOverride={isMobile}
        />

        {/* 🎨 FUNDO E EFEITOS DE VIDRO DO CONTAINER */}
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
        />

        {/* 📐 BORDA E ARREDONDAMENTO */}
        <BorderControl
          borderStyle={effectiveBorder.borderStyle || (divComponent.border?.style as any) || 'none'}
          borderWidth={effectiveBorder.borderWidth || divComponent.border?.width || '1px'}
          borderColor={effectiveBorder.borderColor || divComponent.border?.color || '#E2E8F0'}
          borderRadius={effectiveBorder.borderRadius || divComponent.border?.radiusTopLeft || '0px'}
          page={page}
          onChangeBorderStyle={(style) => handleBorderChange('borderStyle', style)}
          onChangeBorderWidth={(w) => handleBorderChange('borderWidth', w)}
          onChangeBorderColor={(c) => handleBorderChange('borderColor', c)}
          onChangeBorderRadius={(r) => handleBorderChange('borderRadius', r)}
        />

        {/* 🚨 EXCLUSÃO PROMINENTE */}
        <div className="pt-4 border-t border-[var(--surface-border)]">
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            className="w-full text-xs text-red-600 border-red-500/30 hover:bg-red-500/10 flex items-center justify-center gap-2 cursor-pointer font-bold py-2.5 rounded-xl"
          >
            <Trash2 className="w-4 h-4" />
            Excluir Container Div e todos os filhos
          </Button>
        </div>
      </div>
    </div>
  );
}
