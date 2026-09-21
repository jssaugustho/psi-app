'use client';

import React, { useState, useRef } from 'react';
import { Section, ViewportMode, CanvasData } from './types';
import { ComponentWrapper } from './ComponentWrapper';
import { Layout, Trash2, Plus, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';
import { createDefaultDiv, createDefaultCarousel, createDefaultComponent, createSectionFromPreset } from './constants';
import { getSectionDisplayName } from './utils/sectionHelpers';
import { buildComponentCssStyle } from './utils/colorHelpers';
import { useScrollThreshold, getPositionStyles } from './utils/positionHelpers';
import { useParallaxEffect } from './hooks/useParallaxEffect';
import { useIsAdjustingProperty } from './utils/propertyAdjustHelpers';

interface SectionWrapperProps {
  section: Section;
  index: number;
  totalSections?: number;
  selectedId?: string | null;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  viewportMode?: ViewportMode;
  page?: any;
  canvasData?: CanvasData | null;
  onSelect?: (id: string, type: any) => void;
  onRemoveSection?: (id: string) => void;
  onRemoveComponent?: (id: string) => void;
  onUpdateSection?: (id: string, patch: Partial<Section>) => void;
  onUpdateComponent?: (id: string, patch: any) => void;
  onAddComponent?: (parentId: string, comp: any) => void;
  onAddCustomSection?: (section: Section) => void;
  onMoveSection?: (fromIndex: number, toIndex: number) => void;
  onMoveElement?: (elementId: string, targetParentId: string) => void;
  onMoveElementBeforeOrAfter?: (elementId: string, targetElementId: string, position: 'before' | 'after') => void;
  onAddComponentBeforeOrAfter?: (targetElementId: string, comp: any, position: 'before' | 'after') => void;
  onContextMenu?: (e: React.MouseEvent, id: string, type: string) => void;
  onCtaClick?: () => void;
  isPublicView?: boolean;
}

export function SectionWrapper({
  section,
  index,
  totalSections = 1,
  selectedId = null,
  hoveredId = null,
  onHover,
  viewportMode = 'desktop',
  page,
  canvasData,
  onSelect,
  onRemoveSection,
  onRemoveComponent,
  onUpdateSection,
  onUpdateComponent,
  onAddComponent,
  onAddCustomSection,
  onMoveSection,
  onMoveElement,
  onMoveElementBeforeOrAfter,
  onAddComponentBeforeOrAfter,
  onContextMenu,
  onCtaClick,
  isPublicView = false,
}: SectionWrapperProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const isAdjustingProperty = useIsAdjustingProperty();
  const [isDragOver, setIsDragOver] = useState(false);
  const isSelfHovered = !isPublicView && hoveredId === section.id && !isAdjustingProperty;
  const isSelected = !isPublicView && selectedId === section.id && !isAdjustingProperty;
  const isMobile = viewportMode === 'mobile';

  const layout = isMobile
    ? { ...section.layout, ...(section.mobile || {}) }
    : section.layout;
  const border = isMobile
    ? { ...(section.border || {}), ...(section.mobile?.border || {}) }
    : (section.border || {});

  const isPastThreshold = useScrollThreshold(!!layout?.appearOnScroll, layout?.scrollThreshold || 300);
  const positionStyles = getPositionStyles(layout, section.mobile, isMobile, isPastThreshold, !isPublicView);
  const parallax = useParallaxEffect({
    speed: layout?.parallaxSpeed || 0,
    disableMobile: !!layout?.disableParallaxMobile,
    isMobile,
    isEditorMode: !isPublicView,
  });

  const isHidden = isMobile
    ? (section.mobile?.hidden ?? section.hidden ?? false)
    : (section.hidden ?? false);

  if (isHidden) return null;

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

      // CASO B: INSERIR NOVO ELEMENTO DA SIDEBAR
      if (data.itemType) {
        if (data.itemType === 'section') {
          const newSec = createSectionFromPreset(data.preset);
          if (onAddCustomSection) {
            onAddCustomSection(newSec);
            if (onSelect) {
              onSelect(newSec.id, 'section');
            }
          }
          return;
        }

        let newComp: any = null;
        if (data.itemType === 'div') {
          newComp = createDefaultDiv('Container (Div)');
        } else if (data.itemType === 'carousel') {
          newComp = createDefaultCarousel();
        } else {
          newComp = createDefaultComponent(data.itemType, data.preset);
        }

        if (newComp && onAddComponent) {
          onAddComponent(section.id, newComp);
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

  return (
    <section
      ref={sectionRef}
      id={section.anchorId || section.id}
      data-node-id={section.id}
      data-is-container="true"
      onClick={(e) => {
        if (!isPublicView && onSelect) {
          e.stopPropagation();
          onSelect(section.id, 'section');
        }
      }}
      onContextMenu={!isPublicView ? handleContextMenu : undefined}
      onDragOver={!isPublicView ? handleDragOver : undefined}
      onDragLeave={!isPublicView ? handleDragLeave : undefined}
      onDrop={!isPublicView ? handleDrop : undefined}
      onMouseOver={(e) => {
        if (!isPublicView && onHover) {
          e.stopPropagation();
          onHover(section.id);
        }
      }}
      className={`relative w-full flex flex-col transition-all duration-200 ${
        !isPublicView ? 'cursor-pointer' : ''
      } ${
        isHidden ? 'opacity-40 grayscale outline-dashed outline-2 outline-amber-500' : ''
      }`}
      style={{
        ...parallax.style,
        ...positionStyles,
        paddingTop: layout?.paddingTop !== undefined ? layout.paddingTop : '0px',
        paddingBottom: layout?.paddingBottom !== undefined ? layout.paddingBottom : '0px',
        paddingLeft: layout?.paddingLeft !== undefined ? layout.paddingLeft : '0px',
        paddingRight: layout?.paddingRight !== undefined ? layout.paddingRight : '0px',
        minHeight: (layout?.minHeight && layout.minHeight !== 'auto') ? layout.minHeight : undefined,
        ...buildComponentCssStyle({
          component: section,
          viewportMode,
          isHovered: false,
          page,
          canvasData,
          componentCategory: 'section',
        }),
      }}
    >
      {/* Borda Flutuante de Seleção / Hover no topo dos filhos (z-20) */}
      {!isPublicView && isSelected && (
        <div className="absolute inset-0 border-2 border-purple-500 pointer-events-none z-20" />
      )}
      {!isPublicView && isSelfHovered && !isSelected && (
        <div className="absolute inset-0 border border-purple-400/60 pointer-events-none z-20" />
      )}
      {/* Background Video Player */}
      {section.background?.type === 'video' && section.background?.videoUrl && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            src={section.background.videoUrl}
          />
          {section.background.videoOverlayColor && (
            <div
              className="absolute inset-0 z-10"
              style={{ backgroundColor: section.background.videoOverlayColor }}
            />
          )}
        </div>
      )}

      {!isPublicView && isDragOver && (
        <div className="absolute inset-0 border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-30" />
      )}

      {!isPublicView && isDragOver && (
        <div className="absolute top-2.5 right-4 flex items-center gap-1.5 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg z-40 select-none">
          <Plus className="w-3.5 h-3.5" />
          <span>Soltar elemento nesta Seção</span>
        </div>
      )}

      {/* Action Bar Flutuante da Seção (Apenas no Editor) */}
      {!isPublicView && (
        <div
          onMouseEnter={(e) => {
            if (!isPublicView && onHover) {
              e.stopPropagation();
              onHover(section.id);
            }
          }}
          onMouseLeave={(e) => {
            if (!isPublicView && onHover) {
              e.stopPropagation();
              onHover(null);
            }
          }}
          className={`absolute top-2.5 left-4 flex items-center gap-2 bg-slate-900/90 text-white border ${
            isSelected ? 'border-purple-500' : 'border-blue-500/80'
          } text-[10px] font-bold px-3 py-1 rounded-full shadow-2xl z-40 select-none transition-opacity backdrop-blur-md ${
            isSelected || isSelfHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <Layout className={`w-3 h-3 ${isSelected ? 'text-purple-400' : 'text-blue-400'}`} />
          <span className="truncate max-w-[180px]">{section.label || `Seção ${index + 1}`}</span>

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

          {onUpdateSection && (
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
          )}

          {onRemoveSection && (
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
          )}
        </div>
      )}

      {/* Conteúdo da Seção (Render dos Filhos) */}
      <div
        className="w-full mx-auto flex-1 flex flex-col justify-inherit"
        style={{
          maxWidth: (layout.maxContentWidth && layout.maxContentWidth !== '100%')
            ? layout.maxContentWidth
            : (page?.siteConfig?.theme?.contentMaxWidth || page?.siteConfig?.theme?.containerMaxWidth || '1200px'),
          justifyContent: layout.justifyContent || 'flex-start',
        }}
      >
        {section.components.length > 0 ? (
          <div
            className="flex w-full flex-1"
            style={{
              flexDirection: layout.flexDirection || 'row',
              flexWrap: layout.flexWrap || 'nowrap',
              gap: layout.gap || '24px',
              alignItems: layout.alignItems || ((layout.flexDirection || 'row') === 'row' ? 'stretch' : 'flex-start'),
              justifyContent: layout.justifyContent || 'flex-start',
              textAlign: layout.textAlign || 'inherit',
            }}
          >
            {section.components.map((comp) => (
              <ComponentWrapper
                key={comp.id}
                component={comp}
                selectedId={selectedId}
                hoveredId={hoveredId}
                onHover={onHover}
                viewportMode={viewportMode}
                page={page}
                canvasData={canvasData}
                onSelect={onSelect}
                onRemove={onRemoveComponent}
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

      {/* Borda de Seleção (Roxa) / Hover (Azul) - Desenhar no Topo do Stacking Context (Z-20) */}
      {!isPublicView && isSelected && (
        <div
          className="absolute inset-0 pointer-events-none z-20 shadow-sm"
          style={{ borderColor: '#9333ea', borderStyle: 'solid', borderWidth: '2px' }}
        />
      )}
      {!isPublicView && isSelfHovered && !isSelected && (
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{ borderColor: '#3b82f6', borderStyle: 'solid', borderWidth: '2px' }}
        />
      )}
      {!isPublicView && isDragOver && (
        <div
          className="absolute inset-0 bg-blue-500/10 pointer-events-none z-20"
          style={{ borderColor: '#3b82f6', borderStyle: 'solid', borderWidth: '2px' }}
        />
      )}
    </section>
  );
}
