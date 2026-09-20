'use client';

import React from 'react';
import { ComponentStyle } from '../../types';
import { Select } from '@psi/ui';
import { Sliders, Clock } from 'lucide-react';
import { startAdjustingProperty } from '@psi/canvas-renderer';

interface TransitionControlProps {
  style: ComponentStyle;
  onChangeStyle: (key: keyof ComponentStyle, value: any) => void;
}

export function TransitionControl({ style, onChangeStyle }: TransitionControlProps) {
  const durationMs = style.transitionDurationMs !== undefined ? style.transitionDurationMs : 200;
  const timingFunc = style.transitionTimingFunction || 'ease-in-out';

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Duração em Milissegundos */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-500" />
            Duração da Transição
          </label>
          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
            {durationMs}ms
          </span>
        </div>
        <input
          type="range"
          min={50}
          max={1500}
          step={50}
          value={durationMs}
          onPointerDown={startAdjustingProperty}
          onMouseDown={startAdjustingProperty}
          onTouchStart={startAdjustingProperty}
          onChange={(e) => onChangeStyle('transitionDurationMs', Number(e.target.value))}
          className="w-full accent-blue-500 cursor-pointer"
        />
        <div className="flex justify-between text-[8px] text-slate-400 font-mono">
          <span>50ms (Rápido)</span>
          <span>200ms (Suave)</span>
          <span>1500ms (Lento)</span>
        </div>
      </div>

      {/* Curva de Animação / Timing Function */}
      <div className="space-y-1 pt-2 border-t border-[var(--surface-border)]/60">
        <label className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
          <Sliders className="w-3 h-3 text-purple-500" />
          Curva de Animação (Easing)
        </label>
        <Select
          value={timingFunc}
          onChange={(e) => onChangeStyle('transitionTimingFunction', e.target.value)}
          options={[
            { value: 'ease-in-out', label: 'Suave no Início & Fim (ease-in-out)' },
            { value: 'ease', label: 'Suave Padrão (ease)' },
            { value: 'ease-out', label: 'Início Rápido, Fim Suave (ease-out)' },
            { value: 'ease-in', label: 'Início Suave, Fim Rápido (ease-in)' },
            { value: 'linear', label: 'Constante / Linear (linear)' },
          ]}
          variant="glass"
        />
      </div>
    </div>
  );
}
