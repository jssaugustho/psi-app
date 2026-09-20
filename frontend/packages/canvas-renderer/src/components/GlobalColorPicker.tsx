'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@psi/ui';
import { Pipette, Check, X, Sparkles, Sliders, Copy, RotateCcw } from 'lucide-react';
import { getThemeColors, extractCanvasColors, extractCanvasGradients } from '../utils/colorHelpers';
import { SliderNumberInput } from './SliderNumberInput';

interface GlobalColorPickerProps {
  label?: string;
  value: string;
  onChange: (color: string) => void;
  page?: any;
  canvasData?: any;
  allowTransparent?: boolean;
  allowGradients?: boolean;
  className?: string;
  inheritedValue?: string;
  defaultValue?: string;
}

function deriveGradientSecondaryColor(colorStr: string): string {
  if (!colorStr || colorStr === 'transparent') return '#7C3AED';
  const hex = extractHex(colorStr);
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  if (!isNaN(num)) {
    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;
    r = Math.max(0, Math.min(255, Math.floor(r * 0.75)));
    g = Math.max(0, Math.min(255, Math.floor(g * 0.75)));
    b = Math.max(0, Math.min(255, Math.floor(b * 0.75)));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  }
  return '#7C3AED';
}

function parseGradient(str: string, fallbackColor = '#4F46E5'): { type: 'linear' | 'radial'; angle: number; color1: string; color2: string } {
  if (!str || typeof str !== 'string') {
    return { type: 'linear', angle: 135, color1: fallbackColor, color2: deriveGradientSecondaryColor(fallbackColor) };
  }
  const isRadial = str.includes('radial');
  let angle = 135;
  const angleMatch = str.match(/(\d+)deg/);
  if (angleMatch) angle = parseInt(angleMatch[1], 10);

  const colorMatches = str.match(/#(?:[0-9a-fA-F]{3,8})|rgba?\([^)]+\)|transparent/g);
  if (colorMatches && colorMatches.length >= 1) {
    const color1 = colorMatches[0];
    const color2 = colorMatches[1] || deriveGradientSecondaryColor(color1);
    return { type: isRadial ? 'radial' : 'linear', angle, color1, color2 };
  }

  const baseHex = extractHex(str);
  return {
    type: isRadial ? 'radial' : 'linear',
    angle,
    color1: baseHex,
    color2: deriveGradientSecondaryColor(baseHex),
  };
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
  if (!colorStr || colorStr === 'transparent') return '#FFFFFF';
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
  return '#FFFFFF';
}

function getColorLabel(value: string): string {
  if (!value) return 'Herdado / Padrão';
  if (value === 'transparent') return 'Transparente';
  if (value.includes('gradient')) return 'Gradiente';
  if (value.startsWith('var(')) return value.replace('var(', '').replace(')', '').replace('--', '');
  if (value.startsWith('#')) return value.toUpperCase();
  if (value.startsWith('rgb')) return value;
  return value;
}

function truncateLabel(label: string, max = 18): string {
  return label.length > max ? label.slice(0, max) + '…' : label;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini seletor de parada de gradiente (suporta opacidade e transparência por cor)
// ─────────────────────────────────────────────────────────────────────────────
interface GradientStopPickerProps {
  label: string;
  color: string;
  themeSwatches: { label: string; value: string }[];
  siteColors: string[];
  onChange: (color: string) => void;
  align?: 'left' | 'right';
}

function GradientStopPicker({ label, color, themeSwatches, siteColors, onChange, align }: GradientStopPickerProps) {
  const [open, setOpen] = useState(false);
  const [textInput, setTextInput] = useState(color);
  const [popAlign, setPopAlign] = useState<'left' | 'right'>(align || 'left');
  const [popPlacement, setPopPlacement] = useState<'bottom' | 'top'>('bottom');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setTextInput(color); }, [color]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (align) {
        setPopAlign(align);
      } else if (rect.left + 220 > viewportWidth || rect.left > viewportWidth / 2) {
        setPopAlign('right');
      } else {
        setPopAlign('left');
      }

      if (rect.bottom + 280 > viewportHeight && rect.top > 280) {
        setPopPlacement('top');
      } else {
        setPopPlacement('bottom');
      }
    }
  }, [open, align]);

  const currentAlpha = parseAlpha(color);
  const currentHex = extractHex(color);

  const quickSwatches = [
    '#FFFFFF', '#000000', '#18181B', '#F4F4F5',
    '#EF4444', '#F97316', '#EAB308', '#22C55E',
    '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280',
  ];

  const handleTextCommit = (val: string) => {
    const trimmed = val.trim();
    if (trimmed === 'transparent') {
      onChange('transparent');
      return;
    }
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(trimmed)) {
      onChange(hexToRgba(trimmed.toUpperCase(), currentAlpha <= 0 ? 1 : currentAlpha));
      return;
    }
    if (trimmed.startsWith('rgb')) {
      onChange(trimmed);
      return;
    }
  };

  const handleAlphaChange = (newAlphaPercent: number) => {
    const alpha = newAlphaPercent / 100;
    if (alpha <= 0) {
      onChange('transparent');
      return;
    }
    const hex = currentHex || '#FFFFFF';
    onChange(hexToRgba(hex, alpha));
  };

  const isTransparent = color === 'transparent' || currentAlpha === 0;

  const swatchBgStyle: React.CSSProperties = isTransparent
    ? {
        backgroundColor: '#ffffff',
        backgroundImage:
          'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
        backgroundSize: '8px 8px',
        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
      }
    : { backgroundColor: color };

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-8 h-8 rounded-lg border border-[var(--surface-border)] cursor-pointer transition-transform hover:scale-105 shadow-sm shrink-0 hover:ring-2 hover:ring-[var(--brand-gradient-start)]/50 ring-offset-1 relative overflow-hidden flex items-center justify-center"
          style={swatchBgStyle}
          title={`${label}: ${color}`}
        >
          {isTransparent && <span className="text-red-500 text-[10px] font-bold">✕</span>}
        </button>
        <span className="text-[10px] font-mono font-medium text-slate-600 dark:text-slate-300 truncate max-w-[80px]" title={color}>
          {isTransparent ? '0%' : `${Math.round(currentAlpha * 100)}%`}
        </span>
      </div>

      {open && (
        <div className={`absolute ${popAlign === 'right' ? 'right-0' : 'left-0'} ${popPlacement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} z-[200] w-[220px] brand-popup rounded-xl border border-[var(--surface-border)] shadow-2xl p-2.5 space-y-2.5 animate-in fade-in duration-150 backdrop-blur-xl max-h-[80vh] overflow-y-auto custom-scrollbar`}>
          {/* Picker de Cor Nativo + Hex + Sem Cor */}
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={currentHex}
              onChange={(e) => onChange(hexToRgba(e.target.value, currentAlpha <= 0 ? 1 : currentAlpha))}
              className="w-7 h-7 rounded-md border border-[var(--surface-border)] cursor-pointer shrink-0 p-0.5 bg-transparent"
              title="Escolher cor visualmente"
            />
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onBlur={(e) => handleTextCommit(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTextCommit(textInput); }}
              placeholder="#FFFFFF"
              className="flex-1 font-mono text-[10px] px-1.5 py-1 rounded-md border border-[var(--surface-border)] bg-transparent outline-none uppercase"
            />
            <button
              type="button"
              onClick={() => onChange('transparent')}
              className={`h-7 px-1.5 rounded-md border text-[9px] font-bold transition-all cursor-pointer shrink-0 ${
                isTransparent
                  ? 'border-red-500 bg-red-500/10 text-red-500'
                  : 'border-[var(--surface-border)] text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="Transparente (Sem Cor)"
            >
              Sem Cor
            </button>
          </div>

          {/* Slider de Opacidade do Gradiente */}
          <div className="space-y-1 p-1.5 rounded-lg glass-sm border border-[var(--surface-border)]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Sliders className="w-2.5 h-2.5 text-[var(--brand-gradient-start)]" />
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

          {/* Cores do Tema */}
          {themeSwatches.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                Cores do Tema
              </span>
              <div className="grid grid-cols-4 gap-1">
                {themeSwatches.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { onChange(hexToRgba(extractHex(s.value), currentAlpha <= 0 ? 1 : currentAlpha)); setOpen(false); }}
                    className={`h-6 rounded-md border transition-all cursor-pointer flex items-center justify-center ${
                      color.toUpperCase() === s.value.toUpperCase()
                        ? 'ring-2 ring-purple-500 scale-105'
                        : 'border-black/10 dark:border-white/10 hover:scale-105'
                    }`}
                    style={{ backgroundColor: s.value }}
                    title={`${s.label}: ${s.value}`}
                  >
                    {color.toUpperCase() === s.value.toUpperCase() && (
                      <Check className="w-3 h-3 text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cores Usadas no Site */}
          {siteColors.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Usadas na Página
              </span>
              <div className="flex flex-wrap gap-1">
                {siteColors.slice(0, 12).map((col, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { onChange(hexToRgba(extractHex(col), currentAlpha <= 0 ? 1 : currentAlpha)); setOpen(false); }}
                    className={`w-5 h-5 rounded-md border transition-all cursor-pointer flex items-center justify-center ${
                      color.toUpperCase() === col.toUpperCase()
                        ? 'ring-2 ring-purple-500 scale-105'
                        : 'border-black/10 dark:border-white/10 hover:scale-105'
                    }`}
                    style={{ backgroundColor: col }}
                    title={col}
                  >
                    {color.toUpperCase() === col.toUpperCase() && (
                      <Check className="w-2.5 h-2.5 text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Paleta Rápida */}
          <div className="space-y-1 pt-1 border-t border-[var(--surface-border)]">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Paleta Rápida
            </span>
            <div className="grid grid-cols-6 gap-1">
              {quickSwatches.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => { onChange(hexToRgba(col, currentAlpha <= 0 ? 1 : currentAlpha)); setOpen(false); }}
                  className={`w-full aspect-square rounded-md border transition-all cursor-pointer flex items-center justify-center ${
                    color.toUpperCase() === col.toUpperCase()
                      ? 'ring-2 ring-purple-500 scale-105'
                      : 'border-black/10 dark:border-white/10 hover:scale-105'
                  }`}
                  style={{ backgroundColor: col }}
                  title={col}
                >
                  {color.toUpperCase() === col.toUpperCase() && (
                    <Check className="w-2 h-2 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function GlobalColorPicker({
  label,
  value,
  onChange,
  page,
  canvasData,
  allowTransparent = true,
  allowGradients,
  className = '',
  inheritedValue,
  defaultValue,
}: GlobalColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const [align, setAlign] = useState<'left' | 'right'>('left');
  const [copied, setCopied] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const themeColors = getThemeColors(page);

  const getFallbackColor = (): string => {
    if (inheritedValue) return inheritedValue;
    if (defaultValue) return defaultValue;
    const l = (label || '').toLowerCase();
    if (l.includes('fundo') || l.includes('background') || l.includes('overlay')) {
      return themeColors.siteBg || '#FFFFFF';
    }
    if (l.includes('texto') || l.includes('text') || l.includes('título') || l.includes('parágrafo') || l.includes('rótulo')) {
      return themeColors.contrast || '#18181B';
    }
    if (l.includes('ícone') || l.includes('icon') || l.includes('borda') || l.includes('border') || l.includes('destaque') || l.includes('primary')) {
      return themeColors.primaryStart || '#4F46E5';
    }
    return themeColors.contrast || themeColors.primaryStart || '#000000';
  };

  const fallbackColor = getFallbackColor();
  const currentColor = value || '';
  const displayColor = currentColor || fallbackColor;
  const currentAlpha = parseAlpha(displayColor);
  const currentHex = extractHex(displayColor);
  const isEmpty = !currentColor;

  const isBorderOrDivider = (label || '').toLowerCase().includes('borda') ||
    (label || '').toLowerCase().includes('border') ||
    (label || '').toLowerCase().includes('linha') ||
    (label || '').toLowerCase().includes('divider');

  const canUseGradient = allowGradients !== undefined ? allowGradients : !isBorderOrDivider;
  const isValueGradient = canUseGradient && (displayColor.includes('gradient') || displayColor.includes('var(--brand-gradient'));
  const mode: 'solid' | 'gradient' = isValueGradient ? 'gradient' : 'solid';

  const initialGrad = parseGradient(displayColor, fallbackColor);
  const [gradType, setGradType] = useState<'linear' | 'radial'>(initialGrad.type);
  const [gradAngle, setGradAngle] = useState<number>(initialGrad.angle);
  const [gradColor1, setGradColor1] = useState<string>(initialGrad.color1);
  const [gradColor2, setGradColor2] = useState<string>(initialGrad.color2);

  useEffect(() => {
    const parsed = parseGradient(displayColor, fallbackColor);
    setGradType(parsed.type);
    setGradAngle(parsed.angle);
    setGradColor1(parsed.color1);
    setGradColor2(parsed.color2);
  }, [displayColor, fallbackColor]);

  const siteColors = extractCanvasColors(canvasData || page?.canvasData || null);
  const siteGradients = extractCanvasGradients(canvasData || page?.canvasData || null);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState && !value) {
      onChange(fallbackColor);
    }
  };

  const handleCopy = async () => {
    if (!displayColor) return;
    try {
      await navigator.clipboard.writeText(displayColor);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const handleClear = () => onChange('');

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      if (rect.bottom + 340 > viewportHeight && rect.top > 340) {
        setPlacement('top');
      } else {
        setPlacement('bottom');
      }

      if (rect.left + 270 > viewportWidth && rect.right > 270) {
        setAlign('right');
      } else {
        setAlign('left');
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleAlphaChange = (newAlphaPercent: number) => {
    const alpha = newAlphaPercent / 100;
    if (alpha <= 0) { onChange('transparent'); return; }
    const hex = currentHex || '#000000';
    onChange(hexToRgba(hex, alpha));
  };

  const handleApplyGradient = (c1 = gradColor1, c2 = gradColor2, angle = gradAngle, type = gradType) => {
    if (type === 'radial') {
      onChange(`radial-gradient(circle, ${c1} 0%, ${c2} 100%)`);
    } else {
      onChange(`linear-gradient(${angle}deg, ${c1} 0%, ${c2} 100%)`);
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

  const swatchStyle: React.CSSProperties = displayColor === 'transparent'
    ? {
        backgroundColor: '#ffffff',
        backgroundImage:
          'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
        backgroundSize: '8px 8px',
        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
      }
    : displayColor.includes('gradient')
    ? { backgroundImage: displayColor }
    : { background: displayColor };

  const colorLabel = isEmpty ? 'Herdado / Padrão' : truncateLabel(getColorLabel(currentColor));

  return (
    <div className={`space-y-1 relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl border cursor-pointer transition-all hover:border-[var(--brand-gradient-start)]/50 group ${
          isOpen
            ? 'border-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/5'
            : 'border-[var(--surface-border)] glass-sm'
        }`}
        title="Clique para selecionar cor"
      >
        <div
          className="w-6 h-6 rounded-lg border border-black/10 dark:border-white/10 shrink-0 relative overflow-hidden flex items-center justify-center shadow-sm"
          style={swatchStyle}
        >
          {currentColor === 'transparent' && (
            <span className="text-red-500 text-[9px] font-bold">✕</span>
          )}
        </div>

        <span
          className={`flex-1 text-left text-[10px] font-mono font-medium truncate ${
            isEmpty ? 'text-slate-400 italic' : 'text-slate-700 dark:text-slate-200'
          }`}
        >
          {colorLabel}
        </span>

        {!isEmpty && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); handleCopy(); }}
              className="p-0.5 rounded hover:bg-[var(--mix-base)]/40 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              title="Copiar valor"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </span>
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="p-0.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
              title="Remover cor (herdar padrão)"
            >
              <RotateCcw className="w-3 h-3" />
            </span>
          </div>
        )}

        <Pipette className="w-3 h-3 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} ${
            placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } z-50 w-[270px] brand-popup rounded-2xl border border-[var(--surface-border)] shadow-2xl p-3 space-y-2.5 animate-in fade-in duration-150 select-none backdrop-blur-xl`}
        >
          <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-2">
            <div className="flex items-center gap-1 glass-sm p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  const solidHex = extractHex(displayColor) || '#000000';
                  const solidVal = hexToRgba(solidHex, currentAlpha <= 0 ? 1 : currentAlpha);
                  onChange(solidVal);
                }}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  mode === 'solid'
                    ? 'brand-accent text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Cor Sólida
              </button>
              {canUseGradient && (
                <button
                  type="button"
                  onClick={() => {
                    const c1 = gradColor1 || extractHex(displayColor) || '#4F46E5';
                    const c2 = gradColor2 || deriveGradientSecondaryColor(c1);
                    handleApplyGradient(c1, c2, gradAngle, gradType);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    mode === 'gradient'
                      ? 'brand-accent text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  🌈 Gradiente
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {currentColor && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg glass-sm border border-[var(--surface-border)] group">
              <span className="flex-1 text-[9px] font-mono text-slate-500 truncate" title={currentColor}>
                {currentColor}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 p-0.5 rounded hover:bg-[var(--mix-base)]/40 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                title="Copiar valor CSS"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          )}

          {mode === 'solid' && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={currentHex}
                  onChange={(e) => onChange(hexToRgba(e.target.value, currentAlpha))}
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

              {currentColor && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-[var(--surface-border)] text-[10px] font-bold text-slate-500 hover:text-red-500 hover:border-red-400 transition-all cursor-pointer glass-sm"
                >
                  <RotateCcw className="w-3 h-3" />
                  Remover Cor (herdar padrão)
                </button>
              )}
            </div>
          )}

          {mode === 'gradient' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-1.5">
                <div className="grid grid-cols-2 gap-1 flex-1">
                  <button
                    type="button"
                    onClick={() => { setGradType('linear'); handleApplyGradient(gradColor1, gradColor2, gradAngle, 'linear'); }}
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
                    onClick={() => { setGradType('radial'); handleApplyGradient(gradColor1, gradColor2, gradAngle, 'radial'); }}
                    className={`py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                      gradType === 'radial'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                        : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Radial
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onChange('linear-gradient(135deg, var(--brand-gradient-start), var(--brand-gradient-end))')}
                  className="px-2 py-1 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[9px] font-bold shadow-sm cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                  title="Aplicar Gradiente do Tema do Site"
                >
                  ✨ Tema
                </button>
              </div>

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
                        onClick={() => { setGradAngle(deg); handleApplyGradient(gradColor1, gradColor2, deg, 'linear'); }}
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

              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Cor Inicial</span>
                  <GradientStopPicker
                    label="Cor Inicial"
                    color={gradColor1}
                    themeSwatches={themeSwatches}
                    siteColors={siteColors}
                    onChange={(c) => { setGradColor1(c); handleApplyGradient(c, gradColor2); }}
                    align="left"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Cor Final</span>
                  <GradientStopPicker
                    label="Cor Final"
                    color={gradColor2}
                    themeSwatches={themeSwatches}
                    siteColors={siteColors}
                    onChange={(c) => { setGradColor2(c); handleApplyGradient(gradColor1, c); }}
                    align="right"
                  />
                </div>
              </div>

              <div
                className="w-full h-7 rounded-lg border border-[var(--surface-border)] shadow-inner"
                style={{
                  background:
                    gradType === 'radial'
                      ? `radial-gradient(circle, ${gradColor1} 0%, ${gradColor2} 100%)`
                      : `linear-gradient(${gradAngle}deg, ${gradColor1} 0%, ${gradColor2} 100%)`,
                }}
              />

              {currentColor && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-[var(--surface-border)] text-[10px] font-bold text-slate-500 hover:text-red-500 hover:border-red-400 transition-all cursor-pointer glass-sm"
                >
                  <RotateCcw className="w-3 h-3" />
                  Remover Cor (herdar padrão)
                </button>
              )}
            </div>
          )}

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

          {siteGradients.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-[var(--surface-border)]">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                Gradientes Usados na Página
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {siteGradients.map((grad, idx) => {
                  const isSelected = currentColor === grad;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        onChange(grad);
                      }}
                      className={`h-7 rounded-lg border shadow-sm transition-all cursor-pointer flex items-center justify-center ${
                        isSelected ? 'ring-2 ring-purple-500 scale-105' : 'border-black/10 dark:border-white/10 hover:scale-105'
                      }`}
                      style={{ background: grad }}
                      title={grad}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white drop-shadow-md" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                    style={{
                      backgroundColor: swatch.value,
                      color: swatch.value === '#FFFFFF' || swatch.value === '#F4F4F5' ? '#000' : '#FFF',
                    }}
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
