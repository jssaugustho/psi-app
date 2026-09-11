'use client';

import React from 'react';
import { Input } from '@psi/ui';
import { Square, Circle, ShieldAlert } from 'lucide-react';
import { SliderNumberInput } from './SliderNumberInput';
import { GlobalColorPicker } from './GlobalColorPicker';

interface BorderControlProps {
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  borderWidth?: string;
  borderColor?: string;
  borderRadius?: string;
  page?: any;
  onChangeBorderStyle: (style: 'none' | 'solid' | 'dashed' | 'dotted') => void;
  onChangeBorderWidth: (width: string) => void;
  onChangeBorderColor: (color: string) => void;
  onChangeBorderRadius: (radius: string) => void;
}

export function BorderControl({
  borderStyle = 'none',
  borderWidth = '1px',
  borderColor = '#E2E8F0',
  borderRadius = '0px',
  page,
  onChangeBorderStyle,
  onChangeBorderWidth,
  onChangeBorderColor,
  onChangeBorderRadius,
}: BorderControlProps) {
  return (
    <div className="space-y-4 p-3 rounded-2xl border border-[var(--surface-border)] glass-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          📐 Bordas & Arredondamento
        </span>
        <span className="text-[9px] font-mono text-slate-400">Border / Radius</span>
      </div>

      {/* ESTILO DA BORDA */}
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-slate-500 uppercase">Estilo da Borda</label>
        <div className="grid grid-cols-4 gap-1">
          {[
            { value: 'none', label: 'Nenhum' },
            { value: 'solid', label: 'Sólida' },
            { value: 'dashed', label: 'Tracejada' },
            { value: 'dotted', label: 'Pontos' },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onChangeBorderStyle(item.value as any)}
              className={`py-1.5 rounded-lg border text-[9px] font-bold transition-all cursor-pointer ${
                borderStyle === item.value
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-extrabold'
                  : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {borderStyle !== 'none' && (
        <>
          {/* ESPESSURA DA BORDA */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase">Espessura (Largura)</label>
            <div className="grid grid-cols-4 gap-1 mb-1">
              {['1px', '2px', '3px', '4px'].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => onChangeBorderWidth(w)}
                  className={`py-1 rounded-lg border text-[9px] font-bold transition-all cursor-pointer ${
                    borderWidth === w
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-extrabold'
                      : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
            <SliderNumberInput
              value={borderWidth}
              onChange={onChangeBorderWidth}
              min={0}
              max={20}
              defaultUnit="px"
            />
          </div>

          {/* COR DA BORDA */}
          <GlobalColorPicker
            label="Cor da Borda"
            value={borderColor || ''}
            onChange={onChangeBorderColor}
            page={page}
          />
        </>
      )}

      {/* RAIO DE CANTO (BORDER RADIUS) */}
      <div className="space-y-1.5">
        <label className="text-[9px] font-bold text-slate-500 uppercase">Cantos Arredondados (Radius)</label>
        <div className="grid grid-cols-6 gap-1 mb-1">
          {[
            { value: '0px', label: 'Reto' },
            { value: '8px', label: '8px' },
            { value: '12px', label: '12px' },
            { value: '16px', label: '16px' },
            { value: '24px', label: '24px' },
            { value: '9999px', label: 'Redondo' },
          ].map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onChangeBorderRadius(r.value)}
              className={`py-1 rounded-lg border text-[8px] font-bold transition-all cursor-pointer ${
                borderRadius === r.value
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-extrabold'
                  : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <SliderNumberInput
          value={borderRadius}
          onChange={onChangeBorderRadius}
          min={0}
          max={100}
          defaultUnit="px"
        />
      </div>
    </div>
  );
}
