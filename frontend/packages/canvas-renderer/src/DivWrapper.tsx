'use client';

import React, { useState, useRef } from 'react';
import { DivComponent, ViewportMode, CanvasData } from './types';
import { ComponentWrapper } from './ComponentWrapper';
import { Trash2, Square, Plus, GripVertical } from 'lucide-react';
import { getComponentHoverClasses, buildComponentCssStyle } from './utils/colorHelpers';
import { createDefaultDiv, createDefaultCarousel, createDefaultComponent } from './constants';
import { useScrollThreshold, getPositionStyles } from './utils/positionHelpers';
import { useParallaxEffect } from './hooks/useParallaxEffect';
import { useIsAdjustingProperty } from './utils/propertyAdjustHelpers';

interface DivWrapperProps {
  divComponent: DivComponent;
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
  isHoistedRoot?: boolean;
}

export function DivWrapper({
  divComponent,
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
  isHoistedRoot = false,
}: DivWrapperProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const isAdjustingProperty = useIsAdjustingProperty();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMouseHovered, setIsMouseHovered] = useState(false);
  const isSelected = !isPublicView && selectedId === divComponent.id && !isAdjustingProperty;
  const isSelfHovered = !isPublicView && hoveredId === divComponent.id && !isAdjustingProperty;
  const isStylingHovered = isMouseHovered || (isSelected && (isSelfHovered || !!(divComponent.style as any)?.__isPreviewingHover));
  const isMobile = viewportMode === 'mobile';

  const layout = isMobile
    ? { ...divComponent.layout, ...(divComponent.mobile || {}) }
    : divComponent.layout;
  const border = isMobile
    ? { ...(divComponent.border || {}), ...(divComponent.mobile?.border || {}) }
    : (divComponent.border || {});

  const isPastThreshold = useScrollThreshold(!!layout?.appearOnScroll, layout?.scrollThreshold || 300);
  const positionStyles = getPositionStyles(layout, divComponent.mobile, isMobile, isPastThreshold, !isPublicView);
  const parallax = useParallaxEffect({
    speed: layout?.parallaxSpeed || 0,
    disableMobile: !!layout?.disableParallaxMobile,
    isMobile,
    isEditorMode: !isPublicView,
  });

  const isHidden = isMobile
    ? (divComponent.mobile?.hidden ?? divComponent.hidden ?? false)
    : (divComponent.hidden ?? false);

  if (isHidden) return null;

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e, divComponent.id, 'div');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);

      // CASO A: MOVER ELEMENTO EXISTENTE
      if (data.isExistingElement && data.elementId) {
        if (data.elementId === divComponent.id) return;
        if (onMoveElement) {
          onMoveElement(data.elementId, divComponent.id);
        }
        return;
      }

      // CASO B: INSERIR NOVO ELEMENTO DA SIDEBAR
      if (data.itemType) {
        let newComp: any = null;
        if (data.itemType === 'div') {
          newComp = createDefaultDiv('Container (Div)');
        } else if (data.itemType === 'carousel') {
          newComp = createDefaultCarousel();
        } else {
          newComp = createDefaultComponent(data.itemType, data.preset);
        }

        if (newComp && onAddComponent) {
          onAddComponent(divComponent.id, newComp);
          if (onSelect) {
            onSelect(newComp.id, newComp.type);
          }
        }
        return;
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const effectiveWidth = layout.width || '100%';
  const effectiveHeight = layout.height || 'auto';
  const hasCustomWidth = !!layout.width && layout.width !== '100%' && layout.width !== 'auto';
  const effectiveFlexBasis = hasCustomWidth ? 'auto' : (layout.flexBasis || 'auto');
  const effectiveMaxWidth = layout.maxWidth || '100%';

  const isRow = layout.flexDirection === 'row';
  const effectiveAlignItems = layout.alignItems || (isRow ? 'stretch' : 'flex-start');

  return (
    <div
      ref={divRef}
      onClick={(e) => {
        if (!isPublicView && onSelect) {
          e.stopPropagation();
          onSelect(divComponent.id, 'div');
        }
      }}
      onContextMenu={!isPublicView ? handleContextMenu : undefined}
      onDragOver={!isPublicView ? handleDragOver : undefined}
      onDragLeave={!isPublicView ? handleDragLeave : undefined}
      onDrop={!isPublicView ? handleDrop : undefined}
      onMouseOver={(e) => {
        setIsMouseHovered(true);
        if (!isPublicView && onHover) {
          e.stopPropagation();
          onHover(divComponent.id);
        }
      }}
      onMouseLeave={() => {
        setIsMouseHovered(false);
      }}
      className={`relative flex flex-col transition-all duration-200 ${!isPublicView ? 'cursor-pointer' : ''} ${
        isHidden ? 'opacity-40 outline-dashed outline-1 outline-amber-400' : ''
      } ${getComponentHoverClasses(divComponent.style?.hoverEffect || (divComponent.props as any)?.hoverEffect)}`}
      style={{
        ...parallax.style,
        ...positionStyles,
        ...buildComponentCssStyle({
          component: divComponent,
          viewportMode,
          isHovered: isStylingHovered,
          page,
          canvasData,
          componentCategory: 'div',
        }),
        width: effectiveWidth,
        height: effectiveHeight,
        flexBasis: effectiveFlexBasis,
        maxWidth: effectiveMaxWidth,
      }}
    >
      {/* Borda Flutuante de Seleção / Hover no topo dos filhos (z-20) */}
      {!isPublicView && isSelected && (
        <div className="absolute inset-0 border-2 border-purple-500 pointer-events-none z-20 rounded-[inherit]" />
      )}
      {!isPublicView && isSelfHovered && !isSelected && (
        <div className="absolute inset-0 border border-purple-400/60 pointer-events-none z-20 rounded-[inherit]" />
      )}

      {/* Indicator Badge em Drag Over */}
      {!isPublicView && isDragOver && (
        <div className="absolute top-1.5 right-3 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold shadow-md z-40 flex items-center gap-1">
          <Plus className="w-3 h-3" />
          <span>Soltar elemento aqui</span>
        </div>
      )}

      {/* Botão de Arrastar / Mover Container no Hover */}
      {!isPublicView && (
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect(divComponent.id, 'div');
            e.dataTransfer.setData(
              'application/json',
              JSON.stringify({
                isExistingElement: true,
                elementId: divComponent.id,
                elementType: 'div',
              })
            );
            e.dataTransfer.effectAllowed = 'move';
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect(divComponent.id, 'div');
          }}
          onMouseEnter={(e) => {
            if (!isPublicView && onHover) {
              e.stopPropagation();
              onHover(divComponent.id);
            }
          }}
          onMouseLeave={(e) => {
            if (!isPublicView && onHover) {
              e.stopPropagation();
              onHover(null);
            }
          }}
          className={`absolute top-1.5 right-2 transition-opacity ${
            isSelected ? 'bg-purple-600' : 'bg-blue-600'
          } text-white p-1 rounded-md shadow-md z-40 cursor-grab active:cursor-grabbing flex items-center justify-center ${
            isSelfHovered || isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          title="Arrastar container para mover de lugar"
        >
          <GripVertical className="w-3 h-3" />
        </div>
      )}

      {/* Label de Identificação Flutuante ao Selecionar */}
      {!isPublicView && isSelected && !isDragOver && (
        <div
          onMouseEnter={(e) => {
            if (!isPublicView && onHover) {
              e.stopPropagation();
              onHover(divComponent.id);
            }
          }}
          onMouseLeave={(e) => {
            if (!isPublicView && onHover) {
              e.stopPropagation();
              onHover(null);
            }
          }}
          className="absolute top-1.5 left-3 px-2 py-0.5 rounded-full bg-purple-600 text-white text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-sm select-none z-40 pointer-events-auto"
        >
          <Square className="w-2.5 h-2.5" />
          Container Div
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(divComponent.id);
              }}
              className="hover:text-red-300 ml-1 cursor-pointer"
              title="Excluir Container Div"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      )}

      {/* Render dos Filhos */}
      {divComponent.components.length > 0 ? (
        <div
          className="flex w-full h-full flex-1"
          style={{
            flexDirection: layout.flexDirection || 'column',
            gap: layout.gap || '16px',
            alignItems: effectiveAlignItems,
            justifyContent: layout.justifyContent || 'flex-start',
            textAlign: layout.textAlign || 'inherit',
          }}
        >
          {divComponent.components.map((child) => (
            <ComponentWrapper
              key={child.id}
              component={child}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onHover={onHover}
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
          ))}
        </div>
      ) : !isPublicView ? (
        <div
          className="w-full flex-1 min-h-[50px] flex flex-col items-center justify-center text-[10px] text-[var(--brand-gradient-start)] font-bold border border-dashed border-[var(--brand-gradient-start)]/40 bg-[var(--brand-gradient-start)]/5 hover:bg-[var(--brand-gradient-start)]/10 transition-colors p-4 select-none"
          style={{
            borderRadius: border.borderRadius ? `calc(${border.borderRadius} - 2px)` : 'inherit',
          }}
        >
          <span className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            + Solte elementos neste container
          </span>
        </div>
      ) : null}

      {/* Borda de Seleção (Roxa) / Hover (Azul) - Desenhar no Topo do Stacking Context (Z-20) */}
      {!isPublicView && isSelected && (
        <div
          className="absolute inset-0 pointer-events-none z-20 rounded-[inherit]"
          style={{ borderColor: '#9333ea', borderStyle: 'solid', borderWidth: '2px' }}
        />
      )}
      {!isPublicView && isSelfHovered && !isSelected && (
        <div
          className="absolute inset-0 pointer-events-none z-20 rounded-[inherit]"
          style={{ borderColor: '#3b82f6', borderStyle: 'solid', borderWidth: '2px' }}
        />
      )}
      {!isPublicView && isDragOver && (
        <div
          className="absolute inset-0 bg-blue-500/10 pointer-events-none z-20 rounded-[inherit]"
          style={{ borderColor: '#3b82f6', borderStyle: 'solid', borderWidth: '2px' }}
        />
      )}
    </div>
  );
}
