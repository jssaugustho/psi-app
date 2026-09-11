'use client';

import React, { useState } from 'react';
import { Input } from '@psi/ui';
import {
  Maximize,
  Minimize,
  Lock,
  Percent,
  ChevronDown,
  ChevronRight,
  Crop,
  Shrink,
  StretchHorizontal
} from 'lucide-react';
import { SliderNumberInput } from './SliderNumberInput';

export type SizingMode = 'fill' | 'fit' | 'fixed' | 'relative';

interface SizeControlProps {
  width?: string;
  height?: string;
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
  onChangeWidth: (val: string) => void;
  onChangeHeight: (val: string) => void;
  onChangeMinMax?: (minMax: { minWidth?: string; maxWidth?: string; minHeight?: string; maxHeight?: string }) => void;
  showImageControls?: boolean;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  onChangeAspectRatio?: (aspectRatio: string) => void;
  onChangeObjectFit?: (objectFit: 'cover' | 'contain' | 'fill') => void;
  isMobileOverride?: boolean;
}

function parseSizingMode(value?: string, defaultMode: SizingMode = 'fill'): SizingMode {
  if (!value || value === '100%') return 'fill';
  if (value === 'auto' || value === 'fit-content') return 'fit';
  if (value.endsWith('%')) return 'relative';
  if (value.endsWith('px') || value.endsWith('rem') || !isNaN(Number(value))) return 'fixed';
  return defaultMode;
}

export function SizeControl({
  width = '100%',
  height = 'auto',
  minWidth = '',
  maxWidth = '',
  minHeight = '',
  maxHeight = '',
  onChangeWidth,
  onChangeHeight,
  onChangeMinMax,
  showImageControls = false,
  aspectRatio = 'auto',
  objectFit = 'cover',
  onChangeAspectRatio,
  onChangeObjectFit,
  isMobileOverride = false,
}: SizeControlProps) {
  const [showMinMax, setShowMinMax] = useState(false);

  const widthMode = parseSizingMode(width, 'fill');
  const heightMode = parseSizingMode(height, 'fit');

  const handleWidthModeChange = (mode: SizingMode) => {
    if (mode === 'fill') onChangeWidth('100%');
    else if (mode === 'fit') onChangeWidth('auto');
    else if (mode === 'relative') onChangeWidth('50%');
    else if (mode === 'fixed') onChangeWidth('300px');
  };

  const handleHeightModeChange = (mode: SizingMode) => {
    if (mode === 'fill') onChangeHeight('100%');
    else if (mode === 'fit') onChangeHeight('auto');
    else if (mode === 'relative') onChangeHeight('50%');
    else if (mode === 'fixed') onChangeHeight('200px');
  };

  return (
    <div className="space-y-4">
      {isMobileOverride && (
        <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold flex items-center gap-1.5">
          <span>📱 Editando Sobrescrita Mobile (Tela ≤ 768px)</span>
        </div>
      )}

      {/* 📏 LARGURA (WIDTH) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Largura (Width)</label>
          <span className="text-[9px] font-mono text-slate-400">{width || '100%'}</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[
            { mode: 'fill', label: 'Preencher (100%)', icon: Maximize },
            { mode: 'fit', label: 'Ajustar Conteúdo', icon: Minimize },
            { mode: 'fixed', label: 'Fixo (px)', icon: Lock },
            { mode: 'relative', label: 'Relativo (%)', icon: Percent },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = widthMode === item.mode;
            return (
              <button
                key={item.mode}
                type="button"
                onClick={() => handleWidthModeChange(item.mode as SizingMode)}
                className={`p-2 rounded-lg border flex items-center justify-center cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-bold'
                    : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:border-slate-400'
                }`}
                title={item.label}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        {(widthMode === 'fixed' || widthMode === 'relative') && (
          <SliderNumberInput
            value={width}
            onChange={onChangeWidth}
            min={0}
            max={widthMode === 'relative' ? 100 : 1200}
            defaultUnit={widthMode === 'relative' ? '%' : 'px'}
            className="mt-1.5"
          />
        )}
      </div>

      {/* 📐 ALTURA (HEIGHT) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Altura (Height)</label>
          <span className="text-[9px] font-mono text-slate-400">{height || 'auto'}</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[
            { mode: 'fit', label: 'Ajustar Conteúdo', icon: Minimize },
            { mode: 'fill', label: 'Preencher (100%)', icon: Maximize },
            { mode: 'fixed', label: 'Fixo (px)', icon: Lock },
            { mode: 'relative', label: 'Relativo (%)', icon: Percent },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = heightMode === item.mode;
            return (
              <button
                key={item.mode}
                type="button"
                onClick={() => handleHeightModeChange(item.mode as SizingMode)}
                className={`p-2 rounded-lg border flex items-center justify-center cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-bold'
                    : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:border-slate-400'
                }`}
                title={item.label}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        {(heightMode === 'fixed' || heightMode === 'relative') && (
          <SliderNumberInput
            value={height}
            onChange={onChangeHeight}
            min={0}
            max={heightMode === 'relative' ? 100 : 1000}
            defaultUnit={heightMode === 'relative' ? '%' : 'px'}
            className="mt-1.5"
          />
        )}
      </div>

      {/* 🖼 CONTROLES ESPECÍFICOS DE IMAGEM */}
      {showImageControls && (
        <div className="space-y-3 pt-2 border-t border-[var(--surface-border)]">
          {/* ASPECT RATIO */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Proporção (Aspect Ratio)</label>
            <div className="grid grid-cols-5 gap-1">
              {[
                { value: 'auto', label: 'Auto' },
                { value: '16/9', label: '16:9' },
                { value: '4/3', label: '4:3' },
                { value: '1/1', label: '1:1' },
                { value: '21/9', label: '21:9' },
              ].map((ratio) => (
                <button
                  key={ratio.value}
                  type="button"
                  onClick={() => onChangeAspectRatio?.(ratio.value)}
                  className={`py-1.5 rounded-lg border font-mono text-[9px] cursor-pointer transition-all ${
                    aspectRatio === ratio.value
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-bold'
                      : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>

          {/* OBJECT FIT */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Ajuste da Imagem (Object Fit)</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { value: 'cover', label: 'Preencher (Cover)', icon: Crop },
                { value: 'contain', label: 'Ajustar (Contain)', icon: Shrink },
                { value: 'fill', label: 'Distorcer (Fill)', icon: StretchHorizontal },
              ].map((fit) => {
                const Icon = fit.icon;
                return (
                  <button
                    key={fit.value}
                    type="button"
                    onClick={() => onChangeObjectFit?.(fit.value as any)}
                    className={`p-2 rounded-lg border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      objectFit === fit.value
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-bold'
                        : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                    }`}
                    title={fit.label}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[9px] capitalize">{fit.value}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ⚙️ LIMITES MÍN / MÁX (COLLAPSIBLE) */}
      {onChangeMinMax && (
        <div className="pt-2 border-t border-[var(--surface-border)]">
          <button
            type="button"
            onClick={() => setShowMinMax(!showMinMax)}
            className="flex items-center justify-between w-full text-[10px] font-bold text-slate-500 uppercase hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <span>Limites Mínimos / Máximos</span>
            {showMinMax ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {showMinMax && (
            <div className="space-y-2 mt-2">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 block font-semibold">Largura Mín (minWidth)</span>
                <SliderNumberInput
                  value={minWidth}
                  onChange={(val) => onChangeMinMax({ minWidth: val })}
                  defaultUnit="px"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 block font-semibold">Largura Máx (maxWidth)</span>
                <SliderNumberInput
                  value={maxWidth}
                  onChange={(val) => onChangeMinMax({ maxWidth: val })}
                  defaultUnit="px"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 block font-semibold">Altura Mín (minHeight)</span>
                <SliderNumberInput
                  value={minHeight}
                  onChange={(val) => onChangeMinMax({ minHeight: val })}
                  defaultUnit="px"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 block font-semibold">Altura Máx (maxHeight)</span>
                <SliderNumberInput
                  value={maxHeight}
                  onChange={(val) => onChangeMinMax({ maxHeight: val })}
                  defaultUnit="px"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
