'use client';

import React, { useState } from 'react';
import { Palette, Sparkles, AlertCircle } from 'lucide-react';
import { Input } from '@psi/ui';

export const COLOR_PALETTES = [
  {
    id: 'salvia',
    name: 'Verde Salvia & Terracota',
    tag: 'Sereno / Recomendado',
    primaryStart: '#458270',
    primaryEnd: '#A64E2B',
    contrast: '#FFFFFF',
  },
  {
    id: 'azul',
    name: 'Azul Petroso & Areia',
    tag: 'Clinico / Confiavel',
    primaryStart: '#2C5282',
    primaryEnd: '#D69E2E',
    contrast: '#FFFFFF',
  },
  {
    id: 'rosa',
    name: 'Nude Rosa & Cafe',
    tag: 'Acolhedor / Humano',
    primaryStart: '#B85B56',
    primaryEnd: '#7B341E',
    contrast: '#FFFFFF',
  },
  {
    id: 'dark',
    name: 'Grafite & Ouro',
    tag: 'Sofisticado / Moderno',
    primaryStart: '#31363F',
    primaryEnd: '#D4AF37',
    contrast: '#FFFFFF',
  },
];

export const getContrastColor = (hex: string) => {
  const cleanHex = hex.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.55 ? '#000000' : '#FFFFFF';
};

interface ColorPaletteSelectorProps {
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  secondaryColor: string;
  setSecondaryColor: (color: string) => void;
  contrastColor: string;
  setContrastColor: (color: string) => void;
  bgColor: string;
  setBgColor: (color: string) => void;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  extractedBrandColors?: string[];
  isExtractingColors?: boolean;
  isCustomColor: boolean;
  setIsCustomColor: (isCustom: boolean) => void;
  selectedPalette: any;
  setSelectedPalette: (palette: any) => void;
  themeColorClass?: string; // Optional class for brand color highlighting
}

export function ColorPaletteSelector({
  primaryColor,
  setPrimaryColor,
  secondaryColor,
  setSecondaryColor,
  contrastColor,
  setContrastColor,
  bgColor,
  setBgColor,
  logoUrl,
  faviconUrl,
  extractedBrandColors = [],
  isExtractingColors = false,
  isCustomColor,
  setIsCustomColor,
  selectedPalette,
  setSelectedPalette,
  themeColorClass = 'text-violet-500',
}: ColorPaletteSelectorProps) {
  const [activeColorPopover, setActiveColorPopover] = useState<'primaryStart' | 'primaryEnd' | 'contrast' | 'bgColor' | null>(null);

  const hasImage = Boolean(logoUrl || faviconUrl);

  const renderColorPickerWithPopover = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    popoverKey: 'primaryStart' | 'primaryEnd' | 'contrast' | 'bgColor'
  ) => {
    const isOpen = activeColorPopover === popoverKey;
    return (
      <div className="space-y-1.5 relative">
        <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">{label}</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              if (hasImage) setActiveColorPopover(isOpen ? null : popoverKey);
              else e.currentTarget.parentElement?.querySelector<HTMLInputElement>('input[type="color"]')?.click();
            }}
            className="h-10 w-12 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm cursor-pointer p-1 transition-all hover:scale-105 flex items-center justify-center relative overflow-hidden shrink-0 bg-transparent"
            style={{ backgroundColor: value }}
          >
            <div className="w-full h-full rounded-lg border border-black/10 dark:border-white/20" />
          </button>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="sr-only" />
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`text-xs font-mono h-10 ${value && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value) ? '!border-red-500/80' : ''}`}
          />
        </div>
        {value && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value) && (
          <span className="text-[10px] text-red-500 font-medium flex items-center gap-1 pt-0.5">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>Hexadecimal inválido (ex: #C5825D)</span>
          </span>
        )}
        {isOpen && hasImage && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setActiveColorPopover(null)} />
            <div className="absolute top-full left-0 z-50 mt-1.5 p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl min-w-[220px]">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 tracking-wider">
                {isExtractingColors ? 'Extraindo cores...' : 'Cores da sua Marca'}
              </p>
              <div className="flex flex-wrap gap-2">
                {extractedBrandColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => { onChange(color); setActiveColorPopover(null); }}
                    className="h-8 w-8 rounded-lg border-2 border-transparent hover:border-violet-500 hover:scale-110 transition-all cursor-pointer shadow-sm bg-transparent"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setActiveColorPopover(null)}
                  className="h-8 px-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-[10px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer bg-transparent"
                >
                  Hex
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {!isCustomColor ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COLOR_PALETTES.map((palette) => {
            const isSelected = selectedPalette.id === palette.id;
            return (
              <div
                key={palette.id}
                onClick={() => {
                  setSelectedPalette(palette);
                  setPrimaryColor(palette.primaryStart);
                  setSecondaryColor(palette.primaryEnd);
                  setContrastColor(palette.contrast);
                  // Manter fundo padrão do preset ou deixar como está
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? `bg-violet-500/5 dark:bg-violet-500/10 border-violet-500 shadow-md ring-1 ring-violet-500`
                    : 'border-slate-200 dark:border-zinc-800/80 hover:border-slate-400 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-black/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{palette.name}</span>
                  {isSelected && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border bg-violet-500/10 border-violet-500/30 text-violet-650 dark:text-violet-400`}>
                      Selecionada
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-6 flex-1 rounded-lg shadow-inner border border-black/10 dark:border-white/10"
                    style={{ background: `linear-gradient(135deg, ${palette.primaryStart}, ${palette.primaryEnd})` }}
                  />
                  <div
                    className="h-6 w-6 rounded-lg border border-black/10 dark:border-white/20 shadow-sm"
                    style={{ background: palette.contrast }}
                  />
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{palette.tag}</span>
              </div>
            );
          })}

          {extractedBrandColors.length >= 1 && (
            <div
              onClick={() => {
                const prim = extractedBrandColors[0] || '#458270';
                const sec = extractedBrandColors[1] || prim;
                const contrast = getContrastColor(prim);
                setPrimaryColor(prim);
                setSecondaryColor(sec);
                setContrastColor(contrast);
                setSelectedPalette({
                  id: 'extracted',
                  name: 'Paleta da sua Marca',
                  tag: 'Cores extraídas da sua imagem',
                  primaryStart: prim,
                  primaryEnd: sec,
                  contrast,
                });
              }}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                selectedPalette.id === 'extracted'
                  ? `bg-violet-500/5 dark:bg-violet-500/10 border-violet-500 shadow-md ring-1 ring-violet-500`
                  : 'border-slate-200 dark:border-zinc-800/80 hover:border-slate-400 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-black/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Paleta da sua Marca</span>
                </div>
                {selectedPalette.id === 'extracted' && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border bg-violet-500/10 border-violet-500/30 text-violet-650 dark:text-violet-400`}>
                    Selecionada
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="h-6 flex-1 rounded-lg shadow-inner border border-black/10 dark:border-white/10"
                  style={{ background: `linear-gradient(135deg, ${extractedBrandColors[0]}, ${extractedBrandColors[1] || extractedBrandColors[0]})` }}
                />
                <div
                  className="h-6 w-6 rounded-lg border border-black/10 dark:border-white/20 shadow-sm"
                  style={{ background: getContrastColor(extractedBrandColors[0] || '#458270') }}
                />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Cores extraídas da sua imagem</span>
            </div>
          )}

          <div
            onClick={() => setIsCustomColor(true)}
            className={`p-4 rounded-xl border border-slate-200 dark:border-zinc-800/80 hover:border-violet-500 hover:bg-violet-500/5 cursor-pointer transition-all flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md ${
              extractedBrandColors.length >= 1 ? 'col-span-1' : 'sm:col-span-2 col-span-full'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Palette className={`h-4 w-4 ${themeColorClass}`} />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Personalizar Cores</span>
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase">Hexadecimal</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-6 flex-1 rounded-lg shadow-inner border border-black/10 dark:border-white/10"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              />
              <div
                className="h-6 w-6 rounded-lg border border-black/10 dark:border-white/20 shadow-sm"
                style={{ background: bgColor }}
                title="Fundo"
              />
              <div
                className="h-6 w-6 rounded-lg border border-black/10 dark:border-white/20 shadow-sm"
                style={{ background: contrastColor }}
                title="Contraste"
              />
            </div>
            <span className={`text-[11px] font-semibold flex items-center gap-1 ${themeColorClass}`}>
              + Definir cores personalizadas
            </span>
          </div>
        </div>
      ) : (
        <div className="p-5 border border-slate-200 dark:border-zinc-800/80 rounded-xl space-y-5 bg-slate-50/50 dark:bg-black/10 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Palette className={`h-4 w-4 ${themeColorClass}`} />
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Cores Personalizadas</span>
            </div>
            <button
              type="button"
              onClick={() => setIsCustomColor(false)}
              className={`text-xs hover:underline font-semibold cursor-pointer bg-transparent border-none ${themeColorClass}`}
            >
              Voltar para Paletas Prontas
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            {renderColorPickerWithPopover('Cor Primária', primaryColor, setPrimaryColor, 'primaryStart')}
            {renderColorPickerWithPopover('Cor Secundária', secondaryColor, setSecondaryColor, 'primaryEnd')}
            {renderColorPickerWithPopover('Fundo do Site', bgColor, setBgColor, 'bgColor')}
            {renderColorPickerWithPopover('Texto / Contraste', contrastColor, setContrastColor, 'contrast')}
          </div>
        </div>
      )}
    </div>
  );
}
