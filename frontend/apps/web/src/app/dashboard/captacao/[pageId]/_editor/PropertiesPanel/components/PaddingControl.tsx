import React, { useState, useEffect, useRef } from 'react';
import { Link2, Unlink, Box } from 'lucide-react';

interface PaddingControlProps {
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  onChangePadding: (padding: {
    paddingTop?: string;
    paddingRight?: string;
    paddingBottom?: string;
    paddingLeft?: string;
  }) => void;
  isMobileOverride?: boolean;
}

export function PaddingControl({
  paddingTop = '0px',
  paddingRight = '0px',
  paddingBottom = '0px',
  paddingLeft = '0px',
  onChangePadding,
  isMobileOverride = false,
}: PaddingControlProps) {
  const [isLinked, setIsLinked] = useState<boolean>(
    paddingTop === paddingRight &&
    paddingRight === paddingBottom &&
    paddingBottom === paddingLeft
  );

  const parseNum = (val?: string): number => {
    if (!val) return 0;
    const num = parseInt(val, 10);
    return isNaN(num) ? 0 : num;
  };

  const extractUnit = (val?: string): string => {
    if (!val) return 'px';
    const match = val.match(/[a-z%]+$/i);
    return match ? match[0] : 'px';
  };

  // Se estiver sincronizado, determina o valor mestre unificado (dando preferência ao primeiro valor não zero)
  const masterVal =
    [paddingTop, paddingRight, paddingBottom, paddingLeft].find((v) => v && v !== '0px') ||
    paddingTop ||
    '0px';

  const handleSideChange = (
    key: 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft',
    rawVal: string,
    unit: string
  ) => {
    const num = rawVal === '' ? 0 : Math.max(0, parseInt(rawVal, 10) || 0);
    const formatted = `${num}${unit}`;

    if (isLinked) {
      onChangePadding({
        paddingTop: formatted,
        paddingRight: formatted,
        paddingBottom: formatted,
        paddingLeft: formatted,
      });
    } else {
      onChangePadding({
        [key]: formatted,
      });
    }
  };

  const toggleLink = () => {
    const nextLinked = !isLinked;
    setIsLinked(nextLinked);
    if (nextLinked) {
      const syncVal = masterVal;
      onChangePadding({
        paddingTop: syncVal,
        paddingRight: syncVal,
        paddingBottom: syncVal,
        paddingLeft: syncVal,
      });
    }
  };

  const sides = [
    { key: 'paddingTop' as const, label: 'Topo', val: isLinked ? masterVal : paddingTop },
    { key: 'paddingRight' as const, label: 'Direita', val: isLinked ? masterVal : paddingRight },
    { key: 'paddingBottom' as const, label: 'Base', val: isLinked ? masterVal : paddingBottom },
    { key: 'paddingLeft' as const, label: 'Esquerda', val: isLinked ? masterVal : paddingLeft },
  ];

  return (
    <div className="space-y-2.5 p-3 rounded-2xl border border-[var(--surface-border)] glass-sm select-none">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Box className="w-3.5 h-3.5 text-[var(--brand-gradient-start)]" />
          Espaçamento Interno (Padding)
        </span>
        <button
          type="button"
          onClick={toggleLink}
          className={`p-1 px-2 rounded-lg border text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            isLinked
              ? 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold'
              : 'border-[var(--surface-border)] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
          title={isLinked ? 'Valores Sincronizados (Clique para desvincular)' : 'Valores Individuais (Clique para sincronizar)'}
        >
          {isLinked ? <Link2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> : <Unlink className="w-3.5 h-3.5" />}
          <span>{isLinked ? 'Sincronizado' : 'Individuais'}</span>
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {sides.map((item) => {
          const unit = extractUnit(item.val);
          const num = parseNum(item.val);

          return (
            <PaddingInputItem
              key={item.key}
              label={item.label}
              num={num}
              unit={unit}
              onChange={(rawVal) => handleSideChange(item.key, rawVal, unit)}
              onWheelChange={(deltaY, isShift) => {
                const step = isShift ? 5 : 1;
                const change = deltaY < 0 ? step : -step;
                const newNum = Math.max(0, num + change);
                handleSideChange(item.key, String(newNum), unit);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

interface PaddingInputItemProps {
  label: string;
  num: number;
  unit: string;
  onChange: (rawVal: string) => void;
  onWheelChange: (deltaY: number, isShift: boolean) => void;
}

function PaddingInputItem({
  label,
  num,
  unit,
  onChange,
  onWheelChange,
}: PaddingInputItemProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onWheelChange(e.deltaY, e.shiftKey);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [onWheelChange]);

  return (
    <div className="space-y-1">
      <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight block text-center">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="number"
          min={0}
          max={500}
          value={num}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-8 pl-2 pr-5 text-xs text-center font-bold font-mono rounded-xl border border-[var(--surface-border)] bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-ns-resize"
          title="Altere digitando ou passando o mouse por cima e scrollando"
        />
        <span className="absolute right-2 text-[9px] text-slate-400 font-semibold select-none pointer-events-none">
          {unit}
        </span>
      </div>
    </div>
  );
}
