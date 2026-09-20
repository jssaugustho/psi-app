import React, { useState } from 'react';
import { Section, ViewportMode, getPositionStyles, useScrollThreshold, useParallaxEffect } from '@psi/canvas-renderer';
import { ComponentWrapper } from './ComponentWrapper';
import { Layout, Trash2, Plus, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';
import { createDefaultDiv, createDefaultCarousel, createDefaultComponent } from '../constants';
import { getComponentTransitionAndHoverStyle } from '../utils/colorHelpers';

interface SectionWrapperProps {
  section: Section;
  index: number;
  totalSections?: number;
  selectedId: string | null;
  viewportMode?: ViewportMode;
  page?: any;
  onSelect: (id: string, type: any) => void;
  onRemoveSection: (id: string) => void;
  onRemoveComponent: (id: string) => void;
  onUpdateSection: (id: string, patch: Partial<Section>) => void;
  onUpdateComponent?: (id: string, patch: any) => void;
  onAddComponent: (parentId: string, comp: any) => void;
  onMoveSection?: (fromIndex: number, toIndex: number) => void;
  onMoveElement?: (elementId: string, targetParentId: string) => void;
  onMoveElementBeforeOrAfter?: (elementId: string, targetElementId: string, position: 'before' | 'after') => void;
  onAddComponentBeforeOrAfter?: (targetElementId: string, comp: any, position: 'before' | 'after') => void;
  onContextMenu?: (e: React.MouseEvent, id: string, type: string) => void;
  isPublicView?: boolean;
}

export function SectionWrapper({
  section,
  index,
  totalSections = 1,
  selectedId,
  viewportMode = 'desktop',
  page,
  onSelect,
  onRemoveSection,
  onRemoveComponent,
  onUpdateSection,
  onUpdateComponent,
  onAddComponent,
  onMoveSection,
  onMoveElement,
  onMoveElementBeforeOrAfter,
  onAddComponentBeforeOrAfter,
  onContextMenu,
  isPublicView = false,
}: SectionWrapperProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSelfHovered, setIsSelfHovered] = useState(false);
  const isStylingHovered = isSelfHovered || !!((section as any).style as any)?.__isPreviewingHover;
  const isSelected = selectedId === section.id;
  const isMobile = viewportMode === 'mobile';
  const isHidden = isMobile
    ? (section.mobile?.hidden ?? section.hidden ?? false)
    : (section.hidden ?? false);

  const layout = isMobile
    ? { ...section.layout, ...(section.mobile || {}) }
    : section.layout;
  const border = isMobile
    ? { ...(section.border || {}), ...(section.mobile?.border || {}) }
    : (section.border || {});

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e, section.id, 'section');
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
        if (data.elementId === section.id) return;
        if (onMoveElement) {
          onMoveElement(data.elementId, section.id);
        }
        return;
      }

      // CASO B: NOVO ELEMENTO DA SIDEBAR
      const { itemType, preset } = data;
      if (itemType === 'div') {
        const newDiv = createDefaultDiv('Container (Div)');
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
        onAddComponent(section.id, newDiv);
      } else if (itemType === 'carousel') {
        const newCarousel = createDefaultCarousel('Galeria / Carrossel');
        onAddComponent(section.id, newCarousel);
      } else if (itemType) {
        const newComp = createDefaultComponent(itemType);
        onAddComponent(section.id, newComp);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const isPastThreshold = useScrollThreshold(!!layout?.appearOnScroll, layout?.scrollThreshold || 300);
  const positionStyles = getPositionStyles(layout, section.mobile, isMobile, isPastThreshold, !isPublicView);
  const parallax = useParallaxEffect({
    speed: layout?.parallaxSpeed || 0,
    disableMobile: !!layout?.disableParallaxMobile,
    isMobile,
    isEditorMode: !isPublicView,
  });

  return (
    <section
      onClick={(e) => {
        if (!isPublicView) {
          e.stopPropagation();
          onSelect(section.id, 'section');
        }
      }}
      onContextMenu={!isPublicView ? handleContextMenu : undefined}
      onDragOver={!isPublicView ? handleDragOver : undefined}
      onDragLeave={!isPublicView ? handleDragLeave : undefined}
      onDrop={!isPublicView ? handleDrop : undefined}
      onMouseEnter={() => !isPublicView && setIsSelfHovered(true)}
      onMouseLeave={() => !isPublicView && setIsSelfHovered(false)}
      className={`relative w-full transition-all duration-200 ${
        isHidden ? 'opacity-40 outline-dashed outline-1 outline-amber-400' : ''
      }`}
      style={{
        ...parallax.style,
        ...positionStyles,
        paddingTop: layout.paddingTop !== undefined ? layout.paddingTop : '0px',
        paddingBottom: layout.paddingBottom !== undefined ? layout.paddingBottom : '0px',
        paddingLeft: layout.paddingLeft !== undefined ? layout.paddingLeft : '0px',
        paddingRight: layout.paddingRight !== undefined ? layout.paddingRight : '0px',
        marginTop: layout.marginTop || '0px',
        marginBottom: layout.marginBottom || '0px',
        minHeight: (layout.minHeight && layout.minHeight !== 'auto') ? layout.minHeight : undefined,
        background: section.background?.gradientString || section.background?.color || 'transparent',
        backgroundImage: section.background?.type === 'image' && section.background?.imageUrl
          ? `linear-gradient(${section.background.imageOverlayColor || 'transparent'}, ${section.background.imageOverlayColor || 'transparent'}), url(${section.background.imageUrl})`
          : section.background?.gradientString
          ? section.background.gradientString
          : undefined,
        backgroundSize: section.background?.imageSize || 'cover',
        backdropFilter: section.background?.backdropBlur && section.background.backdropBlur !== '0px'
          ? `blur(${section.background.backdropBlur})`
          : undefined,
        WebkitBackdropFilter: section.background?.backdropBlur && section.background.backdropBlur !== '0px'
          ? `blur(${section.background.backdropBlur})`
          : undefined,
        borderStyle: border.borderStyle || (section.border?.style as any) || 'none',
        borderWidth: border.borderWidth || section.border?.borderWidth || section.border?.topWidth || '1px',
        borderColor: border.borderColor || section.border?.color || 'transparent',
        borderRadius: border.borderRadius || section.border?.radiusTopLeft || '0px',
        ...getComponentTransitionAndHoverStyle((section as any).style, isStylingHovered),
      }}
    >
      {/* Borda Flutuante de Seleção / Hover no topo dos filhos (z-20) */}
      {!isPublicView && isSelected && (
        <div className="absolute inset-0 border-2 border-[var(--brand-gradient-start)] pointer-events-none z-20 rounded-[inherit]" />
      )}
      {!isPublicView && isSelfHovered && !isSelected && (
        <div className="absolute inset-0 border border-slate-300 dark:border-zinc-700 pointer-events-none z-20 rounded-[inherit]" />
      )}
      {!isPublicView && isDragOver && (
        <div className="absolute inset-0 border-2 border-blue-500 bg-blue-500/10 ring-2 ring-blue-400/50 pointer-events-none z-20 rounded-[inherit]" />
      )}
      {/* Indicator Badge em Drag Over */}
      {!isPublicView && isDragOver && (
        <div className="absolute top-2.5 right-4 flex items-center gap-1.5 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg z-40 select-none">
          <Plus className="w-3.5 h-3.5" />
          <span>Soltar elemento nesta Seção</span>
        </div>
      )}

      {/* Action Bar Flutuante da Seção (Apenas ao Selecionar ou no Hover) */}
      {!isPublicView && (
        <div className={`absolute top-2.5 left-4 flex items-center gap-2 bg-slate-900/90 text-white border border-slate-700/80 text-[10px] font-bold px-3 py-1 rounded-full shadow-2xl z-40 select-none transition-opacity backdrop-blur-md ${
          isSelected || isSelfHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <Layout className="w-3 h-3 text-purple-400" />
          <span>Seção {index + 1}</span>

          {/* Botões Mover Seção para Cima / Baixo */}
          <div className="flex items-center gap-0.5 ml-1 border-l border-r border-slate-700/60 px-1">
            <button
              type="button"
              disabled={index === 0}
              onClick={(e) => {
                e.stopPropagation();
                if (index > 0 && onMoveSection) {
                  onMoveSection(index, index - 1);
                }
              }}
              className={`p-0.5 hover:text-blue-300 transition-colors ${
                index === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
              }`}
              title="Mover Seção para Cima"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              disabled={index >= totalSections - 1}
              onClick={(e) => {
                e.stopPropagation();
                if (index < totalSections - 1 && onMoveSection) {
                  onMoveSection(index, index + 1);
                }
              }}
              className={`p-0.5 hover:text-blue-300 transition-colors ${
                index >= totalSections - 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
              }`}
              title="Mover Seção para Baixo"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const newDiv = createDefaultDiv('Novo Container');
              onAddComponent(section.id, newDiv);
            }}
            className="ml-2 hover:text-emerald-300 font-extrabold flex items-center gap-1 cursor-pointer"
            title="Adicionar Container Div"
          >
            <Plus className="w-3 h-3" />
            + Div
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
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
            }}
            className="hover:text-amber-300 cursor-pointer ml-1"
            title={isHidden ? 'Mostrar Seção' : 'Ocultar Seção'}
          >
            {isHidden ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3" />}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveSection(section.id);
            }}
            className="hover:text-red-400 cursor-pointer ml-1"
            title="Excluir Seção"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Conteúdo da Seção (Render dos Filhos) */}
      <div
        className="w-full mx-auto"
        style={{
          maxWidth: (layout.maxContentWidth && layout.maxContentWidth !== '100%')
            ? layout.maxContentWidth
            : (page?.siteConfig?.theme?.contentMaxWidth || page?.siteConfig?.theme?.containerMaxWidth || '1200px'),
        }}
      >
        {section.components.length > 0 ? (
          <div
            className="flex w-full"
            style={{
              flexDirection: layout.flexDirection || 'row',
              flexWrap: layout.flexWrap || 'nowrap',
              gap: layout.gap || '24px',
              alignItems: (layout.alignItems === 'center' || layout.alignItems === 'flex-end' || layout.alignItems === 'baseline')
                ? layout.alignItems
                : ((layout.flexDirection || 'row') === 'row' ? 'stretch' : (layout.alignItems || 'flex-start')),
              justifyContent: layout.justifyContent || 'flex-start',
              textAlign: layout.textAlign || 'inherit',
            }}
          >
            {section.components.map((comp) => (
              <ComponentWrapper
                key={comp.id}
                component={comp}
                selectedId={selectedId}
                viewportMode={viewportMode}
                page={page}
                onSelect={onSelect}
                onRemove={onRemoveComponent}
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
          <div className="p-8 text-center border-2 border-dashed border-[var(--surface-border)] rounded-2xl text-xs text-slate-400 font-semibold glass-sm flex flex-col items-center justify-center gap-1 hover:border-[var(--brand-gradient-start)] transition-colors select-none">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold">
              <Plus className="w-4 h-4 text-[var(--brand-gradient-start)]" />
              Seção Vazia
            </span>
            <span className="text-[10px] text-slate-400">
              Arraste elementos da barra lateral ou solte aqui para preencher
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
