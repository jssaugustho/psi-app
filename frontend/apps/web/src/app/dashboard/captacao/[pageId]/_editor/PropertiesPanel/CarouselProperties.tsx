'use client';

import React from 'react';
import { CarouselComponent, ViewportMode } from '../types';
import { Input, Button, Select } from '@psi/ui';
import {
  Trash2,
  ArrowLeft,
  Eye,
  EyeOff,
  GalleryHorizontal,
  Plus,
  Sliders,
  Play,
  Maximize2,
  Palette,
  Square,
  Maximize,
  Layers,
  Edit3,
  Copy,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { SizeControl } from './components/SizeControl';
import { PaddingControl } from './components/PaddingControl';
import { BorderControl } from './components/BorderControl';
import { SliderNumberInput } from './components/SliderNumberInput';
import { GlobalColorPicker } from './components/GlobalColorPicker';
import { BackgroundControl } from './components/BackgroundControl';
import { AccordionItem } from './components/AccordionSection';
import { createDefaultDiv } from '../constants';

interface CarouselPropertiesProps {
  carouselComponent: CarouselComponent;
  viewportMode?: ViewportMode;
  page?: any;
  onUpdateComponent: (id: string, patch: Partial<CarouselComponent>) => void;
  onRemoveComponent: (id: string) => void;
  onAddComponent?: (parentId: string, comp: any) => void;
  onSelect?: (id: string, type: any) => void;
  onDeselect?: () => void;
}

export function CarouselProperties({
  carouselComponent,
  viewportMode = 'desktop',
  page,
  onUpdateComponent,
  onRemoveComponent,
  onAddComponent,
  onSelect,
  onDeselect,
}: CarouselPropertiesProps) {
  const isMobile = viewportMode === 'mobile';
  const props = carouselComponent.props || {};
  const effectiveProps = isMobile
    ? { ...props, ...(carouselComponent.mobile?.props || {}) }
    : props;

  const effectiveLayout = isMobile
    ? { ...carouselComponent.layout, ...(carouselComponent.mobile || {}) }
    : carouselComponent.layout;
  const effectiveBorder = isMobile
    ? { ...(carouselComponent.border || {}), ...(carouselComponent.mobile?.border || {}) }
    : (carouselComponent.border || {});
  const isHidden = isMobile
    ? (carouselComponent.mobile?.hidden ?? carouselComponent.hidden ?? false)
    : (carouselComponent.hidden ?? false);

  const slides = carouselComponent.components || [];

  const handlePropChange = (key: string, value: any) => {
    if (isMobile) {
      onUpdateComponent(carouselComponent.id, {
        mobile: {
          ...(carouselComponent.mobile || {}),
          props: {
            ...(carouselComponent.mobile?.props || {}),
            [key]: value,
          },
        },
      });
    } else {
      onUpdateComponent(carouselComponent.id, {
        props: {
          ...props,
          [key]: value,
        },
      });
    }
  };

  const handleLayoutChange = (key: string, value: any) => {
    if (isMobile) {
      onUpdateComponent(carouselComponent.id, {
        mobile: {
          ...(carouselComponent.mobile || {}),
          [key]: value,
        },
      });
    } else {
      onUpdateComponent(carouselComponent.id, {
        layout: {
          ...carouselComponent.layout,
          [key]: value,
        },
      });
    }
  };

  const handleMultiLayoutChange = (patch: Record<string, any>) => {
    if (isMobile) {
      onUpdateComponent(carouselComponent.id, {
        mobile: {
          ...(carouselComponent.mobile || {}),
          ...patch,
        },
      });
    } else {
      onUpdateComponent(carouselComponent.id, {
        layout: {
          ...carouselComponent.layout,
          ...patch,
        },
      });
    }
  };

  const handleBorderChange = (key: string, value: any) => {
    const stylePatchKeyMap: Record<string, string> = {
      borderStyle: 'borderStyle',
      borderWidth: 'borderWidth',
      borderColor: 'borderColor',
      borderRadius: 'borderRadius',
    };
    const styleKey = stylePatchKeyMap[key];

    if (isMobile) {
      onUpdateComponent(carouselComponent.id, {
        mobile: {
          ...(carouselComponent.mobile || {}),
          border: {
            ...(carouselComponent.mobile?.border || carouselComponent.border || {}),
            [key]: value,
          },
          ...(styleKey ? {
            style: {
              ...(carouselComponent.mobile?.style || carouselComponent.style || {}),
              [styleKey]: value,
            },
          } : {}),
        },
      });
    } else {
      onUpdateComponent(carouselComponent.id, {
        border: {
          ...(carouselComponent.border || {}),
          [key]: value,
        },
        ...(styleKey ? {
          style: {
            ...(carouselComponent.style || {}),
            [styleKey]: value,
          },
        } : {}),
      });
    }
  };

  const handleToggleVisibility = () => {
    if (isMobile) {
      onUpdateComponent(carouselComponent.id, {
        mobile: {
          ...(carouselComponent.mobile || {}),
          hidden: !isHidden,
        },
      });
    } else {
      onUpdateComponent(carouselComponent.id, { hidden: !isHidden });
    }
  };

  const handleAddSlide = () => {
    if (!onAddComponent) return;
    const newSlideNumber = slides.length + 1;
    const newSlide = createDefaultDiv(`Slide ${newSlideNumber}`);
    newSlide.layout = {
      ...newSlide.layout,
      width: '100%',
      paddingTop: '16px',
      paddingRight: '16px',
      paddingBottom: '16px',
      paddingLeft: '16px',
      gap: '12px',
    };
    newSlide.border = {
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: 'var(--surface-border)',
      borderRadius: '16px',
    };
    onAddComponent(carouselComponent.id, newSlide);
  };

  const handleDuplicateSlide = (index: number) => {
    const targetSlide = slides[index];
    if (!targetSlide) return;

    const clonedSlide = JSON.parse(JSON.stringify(targetSlide));
    clonedSlide.id = `div_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    clonedSlide.label = `Slide ${slides.length + 1}`;

    const reIdComponent = (c: any) => {
      c.id = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      if (c.components && Array.isArray(c.components)) {
        c.components.forEach(reIdComponent);
      }
    };
    if (clonedSlide.components) {
      clonedSlide.components.forEach(reIdComponent);
    }

    const newSlides = [...slides];
    newSlides.splice(index + 1, 0, clonedSlide);
    onUpdateComponent(carouselComponent.id, {
      components: newSlides as any,
    });
  };

  const handleMoveSlide = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= slides.length) return;
    const newSlides = [...slides];
    const [moved] = newSlides.splice(fromIndex, 1);
    newSlides.splice(toIndex, 0, moved);
    onUpdateComponent(carouselComponent.id, {
      components: newSlides as any,
    });
  };

  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, idx) => idx !== index);
    onUpdateComponent(carouselComponent.id, {
      components: newSlides as any,
    });
  };

  const handleDelete = () => {
    onRemoveComponent(carouselComponent.id);
  };

  return (
    <div className="flex flex-col h-full text-xs select-none">
      {/* Header do Painel */}
      <div className="p-3 border-b border-[var(--surface-border)] flex items-center justify-between glass-sm shrink-0">
        <button
          type="button"
          onClick={onDeselect}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-purple-600 transition-colors cursor-pointer"
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
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center gap-1">
            <GalleryHorizontal className="w-3 h-3" />
            Galeria / Carrossel
          </span>
        </div>
      </div>

      {/* Conteúdo Scrollável com Accordions */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
        {/* Top Metadata & Adicionar Slide rápido */}
        <div className="p-3 rounded-xl border border-[var(--surface-border)] glass-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Visibilidade</span>
            <button
              type="button"
              onClick={handleToggleVisibility}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                isHidden
                  ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
              }`}
            >
              {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isHidden ? 'Oculto' : 'Visível'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddSlide}
            className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            Adicionar Novo Slide Container ({slides.length} slides)
          </button>
        </div>

        {/* 🎴 ACCORDION: GERENCIADOR DE SLIDES */}
        <AccordionItem
          id="car-slides-manager"
          title={`Gerenciador de Slides (${slides.length})`}
          icon={Layers}
          defaultOpen={false}
        >
          <div className="space-y-2">
            {slides.map((slide, idx) => {
              const childCount = slide.components?.length || 0;
              return (
                <div
                  key={slide.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--surface-border)] glass-sm hover:border-purple-500/50 transition-all"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs truncate">
                        {slide.label || `Slide ${idx + 1}`}
                      </span>
                      <span className="text-[9px] text-slate-400 block truncate">
                        {childCount === 0 ? 'Slide vazio' : `${childCount} elemento${childCount > 1 ? 's' : ''}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {onSelect && (
                      <button
                        type="button"
                        onClick={() => onSelect(slide.id, 'div')}
                        className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
                        title="Editar este slide no editor"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDuplicateSlide(idx)}
                      className="p-1 text-slate-400 hover:text-purple-600 rounded-md transition-colors cursor-pointer"
                      title="Duplicar Slide"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => handleMoveSlide(idx, idx - 1)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
                        title="Mover para esquerda"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {idx < slides.length - 1 && (
                      <button
                        type="button"
                        onClick={() => handleMoveSlide(idx, idx + 1)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
                        title="Mover para direita"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {slides.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSlide(idx)}
                        className="p-1 text-red-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                        title="Excluir Slide"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleAddSlide}
              className="w-full py-1.5 px-3 rounded-xl border border-dashed border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 font-bold text-[10px] flex items-center justify-center gap-1.5 cursor-pointer transition-all mt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Adicionar Slide</span>
            </button>
          </div>
        </AccordionItem>

        {/* 📐 ACCORDION: EXIBIÇÃO & LAYOUT */}
        <AccordionItem
          id="car-layout"
          title="Exibição & Layout dos Itens"
          icon={Sliders}
          defaultOpen={false}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Itens Mostrados por Vez</label>
              {isMobile && (
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  📱 Mobile
                </span>
              )}
            </div>
            <div className="grid grid-cols-6 gap-1">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePropChange('itemsPerView', num)}
                  className={`py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                    (effectiveProps.itemsPerView || (isMobile ? 1 : 3)) === num
                      ? 'border-purple-500 bg-purple-500/10 text-purple-600 font-extrabold'
                      : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Espaço entre Itens (Gap)</label>
            <SliderNumberInput
              value={effectiveProps.gap || '16px'}
              onChange={(val) => handlePropChange('gap', val)}
              min={0}
              max={80}
              defaultUnit="px"
            />
          </div>
        </AccordionItem>

        {/* 🔘 ACCORDION: BOTÕES DE NAVEGAÇÃO (SETAS) */}
        <AccordionItem
          id="car-arrows"
          title="Botões de Navegação (Setas)"
          icon={Sliders}
          defaultOpen={false}
        >
          <div className="flex items-center justify-between p-2 rounded-lg border border-[var(--surface-border)] glass-sm">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Mostrar Setas</span>
            <button
              type="button"
              onClick={() => handlePropChange('showArrows', !(effectiveProps.showArrows ?? true))}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                (effectiveProps.showArrows ?? true)
                  ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                  : 'border-[var(--surface-border)] text-slate-500'
              }`}
            >
              {(effectiveProps.showArrows ?? true) ? 'Sim' : 'Não'}
            </button>
          </div>

          {(effectiveProps.showArrows ?? true) && (
            <>
              <GlobalColorPicker
                label="Cor do Ícone da Seta"
                value={effectiveProps.arrowColor || 'var(--brand-contrast-color)'}
                onChange={(val) => handlePropChange('arrowColor', val)}
                page={page}
              />

              <GlobalColorPicker
                label="Cor de Fundo do Botão de Seta"
                value={effectiveProps.arrowBgColor || 'var(--brand-gradient-start)'}
                onChange={(val) => handlePropChange('arrowBgColor', val)}
                page={page}
              />

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Margem / Espaçamento das Setas</label>
                <SliderNumberInput
                  value={effectiveProps.arrowSpacing || '12px'}
                  onChange={(val) => handlePropChange('arrowSpacing', val)}
                  min={0}
                  max={60}
                  defaultUnit="px"
                />
              </div>
            </>
          )}
        </AccordionItem>

        {/* ⏺️ ACCORDION: PAGINAÇÃO & INDICADORES (DOTS) */}
        <AccordionItem
          id="car-pagination"
          title="Paginação & Indicadores"
          icon={Sliders}
          defaultOpen={false}
        >
          <div className="flex items-center justify-between p-2 rounded-lg border border-[var(--surface-border)] glass-sm">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Mostrar Paginação</span>
            <button
              type="button"
              onClick={() => handlePropChange('showPagination', !(effectiveProps.showPagination ?? true))}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                (effectiveProps.showPagination ?? true)
                  ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                  : 'border-[var(--surface-border)] text-slate-500'
              }`}
            >
              {(effectiveProps.showPagination ?? true) ? 'Sim' : 'Não'}
            </button>
          </div>

          {(effectiveProps.showPagination ?? true) && (
            <GlobalColorPicker
              label="Cor dos Indicadores"
              value={effectiveProps.paginationColor || 'var(--brand-gradient-start)'}
              onChange={(val) => handlePropChange('paginationColor', val)}
              page={page}
            />
          )}
        </AccordionItem>

        {/* ⏱️ ACCORDION: AUTOMAÇÃO & VELOCIDADE */}
        <AccordionItem
          id="car-autoplay"
          title="Automação & Velocidade"
          icon={Play}
          defaultOpen={false}
        >
          <div className="flex items-center justify-between p-2 rounded-lg border border-[var(--surface-border)] glass-sm">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Troca Automática (Autoplay)</span>
            <button
              type="button"
              onClick={() => handlePropChange('autoplay', !(effectiveProps.autoplay ?? true))}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                (effectiveProps.autoplay ?? true)
                  ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                  : 'border-[var(--surface-border)] text-slate-500'
              }`}
            >
              {(effectiveProps.autoplay ?? true) ? 'Sim' : 'Não'}
            </button>
          </div>

          {(effectiveProps.autoplay ?? true) && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tempo entre Trocas</label>
              <SliderNumberInput
                value={effectiveProps.autoplayInterval ? `${effectiveProps.autoplayInterval}ms` : '4000ms'}
                onChange={(val) => {
                  const parsed = typeof val === 'number' ? val : parseInt(val || '4000', 10);
                  handlePropChange('autoplayInterval', parsed);
                }}
                min={1000}
                max={15000}
                step={500}
                defaultUnit="ms"
                unitOptions={['ms', 's']}
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Velocidade da Transição</label>
            <SliderNumberInput
              value={effectiveProps.transitionSpeed ? `${effectiveProps.transitionSpeed}ms` : '500ms'}
              onChange={(val) => {
                const parsed = typeof val === 'number' ? val : parseInt(val || '500', 10);
                handlePropChange('transitionSpeed', parsed);
              }}
              min={100}
              max={2000}
              step={50}
              defaultUnit="ms"
              unitOptions={['ms', 's']}
            />
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg border border-[var(--surface-border)] glass-sm">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Pausar ao passar o mouse</span>
            <button
              type="button"
              onClick={() => handlePropChange('pauseOnHover', !(effectiveProps.pauseOnHover ?? true))}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                (effectiveProps.pauseOnHover ?? true)
                  ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                  : 'border-[var(--surface-border)] text-slate-500'
              }`}
            >
              {(effectiveProps.pauseOnHover ?? true) ? 'Sim' : 'Não'}
            </button>
          </div>
        </AccordionItem>

        {/* 📏 ACCORDION: DIMENSÕES & MEDIDAS */}
        <AccordionItem
          id="car-size"
          title="Dimensões & Medidas"
          icon={Maximize2}
          defaultOpen={false}
        >
          <SizeControl
            width={effectiveLayout.width || '100%'}
            height={effectiveLayout.height || 'auto'}
            minWidth={effectiveLayout.minWidth}
            maxWidth={effectiveLayout.maxWidth}
            minHeight={effectiveLayout.minHeight}
            onChangeWidth={(w) => handleMultiLayoutChange({ width: w })}
            onChangeHeight={(h) => handleMultiLayoutChange({ height: h })}
            onChangeMinMax={(patch) => handleMultiLayoutChange(patch)}
            isMobileOverride={isMobile}
          />
        </AccordionItem>

        {/* 📦 ACCORDION: ESPAÇAMENTO (PADDING) */}
        <AccordionItem
          id="car-padding"
          title="Espaçamento (Padding)"
          icon={Maximize}
          defaultOpen={false}
        >
          <PaddingControl
            paddingTop={effectiveLayout.paddingTop}
            paddingRight={effectiveLayout.paddingRight}
            paddingBottom={effectiveLayout.paddingBottom}
            paddingLeft={effectiveLayout.paddingLeft}
            onChangePadding={(patch) => handleMultiLayoutChange(patch)}
            isMobileOverride={isMobile}
          />
        </AccordionItem>

        {/* 🎨 ACCORDION: FUNDO & CORES */}
        <AccordionItem
          id="car-background"
          title="Fundo & Cores"
          icon={Palette}
          defaultOpen={false}
        >
          <BackgroundControl
            label="Fundo do Carrossel"
            background={carouselComponent.background || { type: 'none' }}
            onChange={(bgPatch) => onUpdateComponent(carouselComponent.id, { background: bgPatch as any })}
            page={page}
            targetWidth={1200}
            targetHeight={600}
            aspectRatio={2}
          />
        </AccordionItem>

        {/* 🖼️ ACCORDION: BORDAS & ARREDONDAMENTO */}
        <AccordionItem
          id="car-border"
          title="Bordas & Arredondamento"
          icon={Square}
          defaultOpen={false}
        >
          <BorderControl
            borderStyle={carouselComponent.style?.borderStyle || effectiveBorder.borderStyle || (carouselComponent.border?.style as any) || 'none'}
            borderWidth={carouselComponent.style?.borderWidth || effectiveBorder.borderWidth || carouselComponent.border?.width || '1px'}
            borderColor={carouselComponent.style?.borderColor || effectiveBorder.borderColor || carouselComponent.border?.color || '#E2E8F0'}
            borderRadius={carouselComponent.style?.borderRadius || effectiveBorder.borderRadius || carouselComponent.border?.radiusTopLeft || '0px'}
            page={page}
            onChangeBorderStyle={(style) => handleBorderChange('borderStyle', style)}
            onChangeBorderWidth={(w) => handleBorderChange('borderWidth', w)}
            onChangeBorderColor={(c) => handleBorderChange('borderColor', c)}
            onChangeBorderRadius={(r) => handleBorderChange('borderRadius', r)}
          />
        </AccordionItem>

        {/* 🚨 EXCLUSÃO PROMINENTE */}
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            className="w-full text-xs text-red-600 border-red-500/30 hover:bg-red-500/10 flex items-center justify-center gap-2 cursor-pointer font-bold py-2.5 rounded-xl"
          >
            <Trash2 className="w-4 h-4" />
            Excluir Carrossel e todos os slides
          </Button>
        </div>
      </div>
    </div>
  );
}
