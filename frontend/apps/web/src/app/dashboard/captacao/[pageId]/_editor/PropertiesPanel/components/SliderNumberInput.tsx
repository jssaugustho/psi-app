'use client';

import React from 'react';

interface SliderNumberInputProps {
  value?: string | number;
  onChange: (val: string) => void;
  min?: number;
  max?: number;
  step?: number;
  defaultUnit?: string;
  placeholder?: string;
  className?: string;
}

export function parseValueWithUnit(val?: string | number, fallbackUnit = 'px') {
  if (val === undefined || val === null || val === '') {
    return { numericValue: 0, unit: fallbackUnit };
  }
  const str = String(val).trim();
  const match = str.match(/^(-?\d+(?:\.\d+)?)\s*([a-z%]*)$/i);
  if (match) {
    const num = parseFloat(match[1]);
    const u = match[2] || fallbackUnit;
    return { numericValue: isNaN(num) ? 0 : num, unit: u };
  }
  return { numericValue: 0, unit: fallbackUnit };
}

export function SliderNumberInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  defaultUnit = 'px',
  placeholder,
  className = '',
}: SliderNumberInputProps) {
  const { numericValue, unit } = parseValueWithUnit(value, defaultUnit);
  const effectiveMax = max !== undefined ? max : (unit === '%' ? 100 : 1000);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNum = parseFloat(e.target.value);
    onChange(`${newNum}${unit}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange('');
    } else {
      const newNum = parseFloat(val);
      onChange(`${isNaN(newNum) ? 0 : newNum}${unit}`);
    }
  };

  return (
    <div className={`flex items-center gap-2.5 w-full ${className}`}>
      {/* Slider à esquerda ocupando flex-1 */}
      <input
        type="range"
        min={min}
        max={effectiveMax}
        step={step}
        value={numericValue}
        onChange={handleSliderChange}
        className="flex-1 accent-[var(--brand-gradient-start)] h-1.5 bg-[var(--surface-border)] rounded-lg cursor-pointer transition-all"
      />

      {/* Caixa de Entrada Numérica Pequena com Unidade Fixa à direita */}
      <div className="relative flex items-center w-24 shrink-0">
        <input
          type="number"
          value={numericValue}
          step={step}
          min={min}
          max={effectiveMax}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full pl-2 pr-7 py-1.5 text-xs font-mono text-right font-bold rounded-xl brand-input outline-none focus:border-[var(--brand-gradient-start)] focus:ring-1 focus:ring-[var(--brand-gradient-start)] transition-colors"
        />
        <span className="absolute right-2 text-[10px] font-mono font-bold text-slate-400 select-none pointer-events-none uppercase">
          {unit || defaultUnit}
        </span>
      </div>
    </div>
  );
}
