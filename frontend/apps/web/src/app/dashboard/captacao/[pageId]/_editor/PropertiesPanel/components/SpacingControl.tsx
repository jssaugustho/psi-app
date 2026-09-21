'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Link2, Unlink2, Space, ChevronDown, Check } from 'lucide-react';
import { parseValueWithUnit, convertValueUnit } from './SliderNumberInput';

interface SpacingControlProps {
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  onChangePadding: (p: { paddingTop?: string; paddingRight?: string; paddingBottom?: string; paddingLeft?: string }) => void;
  onChangeMargin: (m: { marginTop?: string; marginRight?: string; marginBottom?: string; marginLeft?: string }) => void;
}

interface SpacingInputItemProps {
  label: string;
  value?: string;
  onChange: (val: string) => void;
  unitOptions?: string[];
}

function SpacingInputItem({
  label,
  value,
  onChange,
  unitOptions = ['px', 'rem', 'em', '%', 'vw', 'vh', 'auto'],
}: SpacingInputItemProps) {
  const { numericValue, unit } = parseValueWithUnit(value, 'px');
  const activeUnit = unit === 'auto' ? 'px' : unit;
  const isAuto = unit === 'auto';
  const [isUnitOpen, setIsUnitOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(`0${activeUnit}`);
    } else {
      const newNum = parseFloat(val);
      onChange(`${isNaN(newNum) ? 0 : newNum}${activeUnit}`);
    }
  };

  const handleUnitSelect = (newUnit: string) => {
    if (newUnit === 'auto') {
      onChange('auto');
    } else {
      const currentUnit = isAuto ? 'px' : unit;
      const converted = convertValueUnit(numericValue, currentUnit, newUnit);
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

      if (isAuto) return;
      const step = e.shiftKey ? 5 : 1;
      const change = e.deltaY < 0 ? step : -step;
      const newNum = Math.max(0, Number((numericValue + change).toFixed(2)));
      onChange(`${newNum}${activeUnit}`);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [numericValue, activeUnit, isAuto, onChange]);

  return (
    <div className="flex flex-col gap-1 min-w-0 flex-1">
      <span className="text-[8px] text-slate-400 dark:text-slate-500 uppercase font-mono font-bold text-center truncate">
        {label}
      </span>
      <div className="relative flex items-center w-full" ref={containerRef}>
        <input
          ref={inputRef}
          type="text"
          value={isAuto ? 'auto' : numericValue}
          onChange={handleInputChange}
          disabled={isAuto}
          className="w-full h-8 pl-1.5 pr-8 text-xs font-mono text-center font-bold rounded-xl brand-input outline-none focus:border-[var(--brand-gradient-start)] transition-all cursor-ns-resize disabled:opacity-60 disabled:cursor-not-allowed"
          title="Edite digitando ou passando o mouse por cima e scrollando"
        />

        <div className="absolute right-1 flex items-center">
          <button
            type="button"
            onClick={() => setIsUnitOpen(!isUnitOpen)}
            className="px-1 py-0.5 rounded-md text-[8px] font-mono font-bold uppercase text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-300 transition-all flex items-center gap-0.5 cursor-pointer"
            title="Alterar unidade"
          >
            <span>{unit || 'px'}</span>
            <ChevronDown className={`w-2 h-2 transition-transform duration-200 ${isUnitOpen ? 'rotate-180 text-purple-500' : ''}`} />
          </button>

          {isUnitOpen && (
            <div className="absolute right-0 top-full mt-1 w-20 py-1 px-1 bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md border border-[var(--surface-border)] shadow-xl rounded-xl z-50 flex flex-col gap-0.5">
              {unitOptions.map((u) => {
                const isSelected = u === unit;
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => handleUnitSelect(u)}
                    className={`w-full px-2 py-1 text-[9px] font-mono font-bold rounded-lg text-left transition-colors uppercase flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'brand-accent text-white shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-purple-500/20'
                    }`}
                  >
                    <span>{u}</span>
                    {isSelected && <Check className="w-2.5 h-2.5 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SpacingControl({
  paddingTop = '0px',
  paddingRight = '0px',
  paddingBottom = '0px',
  paddingLeft = '0px',
  marginTop = '0px',
  marginRight = '0px',
  marginBottom = '0px',
  marginLeft = '0px',
  onChangePadding,
  onChangeMargin,
}: SpacingControlProps) {
  const [padLinked, setPadLinked] = useState(false);
  const [marLinked, setMarLinked] = useState(false);

  const handlePadChange = (side: 'top' | 'right' | 'bottom' | 'left', val: string) => {
    if (padLinked) {
      onChangePadding({
        paddingTop: val,
        paddingRight: val,
        paddingBottom: val,
        paddingLeft: val,
      });
    } else {
      onChangePadding({
        paddingTop: side === 'top' ? val : paddingTop,
        paddingRight: side === 'right' ? val : paddingRight,
        paddingBottom: side === 'bottom' ? val : paddingBottom,
        paddingLeft: side === 'left' ? val : paddingLeft,
      });
    }
  };

  const handleMarChange = (side: 'top' | 'right' | 'bottom' | 'left', val: string) => {
    if (marLinked) {
      onChangeMargin({
        marginTop: val,
        marginRight: val,
        marginBottom: val,
        marginLeft: val,
      });
    } else {
      onChangeMargin({
        marginTop: side === 'top' ? val : marginTop,
        marginRight: side === 'right' ? val : marginRight,
        marginBottom: side === 'bottom' ? val : marginBottom,
        marginLeft: side === 'left' ? val : marginLeft,
      });
    }
  };

  return (
    <div className="space-y-4 p-3.5 rounded-2xl border border-[var(--surface-border)] glass-sm">
      <div className="flex items-center justify-between pb-1.5 border-b border-[var(--surface-border)]">
        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 tracking-wider flex items-center gap-1.5">
          <Space className="w-3.5 h-3.5 text-emerald-500" /> Espaçamentos (Padding & Margem)
        </span>
        <span className="text-[9px] font-mono text-slate-400">box-spacing</span>
      </div>

      {/* 📦 PADDING (ESPAÇAMENTO INTERNO) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[9px] font-bold text-slate-500 uppercase">Padding (Espaçamento Interno)</label>
          <button
            type="button"
            onClick={() => {
              const nextLinked = !padLinked;
              setPadLinked(nextLinked);
              if (nextLinked) {
                handlePadChange('top', paddingTop);
              }
            }}
            className={`px-2 py-1 rounded-lg border text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              padLinked
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 font-extrabold shadow-sm'
                : 'border-[var(--surface-border)] text-slate-500 hover:border-slate-400'
            }`}
            title={padLinked ? 'Os 4 eixos estão sincronizados' : 'Sincronizar os 4 eixos com o mesmo valor'}
          >
            {padLinked ? <Link2 className="w-3 h-3 text-emerald-500" /> : <Unlink2 className="w-3 h-3 text-slate-400" />}
            <span>{padLinked ? 'Sincronizados' : 'Sincronizar'}</span>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <SpacingInputItem
            label="Topo"
            value={paddingTop}
            onChange={(v) => handlePadChange('top', v)}
          />
          <SpacingInputItem
            label="Direita"
            value={padLinked ? paddingTop : paddingRight}
            onChange={(v) => handlePadChange('right', v)}
          />
          <SpacingInputItem
            label="Baixo"
            value={padLinked ? paddingTop : paddingBottom}
            onChange={(v) => handlePadChange('bottom', v)}
          />
          <SpacingInputItem
            label="Esquerda"
            value={padLinked ? paddingTop : paddingLeft}
            onChange={(v) => handlePadChange('left', v)}
          />
        </div>
      </div>

      {/* 📐 MARGIN (MARGEM EXTERNA) */}
      <div className="space-y-2 pt-2 border-t border-[var(--surface-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase">Margin (Margem Externa)</label>
            <button
              type="button"
              onClick={() => {
                const isAutoX = marginLeft === 'auto' && marginRight === 'auto';
                if (isAutoX) {
                  onChangeMargin({ marginTop, marginRight: '0px', marginBottom, marginLeft: '0px' });
                } else {
                  onChangeMargin({ marginTop, marginRight: 'auto', marginBottom, marginLeft: 'auto' });
                }
              }}
              className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border transition-all cursor-pointer ${
                marginLeft === 'auto' && marginRight === 'auto'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 font-extrabold shadow-sm'
                  : 'border-[var(--surface-border)] text-slate-400'
              }`}
              title="Centralizar Horizontalmente com Margem (margin: 0 auto)"
            >
              Auto X
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              const nextLinked = !marLinked;
              setMarLinked(nextLinked);
              if (nextLinked) {
                handleMarChange('top', marginTop);
              }
            }}
            className={`px-2 py-1 rounded-lg border text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              marLinked
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 font-extrabold shadow-sm'
                : 'border-[var(--surface-border)] text-slate-500 hover:border-slate-400'
            }`}
            title={marLinked ? 'Os 4 eixos estão sincronizados' : 'Sincronizar os 4 eixos com o mesmo valor'}
          >
            {marLinked ? <Link2 className="w-3 h-3 text-emerald-500" /> : <Unlink2 className="w-3 h-3 text-slate-400" />}
            <span>{marLinked ? 'Sincronizados' : 'Sincronizar'}</span>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <SpacingInputItem
            label="Topo"
            value={marginTop}
            onChange={(v) => handleMarChange('top', v)}
          />
          <SpacingInputItem
            label="Direita"
            value={marLinked ? marginTop : marginRight}
            onChange={(v) => handleMarChange('right', v)}
          />
          <SpacingInputItem
            label="Baixo"
            value={marLinked ? marginTop : marginBottom}
            onChange={(v) => handleMarChange('bottom', v)}
          />
          <SpacingInputItem
            label="Esquerda"
            value={marLinked ? marginTop : marginLeft}
            onChange={(v) => handleMarChange('left', v)}
          />
        </div>
      </div>
    </div>
  );
}
