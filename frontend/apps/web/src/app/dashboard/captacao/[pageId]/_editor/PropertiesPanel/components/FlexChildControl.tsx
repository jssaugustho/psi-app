'use client';

import React from 'react';
import { Box, Maximize2, Minimize2 } from 'lucide-react';
import { SliderNumberInput } from './SliderNumberInput';
import { HelpTooltip } from './HelpTooltip';
import { FlexAlign } from '@psi/canvas-renderer';

interface FlexChildControlProps {
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string;
  alignSelf?: FlexAlign | 'auto';
  onChangeFlexGrow: (grow: number) => void;
  onChangeFlexShrink: (shrink: number) => void;
  onChangeFlexBasis: (basis: string) => void;
  onChangeAlignSelf?: (align: FlexAlign | 'auto') => void;
}

export function FlexChildControl({
  flexGrow = 0,
  flexShrink = 1,
  flexBasis = 'auto',
  onChangeFlexGrow,
  onChangeFlexShrink,
  onChangeFlexBasis,
}: FlexChildControlProps) {
  return (
    <div className="space-y-3.5 p-3.5 rounded-2xl border border-[var(--surface-border)] glass-sm">
      {/* CABEÇALHO AMIGÁVEL */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[var(--surface-border)]">
        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 tracking-wider flex items-center gap-1.5">
          <Box className="w-3.5 h-3.5 text-purple-500" /> Comportamento de Encaixe
        </span>
        <HelpTooltip
          title="Comportamento no Container"
          text="Configure como este elemento se comporta dentro do container pai (se deve expandir no espaço livre ou ter um tamanho inicial específico). O alinhamento é controlado sempre pelo bloco pai."
        />
      </div>

      {/* EXPANDIR / REDUZIR */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-bold text-slate-500 uppercase">Expandir Espaço</label>
            <HelpTooltip
              title="Expandir no Espaço Livre"
              text="Quando ativado, este elemento vai crescer para preencher todo o espaço restante do bloco."
            />
          </div>
          <div className="grid grid-cols-2 gap-1">
            {[
              { value: 0, label: 'Fixo', icon: Minimize2 },
              { value: 1, label: 'Expandir', icon: Maximize2 },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onChangeFlexGrow(item.value)}
                className={`py-1.5 rounded-lg border text-[8px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  flexGrow === item.value
                    ? 'border-purple-500 bg-purple-500/10 text-purple-600 font-extrabold shadow-sm'
                    : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:border-slate-400'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-bold text-slate-500 uppercase">Reduzir Tamanho</label>
            <HelpTooltip
              title="Permitir Reduzir"
              text="Define se este elemento pode ser comprimido quando a tela for menor."
            />
          </div>
          <div className="grid grid-cols-2 gap-1">
            {[
              { value: 0, label: 'Manter Fixo' },
              { value: 1, label: 'Reduzir' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onChangeFlexShrink(item.value)}
                className={`py-1.5 rounded-lg border text-[8px] font-bold text-center leading-tight transition-all cursor-pointer ${
                  flexShrink === item.value
                    ? 'border-purple-500 bg-purple-500/10 text-purple-600 font-extrabold shadow-sm'
                    : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:border-slate-400'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TAMANHO INICIAL */}
      <div className="space-y-1 pt-1 border-t border-[var(--surface-border)]">
        <div className="flex items-center justify-between">
          <label className="text-[9px] font-bold text-slate-500 uppercase">Tamanho Inicial</label>
          <HelpTooltip
            title="Tamanho Inicial de Referência"
            text="Define a dimensão base do elemento antes de expandir ou encolher. Use 'auto' para o tamanho natural."
          />
        </div>
        <SliderNumberInput
          value={flexBasis}
          onChange={onChangeFlexBasis}
          min={0}
          max={1000}
          defaultUnit="auto"
          unitOptions={['auto', 'px', '%', 'rem', 'vw']}
        />
      </div>
    </div>
  );
}
