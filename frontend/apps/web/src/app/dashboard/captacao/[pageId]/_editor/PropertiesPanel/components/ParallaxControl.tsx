'use client';

import React from 'react';
import { Sparkles, Layers, Smartphone, Zap } from 'lucide-react';
import { startAdjustingProperty } from '@psi/canvas-renderer';

interface ParallaxControlProps {
  parallaxSpeed?: number;
  disableParallaxMobile?: boolean;
  onChangeSpeed: (speed: number | undefined) => void;
  onChangeDisableMobile: (disable: boolean) => void;
}

export function ParallaxControl({
  parallaxSpeed = 0,
  disableParallaxMobile = false,
  onChangeSpeed,
  onChangeDisableMobile,
}: ParallaxControlProps) {
  const isEnabled = parallaxSpeed !== 0;

  const getSpeedLabel = (speed: number) => {
    if (speed === 0) return '📄 Velocidade Padrão (Sem Parallax)';
    if (speed < 0) return `🏔️ Fundo Lento (${speed.toFixed(2)}x)`;
    if (speed <= 0.4) return `🎈 Flutuante Suave (+${speed.toFixed(2)}x)`;
    return `🚀 Flutuante Rápido (+${speed.toFixed(2)}x)`;
  };

  return (
    <div className="space-y-3">
      {/* Header Toggle */}
      <div className="p-2.5 rounded-xl border border-[var(--surface-border)] glass-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
              Efeito Parallax (Velocidade de Scroll)
            </span>
          </div>
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => onChangeSpeed(e.target.checked ? 0.3 : undefined)}
            className="w-4 h-4 rounded border-slate-300 accent-purple-500 cursor-pointer"
          />
        </div>

        {isEnabled && (
          <div className="space-y-2.5 pt-2 border-t border-[var(--surface-border)]">
            {/* Indicador de Status */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">
                {getSpeedLabel(parallaxSpeed)}
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300">
                {parallaxSpeed > 0 ? `+${parallaxSpeed.toFixed(2)}x` : `${parallaxSpeed.toFixed(2)}x`}
              </span>
            </div>

            {/* Slider de Velocidade */}
            <input
              type="range"
              min={-1.0}
              max={1.5}
              step={0.05}
              value={parallaxSpeed}
              onPointerDown={startAdjustingProperty}
              onMouseDown={startAdjustingProperty}
              onTouchStart={startAdjustingProperty}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChangeSpeed(val === 0 ? undefined : Number(val.toFixed(2)));
              }}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[8px] text-slate-400 font-mono">
              <span>-1.0x (Invertido)</span>
              <span>0.0x (Padrão)</span>
              <span>+1.5x (Rápido)</span>
            </div>

            {/* Presets Rápidos */}
            <div className="space-y-1 pt-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase">Presets Rápidos</label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: '🏔️ -0.3x', val: -0.3, desc: 'Fundo Lento' },
                  { label: '📄 0.0x', val: 0.0, desc: 'Normal' },
                  { label: '🎈 +0.3x', val: 0.3, desc: 'Flutuante' },
                  { label: '🚀 +0.7x', val: 0.7, desc: '3D Rápido' },
                ].map((preset) => {
                  const isSelected = parallaxSpeed === preset.val;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => onChangeSpeed(preset.val === 0 ? undefined : preset.val)}
                      className={`py-1 px-1 rounded-lg border text-[9px] font-bold transition-all cursor-pointer text-center ${
                        isSelected
                          ? 'brand-accent text-white border-transparent shadow-xs'
                          : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white glass-sm'
                      }`}
                      title={preset.desc}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checkbox Mobile */}
            <div className="flex items-center justify-between pt-1.5 border-t border-[var(--surface-border)]">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                  Pausar no Celular (Mobile)
                </span>
              </div>
              <input
                type="checkbox"
                checked={disableParallaxMobile}
                onChange={(e) => onChangeDisableMobile(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 accent-purple-500 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
