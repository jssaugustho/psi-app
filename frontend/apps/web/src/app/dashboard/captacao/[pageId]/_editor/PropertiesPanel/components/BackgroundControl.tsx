'use client';

import React, { useState } from 'react';
import { GlobalColorPicker } from './GlobalColorPicker';
import { SliderNumberInput } from './SliderNumberInput';
import { Input, Button, Select } from '@psi/ui';
import { Palette, X, Sparkles, Image as ImageIcon, Sliders, Eye, Droplet } from 'lucide-react';

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
}

export function BackgroundControl({
  label = 'Fundo & Efeitos de Vidro',
  background,
  onChange,
  page,
  canvasData,
}: BackgroundControlProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const bgType = background.type || 'none';
  const color = background.color || '';
  const backdropBlur = background.backdropBlur || '0px';

  // Resolver preview background CSS
  const getPreviewBackgroundCss = () => {
    if (bgType === 'none') return 'transparent';
    if (bgType === 'color') return color || 'transparent';
    if (bgType === 'gradient') return background.gradientString || color || 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)';
    if (bgType === 'image') return background.imageUrl ? `url(${background.imageUrl})` : 'transparent';
    return color || 'transparent';
  };

  const previewCss = getPreviewBackgroundCss();

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          {label}
        </label>
      )}

      {/* Card Resumo do Fundo + Botão para Abrir Modal */}
      <div className="p-3 rounded-2xl border border-[var(--surface-border)] glass-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Swatch de Fundo com Suporte a Efeito Grid se Transparente */}
            <div
              className="w-7 h-7 rounded-lg border border-black/10 dark:border-white/20 shadow-inner relative overflow-hidden flex items-center justify-center shrink-0"
              style={{
                background: previewCss,
                backgroundImage: bgType === 'none' || color === 'transparent'
                  ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                  : bgType === 'image' && background.imageUrl
                  ? `url(${background.imageUrl})`
                  : previewCss,
                backgroundSize: bgType === 'none' || color === 'transparent' ? '6px 6px' : 'cover',
              }}
            >
              {bgType === 'none' && <span className="text-[9px] font-bold text-red-500">✕</span>}
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
                {bgType === 'none' ? 'Transparente' : bgType === 'color' ? 'Cor Sólida' : bgType === 'gradient' ? 'Gradiente' : 'Imagem'}
              </span>
              <span className="text-[9px] text-slate-400 font-mono">
                {backdropBlur && backdropBlur !== '0px' ? `Blur: ${backdropBlur}` : 'Sem desfoque'}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsModalOpen(true)}
            className="text-[10px] font-bold px-3 py-1.5 h-auto rounded-xl border-[var(--brand-gradient-start)]/30 text-[var(--brand-gradient-start)] hover:bg-[var(--brand-gradient-start)]/10 flex items-center gap-1.5 cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5" />
            Editar Fundo
          </Button>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO DE FUNDO & EFEITOS DE VIDRO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-modal w-full max-w-xl rounded-3xl border border-[var(--surface-border)] shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar relative brand-modal text-white">
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--brand-gradient-start)]/20 text-[var(--brand-gradient-start)] border border-[var(--brand-gradient-start)]/30">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Edição de Fundo & Efeitos de Vidro</h3>
                  <p className="text-[11px] text-slate-400">Configure cores, gradientes, transparência e desfoque de fundo (Glassmorphism).</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* LIVE PREVIEW BOX */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-purple-400" />
                Pré-visualização do Fundo (Live Preview)
              </span>
              <div className="w-full h-32 rounded-2xl border border-white/20 relative overflow-hidden flex items-center justify-center p-4 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]">
                {/* Elemento de Fundo Simulado */}
                <div
                  className="w-full h-full rounded-xl border border-white/20 p-4 flex flex-col justify-center items-center text-center shadow-lg transition-all"
                  style={{
                    background: previewCss,
                    backgroundImage: bgType === 'image' && background.imageUrl
                      ? `linear-gradient(${background.imageOverlayColor || 'transparent'}, ${background.imageOverlayColor || 'transparent'}), url(${background.imageUrl})`
                      : previewCss.includes('gradient')
                      ? previewCss
                      : undefined,
                    backgroundSize: background.imageSize || 'cover',
                    backdropFilter: backdropBlur && backdropBlur !== '0px' ? `blur(${backdropBlur})` : undefined,
                    WebkitBackdropFilter: backdropBlur && backdropBlur !== '0px' ? `blur(${backdropBlur})` : undefined,
                  }}
                >
                  <span className="text-xs font-bold text-white drop-shadow-md">Texto de Exemplo no Container</span>
                  <span className="text-[10px] text-white/80 drop-shadow-sm">Demonstração de cor, transparência e desfoque de vidro</span>
                </div>
              </div>
            </div>

            {/* 1. SELEÇÃO DO TIPO DE FUNDO */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Tipo de Fundo
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'none', label: 'Transparente', icon: X },
                  { id: 'color', label: 'Cor / Alfa', icon: Droplet },
                  { id: 'gradient', label: 'Gradiente', icon: Sparkles },
                  { id: 'image', label: 'Imagem', icon: ImageIcon },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = bgType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onChange({ ...background, type: item.id as any })}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/20 text-purple-400 font-bold shadow-md'
                          : 'border-white/10 text-slate-400 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. CONFIGURAÇÃO DEPENDENDO DO TIPO DE FUNDO */}
            {bgType === 'color' && (
              <div className="space-y-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                <GlobalColorPicker
                  label="Cor de Fundo com Transparência"
                  value={color || '#FFFFFF'}
                  onChange={(val) => onChange({ ...background, color: val })}
                  page={page}
                  canvasData={canvasData}
                />
              </div>
            )}

            {bgType === 'gradient' && (
              <div className="space-y-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                <GlobalColorPicker
                  label="Seletor de Gradiente"
                  value={background.gradientString || color || 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)'}
                  onChange={(val) => onChange({ ...background, gradientString: val, color: val })}
                  page={page}
                  canvasData={canvasData}
                />
              </div>
            )}

            {bgType === 'image' && (
              <div className="space-y-3 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">URL da Imagem de Fundo</label>
                  <Input
                    type="text"
                    value={background.imageUrl || ''}
                    onChange={(e) => onChange({ ...background, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Ajuste da Imagem</label>
                    <Select
                      value={background.imageSize || 'cover'}
                      onChange={(e) => onChange({ ...background, imageSize: e.target.value as any })}
                      options={[
                        { value: 'cover', label: 'Preencher (Cover)' },
                        { value: 'contain', label: 'Ajustar (Contain)' },
                        { value: 'auto', label: 'Tamanho Original' },
                      ]}
                      variant="glass"
                    />
                  </div>

                  <div className="space-y-1">
                    <GlobalColorPicker
                      label="Cor de Sobreposição (Overlay)"
                      value={background.imageOverlayColor || 'rgba(0,0,0,0.4)'}
                      onChange={(val) => onChange({ ...background, imageOverlayColor: val })}
                      page={page}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. DESFOQUE DE FUNDO (BACKDROP BLUR / GLASSMORPHISM) */}
            <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-400" />
                  Desfoque de Fundo (Backdrop Blur - Efeito de Vidro)
                </span>
                <span className="text-[10px] font-mono font-bold text-purple-400">{backdropBlur}</span>
              </div>

              {/* Presets de Desfoque */}
              <div className="grid grid-cols-6 gap-1.5">
                {[
                  { label: '0px', val: '0px' },
                  { label: '4px', val: '4px' },
                  { label: '8px', val: '8px' },
                  { label: '12px', val: '12px' },
                  { label: '20px', val: '20px' },
                  { label: '32px', val: '32px' },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => onChange({ ...background, backdropBlur: preset.val })}
                    className={`py-1.5 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      backdropBlur === preset.val
                        ? 'border-purple-500 bg-purple-500/30 text-purple-300 font-bold'
                        : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <SliderNumberInput
                value={backdropBlur}
                onChange={(val) => onChange({ ...background, backdropBlur: val })}
                min={0}
                max={40}
                defaultUnit="px"
              />
            </div>

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-lg"
              >
                Concluir & Aplicar Fundo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
