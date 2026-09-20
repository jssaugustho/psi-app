'use client';

import React from 'react';
import { ComponentStyle } from '../../types';
import { Select } from '@psi/ui';
import { GlobalColorPicker } from './GlobalColorPicker';
import { Sparkles, Sliders, Zap, Palette } from 'lucide-react';
import { startAdjustingProperty } from '@psi/canvas-renderer';

interface HoverPropertiesControlProps {
  style: ComponentStyle;
  page?: any;
  onChangeStyle: (key: keyof ComponentStyle, value: any) => void;
  isButton?: boolean;
}

export function HoverPropertiesControl({
  style,
  page,
  onChangeStyle,
  isButton = false,
}: HoverPropertiesControlProps) {
  const durationMs = style.transitionDurationMs !== undefined ? style.transitionDurationMs : 200;
  const timingFunc = style.transitionTimingFunction || 'ease-in-out';
  const scale = style.hoverScale !== undefined ? style.hoverScale : '';
  const translateY = style.hoverTranslateY !== undefined ? Number(style.hoverTranslateY) : 0;

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Informação do Painel */}
      <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span>Personalização do Estado Hover</span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400">
          Personalize cores, elevação, sombras e transformações do elemento ao passar o mouse.
        </p>
      </div>

      {/* 1. Cores no Hover */}
      <div className="p-3 rounded-xl border border-[var(--surface-border)] glass-sm space-y-3">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Palette className="w-3 h-3 text-purple-500" />
          Cores no Hover
        </h4>

        {/* Cor de Fundo no Hover */}
        <GlobalColorPicker
          label="Cor de Fundo no Hover"
          value={style.hoverBackgroundColor || ''}
          inheritedValue={style.backgroundColor || (style as any).background || (style as any).gradientString}
          onChange={(val) => onChangeStyle('hoverBackgroundColor', val || undefined)}
          page={page}
        />

        {/* Cor do Texto no Hover */}
        <GlobalColorPicker
          label="Cor do Texto / Conteúdo no Hover"
          value={style.hoverColor || ''}
          inheritedValue={style.color}
          onChange={(val) => onChangeStyle('hoverColor', val || undefined)}
          page={page}
        />

        {/* Cor da Borda no Hover */}
        <GlobalColorPicker
          label="Cor da Borda no Hover"
          value={style.hoverBorderColor || ''}
          inheritedValue={style.borderColor}
          onChange={(val) => onChangeStyle('hoverBorderColor', val || undefined)}
          page={page}
        />
      </div>

      {/* 2. Transformação & Movimento (Lift & Scale) */}
      <div className="p-3 rounded-xl border border-[var(--surface-border)] glass-sm space-y-3">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-500" />
          Transformação & Movimento
        </h4>

        {/* Elevação Vertical (TranslateY) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-slate-500">Elevação / Deslocamento Vertical (Lift)</label>
            <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
              {translateY !== 0 ? `${translateY}px` : 'Sem Elevação (0px)'}
            </span>
          </div>
          <input
            type="range"
            min={-16}
            max={16}
            step={1}
            value={translateY}
            onPointerDown={startAdjustingProperty}
            onMouseDown={startAdjustingProperty}
            onTouchStart={startAdjustingProperty}
            onChange={(e) => {
              const val = Number(e.target.value);
              onChangeStyle('hoverTranslateY', val === 0 ? undefined : val);
            }}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[8px] text-slate-400 font-mono">
            <span>-16px (Subir)</span>
            <span>0px (Fixo)</span>
            <span>+16px (Descer)</span>
          </div>
        </div>

        {/* Zoom / Escala no Hover */}
        <div className="space-y-1 pt-2 border-t border-[var(--surface-border)]/60">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-slate-500">Escala / Zoom no Hover (Scale)</label>
            <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
              {scale ? `${scale}x` : '1.00x (Padrão)'}
            </span>
          </div>
          <input
            type="range"
            min={0.9}
            max={1.3}
            step={0.01}
            value={scale || 1}
            onPointerDown={startAdjustingProperty}
            onMouseDown={startAdjustingProperty}
            onTouchStart={startAdjustingProperty}
            onChange={(e) => {
              const val = Number(e.target.value);
              onChangeStyle('hoverScale', val === 1 ? undefined : val);
            }}
            className="w-full accent-purple-500 cursor-pointer"
          />
        </div>

        {/* Sombra no Hover */}
        <div className="space-y-1 pt-2 border-t border-[var(--surface-border)]/60">
          <label className="text-[10px] text-slate-500">Sombra no Hover (Box Shadow)</label>
          <Select
            value={style.hoverBoxShadow || ''}
            onChange={(e) => onChangeStyle('hoverBoxShadow', e.target.value || undefined)}
            options={[
              { value: '', label: '✨ Sem Sombra / Padrão' },
              { value: '0 4px 12px rgba(0,0,0,0.08)', label: '☁️ Sombra Suave (MD)' },
              { value: '0 10px 25px -5px rgba(0,0,0,0.15)', label: '🚀 Elevação Forte (XL)' },
              { value: '0 20px 35px -10px rgba(0,0,0,0.25)', label: '🌑 Sombra Profunda (2XL)' },
              { value: '0 0 20px rgba(79, 70, 229, 0.4)', label: '💜 Brilho Glow Neon' },
            ]}
            variant="glass"
          />
        </div>

        {/* Opacidade no Hover */}
        <div className="space-y-1 pt-2 border-t border-[var(--surface-border)]/60">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-slate-500">Opacidade no Hover</label>
            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
              {style.hoverOpacity !== undefined ? `${Math.round(style.hoverOpacity * 100)}%` : '100% (Normal)'}
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={style.hoverOpacity !== undefined ? style.hoverOpacity : 1}
            onPointerDown={startAdjustingProperty}
            onMouseDown={startAdjustingProperty}
            onTouchStart={startAdjustingProperty}
            onChange={(e) => {
              const val = Number(e.target.value);
              onChangeStyle('hoverOpacity', val === 1 ? undefined : val);
            }}
            className="w-full accent-purple-500 cursor-pointer"
          />
        </div>
      </div>

      {/* 3. Configuração de Transição & Animação */}
      <div className="p-3 rounded-xl border border-[var(--surface-border)] glass-sm space-y-3">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Sliders className="w-3 h-3 text-blue-500" />
          Velocidade & Curva de Animação
        </h4>

        {/* Duração em Milissegundos */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-slate-500">Duração da Transição</label>
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
        </div>

        {/* Curva de Animação / Timing Function */}
        <div className="space-y-1 pt-1">
          <label className="text-[10px] text-slate-500">Curva de Animação (Easing)</label>
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
    </div>
  );
}
