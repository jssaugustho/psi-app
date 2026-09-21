'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { startAdjustingProperty } from '@psi/canvas-renderer';

export interface SliderNumberInputProps {
  value?: string | number;
  onChange: (val: string) => void;
  min?: number;
  max?: number;
  step?: number;
  defaultUnit?: string;
  unitOptions?: string[];
  placeholder?: string;
  className?: string;
}

export function parseValueWithUnit(val?: string | number, fallbackUnit = 'px') {
  if (val === undefined || val === null || val === '') {
    return { numericValue: 0, unit: fallbackUnit };
  }
  const str = String(val).trim();
  if (str === 'auto') {
    return { numericValue: 0, unit: 'auto' };
  }
  const match = str.match(/^(-?\d+(?:\.\d+)?)\s*([a-z%]*)$/i);
  if (match) {
    const num = parseFloat(match[1]);
    const matchedUnit = match[2] ? match[2].trim() : '';
    const unit = matchedUnit !== '' ? matchedUnit : fallbackUnit;
    return { numericValue: isNaN(num) ? 0 : num, unit };
  }
  return { numericValue: 0, unit: fallbackUnit };
}

export function getUnitDefaults(unit: string, customMin?: number, customMax?: number, customStep?: number, currentNum?: number) {
  let min = customMin ?? 0;
  let max = customMax;
  let step = customStep;

  switch (unit.toLowerCase()) {
    case 'rem':
    case 'em':
      if (max === undefined) max = 10;
      if (step === undefined) step = 0.1;
      break;
    case 'vw':
    case 'vh':
    case '%':
      if (max === undefined) max = 100;
      if (step === undefined) step = 0.5;
      break;
    case '':
      if (customMin === undefined) min = -10;
      if (max === undefined) max = 10;
      if (step === undefined) step = 0.01;
      break;
    case 'px':
    default:
      if (max === undefined) max = 200;
      if (step === undefined) step = 1;
      break;
  }

  if (currentNum !== undefined && !isNaN(currentNum)) {
    if (max !== undefined && currentNum > max) {
      max = Math.ceil(currentNum * 1.25);
    }
    if (min !== undefined && currentNum < min) {
      min = Math.floor(currentNum * 1.25);
    }
  }

  return { min, max, step };
}

export function convertValueUnit(currentNum: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return currentNum;

  // Primeiro converte para px equivalente
  let numInPx = currentNum;
  if (fromUnit === 'rem' || fromUnit === 'em') {
    numInPx = currentNum * 16;
  } else if (fromUnit === '%' || fromUnit === 'vw' || fromUnit === 'vh') {
    numInPx = currentNum * 10;
  }

  // Depois converte de px para a nova unidade
  let result = numInPx;
  if (toUnit === 'rem' || toUnit === 'em') {
    result = Number((numInPx / 16).toFixed(2));
  } else if (toUnit === '%' || toUnit === 'vw' || toUnit === 'vh') {
    result = Number((numInPx / 10).toFixed(1));
  } else if (toUnit === 'px') {
    result = Math.round(numInPx);
  }

  return isNaN(result) ? 0 : result;
}

const DEFAULT_STANDARD_UNITS = ['px', 'rem', 'em', 'vw', 'vh', '%'];

export function SliderNumberInput({
  value,
  onChange,
  min: customMin,
  max: customMax,
  step: customStep,
  defaultUnit = 'px',
  unitOptions,
  placeholder,
  className = '',
}: SliderNumberInputProps) {
  const { numericValue, unit } = parseValueWithUnit(value, defaultUnit);
  const activeUnit = unit === 'auto' ? (defaultUnit !== 'auto' ? defaultUnit : 'px') : unit;
  const { min: effectiveMin, max: effectiveMax, step: effectiveStep } = getUnitDefaults(
    activeUnit,
    customMin,
    customMax,
    customStep,
    numericValue
  );

  const [isUnitOpen, setIsUnitOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const availableUnits = unitOptions || (unit === '' ? [''] : DEFAULT_STANDARD_UNITS);
  const showUnitSelect = availableUnits.length > 1;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNum = parseFloat(e.target.value);
    const rounded = Number(newNum.toFixed(2));
    onChange(`${rounded}${activeUnit}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange('');
    } else {
      const newNum = parseFloat(val);
      onChange(`${isNaN(newNum) ? 0 : newNum}${activeUnit}`);
    }
  };

  const handleUnitSelect = (newUnit: string) => {
    if (newUnit === 'auto') {
      onChange('auto');
    } else {
      const converted = convertValueUnit(numericValue, activeUnit, newUnit);
      onChange(`${converted}${newUnit}`);
    }
    setIsUnitOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsUnitOpen(false);
      }
    };
    if (isUnitOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUnitOpen]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const mult = e.shiftKey ? 5 : 1;
      const change = e.deltaY < 0 ? effectiveStep * mult : -effectiveStep * mult;
      const newNum = Math.max(effectiveMin, Number((numericValue + change).toFixed(2)));
      onChange(`${newNum}${activeUnit}`);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [numericValue, activeUnit, effectiveStep, effectiveMin, onChange]);

  return (
    <div className={`flex items-center gap-2.5 w-full ${className}`}>
      {/* Slider à esquerda ocupando flex-1 */}
      <input
        type="range"
        min={effectiveMin}
        max={effectiveMax}
        step={effectiveStep}
        value={numericValue}
        onChange={handleSliderChange}
        onPointerDown={startAdjustingProperty}
        onMouseDown={startAdjustingProperty}
        onTouchStart={startAdjustingProperty}
        className="flex-1 accent-[var(--brand-gradient-start)] h-1.5 bg-[var(--surface-border)] rounded-lg cursor-pointer transition-all"
      />

      {/* Caixa de Entrada Numérica com Seletor de Unidade Customizado */}
      <div className="relative flex items-center w-28 shrink-0" ref={containerRef}>
        <input
          ref={inputRef}
          type="number"
          value={numericValue}
          step={effectiveStep}
          min={effectiveMin}
          max={effectiveMax}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full pl-2 pr-10 py-1.5 text-xs font-mono text-right font-bold rounded-xl brand-input outline-none focus:border-[var(--brand-gradient-start)] focus:ring-1 focus:ring-[var(--brand-gradient-start)] transition-colors cursor-ns-resize [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          title="Edite digitando ou passando o mouse por cima e scrollando"
        />

        {showUnitSelect ? (
          <div className="absolute right-1.5 flex items-center">
            <button
              type="button"
              onClick={() => setIsUnitOpen(!isUnitOpen)}
              className="px-1 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-300 hover:bg-purple-500/10 transition-all flex items-center gap-0.5 cursor-pointer"
              title="Alterar unidade de medida"
            >
              <span>{unit || defaultUnit}</span>
              <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 ${isUnitOpen ? 'rotate-180 text-purple-500' : ''}`} />
            </button>

            {isUnitOpen && (
              <div className="absolute right-0 top-full mt-1 w-20 py-1 px-1 bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md border border-[var(--surface-border)] shadow-xl rounded-xl z-50 flex flex-col gap-0.5">
                {availableUnits.map((u) => {
                  const isSelected = u === unit;
                  return (
                    <button
                      key={u}
                      type="button"
                      onClick={() => handleUnitSelect(u)}
                      className={`w-full px-2 py-1 text-[10px] font-mono font-bold rounded-lg text-left transition-colors uppercase flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'brand-accent text-white shadow-xs'
                          : 'text-slate-300 hover:text-white hover:bg-purple-500/20'
                      }`}
                    >
                      <span>{u || 'auto'}</span>
                      {isSelected && <Check className="w-2.5 h-2.5 text-white shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <span className="absolute right-2 text-[9px] font-mono font-bold text-slate-400 uppercase select-none pointer-events-none">
            {unit || defaultUnit}
          </span>
        )}
      </div>
    </div>
  );
}
