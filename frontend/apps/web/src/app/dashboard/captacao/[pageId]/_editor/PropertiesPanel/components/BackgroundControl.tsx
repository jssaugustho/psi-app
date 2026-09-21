'use client';

import React from 'react';
import { GlobalColorPicker } from './GlobalColorPicker';
import { SliderNumberInput } from './SliderNumberInput';
import { Select } from '@psi/ui';
import { X, Sparkles, Image as ImageIcon, Sliders, Droplet } from 'lucide-react';
import { ImageUploader } from '../../components/ImageUploader';

export interface BackgroundData {
  type?: 'none' | 'color' | 'gradient' | 'image' | 'video';
  color?: string;
  gradientType?: 'linear' | 'radial';
  gradientAngle?: number;
  gradientStops?: Array<{ color: string; position: number }>;
  gradientString?: string;
  imageUrl?: string;
  imagePosition?: string;
  imageSize?: 'cover' | 'contain' | 'auto';
  imageOverlayColor?: string;
  backdropBlur?: string;
  videoUrl?: string;
  videoOverlayColor?: string;
}

interface BackgroundControlProps {
  label?: string;
  background: BackgroundData;
  onChange: (patch: BackgroundData) => void;
  page?: any;
  canvasData?: any;
  targetWidth?: number;
  targetHeight?: number;
  aspectRatio?: number | string;
}

function parseAspectRatio(ratio?: number | string): number | undefined {
  if (typeof ratio === 'number') return ratio;
  if (!ratio) return undefined;
  if (typeof ratio === 'string') {
    if (ratio.includes('/')) {
      const [w, h] = ratio.split('/').map(Number);
      if (w && h) return w / h;
    }
    if (ratio.includes(':')) {
      const [w, h] = ratio.split(':').map(Number);
      if (w && h) return w / h;
    }
    const num = parseFloat(ratio);
    if (!isNaN(num)) return num;
  }
  return undefined;
}

export function BackgroundControl({
  label = 'Fundo & Efeitos de Vidro',
  background,
  onChange,
  page,
  canvasData,
  targetWidth,
  targetHeight,
  aspectRatio,
}: BackgroundControlProps) {
  const bgType = background.type || 'none';
  const color = background.color || '';
  const backdropBlur = background.backdropBlur || '0px';

  const tenantId = page?.tenantId || page?.workspaceId || '';
  const numericRatio = parseAspectRatio(aspectRatio);
  const calculatedWidth = targetWidth || 1920;
  const calculatedHeight = targetHeight || (numericRatio ? Math.round(calculatedWidth / numericRatio) : (targetWidth === 1920 ? 1080 : undefined));

  return (
    <div className="space-y-3">
      {label && (
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          {label}
        </label>
      )}

      {/* 1. SELEÇÃO DO TIPO DE FUNDO (BOTÕES INLINE) */}
      <div className="space-y-1.5">
        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
          Tipo de Fundo
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'none', label: 'Transparente', icon: X },
            { id: 'color', label: 'Cor / Gradiente', icon: Droplet },
            { id: 'image', label: 'Imagem', icon: ImageIcon },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = item.id === 'color'
              ? (bgType === 'color' || bgType === 'gradient')
              : bgType === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'none') {
                    onChange({ ...background, type: 'none' });
                  } else if (item.id === 'color') {
                    const activeVal = background.gradientString || background.color;
                    const isGrad = typeof activeVal === 'string' && activeVal.includes('gradient');
                    onChange({ ...background, type: isGrad ? 'gradient' : 'color' });
                  } else {
                    onChange({ ...background, type: 'image' });
                  }
                }}
                className={`py-1.5 px-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] font-bold shadow-sm'
                    : 'border-[var(--surface-border)] text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[9px] truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CONTROLES ESPECÍFICOS DO TIPO DE FUNDO */}
      {(bgType === 'color' || bgType === 'gradient') && (
        <div className="pt-1">
          <GlobalColorPicker
            label="Cor ou Gradiente de Fundo"
            value={background.gradientString || background.color || 'transparent'}
            onChange={(val) => {
              const isGrad = typeof val === 'string' && val.includes('gradient');
              onChange({
                ...background,
                type: isGrad ? 'gradient' : 'color',
                color: val,
                gradientString: isGrad ? val : undefined,
              });
            }}
            page={page}
            canvasData={canvasData}
          />
        </div>
      )}

      {bgType === 'image' && (
        <div className="space-y-2.5 pt-1">
          <ImageUploader
            label="Imagem de Fundo"
            value={background.imageUrl || ''}
            onChange={(url: string) => onChange({ ...background, imageUrl: url })}
            tenantId={tenantId}
            targetWidth={calculatedWidth}
            targetHeight={calculatedHeight}
            aspectRatio={numericRatio}
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase block">Ajuste da Imagem</label>
              <Select
                value={background.imageSize || 'cover'}
                onChange={(e) => onChange({ ...background, imageSize: e.target.value as any })}
                options={[
                  { value: 'cover', label: 'Preencher (Cover)' },
                  { value: 'contain', label: 'Ajustar (Contain)' },
                  { value: 'auto', label: 'Original' },
                ]}
                variant="glass"
              />
            </div>

            <GlobalColorPicker
              label="Sobreposição"
              value={background.imageOverlayColor || 'rgba(0,0,0,0.4)'}
              onChange={(val) => onChange({ ...background, imageOverlayColor: val })}
              page={page}
            />
          </div>
        </div>
      )}

      {/* 3. DESFOQUE DE FUNDO (BACKDROP BLUR / GLASSMORPHISM) */}
      <div className="space-y-1.5 pt-1 border-t border-[var(--surface-border)]">
        <div className="flex items-center justify-between">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sliders className="w-3 h-3 text-[var(--brand-gradient-start)]" />
            Desfoque (Glassmorphism Blur)
          </label>
          <span className="text-[9px] font-mono font-bold text-[var(--brand-gradient-start)]">
            {backdropBlur}
          </span>
        </div>

        <SliderNumberInput
          value={backdropBlur}
          onChange={(val) => onChange({ ...background, backdropBlur: val })}
          min={0}
          max={40}
          defaultUnit="px"
        />
      </div>
    </div>
  );
}
