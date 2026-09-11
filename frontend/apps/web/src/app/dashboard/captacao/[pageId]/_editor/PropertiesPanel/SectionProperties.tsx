'use client';

import React from 'react';
import { Section, ViewportMode } from '../types';
import { Input, Button, Select } from '@psi/ui';
import {
  Trash2,
  ArrowLeft,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  MoveHorizontal,
  MoveVertical,
  Eye,
  EyeOff
} from 'lucide-react';
import { SizeControl } from './components/SizeControl';
import { BorderControl } from './components/BorderControl';
import { SliderNumberInput } from './components/SliderNumberInput';
import { GlobalColorPicker } from './components/GlobalColorPicker';
import { BackgroundControl } from './components/BackgroundControl';

interface SectionPropertiesProps {
  section: Section;
  viewportMode?: ViewportMode;
  page?: any;
  onUpdateSection: (id: string, patch: Partial<Section>) => void;
  onRemoveSection: (id: string) => void;
  onDeselect?: () => void;
}

export function SectionProperties({
  section,
  viewportMode = 'desktop',
  page,
  onUpdateSection,
  onRemoveSection,
  onDeselect,
}: SectionPropertiesProps) {
  const isMobile = viewportMode === 'mobile';

  const effectiveLayout = isMobile
    ? { ...section.layout, ...(section.mobile || {}) }
    : section.layout;
  const effectiveBorder = isMobile
    ? { ...(section.border || {}), ...(section.mobile?.border || {}) }
    : (section.border || {});
  const isHidden = isMobile ? (section.mobile?.hidden ?? section.hidden ?? false) : (section.hidden ?? false);

  const bg = section.background;
  const isHorizontal = effectiveLayout.flexDirection === 'row';

  const handleLayoutChange = (key: string, value: any) => {
    if (isMobile) {
      onUpdateSection(section.id, {
        mobile: {
          ...(section.mobile || {}),
          [key]: value,
        },
      });
    } else {
      onUpdateSection(section.id, {
        layout: {
          ...section.layout,
          [key]: value,
        },
      });
    }
  };

  const handleMultiLayoutChange = (patch: Record<string, any>) => {
    if (isMobile) {
      onUpdateSection(section.id, {
        mobile: {
          ...(section.mobile || {}),
          ...patch,
        },
      });
    } else {
      onUpdateSection(section.id, {
        layout: {
          ...section.layout,
          ...patch,
        },
      });
    }
  };

  const handleBorderChange = (key: string, value: any) => {
    if (isMobile) {
      onUpdateSection(section.id, {
        mobile: {
          ...(section.mobile || {}),
          border: {
            ...(section.mobile?.border || section.border || {}),
            [key]: value,
          },
        },
      });
    } else {
      onUpdateSection(section.id, {
        border: {
          ...(section.border || {}),
          [key]: value,
        },
      });
    }
  };

  const handleToggleVisibility = () => {
    if (isMobile) {
      onUpdateSection(section.id, {
        mobile: {
          ...(section.mobile || {}),
          hidden: !isHidden,
        },
      });
    } else {
      onUpdateSection(section.id, { hidden: !isHidden });
    }
  };

  const handleBgChange = (key: keyof typeof bg, value: any) => {
    onUpdateSection(section.id, {
      background: {
        ...bg,
        [key]: value,
      },
    });
  };

  const handleDelete = () => {
    onRemoveSection(section.id);
    if (onDeselect) onDeselect();
  };

  return (
    <div className="flex flex-col h-full text-xs select-none">
      <div className="p-3 border-b border-[var(--surface-border)] flex items-center justify-between glass-sm">
        <button
          type="button"
          onClick={onDeselect}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[var(--brand-gradient-start)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Elementos</span>
        </button>

        <div className="flex items-center gap-1.5">
          {isMobile && (
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
              📱 Mobile
            </span>
          )}
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] border border-[var(--brand-gradient-start)]/20">
            Seção
          </span>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-5 overflow-y-auto custom-scrollbar">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Nome da Seção</label>
          <Input
            type="text"
            value={section.label || ''}
            onChange={(e) => onUpdateSection(section.id, { label: e.target.value })}
            className="text-xs"
            placeholder="Ex: Hero Principal, Sobre Mim, Depoimentos"
          />
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--surface-border)] glass-sm">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Visibilidade da Seção</span>
          <button
            type="button"
            onClick={handleToggleVisibility}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              isHidden
                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
            }`}
          >
            {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isHidden ? 'Oculto' : 'Visível'}</span>
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Organização dos Elementos</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleLayoutChange('flexDirection', 'row')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer transition-all ${
                isHorizontal
                  ? 'border-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)]'
                  : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
              }`}
            >
              <MoveHorizontal className="w-4 h-4" />
              <span>Lado a Lado</span>
            </button>
            <button
              type="button"
              onClick={() => handleLayoutChange('flexDirection', 'column')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer transition-all ${
                !isHorizontal
                  ? 'border-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)]'
                  : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
              }`}
            >
              <MoveVertical className="w-4 h-4" />
              <span>Empilhado</span>
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">
            {isHorizontal ? 'Alinhamento Horizontal' : 'Alinhamento Vertical'}
          </label>
          <div className="grid grid-cols-4 gap-1">
            {[
              { value: 'flex-start', label: isHorizontal ? 'Esquerda' : 'Topo' },
              { value: 'center', label: 'Centro' },
              { value: 'flex-end', label: isHorizontal ? 'Direita' : 'Base' },
              { value: 'space-between', label: 'Espaçado' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => handleLayoutChange('justifyContent', item.value)}
                className={`py-2 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                  (effectiveLayout.justifyContent || 'flex-start') === item.value
                    ? 'border-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)]'
                    : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">
            {isHorizontal ? 'Alinhamento Vertical dos Elementos' : 'Alinhamento Horizontal dos Elementos'}
          </label>
          <div className="grid grid-cols-4 gap-1">
            {[
              { value: 'flex-start', label: isHorizontal ? 'Topo' : 'Esquerda' },
              { value: 'center', label: 'Centro' },
              { value: 'flex-end', label: isHorizontal ? 'Base' : 'Direita' },
              { value: 'stretch', label: 'Esticar' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => handleLayoutChange('alignItems', item.value)}
                className={`py-2 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                  (effectiveLayout.alignItems || 'flex-start') === item.value
                    ? 'border-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)]'
                    : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Alinhamento do Texto na Seção</label>
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
                  onClick={() => handleLayoutChange('textAlign', item.value)}
                  className={`p-2 rounded-lg border flex items-center justify-center cursor-pointer transition-all ${
                    effectiveLayout.textAlign === item.value
                      ? 'border-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)]'
                      : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Largura Máxima do Conteúdo</label>
          <div className="grid grid-cols-4 gap-1">
            {[
              { label: 'Padrão (1200px)', val: '1200px' },
              { label: 'Larga (1400px)', val: '1400px' },
              { label: 'Estreita (800px)', val: '800px' },
              { label: 'Tela Cheia (100%)', val: '100%' },
            ].map((preset) => (
              <button
                key={preset.val}
                type="button"
                onClick={() => {
                  handleMultiLayoutChange({
                    maxContentWidth: preset.val,
                    fullWidth: preset.val === '100%',
                  });
                }}
                className={`py-1.5 px-1 text-[9px] font-bold rounded-lg border cursor-pointer transition-all ${
                  effectiveLayout.maxContentWidth === preset.val || (preset.val === '100%' && effectiveLayout.fullWidth)
                    ? 'border-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)]'
                    : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <SliderNumberInput
            value={effectiveLayout.maxContentWidth || '1200px'}
            onChange={(w) => {
              handleMultiLayoutChange({
                maxContentWidth: w,
                fullWidth: w === '100%',
              });
            }}
            min={400}
            max={1800}
            defaultUnit="px"
            className="mt-1"
          />
        </div>

        <BorderControl
          borderStyle={effectiveBorder.borderStyle || (section.border?.style as any) || 'none'}
          borderWidth={effectiveBorder.borderWidth || section.border?.borderWidth || section.border?.topWidth || '1px'}
          borderColor={effectiveBorder.borderColor || section.border?.color || '#E2E8F0'}
          borderRadius={effectiveBorder.borderRadius || section.border?.radiusTopLeft || '0px'}
          page={page}
          onChangeBorderStyle={(style) => handleBorderChange('borderStyle', style)}
          onChangeBorderWidth={(w) => handleBorderChange('borderWidth', w)}
          onChangeBorderColor={(c) => handleBorderChange('borderColor', c)}
          onChangeBorderRadius={(r) => handleBorderChange('borderRadius', r)}
        />

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Espaço entre Elementos (Gap)</label>
          <SliderNumberInput
            value={effectiveLayout.gap || '24px'}
            onChange={(val) => handleLayoutChange('gap', val)}
            min={0}
            max={120}
            defaultUnit="px"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Altura Interna (Padding Topo / Base)</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 font-semibold">Topo</span>
              <SliderNumberInput
                value={effectiveLayout.paddingTop || '60px'}
                onChange={(val) => handleLayoutChange('paddingTop', val)}
                min={0}
                max={250}
                defaultUnit="px"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 font-semibold">Base</span>
              <SliderNumberInput
                value={effectiveLayout.paddingBottom || '60px'}
                onChange={(val) => handleLayoutChange('paddingBottom', val)}
                min={0}
                max={250}
                defaultUnit="px"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Recuo Lateral (Padding Esquerda / Direita)</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 font-semibold">Esquerda</span>
              <SliderNumberInput
                value={effectiveLayout.paddingLeft || '24px'}
                onChange={(val) => handleLayoutChange('paddingLeft', val)}
                min={0}
                max={200}
                defaultUnit="px"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 font-semibold">Direita</span>
              <SliderNumberInput
                value={effectiveLayout.paddingRight || '24px'}
                onChange={(val) => handleLayoutChange('paddingRight', val)}
                min={0}
                max={200}
                defaultUnit="px"
              />
            </div>
          </div>
        </div>

        {/* 🎨 FUNDO DA SEÇÃO & EFEITOS DE VIDRO */}
        <BackgroundControl
          label="Fundo da Seção & Efeitos de Vidro"
          background={bg}
          onChange={(patch) =>
            onUpdateSection(section.id, {
              background: {
                ...bg,
                ...patch,
              },
            })
          }
          page={page}
        />

        {/* 🚨 BOTÃO DE EXCLUSÃO PROMINENTE DA SEÇÃO E SEUS FILHOS */}
        <div className="pt-4 border-t border-[var(--surface-border)]">
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            className="w-full text-xs text-red-600 border-red-500/30 hover:bg-red-500/10 flex items-center justify-center gap-2 cursor-pointer font-bold py-2.5 rounded-xl"
          >
            <Trash2 className="w-4 h-4" />
            Excluir Seção e todos os filhos
          </Button>
        </div>
      </div>
    </div>
  );
}
