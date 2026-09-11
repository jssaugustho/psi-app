import React, { useState } from 'react';
import { DivComponent, ViewportMode } from '../types';
import { ComponentWrapper } from './ComponentWrapper';
import { Trash2, Square, Plus, GripVertical } from 'lucide-react';
import { createDefaultDiv, createDefaultComponent } from '../constants';

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
}: DivWrapperProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSelfHovered, setIsSelfHovered] = useState(false);
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
          col2.layout.flexBasis = '50%';
          newDiv.components = [col1, col2];
          newDiv.layout.flexDirection = 'row';
        } else if (preset === '3col') {
          const col1 = createDefaultDiv('Coluna 1');
          const col2 = createDefaultDiv('Coluna 2');
          const col3 = createDefaultDiv('Coluna 3');
          col1.layout.flexBasis = '33.33%';
          col2.layout.flexBasis = '33.33%';
          col3.layout.flexBasis = '33.33%';
          newDiv.components = [col1, col2, col3];
          newDiv.layout.flexDirection = 'row';
        }
        if (onAddComponent) onAddComponent(divComponent.id, newDiv);
      } else if (itemType) {
        const newComp = createDefaultComponent(itemType);
        if (onAddComponent) onAddComponent(divComponent.id, newComp);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(divComponent.id, 'div');
      }}
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={(e) => {
        e.stopPropagation();
        setIsSelfHovered(true);
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();
        setIsSelfHovered(false);
      }}
      className={`relative min-h-[40px] p-2 transition-all duration-200 cursor-pointer ${
        isHidden ? 'opacity-40 outline-dashed outline-1 outline-amber-400' : ''
      } ${
        isDragOver
          ? 'outline outline-2 outline-purple-500 bg-purple-500/10 shadow-lg ring-2 ring-purple-400/50'
          : isSelected
          ? 'outline outline-2 outline-purple-500 -outline-offset-2'
          : isSelfHovered
          ? 'outline outline-1 outline-purple-400/60 -outline-offset-1'
          : ''
      }`}
      style={{
        width: layout.width || layout.flexBasis || 'auto',
        flexBasis: layout.flexBasis || layout.width || 'auto',
        flexGrow: layout.flexGrow !== undefined ? layout.flexGrow : (layout.width === '100%' || layout.flexBasis === '100%' ? 1 : 0),
        flexShrink: layout.flexShrink !== undefined ? layout.flexShrink : 1,
        alignSelf: layout.alignSelf || 'auto',
        gap: layout.gap || '16px',
        flexDirection: layout.flexDirection || 'column',
        textAlign: layout.textAlign || 'inherit',
        minWidth: layout.minWidth || 'none',
        maxWidth: layout.maxWidth || '100%',
        height: layout.height || 'auto',
        minHeight: layout.minHeight || 'auto',
        maxHeight: layout.maxHeight,
        paddingTop: layout.paddingTop,
        paddingRight: layout.paddingRight,
        paddingBottom: layout.paddingBottom,
        paddingLeft: layout.paddingLeft,
        backgroundColor: divComponent.background?.color || 'transparent',
        background: divComponent.background?.gradientString || divComponent.background?.color || 'transparent',
        backgroundImage: divComponent.background?.type === 'image' && divComponent.background?.imageUrl
          ? `linear-gradient(${divComponent.background.imageOverlayColor || 'transparent'}, ${divComponent.background.imageOverlayColor || 'transparent'}), url(${divComponent.background.imageUrl})`
          : divComponent.background?.gradientString
          ? divComponent.background.gradientString
          : undefined,
        backgroundSize: divComponent.background?.imageSize || 'cover',
        backdropFilter: divComponent.background?.backdropBlur && divComponent.background.backdropBlur !== '0px'
          ? `blur(${divComponent.background.backdropBlur})`
          : undefined,
        WebkitBackdropFilter: divComponent.background?.backdropBlur && divComponent.background.backdropBlur !== '0px'
          ? `blur(${divComponent.background.backdropBlur})`
          : undefined,
        borderStyle: border.borderStyle || (divComponent.border?.style as any) || 'none',
        borderWidth: border.borderWidth || divComponent.border?.width || '1px',
        borderColor: border.borderColor || divComponent.border?.color || 'transparent',
        borderRadius: border.borderRadius || divComponent.border?.radiusTopLeft || '0px',
      }}
    >
      {/* Indicator Badge em Drag Over */}
      {isDragOver && (
        <div className="absolute -top-3 right-3 px-2 py-0.5 rounded-full bg-purple-600 text-white text-[9px] font-bold shadow-md z-30 flex items-center gap-1">
          <Plus className="w-3 h-3" />
          <span>Soltar elemento aqui</span>
        </div>
      )}

      {/* Botão de Arrastar / Mover Container no Hover */}
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
        className={`absolute -top-2.5 right-2 transition-opacity bg-purple-600 text-white p-1 rounded-md shadow-md z-30 cursor-grab active:cursor-grabbing flex items-center justify-center ${
          isSelfHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        title="Arrastar container para mover de lugar"
      >
        <GripVertical className="w-3 h-3" />
      </div>

      {/* Label de Identificação Flutuante ao Selecionar */}
      {isSelected && !isDragOver && (
        <div className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full bg-purple-600 text-white text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-sm select-none z-20">
          <Square className="w-2.5 h-2.5" />
          {divComponent.label || 'Div Container'}
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
          className="flex w-full min-h-[45px]"
          style={{
            flexDirection: layout.flexDirection || 'column',
            gap: layout.gap || '16px',
            alignItems: layout.alignItems || 'flex-start',
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
            />
          ))}
        </div>
      ) : (
        <div className="w-full h-full min-h-[50px] flex flex-col items-center justify-center text-[10px] text-purple-500 dark:text-purple-400 font-bold border border-dashed border-purple-300 dark:border-purple-800/60 rounded-xl bg-purple-500/5 hover:bg-purple-500/10 transition-colors p-3 select-none">
          <span className="flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            + Solte elementos neste container
          </span>
        </div>
      )}
    </div>
  );
}
