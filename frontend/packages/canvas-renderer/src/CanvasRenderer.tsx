'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { DndContext } from '@dnd-kit/core';
import { CanvasData, ViewportMode, Section, DivComponent } from './types';
import { SectionWrapper } from './SectionWrapper';
import { DivWrapper } from './DivWrapper';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { ContextMenu, ContextMenuState } from './components/ContextMenu';
import { InlineSelectionHelper } from './components/InlineSelectionHelper';
import { loadGoogleFonts } from './utils/googleFonts';
import { getThemeColors, getThemeTypography } from './utils/colorHelpers';
import { normalizeCanvasData, denormalizeCanvasData } from './utils/canvasHelpers';
import { createSectionFromPreset } from './constants';

export interface CanvasRendererProps {
  canvasData: CanvasData | null;
  viewportMode?: ViewportMode;
  selectedId?: string | null;
  page?: any;
  onSelectElement?: (id: string | null, type?: any) => void;
  onUpdateCanvas?: (newCanvas: CanvasData) => void;
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
  onDuplicateElement?: (id: string) => void;
  onCopyElement?: (id: string) => void;
  onPasteElement?: (id: string) => void;
  onPasteStyleElement?: (id: string) => void;
  onSaveAsGlobal?: (id: string) => void;
  copiedElement?: any;
  canPaste?: boolean;
  onCtaClick?: () => void;
  isPublicView?: boolean;
}

const noop = () => {};

export function CanvasRenderer({
  canvasData,
  viewportMode = 'desktop',
  selectedId = null,
  page,
  onSelectElement = () => {},
  onUpdateCanvas,
  onRemoveSection = () => {},
  onRemoveComponent = () => {},
  onUpdateSection = () => {},
  onUpdateComponent,
  onAddComponent = () => {},
  onAddCustomSection,
  onMoveSection,
  onMoveElement,
  onMoveElementBeforeOrAfter,
  onAddComponentBeforeOrAfter,
  onDuplicateElement,
  onCopyElement,
  onPasteElement,
  onPasteStyleElement,
  onSaveAsGlobal,
  copiedElement,
  canPaste = false,
  onCtaClick,
  isPublicView = false,
}: CanvasRendererProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    targetId: '',
    targetType: 'component',
  });

  const { sensors, handleDragEnd } = useDragAndDrop({
    canvasData,
  });

  const { siteBg, primaryStart, primaryEnd, contrast } = getThemeColors(page);
  const themeTypo = getThemeTypography(page);

  useEffect(() => {
    loadGoogleFonts([themeTypo.fontHeading, themeTypo.fontBody]);
  }, [themeTypo.fontHeading, themeTypo.fontBody]);

  const handleHover = useCallback((id: string | null) => {
    setHoveredId(id);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, id: string, type: string) => {
    if (isPublicView) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      targetId: id,
      targetType: type,
    });
  }, [isPublicView]);

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Denormaliza o canvasData garantindo compatibilidade com renderizador de seções de nível 1
  const denormalizedCanvasData = useMemo(() => {
    return canvasData ? denormalizeCanvasData(canvasData) : null;
  }, [canvasData]);

  const content = (
    <div
      className={`flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center min-h-full relative transition-colors w-full ${
        isPublicView
          ? 'p-0 w-full'
          : viewportMode === 'mobile'
          ? 'p-6 bg-[var(--surface-base)]'
          : 'p-0 w-full'
      }`}
      onMouseLeave={() => setHoveredId(null)}
      style={
        viewportMode === 'desktop' || isPublicView
          ? ({
              backgroundColor: siteBg,
              '--brand-gradient-start': primaryStart,
              '--brand-gradient-end': primaryEnd,
              '--brand-contrast-color': contrast,
              '--card-bg': siteBg,
              '--site-bg': siteBg,
              color: 'inherit',
              fontFamily: themeTypo.fontBody ? `'${themeTypo.fontBody}', sans-serif` : 'inherit',
            } as React.CSSProperties)
          : ({
              '--brand-gradient-start': primaryStart,
              '--brand-gradient-end': primaryEnd,
              '--brand-contrast-color': contrast,
              '--card-bg': siteBg,
              '--site-bg': siteBg,
              color: 'inherit',
              fontFamily: themeTypo.fontBody ? `'${themeTypo.fontBody}', sans-serif` : 'inherit',
            } as React.CSSProperties)
      }
      onClick={() => {
        if (!isPublicView) {
          onSelectElement(null);
          closeContextMenu();
        }
      }}
    >
      {/* Frame de Simulação de Viewport com Injeção Dinâmica da Identidade Visual */}
      <div
        className={`w-full min-h-full transition-all duration-300 relative flex flex-col flex-1 ${
          isPublicView
            ? 'w-full shadow-none border-none rounded-none'
            : viewportMode === 'mobile'
            ? 'max-w-[390px] border border-[var(--surface-border)] rounded-3xl shadow-2xl overflow-hidden min-h-[750px] my-4'
            : 'w-full shadow-none border-none rounded-none'
        }`}
        style={{
          backgroundColor: siteBg,
        }}
      >
        {/* Seções do Canvas */}
        {denormalizedCanvasData && denormalizedCanvasData.sections && denormalizedCanvasData.sections.length > 0 ? (
          denormalizedCanvasData.sections.map((sec: Section, idx: number) => (
            <SectionWrapper
              key={sec.id}
              section={sec}
              index={idx}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onHover={handleHover}
              viewportMode={viewportMode}
              page={page}
              onSelect={onSelectElement}
              onRemoveSection={onRemoveSection}
              onRemoveComponent={onRemoveComponent}
              onUpdateSection={onUpdateSection}
              onUpdateComponent={onUpdateComponent}
              onAddComponent={onAddComponent}
              onAddCustomSection={onAddCustomSection}
              onMoveSection={onMoveSection}
              onMoveElement={onMoveElement}
              onMoveElementBeforeOrAfter={onMoveElementBeforeOrAfter}
              onAddComponentBeforeOrAfter={onAddComponentBeforeOrAfter}
              onContextMenu={handleContextMenu}
              isPublicView={isPublicView}
            />
          ))
        ) : !isPublicView ? (
          <div className="p-16 text-center border-2 border-dashed border-[var(--surface-border)] rounded-3xl glass-sm space-y-3">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Seu Canvas está vazio
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Selecione uma seção na aba "Seções" da barra lateral para iniciar a construção visual.
            </p>
          </div>
        ) : null}
      </div>

      {/* Floating Context Menu (Botão Direito) - Apenas modo Editor */}
      {!isPublicView && (
        <ContextMenu
          menuState={contextMenu}
          onClose={closeContextMenu}
          onEdit={(id, type) => onSelectElement(id, type)}
          onDuplicate={(id) => onDuplicateElement?.(id)}
          onCopy={(id) => onCopyElement?.(id)}
          onPaste={(id) => onPasteElement?.(id)}
          onPasteStyle={(id) => onPasteStyleElement?.(id)}
          onSaveAsGlobal={(id) => onSaveAsGlobal?.(id)}
          onDelete={(id, type) => {
            if (type === 'section') {
              onRemoveSection(id);
            } else {
              onRemoveComponent(id);
            }
          }}
          canPaste={canPaste}
          canPasteStyle={!!copiedElement && copiedElement.type === contextMenu.targetType}
        />
      )}

      {/* Inline Text Selection Typography Helper - Apenas modo Editor */}
      {!isPublicView && <InlineSelectionHelper page={page} />}
    </div>
  );

  if (isPublicView) {
    return content;
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {content}
    </DndContext>
  );
}
