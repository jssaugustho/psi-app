'use client';

import React from 'react';
import { SliderNumberInput } from './SliderNumberInput';
import { GlobalColorPicker } from './GlobalColorPicker';

interface InlineTypographyControlProps {
  label: string;
  sizeValue?: string;
  weightValue?: string;
  colorValue?: string;
  page?: any;
  onChangeSize: (v: string) => void;
  onChangeWeight: (v: string) => void;
  onChangeColor: (v: string) => void;
}

const FONT_WEIGHTS = [
  { value: '400', label: 'Normal' },
  { value: '500', label: 'Medio' },
  { value: '600', label: 'Semi' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra' },
];

export function InlineTypographyControl({
  label,
  sizeValue,
  weightValue,
  colorValue,
  page,
  onChangeSize,
  onChangeWeight,
  onChangeColor,
}: InlineTypographyControlProps) {
  return (
    <div className="space-y-2.5 p-2.5 rounded-xl border border-[var(--surface-border)] glass-sm">
      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
        {label}
      </span>

      {/* Tamanho */}
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-slate-500 uppercase">Tamanho</label>
        <SliderNumberInput
          value={sizeValue || '0.875rem'}
          onChange={onChangeSize}
          min={8}
          max={72}
          defaultUnit="rem"
          step={0.125}
        />
      </div>

      {/* Peso */}
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-slate-500 uppercase">Peso</label>
        <div className="grid grid-cols-5 gap-1">
          {FONT_WEIGHTS.map((fw) => (
            <button
              key={fw.value}
              type="button"
              onClick={() => onChangeWeight(fw.value)}
              className={`py-1 rounded-lg border text-[9px] font-bold transition-all cursor-pointer ${
                (weightValue || '400') === fw.value
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                  : 'border-[var(--surface-border)] text-slate-500 dark:text-slate-400'
              }`}
            >
              {fw.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cor */}
      <GlobalColorPicker
        label="Cor"
        value={colorValue || ''}
        onChange={onChangeColor}
        page={page}
      />
    </div>
  );
}