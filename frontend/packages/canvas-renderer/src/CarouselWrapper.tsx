'use client';

import React, { useState, useEffect } from 'react';
import { CarouselComponent, ViewportMode, CanvasData } from './types';
import { DivWrapper } from './DivWrapper';
import { buildComponentCssStyle } from './utils/colorHelpers';
import { useIsAdjustingProperty } from './utils/propertyAdjustHelpers';

import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  GalleryHorizontal,
} from 'lucide-react';

interface CarouselWrapperProps {
  carouselComponent: CarouselComponent;
  selectedId?: string | null;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  viewportMode?: ViewportMode;
  page?: any;
  canvasData?: CanvasData | null;
  onSelect?: (id: string, type: any) => void;
  onRemove?: (id: string) => void;
  onUpdateComponent?: (id: string, patch: any) => void;
  onAddComponent?: (parentId: string, comp: any) => void;
  onMoveElement?: (elementId: string, targetParentId: string) => void;
  onMoveElementBeforeOrAfter?: (elementId: string, targetElementId: string, position: 'before' | 'after') => void;
  onAddComponentBeforeOrAfter?: (targetElementId: string, comp: any, position: 'before' | 'after') => void;
  onContextMenu?: (e: React.MouseEvent, id: string, type: string) => void;
  onCtaClick?: () => void;
  isPublicView?: boolean;
}

export function CarouselWrapper({
  carouselComponent,
  selectedId = null,
  hoveredId = null,
  onHover,
  viewportMode = 'desktop',
  page,
  canvasData,
  onSelect,
  onRemove,
  onUpdateComponent,
  onAddComponent,
  onMoveElement,
  onMoveElementBeforeOrAfter,
  onAddComponentBeforeOrAfter,
  onContextMenu,
  onCtaClick,
  isPublicView = false,
}: CarouselWrapperProps) {
  const isAdjustingProperty = useIsAdjustingProperty();
  const isSelected = !isPublicView && selectedId === carouselComponent.id && !isAdjustingProperty;
  const isSelfHovered = !isPublicView && hoveredId === carouselComponent.id && !isAdjustingProperty;
  const isMobile = viewportMode === 'mobile';
  const props = carouselComponent.props || {};
  const style = carouselComponent.style || {};
  const effectiveStyle = isMobile
    ? { ...style, ...(carouselComponent.mobile?.style || {}) }
    : style;
  const effectiveProps = isMobile
    ? { ...props, ...(carouselComponent.mobile?.props || {}) }
    : props;

  const itemsPerView = Math.max(1, effectiveProps.itemsPerView || (isMobile ? 1 : 3));
  const gap = effectiveProps.gap || '16px';
  const showArrows = effectiveProps.showArrows ?? true;
  const showPagination = effectiveProps.showPagination ?? true;
  const autoplay = effectiveProps.autoplay ?? true;
  const autoplayInterval = effectiveProps.autoplayInterval || 4000;
  const transitionSpeed = effectiveProps.transitionSpeed || 500;
  const pauseOnHover = effectiveProps.pauseOnHover ?? true;

  const slides = carouselComponent.components || [];
  const totalSlides = slides.length;
  const maxIndex = Math.max(0, totalSlides - itemsPerView);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [totalSlides, maxIndex, currentIndex]);

  useEffect(() => {
    if (!selectedId || isPublicView) return;
    function isElementInSlide(comp: any, targetId: string): boolean {
      if (!comp) return false;
      if (comp.id === targetId) return true;
      if (comp.components && Array.isArray(comp.components)) {
        return comp.components.some((child: any) => isElementInSlide(child, targetId));
      }
      return false;
    }

    const slideIndex = slides.findIndex(
      (slide) => slide.id === selectedId || isElementInSlide(slide, selectedId)
    );
    if (slideIndex !== -1) {
      setCurrentIndex(Math.min(slideIndex, maxIndex));
    }
  }, [selectedId, slides, maxIndex, isPublicView]);

  useEffect(() => {
    if (!autoplay || totalSlides <= itemsPerView || (pauseOnHover && isHovered)) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, autoplayInterval);

    return () => clearInterval(timer);
  }, [autoplay, autoplayInterval, totalSlides, itemsPerView, maxIndex, pauseOnHover, isHovered]);

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const arrowColor = props.arrowColor || 'var(--brand-contrast-color)';
  const arrowBgColor = props.arrowBgColor || 'var(--brand-gradient-start)';
  const arrowSpacing = props.arrowSpacing || '12px';
  const paginationColor = props.paginationColor || 'var(--brand-gradient-start)';

  const flexBasisCalc = `calc((100% - (${gap} * ${itemsPerView - 1})) / ${itemsPerView})`;
  const transformCalc = `calc(-${currentIndex} * (${flexBasisCalc} + ${gap}))`;

  return (
    <div
      onClick={(e) => {
        if (!isPublicView && onSelect) {
          e.stopPropagation();
          onSelect(carouselComponent.id, 'carousel');
        }
      }}
      onContextMenu={(e) => {
        if (!isPublicView && onContextMenu) {
          e.stopPropagation();
          onContextMenu(e, carouselComponent.id, 'carousel');
        }
      }}
      onMouseOver={(e) => {
        setIsHovered(true);
        if (!isPublicView && onHover) {
          e.stopPropagation();
          onHover(carouselComponent.id);
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      className={`relative w-full transition-all group/carousel select-none ${
        carouselComponent.hidden ? 'opacity-40 grayscale' : ''
      }`}
      style={{
        ...buildComponentCssStyle({
          component: carouselComponent,
          viewportMode,
          isHovered: isSelfHovered,
          page,
          canvasData,
          componentCategory: 'carousel',
        }),
      }}
    >
      {/* 🟣 BORDA DE HOVER DO CARROSSEL */}
      {!isPublicView && isSelfHovered && !isSelected && (
        <div className="absolute inset-0 border border-purple-400/60 pointer-events-none z-20 rounded-2xl" />
      )}

      {/* 🟣 BORDA DE SELEÇÃO E BARRA FLUTUANTE DE AÇÕES DO CARROSSEL */}
      {!isPublicView && isSelected && (
        <div className="absolute inset-0 z-30 pointer-events-none border-2 border-purple-500 rounded-2xl shadow-xl">
          <div className="absolute top-2 left-2 z-40 flex items-center gap-1.5 glass-md px-2.5 py-1 rounded-xl border border-purple-500/40 text-[10px] font-bold text-purple-600 dark:text-purple-300 shadow-md pointer-events-auto backdrop-blur-md">
            <GalleryHorizontal className="w-3.5 h-3.5" />
            <span>Galeria / Carrossel</span>

            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 font-mono">
              Slide {currentIndex + 1} / {totalSlides}
            </span>

            <div className="h-3 w-px bg-purple-500/30 mx-1" />

            <button
              type="button"
              onClick={handlePrev}
              className="p-1 hover:bg-purple-500/20 rounded-md transition-colors cursor-pointer"
              title="Slide Anterior"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="p-1 hover:bg-purple-500/20 rounded-md transition-colors cursor-pointer"
              title="Próximo Slide"
            >
              <ChevronRight className="w-3 h-3" />
            </button>

            {onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(carouselComponent.id);
                }}
                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                title="Excluir Carrossel"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ↔️ TRACK DE SLIDES COM MÁSCARA OVERFLOW HIDDEN */}
      <div className="w-full overflow-hidden relative py-6 px-2">
        <div
          className="flex transition-transform ease-out"
          style={{
            gap: gap,
            transform: `translateX(${transformCalc})`,
            transitionDuration: `${transitionSpeed}ms`,
          }}
        >
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="shrink-0 transition-all"
              style={{
                width: flexBasisCalc,
                flexBasis: flexBasisCalc,
              }}
            >
              <DivWrapper
                divComponent={slide}
                selectedId={selectedId}
                viewportMode={viewportMode}
                page={page}
                canvasData={canvasData}
                onSelect={onSelect}
                onRemove={onRemove}
                onUpdateComponent={onUpdateComponent}
                onAddComponent={onAddComponent}
                onMoveElement={onMoveElement}
                onMoveElementBeforeOrAfter={onMoveElementBeforeOrAfter}
                onAddComponentBeforeOrAfter={onAddComponentBeforeOrAfter}
                onContextMenu={onContextMenu}
                onCtaClick={onCtaClick}
                isPublicView={isPublicView}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 🔘 SETAS DE NAVEGAÇÃO (ANTERIOR & PRÓXIMO) */}
      {showArrows && totalSlides > itemsPerView && (
        <div
          className="flex items-center justify-between pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 px-2"
          style={{ paddingLeft: arrowSpacing, paddingRight: arrowSpacing }}
        >
          <button
            type="button"
            onClick={handlePrev}
            className="p-2 rounded-full shadow-lg pointer-events-auto cursor-pointer transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
            style={{
              backgroundColor: arrowBgColor,
              color: arrowColor,
            }}
            title="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="p-2 rounded-full shadow-lg pointer-events-auto cursor-pointer transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
            style={{
              backgroundColor: arrowBgColor,
              color: arrowColor,
            }}
            title="Próximo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ⏺️ INDICADORES DE PAGINAÇÃO (DOTS) */}
      {showPagination && totalSlides > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-3 z-20">
          {Array.from({ length: maxIndex + 1 }).map((_, dotIdx) => {
            const isActive = dotIdx === currentIndex;
            return (
              <button
                key={dotIdx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(dotIdx);
                }}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  isActive ? 'w-6 h-2' : 'w-2 h-2 opacity-40 hover:opacity-75'
                }`}
                style={{
                  backgroundColor: paginationColor,
                }}
                title={`Ir para o slide ${dotIdx + 1}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
