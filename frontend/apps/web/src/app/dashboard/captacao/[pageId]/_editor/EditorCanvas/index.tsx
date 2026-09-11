'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { DndContext } from '@dnd-kit/core';
import { CanvasData, ViewportMode, Section } from '../types';
import { SectionWrapper } from './SectionWrapper';
import { SiteNavbarWrapper } from './SiteNavbarWrapper';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { ContextMenu, ContextMenuState } from '../components/ContextMenu';
import { loadGoogleFonts } from '../utils/googleFonts';
import { getThemeColors } from '../utils/colorHelpers';

interface EditorCanvasProps {
  canvasData: CanvasData | null;
  viewportMode: ViewportMode;
  selectedId: string | null;
  page?: any;
  onSelectElement: (id: string | null, type?: any) => void;
  onUpdateCanvas: (newCanvas: CanvasData) => void;
  onRemoveSection: (id: string) => void;
  onRemoveComponent: (id: string) => void;
  onUpdateSection: (id: string, patch: Partial<Section>) => void;
  onUpdateComponent?: (id: string, patch: any) => void;
  onAddComponent: (parentId: string, comp: any) => void;
  onMoveElement?: (elementId: string, targetParentId: string) => void;
  onMoveElementBeforeOrAfter?: (elementId: string, targetElementId: string, position: 'before' | 'after') => void;
  onAddComponentBeforeOrAfter?: (targetElementId: string, comp: any, position: 'before' | 'after') => void;
  onDuplicateElement?: (id: string) => void;
  onCopyElement?: (id: string) => void;
  onPasteElement?: (id: string) => void;
  canPaste?: boolean;
}

export function EditorCanvas({
  canvasData,
  viewportMode,
  selectedId,
  page,
  onSelectElement,
  onUpdateCanvas,
  onRemoveSection,
  onRemoveComponent,
  onUpdateSection,
  onUpdateComponent,
  onAddComponent,
  onMoveElement,
  onMoveElementBeforeOrAfter,
  onAddComponentBeforeOrAfter,
  onDuplicateElement,
  onCopyElement,
  onPasteElement,
  canPaste = false,
}: EditorCanvasProps) {
  const { sensors, handleDragEnd } = useDragAndDrop({
    canvasData,
    onUpdateCanvas,
    onSelectElement,
  });

  const { primaryStart, primaryEnd, contrast, siteBg } = getThemeColors(page);
  const fontHeading = page?.siteConfig?.theme?.fontHeading || page?.theme?.fontHeading;
  const fontBody = page?.siteConfig?.theme?.fontBody || page?.theme?.fontBody;


  // Injeta automaticamente as fontes do tema no document.head
  useEffect(() => {
    loadGoogleFonts([fontHeading, fontBody]);
  }, [fontHeading, fontBody]);

  // Estado do Menu de Contexto (Botão Direito)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    targetId: null,
    targetType: null,
  });

  const handleContextMenu = useCallback((e: React.MouseEvent, id: string, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      targetId: id,
      targetType: type,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div
        className={`flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col items-center min-h-full relative transition-colors ${
          viewportMode === 'mobile' ? 'bg-slate-900/10 dark:bg-black/40' : ''
        }`}
        style={
          viewportMode === 'desktop'
            ? ({
                backgroundColor: siteBg,
                '--brand-gradient-start': primaryStart,
                '--brand-gradient-end': primaryEnd,
                '--brand-contrast-color': contrast,
                '--card-bg': siteBg,
                '--site-bg': siteBg,
                color: 'inherit',
                fontFamily: fontBody ? `'${fontBody}', sans-serif` : 'inherit',
              } as React.CSSProperties)
            : ({
                '--brand-gradient-start': primaryStart,
                '--brand-gradient-end': primaryEnd,
                '--brand-contrast-color': contrast,
                '--card-bg': siteBg,
                '--site-bg': siteBg,
                color: 'inherit',
                fontFamily: fontBody ? `'${fontBody}', sans-serif` : 'inherit',
              } as React.CSSProperties)
        }
        onClick={() => {
          onSelectElement(null);
          closeContextMenu();
        }}
      >
        {/* Frame de Simulação de Viewport com Injeção Dinâmica da Identidade Visual */}
        <div
          className={`w-full transition-all duration-300 ${
            viewportMode === 'mobile'
              ? 'max-w-[390px] border-[8px] border-slate-800 rounded-[40px] shadow-2xl overflow-y-auto max-h-[840px] custom-scrollbar p-2'
              : 'max-w-[1300px] w-full h-auto min-h-full'
          }`}
          style={{
            backgroundColor: siteBg,
          }}
        >
          {/* Header / Navbar do Site */}
          {canvasData?.navbar?.enabled && (
            <SiteNavbarWrapper
              navbar={canvasData.navbar}
              sections={canvasData.sections}
              isSelected={selectedId === 'navbar-root'}
              onSelect={onSelectElement}
              page={page}
            />
          )}

          {/* Seções do Canvas */}
          {canvasData && canvasData.sections.length > 0 ? (
            canvasData.sections.map((sec, idx) => (
              <SectionWrapper
                key={sec.id}
                section={sec}
                index={idx}
                selectedId={selectedId}
                viewportMode={viewportMode}
                page={page}
                onSelect={onSelectElement}
                onRemoveSection={onRemoveSection}
                onRemoveComponent={onRemoveComponent}
                onUpdateSection={onUpdateSection}
                onUpdateComponent={onUpdateComponent}
                onAddComponent={onAddComponent}
                onMoveElement={onMoveElement}
                onMoveElementBeforeOrAfter={onMoveElementBeforeOrAfter}
                onAddComponentBeforeOrAfter={onAddComponentBeforeOrAfter}
                onContextMenu={handleContextMenu}
              />
            ))
          ) : (
            <div className="p-16 text-center border-2 border-dashed border-[var(--surface-border)] rounded-3xl glass-sm space-y-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Seu Canvas está vazio
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Selecione uma seção na aba "Seções" da barra lateral para iniciar a construção visual.
              </p>
            </div>
          )}
        </div>

        {/* Floating Context Menu (Botão Direito) */}
        <ContextMenu
          menuState={contextMenu}
          onClose={closeContextMenu}
          onEdit={(id, type) => onSelectElement(id, type)}
          onDuplicate={(id) => onDuplicateElement?.(id)}
          onCopy={(id) => onCopyElement?.(id)}
          onPaste={(id) => onPasteElement?.(id)}
          onDelete={(id, type) => {
            if (type === 'section') {
              onRemoveSection(id);
            } else {
              onRemoveComponent(id);
            }
          }}
          canPaste={canPaste}
        />
      </div>
    </DndContext>
  );
}
