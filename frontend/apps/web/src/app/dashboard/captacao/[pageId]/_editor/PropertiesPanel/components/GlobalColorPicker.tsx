'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@psi/ui';
import { Pipette, Check, X, Sparkles, Sliders } from 'lucide-react';
import { getThemeColors, extractCanvasColors } from '../../utils/colorHelpers';
import { SliderNumberInput } from './SliderNumberInput';

interface GlobalColorPickerProps {
  label?: string;
  value: string;
  onChange: (color: string) => void;
  page?: any;
  canvasData?: any;
  allowTransparent?: boolean;
  className?: string;
}

function parseAlpha(colorStr: string): number {
  if (!colorStr || colorStr === 'transparent') return 0;
  if (colorStr.startsWith('rgba')) {
    const match = colorStr.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
    if (match) return parseFloat(match[1]);
  }
  return 1;
}

function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return hex;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return alpha >= 0.99 ? `#${c.toUpperCase()}` : `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

function extractHex(colorStr: string): string {
  if (!colorStr || colorStr === 'transparent') return '#000000';
  if (colorStr.startsWith('#')) return colorStr.slice(0, 7);
  if (colorStr.startsWith('rgb')) {
    const match = colorStr.match(/\d+/g);
    if (match && match.length >= 3) {
      const r = parseInt(match[0], 10).toString(16).padStart(2, '0');
      const g = parseInt(match[1], 10).toString(16).padStart(2, '0');
      const b = parseInt(match[2], 10).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`.toUpperCase();
    }
  }
  return '#000000';
}

export function GlobalColorPicker({
  label,
  value,
  onChange,
  page,
  canvasData,
  allowTransparent = true,
  className = '',
}: GlobalColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [mode, setMode] = useState<'solid' | 'gradient'>(
    value && (value.includes('gradient') || value.includes('var(--brand-gradient')) ? 'gradient' : 'solid'
  );

  // Estados do Modo Gradiente
  const [gradType, setGradType] = useState<'linear' | 'radial'>('linear');
  const [gradAngle, setGradAngle] = useState(135);
  const [gradColor1, setGradColor1] = useState('#4F46E5');
  const [gradColor2, setGradColor2] = useState('#7C3AED');

  const containerRef = useRef<HTMLDivElement>(null);

  const currentColor = value || '';
  const currentAlpha = parseAlpha(currentColor);
  const currentHex = extractHex(currentColor);

  const themeColors = getThemeColors(page);
  const siteColors = extractCanvasColors(canvasData || page?.canvasData || null);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Atualizar Opacidade/Alpha da cor sólida
  const handleAlphaChange = (newAlphaPercent: number) => {
    const alpha = newAlphaPercent / 100;
    if (alpha <= 0) {
      onChange('transparent');
      return;
    }
    const hex = currentHex || '#000000';
    onChange(hexToRgba(hex, alpha));
  };

  // Gerar String de Gradiente Personalizado
  const handleApplyGradient = (c1 = gradColor1, c2 = gradColor2, angle = gradAngle, type = gradType) => {
    if (type === 'radial') {
      const gradStr = `radial-gradient(circle, ${c1} 0%, ${c2} 100%)`;
      onChange(gradStr);
    } else {
      const gradStr = `linear-gradient(${angle}deg, ${c1} 0%, ${c2} 100%)`;
      onChange(gradStr);
    }
  };

  const themeSwatches = [
    { label: 'Degradê Inicial', value: themeColors.primaryStart },
    { label: 'Degradê Final', value: themeColors.primaryEnd },
    { label: 'Destaque / Contraste', value: themeColors.contrast },
    { label: 'Fundo do Site', value: themeColors.siteBg },
  ].filter((s) => !!s.value);

  const quickSwatches = [
    { label: 'Branco', value: '#FFFFFF' },
    { label: 'Preto', value: '#000000' },
    { label: 'Cinza Escuro', value: '#18181B' },
    { label: 'Cinza Claro', value: '#F4F4F5' },
  ];

  return (
    <div className={`space-y-1 relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
          {label}
        </label>
      )}

      {/* Trigger Bar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleToggle}
          className="w-8 h-8 rounded-lg border border-[var(--surface-border)] shadow-sm shrink-0 cursor-pointer transition-transform hover:scale-105 relative overflow-hidden flex items-center justify-center"
          style={
            currentColor === 'transparent'
              ? {
                  backgroundColor: '#ffffff',
                  backgroundImage:
                    'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                }
              : currentColor.includes('gradient')
              ? {
                  backgroundImage: currentColor,
                  backgroundColor: undefined,
                }
              : {
                  backgroundColor: currentColor || '#000000',
                  backgroundImage: undefined,
                }
          }
          title="Clique para abrir seletor de cores e gradientes"
        >
          {currentColor === 'transparent' && (
            <span className="text-[9px] font-bold text-red-500">✕</span>
          )}
        </button>

        <Input
          type="text"
          value={currentColor}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (!isOpen) {
              setIsOpen(true);
            }
          }}
          placeholder="#000000 ou linear-gradient(...)"
          className="font-mono text-xs brand-input h-8 flex-1"
        />

        <button
          type="button"
          onClick={handleToggle}
          className="h-8 w-8 rounded-lg glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
          title="Abrir paleta de cores e gradientes"
        >
          <Pipette className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Popover Inline Posicionado Relativo ao Container */}
      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1.5 z-50 w-[270px] brand-popup rounded-2xl border border-[var(--surface-border)] shadow-2xl p-3 space-y-2.5 animate-in fade-in duration-150 select-none backdrop-blur-xl"
        >
          {/* Header com Tabs: Cor Sólida vs Gradiente */}
          <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-2">
            <div className="flex items-center gap-1 glass-sm p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setMode('solid')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  mode === 'solid'
                    ? 'brand-accent text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Cor Sólida
              </button>
              <button
                type="button"
                onClick={() => setMode('gradient')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  mode === 'gradient'
                    ? 'brand-accent text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🌈 Gradiente
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* MODO A: COR SÓLIDA COM OPACIDADE */}
          {mode === 'solid' && (
            <div className="space-y-2.5">
              {/* Seletor de Cor Hex & Wheel */}
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={currentHex}
                  onChange={(e) => {
                    const newHex = e.target.value;
                    onChange(hexToRgba(newHex, currentAlpha));
                  }}
                  className="w-9 h-8 rounded-lg border border-[var(--surface-border)] cursor-pointer shrink-0 p-0.5 bg-transparent"
                />
                <div className="flex-1">
                  <Input
                    type="text"
                    value={currentColor}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#000000"
                    className="font-mono text-xs uppercase brand-input h-8 px-2"
                  />
                </div>
                {allowTransparent && (
                  <button
                    type="button"
                    onClick={() => onChange('transparent')}
                    className={`h-8 px-2 rounded-lg border text-[10px] font-bold transition-all cursor-pointer shrink-0 ${
                      currentColor === 'transparent'
                        ? 'border-red-500 bg-red-500/10 text-red-500'
                        : 'border-[var(--surface-border)] text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                    title="Sem cor (Transparente)"
                  >
                    Sem Cor
                  </button>
                )}
              </div>

              {/* Slider de Transparência / Opacidade (Alpha) */}
              <div className="space-y-1 p-2 rounded-xl glass-sm border border-[var(--surface-border)]">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-[var(--brand-gradient-start)]" />
                    Opacidade / Transparência
                  </span>
                  <span className="text-[9px] font-mono font-bold text-[var(--brand-gradient-start)]">
                    {Math.round(currentAlpha * 100)}%
                  </span>
                </div>
                <SliderNumberInput
                  value={`${Math.round(currentAlpha * 100)}%`}
                  onChange={(val) => {
                    const num = parseInt(val.replace('%', ''), 10);
                    handleAlphaChange(isNaN(num) ? 100 : num);
                  }}
                  min={0}
                  max={100}
                  defaultUnit="%"
                />
              </div>
            </div>
          )}

          {/* MODO B: GRADIENTE DINÂMICO */}
          {mode === 'gradient' && (
            <div className="space-y-2.5">
              {/* Presets de Tipo (Linear vs Radial) */}
              <div className="flex items-center justify-between gap-1.5">
                <div className="grid grid-cols-2 gap-1 flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      setGradType('linear');
                      handleApplyGradient(gradColor1, gradColor2, gradAngle, 'linear');
                    }}
                    className={`py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                      gradType === 'linear'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                        : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Linear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGradType('radial');
                      handleApplyGradient(gradColor1, gradColor2, gradAngle, 'radial');
                    }}
                    className={`py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                      gradType === 'radial'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                        : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Radial
                  </button>
                </div>

                {/* Botão Gradiente do Tema */}
                <button
                  type="button"
                  onClick={() => onChange('linear-gradient(135deg, var(--brand-gradient-start), var(--brand-gradient-end))')}
                  className="px-2 py-1 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[9px] font-bold shadow-sm cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                  title="Aplicar Gradiente do Tema do Site"
                >
                  ✨ Tema
                </button>
              </div>

              {/* Ângulo (apenas para Linear) */}
              {gradType === 'linear' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Ângulo (°deg)</span>
                    <span className="text-[9px] font-mono text-slate-400">{gradAngle}°</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[45, 90, 135, 180].map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => {
                          setGradAngle(deg);
                          handleApplyGradient(gradColor1, gradColor2, deg, 'linear');
                        }}
                        className={`py-1 rounded-md text-[9px] font-mono font-bold border cursor-pointer transition-all ${
                          gradAngle === deg
                            ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                            : 'border-[var(--surface-border)] text-slate-500'
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Controles de Cores Inicial e Final */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Cor Inicial</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={extractHex(gradColor1)}
                      onChange={(e) => {
                        setGradColor1(e.target.value);
                        handleApplyGradient(e.target.value, gradColor2);
                      }}
                      className="w-6 h-6 rounded-lg border cursor-pointer shrink-0 p-0.5 bg-transparent"
                    />
                    <Input
                      type="text"
                      value={gradColor1}
                      onChange={(e) => {
                        setGradColor1(e.target.value);
                        handleApplyGradient(e.target.value, gradColor2);
                      }}
                      className="font-mono text-[9px] brand-input h-6 px-1"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Cor Final</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={extractHex(gradColor2)}
                      onChange={(e) => {
                        setGradColor2(e.target.value);
                        handleApplyGradient(gradColor1, e.target.value);
                      }}
                      className="w-6 h-6 rounded-lg border cursor-pointer shrink-0 p-0.5 bg-transparent"
                    />
                    <Input
                      type="text"
                      value={gradColor2}
                      onChange={(e) => {
                        setGradColor2(e.target.value);
                        handleApplyGradient(gradColor1, e.target.value);
                      }}
                      className="font-mono text-[9px] brand-input h-6 px-1"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview do Gradiente */}
              <div
                className="w-full h-7 rounded-lg border border-[var(--surface-border)] shadow-inner"
                style={{
                  background: gradType === 'radial'
                    ? `radial-gradient(circle, ${gradColor1} 0%, ${gradColor2} 100%)`
                    : `linear-gradient(${gradAngle}deg, ${gradColor1} 0%, ${gradColor2} 100%)`,
                }}
              />
            </div>
          )}

          {/* Cores do Tema (Cores & Estilo) */}
          <div className="space-y-1 pt-1 border-t border-[var(--surface-border)]">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Cores do Tema
            </span>
            <div className="grid grid-cols-4 gap-1">
              {themeSwatches.map((swatch, idx) => {
                const isSelected = currentColor.toUpperCase() === swatch.value.toUpperCase();
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onChange(swatch.value)}
                    className={`h-6 rounded-md border transition-all cursor-pointer relative flex items-center justify-center ${
                      isSelected ? 'ring-2 ring-purple-500 scale-105' : 'border-black/10 dark:border-white/10 hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatch.value }}
                    title={`${swatch.label}: ${swatch.value}`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white drop-shadow-md" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cores Usadas no Site */}
          {siteColors.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Cores Usadas na Página
              </span>
              <div className="flex flex-wrap gap-1">
                {siteColors.map((col, idx) => {
                  const isSelected = currentColor.toUpperCase() === col.toUpperCase();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onChange(col)}
                      className={`w-5 h-5 rounded-md border transition-all cursor-pointer flex items-center justify-center ${
                        isSelected ? 'ring-2 ring-purple-500 scale-105' : 'border-black/10 dark:border-white/10 hover:scale-105'
                      }`}
                      style={{ backgroundColor: col }}
                      title={`Cor usada no site: ${col}`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white drop-shadow-md" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cores Rápidas (Padrão) */}
          <div className="space-y-1 pt-1 border-t border-[var(--surface-border)]">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Cores Rápidas
            </span>
            <div className="flex items-center gap-1">
              {quickSwatches.map((swatch, idx) => {
                const isSelected = currentColor.toUpperCase() === swatch.value.toUpperCase();
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onChange(swatch.value)}
                    className={`flex-1 h-5 rounded-md border text-[9px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                      isSelected ? 'ring-2 ring-purple-500 scale-105' : 'border-black/10 dark:border-white/10 hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatch.value, color: swatch.value === '#FFFFFF' || swatch.value === '#F4F4F5' ? '#000' : '#FFF' }}
                    title={swatch.label}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}