'use client';

import React, { useState } from 'react';
import { ComponentStyle, ComponentEffect, EffectType, ComponentEffectParams } from '../../types';
import { Select } from '@psi/ui';
import {
  Sparkles,
  Maximize2,
  Move,
  RotateCw,
  Eye,
  Sun,
  Zap,
  ChevronDown,
  MousePointerClick,
  Plus,
  Trash2,
  Layers,
} from 'lucide-react';
import { SliderNumberInput } from './SliderNumberInput';
import { GlobalColorPicker } from './GlobalColorPicker';
import { ParallaxControl } from './ParallaxControl';

interface EffectsControlProps {
  style: ComponentStyle;
  isHoverTab?: boolean;
  onChangeStyle: (key: keyof ComponentStyle, value: any) => void;
  page?: any;
  canvasData?: any;
}

interface EffectCategoryMeta {
  type: EffectType;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  badgeText: (params?: ComponentEffectParams) => string;
}

const EFFECT_CATEGORIES: EffectCategoryMeta[] = [
  {
    type: 'shadow',
    label: 'Sombra',
    description: 'Sombra de projeção ou brilho neon',
    icon: Sparkles,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    badgeText: (p) => (p?.inset ? 'Interna' : `${p?.blur || 16}px Blur`),
  },
  {
    type: 'scale',
    label: 'Escala / Zoom',
    description: 'Aumento ou redução de tamanho',
    icon: Maximize2,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    badgeText: (p) => `${p?.scaleX !== undefined ? p.scaleX : 1.05}x`,
  },
  {
    type: 'translate',
    label: 'Deslocamento',
    description: 'Elevação ou deslocamento X/Y',
    icon: Move,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    badgeText: (p) => `X: ${p?.translateX || 0}, Y: ${p?.translateY || 0}`,
  },
  {
    type: 'rotate',
    label: 'Rotação',
    description: 'Giro e inclinação de ângulo',
    icon: RotateCw,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    badgeText: (p) => `${p?.angle || 0}°`,
  },
  {
    type: 'opacity',
    label: 'Opacidade',
    description: 'Nível de transparência do elemento',
    icon: Eye,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/20',
    badgeText: (p) => `${p?.opacity !== undefined ? p.opacity : 100}%`,
  },
  {
    type: 'blur',
    label: 'Desfocagem',
    description: 'Desfocar o elemento ou fundo glass',
    icon: Sun,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10 border-rose-500/20',
    badgeText: (p) => `${p?.blurRadius || 8}px (${p?.blurTarget === 'backdrop' ? 'Backdrop' : 'Filter'})`,
  },
  {
    type: 'skew',
    label: 'Inclinação',
    description: 'Distorção e perspectiva X/Y',
    icon: Zap,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/20',
    badgeText: (p) => `X: ${p?.skewX || 0}°, Y: ${p?.skewY || 0}°`,
  },
];

const DEFAULT_PARAMS: Record<EffectType, ComponentEffectParams> = {
  shadow: {
    preset: 'custom',
    offsetX: 0,
    offsetY: 8,
    blur: 16,
    spread: 0,
    color: 'rgba(0, 0, 0, 0.15)',
    inset: false,
  },
  scale: {
    scaleX: 1.05,
    scaleY: 1.05,
    uniform: true,
  },
  translate: {
    translateX: '0px',
    translateY: '-4px',
  },
  rotate: {
    angle: 0,
  },
  opacity: {
    opacity: 100,
  },
  blur: {
    blurRadius: 8,
    blurTarget: 'filter',
  },
  skew: {
    skewX: 0,
    skewY: 0,
  },
};

export function EffectsControl({
  style,
  isHoverTab = false,
  onChangeStyle,
  page,
  canvasData,
}: EffectsControlProps) {
  const effects: ComponentEffect[] = Array.isArray(style.effects) ? style.effects : [];
  const [openCategory, setOpenCategory] = useState<EffectType | null>(null);

  const updateEffects = (newEffects: ComponentEffect[]) => {
    onChangeStyle('effects', newEffects.length > 0 ? newEffects : undefined);
  };

  const handleToggleCategory = (type: EffectType, e: React.MouseEvent) => {
    e.stopPropagation();

    const existingIndex = effects.findIndex((eff) => eff.type === type);

    if (existingIndex !== -1) {
      const currentEff = effects[existingIndex];
      const isCurrentlyEnabled = currentEff.enabled !== false;

      if (isCurrentlyEnabled) {
        // Toggle OFF: disable all of this type
        const updated = effects.map((eff) =>
          eff.type === type ? { ...eff, enabled: false } : eff
        );
        updateEffects(updated);
        if (openCategory === type) setOpenCategory(null);
      } else {
        // Toggle ON: re-enable
        const updated = effects.map((eff) =>
          eff.type === type ? { ...eff, enabled: true } : eff
        );
        updateEffects(updated);
        setOpenCategory(type);
      }
    } else {
      // Create new effect of this type & enable it
      const newId = `eff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const catMeta = EFFECT_CATEGORIES.find((c) => c.type === type);
      const newEff: ComponentEffect = {
        id: newId,
        type,
        enabled: true,
        name: catMeta?.label || type,
        params: { ...DEFAULT_PARAMS[type] },
      };
      updateEffects([...effects, newEff]);
      setOpenCategory(type);
    }
  };

  const handleHeaderClick = (type: EffectType, isEnabled: boolean) => {
    if (!isEnabled) return;
    setOpenCategory(openCategory === type ? null : type);
  };

  const handleUpdateParams = (effectId: string, patch: Partial<ComponentEffectParams>) => {
    updateEffects(
      effects.map((eff) =>
        eff.id === effectId
          ? {
              ...eff,
              params: { ...eff.params, ...patch },
            }
          : eff
      )
    );
  };

  const handleAddLayer = (type: EffectType, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = `eff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const catMeta = EFFECT_CATEGORIES.find((c) => c.type === type);
    const newEff: ComponentEffect = {
      id: newId,
      type,
      enabled: true,
      name: `${catMeta?.label || type} (Camada)`,
      params: { ...DEFAULT_PARAMS[type] },
    };
    updateEffects([...effects, newEff]);
    setOpenCategory(type);
  };

  const handleRemoveLayer = (effectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateEffects(effects.filter((eff) => eff.id !== effectId));
  };

  return (
    <div className="space-y-3 text-xs select-none">
      {/* Accordion list of all available effect categories */}
      <div className="space-y-2">
        {EFFECT_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const categoryEffects = effects.filter((eff) => eff.type === cat.type);
          const activeEffects = categoryEffects.filter((eff) => eff.enabled !== false);
          const isEnabled = activeEffects.length > 0;
          const primaryEff = activeEffects[0] || categoryEffects[0];
          const isOpen = openCategory === cat.type && isEnabled;

          return (
            <div
              key={cat.type}
              className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                isEnabled
                  ? isOpen
                    ? 'border-purple-500/60 bg-slate-900/90 shadow-lg shadow-purple-500/5'
                    : 'border-[var(--surface-border)] bg-slate-900/60 hover:bg-slate-900/80'
                  : 'border-[var(--surface-border)]/50 bg-slate-950/40 opacity-70 hover:opacity-100'
              }`}
            >
              {/* Category Header with Switch Toggle */}
              <div
                onClick={() => handleHeaderClick(cat.type, isEnabled)}
                className={`flex items-center justify-between p-2.5 ${
                  isEnabled ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  {/* Category Icon Badge */}
                  <div className={`p-1.5 rounded-lg shrink-0 ${cat.bgColor}`}>
                    <Icon className={`w-4 h-4 ${cat.color}`} />
                  </div>

                  {/* Title & Description */}
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isEnabled ? 'text-slate-100' : 'text-slate-400'}`}>
                        {cat.label}
                      </span>
                      {isEnabled && primaryEff && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {cat.badgeText(primaryEff.params)}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{cat.description}</p>
                  </div>
                </div>

                {/* Right side: Expand Chevron & Switch Toggle */}
                <div className="flex items-center gap-2 shrink-0">
                  {isEnabled && (
                    <button
                      type="button"
                      className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title={isOpen ? 'Recolher configurações' : 'Abrir configurações'}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-purple-400' : ''
                        }`}
                      />
                    </button>
                  )}

                  {/* Interruptor Switch Toggle */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleCategory(cat.type, e)}
                    className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      isEnabled ? 'bg-purple-600 shadow-xs shadow-purple-500/50' : 'bg-slate-700/80 hover:bg-slate-700'
                    }`}
                    title={isEnabled ? `Desativar ${cat.label}` : `Ativar ${cat.label}`}
                  >
                    <div
                      className={`w-3.5 h-3.5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                        isEnabled ? 'translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Collapsible Dropdown Settings Panel */}
              {isOpen && isEnabled && (
                <div className="p-3 border-t border-slate-800/80 space-y-4 bg-slate-950/50">
                  {categoryEffects.map((eff, index) => {
                    if (eff.enabled === false) return null;

                    return (
                      <div key={eff.id} className="space-y-3">
                        {/* Multi-layer subheader if more than 1 layer */}
                        {categoryEffects.length > 1 && (
                          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                            <span className="text-[10px] font-bold uppercase text-purple-400 flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              Camada #{index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleRemoveLayer(eff.id, e)}
                              className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors"
                              title="Remover camada"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* 1. SHADOW CONTROLS */}
                        {cat.type === 'shadow' && (
                          <div className="space-y-2.5">
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 font-bold uppercase">
                                Preset de Sombra
                              </label>
                              <Select
                                value={eff.params.preset || 'custom'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === 'soft') {
                                    handleUpdateParams(eff.id, { preset: 'soft', offsetX: 0, offsetY: 4, blur: 12, spread: 0, color: 'rgba(0,0,0,0.08)', inset: false });
                                  } else if (val === 'medium') {
                                    handleUpdateParams(eff.id, { preset: 'medium', offsetX: 0, offsetY: 10, blur: 25, spread: -5, color: 'rgba(0,0,0,0.15)', inset: false });
                                  } else if (val === 'strong') {
                                    handleUpdateParams(eff.id, { preset: 'strong', offsetX: 0, offsetY: 20, blur: 35, spread: -10, color: 'rgba(0,0,0,0.25)', inset: false });
                                  } else if (val === 'glow') {
                                    handleUpdateParams(eff.id, { preset: 'glow', offsetX: 0, offsetY: 0, blur: 20, spread: 0, color: 'rgba(79, 70, 229, 0.4)', inset: false });
                                  } else {
                                    handleUpdateParams(eff.id, { preset: 'custom' });
                                  }
                                }}
                                options={[
                                  { value: 'custom', label: '🎛️ Personalizada' },
                                  { value: 'soft', label: '☁️ Sombra Suave (Soft)' },
                                  { value: 'medium', label: '🚀 Elevação Média (Medium)' },
                                  { value: 'strong', label: '🌑 Sombra Forte (Strong)' },
                                  { value: 'glow', label: '💜 Brilho Neon Glow' },
                                ]}
                                variant="glass"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                                Offset X (Horizontal)
                              </label>
                              <SliderNumberInput
                                value={eff.params.offsetX !== undefined ? `${eff.params.offsetX}px` : '0px'}
                                onChange={(val) => {
                                  const num = parseFloat(val) || 0;
                                  handleUpdateParams(eff.id, { offsetX: num, preset: 'custom' });
                                }}
                                min={-100}
                                max={100}
                                step={1}
                                defaultUnit="px"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                                Offset Y (Vertical)
                              </label>
                              <SliderNumberInput
                                value={eff.params.offsetY !== undefined ? `${eff.params.offsetY}px` : '8px'}
                                onChange={(val) => {
                                  const num = parseFloat(val) || 0;
                                  handleUpdateParams(eff.id, { offsetY: num, preset: 'custom' });
                                }}
                                min={-100}
                                max={100}
                                step={1}
                                defaultUnit="px"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                                Desfocagem (Blur)
                              </label>
                              <SliderNumberInput
                                value={eff.params.blur !== undefined ? `${eff.params.blur}px` : '16px'}
                                onChange={(val) => {
                                  const num = parseFloat(val) || 0;
                                  handleUpdateParams(eff.id, { blur: Math.max(0, num), preset: 'custom' });
                                }}
                                min={0}
                                max={100}
                                step={1}
                                defaultUnit="px"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                                Expansão (Spread)
                              </label>
                              <SliderNumberInput
                                value={eff.params.spread !== undefined ? `${eff.params.spread}px` : '0px'}
                                onChange={(val) => {
                                  const num = parseFloat(val) || 0;
                                  handleUpdateParams(eff.id, { spread: num, preset: 'custom' });
                                }}
                                min={-50}
                                max={50}
                                step={1}
                                defaultUnit="px"
                              />
                            </div>

                            <div className="pt-1">
                              <GlobalColorPicker
                                label="Cor da Sombra"
                                value={eff.params.color || 'rgba(0, 0, 0, 0.15)'}
                                onChange={(col) => handleUpdateParams(eff.id, { color: col, preset: 'custom' })}
                                allowTransparent={true}
                                page={page}
                                canvasData={canvasData}
                              />
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">
                                Sombra Interna (Inset)
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateParams(eff.id, { inset: !eff.params.inset, preset: 'custom' })}
                                className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                  eff.params.inset ? 'bg-purple-600' : 'bg-slate-700'
                                }`}
                              >
                                <div
                                  className={`w-3 h-3 bg-white rounded-full transition-transform ${
                                    eff.params.inset ? 'translate-x-3' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 2. SCALE CONTROLS */}
                        {cat.type === 'scale' && (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">
                                Proporção Uniforme
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateParams(eff.id, { uniform: eff.params.uniform === false })}
                                className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                  eff.params.uniform !== false ? 'bg-purple-600' : 'bg-slate-700'
                                }`}
                              >
                                <div
                                  className={`w-3 h-3 bg-white rounded-full transition-transform ${
                                    eff.params.uniform !== false ? 'translate-x-3' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                                Escala X {eff.params.uniform !== false ? '(Geral)' : ''}
                              </label>
                              <SliderNumberInput
                                value={eff.params.scaleX !== undefined ? eff.params.scaleX : 1.05}
                                onChange={(val) => {
                                  const num = parseFloat(val) || 1;
                                  if (eff.params.uniform !== false) {
                                    handleUpdateParams(eff.id, { scaleX: num, scaleY: num });
                                  } else {
                                    handleUpdateParams(eff.id, { scaleX: num });
                                  }
                                }}
                                min={0.1}
                                max={3.0}
                                step={0.05}
                                defaultUnit=""
                                unitOptions={['']}
                              />
                            </div>

                            {eff.params.uniform === false && (
                              <div>
                                <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                                  Escala Y
                                </label>
                                <SliderNumberInput
                                  value={eff.params.scaleY !== undefined ? eff.params.scaleY : 1.05}
                                  onChange={(val) => {
                                    const num = parseFloat(val) || 1;
                                    handleUpdateParams(eff.id, { scaleY: num });
                                  }}
                                  min={0.1}
                                  max={3.0}
                                  step={0.05}
                                  defaultUnit=""
                                  unitOptions={['']}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* 3. TRANSLATE CONTROLS */}
                        {cat.type === 'translate' && (
                          <div className="space-y-2.5">
                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                                Deslocamento X (Horizontal)
                              </label>
                              <SliderNumberInput
                                value={eff.params.translateX || '0px'}
                                onChange={(val) => handleUpdateParams(eff.id, { translateX: val })}
                                min={-200}
                                max={200}
                                step={1}
                                defaultUnit="px"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                                Deslocamento Y (Vertical)
                              </label>
                              <SliderNumberInput
                                value={eff.params.translateY || '0px'}
                                onChange={(val) => handleUpdateParams(eff.id, { translateY: val })}
                                min={-200}
                                max={200}
                                step={1}
                                defaultUnit="px"
                              />
                            </div>
                          </div>
                        )}

                        {/* 4. ROTATE CONTROLS */}
                        {cat.type === 'rotate' && (
                          <div className="space-y-2.5">
                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                                Ângulo de Rotação
                              </label>
                              <SliderNumberInput
                                value={eff.params.angle !== undefined ? `${eff.params.angle}deg` : '0deg'}
                                onChange={(val) => {
                                  const num = parseFloat(val) || 0;
                                  handleUpdateParams(eff.id, { angle: num });
                                }}
                                min={-180}
                                max={180}
                                step={1}
                                defaultUnit="deg"
                                unitOptions={['deg']}
                              />
                            </div>
                          </div>
                        )}

                        {/* 5. OPACITY CONTROLS */}
                        {cat.type === 'opacity' && (
                          <div className="space-y-2.5">
                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                                Nível de Opacidade
                              </label>
                              <SliderNumberInput
                                value={eff.params.opacity !== undefined ? `${eff.params.opacity}%` : '100%'}
                                onChange={(val) => {
                                  const num = parseFloat(val);
                                  handleUpdateParams(eff.id, { opacity: isNaN(num) ? 100 : Math.min(100, Math.max(0, num)) });
                                }}
                                min={0}
                                max={100}
                                step={1}
                                defaultUnit="%"
                                unitOptions={['%']}
                              />
                            </div>
                          </div>
                        )}

                        {/* 6. BLUR CONTROLS */}
                        {cat.type === 'blur' && (
                          <div className="space-y-2.5">
                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                                Alvo da Desfocagem
                              </label>
                              <Select
                                value={eff.params.blurTarget || 'filter'}
                                onChange={(e) => handleUpdateParams(eff.id, { blurTarget: e.target.value as any })}
                                options={[
                                  { value: 'filter', label: '🎨 Filtro do Elemento (filter: blur)' },
                                  { value: 'backdrop', label: '🔍 Fundo Transparente (backdrop-filter: blur)' },
                                ]}
                                variant="glass"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                                Raio de Blur
                              </label>
                              <SliderNumberInput
                                value={eff.params.blurRadius !== undefined ? `${eff.params.blurRadius}px` : '8px'}
                                onChange={(val) => {
                                  const num = parseFloat(val) || 0;
                                  handleUpdateParams(eff.id, { blurRadius: Math.max(0, num) });
                                }}
                                min={0}
                                max={50}
                                step={1}
                                defaultUnit="px"
                              />
                            </div>
                          </div>
                        )}

                        {/* 7. SKEW CONTROLS */}
                        {cat.type === 'skew' && (
                          <div className="space-y-2.5">
                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                                Inclinação X (Skew X)
                              </label>
                              <SliderNumberInput
                                value={eff.params.skewX !== undefined ? `${eff.params.skewX}deg` : '0deg'}
                                onChange={(val) => {
                                  const num = parseFloat(val) || 0;
                                  handleUpdateParams(eff.id, { skewX: num });
                                }}
                                min={-45}
                                max={45}
                                step={1}
                                defaultUnit="deg"
                                unitOptions={['deg']}
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                                Inclinação Y (Skew Y)
                              </label>
                              <SliderNumberInput
                                value={eff.params.skewY !== undefined ? `${eff.params.skewY}deg` : '0deg'}
                                onChange={(val) => {
                                  const num = parseFloat(val) || 0;
                                  handleUpdateParams(eff.id, { skewY: num });
                                }}
                                min={-45}
                                max={45}
                                step={1}
                                defaultUnit="deg"
                                unitOptions={['deg']}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add Layer button for multi-shadows */}
                  {cat.type === 'shadow' && (
                    <button
                      type="button"
                      onClick={(e) => handleAddLayer('shadow', e)}
                      className="w-full py-1.5 px-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Adicionar outra camada de sombra
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Auxiliary Controls: Cursor do Mouse & Parallax */}
      <div className="space-y-3 pt-3 border-t border-[var(--surface-border)]/60">
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
            <MousePointerClick className="w-3 h-3 text-pink-400" />
            Cursor do Mouse (Cursor)
          </label>
          <Select
            value={style.cursor || ''}
            onChange={(e) => onChangeStyle('cursor', e.target.value || undefined)}
            options={[
              { value: '', label: '⚡ Padrão / Automático' },
              { value: 'pointer', label: '👆 Ponteiro (Mãozinha / Clicável)' },
              { value: 'default', label: '🏹 Seta (Default)' },
              { value: 'text', label: '✍️ Seleção de Texto (I-Beam)' },
              { value: 'not-allowed', label: '🚫 Não Permitido (Proibido)' },
              { value: 'grab', label: '✊ Arrastar (Mãozinha Fechada)' },
            ]}
            variant="glass"
          />
        </div>

        {!isHoverTab && (
          <ParallaxControl
            parallaxSpeed={style.parallaxSpeed}
            disableParallaxMobile={style.disableParallaxMobile}
            onChangeSpeed={(speed) => onChangeStyle('parallaxSpeed', speed)}
            onChangeDisableMobile={(disable) => onChangeStyle('disableParallaxMobile', disable)}
          />
        )}
      </div>
    </div>
  );
}
