'use client';

import React from 'react';
import { ComponentStyle } from '../../types';
import { Input, Select } from '@psi/ui';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type
} from 'lucide-react';
import { SliderNumberInput } from './SliderNumberInput';

import { loadGoogleFonts } from '../../utils/googleFonts';
import { GlobalColorPicker } from './GlobalColorPicker';
import { getThemeColors } from '../../utils/colorHelpers';

interface TypographyControlProps {
  style: ComponentStyle;
  defaultFontCategory?: 'heading' | 'body';
  page?: any;
  onChangeStyle: (key: keyof ComponentStyle, value: any) => void;
  isMobileOverride?: boolean;
}

export function TypographyControl({
  style,
  defaultFontCategory = 'body',
  page,
  onChangeStyle,
  isMobileOverride = false,
}: TypographyControlProps) {
  const themeHeadingFont = page?.siteConfig?.theme?.fontHeading || 'Playfair Display';
  const themeBodyFont = page?.siteConfig?.theme?.fontBody || 'Inter';
  const inheritedFontName = defaultFontCategory === 'heading' ? themeHeadingFont : themeBodyFont;

  React.useEffect(() => {
    loadGoogleFonts();
  }, []);

  return (
    <div className="space-y-4 p-3 rounded-2xl border border-[var(--surface-border)] glass-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-blue-500" />
          Tipografia & Texto
        </span>
        <span className="text-[9px] font-mono text-slate-400">Typography</span>
      </div>

      {/* FAMÍLIA DA FONTE (COM HERANÇA DO TEMA) */}
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-slate-500 uppercase">Família da Fonte</label>
        <Select
          value={style.fontFamily || ''}
          onChange={(e) => {
            const fontVal = e.target.value;
            if (fontVal) loadGoogleFonts([fontVal]);
            onChangeStyle('fontFamily', fontVal);
          }}
          options={[
            { value: '', label: `✨ Herdar Tema (${inheritedFontName})`, fontFamily: inheritedFontName },
            { value: 'Inter', label: 'Inter (Sans-serif)', fontFamily: 'Inter' },
            { value: 'Poppins', label: 'Poppins (Geométrica)', fontFamily: 'Poppins' },
            { value: 'Montserrat', label: 'Montserrat (Moderna)', fontFamily: 'Montserrat' },
            { value: 'Playfair Display', label: 'Playfair Display (Serif Elegante)', fontFamily: 'Playfair Display' },
            { value: 'Lora', label: 'Lora (Serif Editorial)', fontFamily: 'Lora' },
            { value: 'Roboto', label: 'Roboto (Neogrotesca)', fontFamily: 'Roboto' },
            { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', fontFamily: 'Plus Jakarta Sans' },
            { value: 'Cinzel', label: 'Cinzel (Luxo)', fontFamily: 'Cinzel' },
            { value: 'Outfit', label: 'Outfit (Moderna Clean)', fontFamily: 'Outfit' },
            { value: 'Space Grotesk', label: 'Space Grotesk (Tech/Moderna)', fontFamily: 'Space Grotesk' },
          ]}
          variant="glass"
        />
      </div>

      {/* TAMANHO DA FONTE */}
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-slate-500 uppercase">Tamanho da Fonte (fontSize)</label>
        <SliderNumberInput
          value={style.fontSize || (defaultFontCategory === 'heading' ? '28px' : '16px')}
          onChange={(val) => onChangeStyle('fontSize', val)}
          min={8}
          max={120}
          defaultUnit="px"
        />
      </div>

      {/* PESO DA FONTE (FONT WEIGHT) */}
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-slate-500 uppercase">Peso da Fonte (fontWeight)</label>
        <Select
          value={style.fontWeight || ''}
          onChange={(e) => onChangeStyle('fontWeight', e.target.value)}
          options={[
            { value: '', label: 'Herdar Padrão' },
            { value: '300', label: 'Leve (300)' },
            { value: '400', label: 'Normal (400)' },
            { value: '500', label: 'Médio (500)' },
            { value: '600', label: 'Seminegrito (600)' },
            { value: '700', label: 'Negrito (700)' },
            { value: '800', label: 'Extranegrito (800)' },
            { value: '900', label: 'Black (900)' },
          ]}
          variant="glass"
        />
      </div>

      {/* ALTURA DA LINHA (LINE HEIGHT) */}
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-slate-500 uppercase">Altura da Linha (lineHeight)</label>
        <SliderNumberInput
          value={style.lineHeight || '1.4'}
          onChange={(val) => onChangeStyle('lineHeight', val)}
          min={0.8}
          max={3}
          step={0.1}
          defaultUnit=""
        />
      </div>

      {/* ESPAÇO ENTRE LETRAS (LETTER SPACING) */}
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-slate-500 uppercase">Espaço entre Letras (letterSpacing)</label>
        <SliderNumberInput
          value={style.letterSpacing || '0px'}
          onChange={(val) => onChangeStyle('letterSpacing', val)}
          min={-2}
          max={10}
          step={0.5}
          defaultUnit="px"
        />
      </div>

      {/* CAIXA DE TEXTO (TEXT TRANSFORM) */}
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-slate-500 uppercase">Caixa do Texto (textTransform)</label>
        <div className="grid grid-cols-4 gap-1">
          {[
            { value: 'none', label: 'Normal' },
            { value: 'uppercase', label: 'MAIÚSCULA' },
            { value: 'lowercase', label: 'minúscula' },
            { value: 'capitalize', label: 'Capitalizar' },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onChangeStyle('textTransform', item.value as any)}
              className={`py-1.5 rounded-lg border text-[8px] font-bold transition-all cursor-pointer ${
                (style.textTransform || 'none') === item.value
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-extrabold'
                  : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ALINHAMENTO DO TEXTO (TEXT ALIGN) */}
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-slate-500 uppercase">Alinhamento do Texto</label>
        <div className="grid grid-cols-4 gap-1">
          {[
            { value: 'left', icon: AlignLeft, label: 'Esquerda' },
            { value: 'center', icon: AlignCenter, label: 'Centro' },
            { value: 'right', icon: AlignRight, label: 'Direita' },
            { value: 'justify', icon: AlignJustify, label: 'Justificado' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onChangeStyle('textAlign', item.value as any)}
                className={`p-1.5 rounded-lg border flex items-center justify-center cursor-pointer transition-all ${
                  style.textAlign === item.value
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-bold'
                    : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                }`}
                title={item.label}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>
      </div>

      {/* MARGEM DE PARÁGRAFO / ESPAÇO INFERIOR */}
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-slate-500 uppercase">Espaço Inferior (marginBottom)</label>
        <SliderNumberInput
          value={style.marginBottom || '0px'}
          onChange={(val) => onChangeStyle('marginBottom', val)}
          min={0}
          max={60}
          defaultUnit="px"
        />
      </div>

      {/* COR DO TEXTO */}
      {(() => {
        const themeColors = getThemeColors(page);
        return (
          <GlobalColorPicker
            label="Cor do Texto"
            value={style.color || themeColors.contrast}
            onChange={(val) => onChangeStyle('color', val)}
            page={page}
          />
        );
      })()}
    </div>
  );
}
