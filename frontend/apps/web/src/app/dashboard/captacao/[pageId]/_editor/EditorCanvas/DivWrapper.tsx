import React, { useState } from 'react';
import { DivComponent, ViewportMode, getPositionStyles, useScrollThreshold, useParallaxEffect, buildComponentCssStyle } from '@psi/canvas-renderer';
import { ComponentWrapper } from './ComponentWrapper';
import { Trash2, Square, Plus, GripVertical } from 'lucide-react';
import { createDefaultDiv, createDefaultCarousel, createDefaultComponent } from '../constants';
import { getComponentHoverClasses, getComponentTransitionAndHoverStyle } from '../utils/colorHelpers';

interface DivWrapperProps {
  divComponent: DivComponent;
  selectedId: string | null;
  viewportMode?: ViewportMode;
  page?: any;
  onSelect: (id: string, type: any) => void;
  onRemove: (id: string) => void;
  onUpdateComponent?: (id: string, patch: any) => void;
  onAddComponent?: (parentId: string, comp: any) => void;
  onMoveElement?: (elementId: string, targetParentId: string) => void;
  onMoveElementBeforeOrAfter?: (elementId: string, targetElementId: string, position: 'before' | 'after') => void;
  onAddComponentBeforeOrAfter?: (targetElementId: string, comp: any, position: 'before' | 'after') => void;
  onContextMenu?: (e: React.MouseEvent, id: string, type: string) => void;
  isPublicView?: boolean;
}

export function DivWrapper({
  divComponent,
  selectedId,
  viewportMode = 'desktop',
  page,
  onSelect,
  onRemove,
  onUpdateComponent,
  onAddComponent,
  onMoveElement,
  onMoveElementBeforeOrAfter,
  onAddComponentBeforeOrAfter,
  onContextMenu,
  isPublicView = false,
}: DivWrapperProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSelfHovered, setIsSelfHovered] = useState(false);
  const isStylingHovered = isSelfHovered || !!(divComponent.style as any)?.__isPreviewingHover;
  const isSelected = selectedId === divComponent.id;
  const isMobile = viewportMode === 'mobile';

  const layout = isMobile
    ? { ...divComponent.layout, ...(divComponent.mobile || {}) }
    : divComponent.layout;
  const border = isMobile
    ? { ...(divComponent.border || {}), ...(divComponent.mobile?.border || {}) }
    : (divComponent.border || {});
  const isHidden = isMobile
    ? (divComponent.mobile?.hidden ?? divComponent.hidden ?? false)
    : (divComponent.hidden ?? false);

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

      // CASO B: NOVO ELEMENTO DA SIDEBAR
      const { itemType, preset } = data;
      if (itemType === 'div') {
        const newDiv = createDefaultDiv('Sub-Container');
        if (preset === '2col') {
          const col1 = createDefaultDiv('Coluna 1');
          const col2 = createDefaultDiv('Coluna 2');
          col1.layout.flexBasis = '50%';
          col1.layout.width = '50%';
          col2.layout.flexBasis = '50%';
          col2.layout.width = '50%';
          newDiv.components = [col1, col2];
          newDiv.layout.flexDirection = 'row';
        } else if (preset === '3col') {
          const col1 = createDefaultDiv('Coluna 1');
          const col2 = createDefaultDiv('Coluna 2');
          const col3 = createDefaultDiv('Coluna 3');
          col1.layout.flexBasis = '33.33%';
          col1.layout.width = '33.33%';
          col2.layout.flexBasis = '33.33%';
          col2.layout.width = '33.33%';
          col3.layout.flexBasis = '33.33%';
          col3.layout.width = '33.33%';
          newDiv.components = [col1, col2, col3];
          newDiv.layout.flexDirection = 'row';
        }
        if (onAddComponent) onAddComponent(divComponent.id, newDiv);
      } else if (itemType === 'carousel') {
        const newCarousel = createDefaultCarousel('Galeria / Carrossel');
        if (onAddComponent) onAddComponent(divComponent.id, newCarousel);
      } else if (itemType) {
        const newComp = createDefaultComponent(itemType);
        if (onAddComponent) onAddComponent(divComponent.id, newComp);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const isAutoWidth = layout.width === 'auto' || layout.width === 'fit-content';
  const hasValidFlexBasis = !!layout.flexBasis && layout.flexBasis !== 'auto' && layout.flexBasis !== '100%' && layout.flexBasis !== '0px' && layout.flexBasis !== '0';
  const effectiveWidth = isAutoWidth ? 'fit-content' : (hasValidFlexBasis ? layout.flexBasis : (layout.width || '100%'));
  const effectiveFlexBasis = isAutoWidth ? 'auto' : (hasValidFlexBasis ? layout.flexBasis : (layout.width === '100%' || layout.flexBasis === '100%' ? '100%' : 'auto'));
  const effectiveMaxWidth = layout.maxWidth || (hasValidFlexBasis ? layout.flexBasis : '100%');
  const effectiveFlexGrow = layout.flexGrow !== undefined ? layout.flexGrow : (isAutoWidth ? 0 : (effectiveWidth === '100%' || layout.flexBasis === '100%' ? 1 : 0));

  const isRow = layout.flexDirection === 'row';
  const effectiveAlignItems = (layout.alignItems === 'center' || layout.alignItems === 'flex-end' || layout.alignItems === 'baseline')
    ? layout.alignItems
    : (isRow ? 'stretch' : (layout.alignItems || 'flex-start'));

  const isPastThreshold = useScrollThreshold(!!layout?.appearOnScroll, layout?.scrollThreshold || 300);
  const positionStyles = getPositionStyles(layout, divComponent.mobile, isMobile, isPastThreshold, !isPublicView);
  const parallax = useParallaxEffect({
    speed: layout?.parallaxSpeed || 0,
    disableMobile: !!layout?.disableParallaxMobile,
    isMobile,
    isEditorMode: !isPublicView,
  });

  return (
    <div
      onClick={(e) => {
        if (!isPublicView) {
          e.stopPropagation();
          onSelect(divComponent.id, 'div');
        }
      }}
      onContextMenu={!isPublicView ? handleContextMenu : undefined}
      onDragOver={!isPublicView ? handleDragOver : undefined}
      onDragLeave={!isPublicView ? handleDragLeave : undefined}
      onDrop={!isPublicView ? handleDrop : undefined}
      onMouseEnter={(e) => {
        if (!isPublicView) {
          e.stopPropagation();
          setIsSelfHovered(true);
        }
      }}
      onMouseLeave={(e) => {
        if (!isPublicView) {
          e.stopPropagation();
          setIsSelfHovered(false);
        }
      }}
      className={`relative flex flex-col transition-all duration-200 cursor-pointer ${
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
          componentCategory: 'div',
        }),
        width: effectiveWidth,
        flexBasis: effectiveFlexBasis,
        flexGrow: effectiveFlexGrow,
        flexShrink: layout.flexShrink !== undefined ? layout.flexShrink : 1,
        alignSelf: (layout.height === '100%' || layout.height === 'stretch' ? 'stretch' : undefined),
        maxWidth: effectiveMaxWidth,
      }}
    >
      {/* Borda Flutuante de Seleção / Hover no topo dos filhos (z-20) */}
      {!isPublicView && isSelected && (
        <div className="absolute inset-0 border-2 border-purple-500 pointer-events-none z-20 rounded-[inherit]" />
      )}
      {!isPublicView && isSelfHovered && !isSelected && (
        <div className="absolute inset-0 border border-purple-400/60 pointer-events-none z-20 rounded-none" />
      )}
      {!isPublicView && isDragOver && (
        <div className="absolute inset-0 border-2 border-purple-500 bg-purple-500/10 ring-2 ring-purple-400/50 pointer-events-none z-20 rounded-[inherit]" />
      )}
      {/* Indicator Badge em Drag Over */}
      {!isPublicView && isDragOver && (
        <div className="absolute top-1.5 right-3 px-2 py-0.5 rounded-full bg-purple-600 text-white text-[9px] font-bold shadow-md z-30 flex items-center gap-1">
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
            onSelect(divComponent.id, 'div');
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
            onSelect(divComponent.id, 'div');
          }}
          className={`absolute top-1.5 right-2 transition-opacity bg-purple-600 text-white p-1 rounded-md shadow-md z-30 cursor-grab active:cursor-grabbing flex items-center justify-center ${
            isSelfHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          title="Arrastar container para mover de lugar"
        >
          <GripVertical className="w-3 h-3" />
        </div>
      )}

      {/* Label de Identificação Flutuante ao Selecionar */}
      {!isPublicView && isSelected && !isDragOver && (
        <div className="absolute top-1.5 left-3 px-2 py-0.5 rounded-full bg-purple-600 text-white text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-sm select-none z-30">
          <Square className="w-2.5 h-2.5" />
          Container Div
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
        </div>
      )}

      {/* Render dos Filhos */}
      {divComponent.components.length > 0 ? (
        <div
          className={`flex h-full flex-1 ${isAutoWidth ? 'w-auto max-w-full' : 'w-full'}`}
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
              viewportMode={viewportMode}
              page={page}
              onSelect={onSelect}
              onRemove={onRemove}
              onUpdateComponent={onUpdateComponent}
              onAddComponent={onAddComponent}
              onMoveElement={onMoveElement}
              onMoveElementBeforeOrAfter={onMoveElementBeforeOrAfter}
              onAddComponentBeforeOrAfter={onAddComponentBeforeOrAfter}
              onContextMenu={onContextMenu}
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
    </div>
  );
}
