'use client';

import React, { useRef } from 'react';
import { CanvasData, ViewportMode, Section } from '@psi/canvas-renderer';
import { CanvasIframePortal, CanvasIframePortalRef } from './CanvasIframePortal';
import { CanvasOverlay } from './CanvasOverlay';

export interface EditorCanvasProps {
  canvasData: CanvasData | null;
  viewportMode: ViewportMode;
  selectedId: string | null;
  selectedType?: string | null;
  page?: any;
  onSelectElement: (id: string | null, type?: any) => void;
  onUpdateCanvas?: (newCanvas: CanvasData) => void;
  onRemoveSection: (id: string) => void;
  onRemoveComponent: (id: string) => void;
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
  isPublicView?: boolean;
}

export function EditorCanvas(props: EditorCanvasProps) {
  const portalRef = useRef<CanvasIframePortalRef>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Mantém a referência síncrona do iframe para o CanvasOverlay
  const getIframeRef = () => {
    return {
      current: portalRef.current?.iframeEl || null,
    };
  };

  const isMobile = props.viewportMode === 'mobile';

  return (
    <div
      id="canvas-viewport"
      className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center min-h-full relative transition-colors w-full bg-[var(--surface-base)]"
    >
      {/* Frame de Simulação do Viewport (Desktop vs Mobile) */}
      <div
        className={`relative flex flex-col flex-1 transition-all duration-300 ${
          props.isPublicView
            ? 'w-full h-full min-h-full'
            : isMobile
            ? 'w-[390px] min-h-[750px] max-h-[840px] my-6 rounded-3xl border border-[var(--surface-border)] shadow-2xl overflow-hidden'
            : 'w-full h-full min-h-full'
        }`}
      >
        {/* Renderizador do Iframe Limpo (Visão do DOM) */}
        <CanvasIframePortal
          ref={portalRef}
          canvasData={props.canvasData}
          viewportMode={props.viewportMode}
          page={props.page}
          isPublicView={props.isPublicView}
        />

        {/* Camada Transparente de Interação e Edição no Documento Pai (Host Overlay) */}
        {!props.isPublicView && (
          <CanvasOverlay
            canvasData={props.canvasData}
            selectedId={props.selectedId}
            selectedType={props.selectedType || null}
            iframeRef={getIframeRef()}
            onSelectElement={props.onSelectElement}
            onRemoveSection={props.onRemoveSection}
            onRemoveComponent={props.onRemoveComponent}
            onUpdateSection={props.onUpdateSection}
            onUpdateComponent={props.onUpdateComponent}
            onAddComponent={props.onAddComponent}
            onAddCustomSection={props.onAddCustomSection}
            onMoveSection={props.onMoveSection}
            onMoveElement={props.onMoveElement}
            onMoveElementBeforeOrAfter={props.onMoveElementBeforeOrAfter}
            onAddComponentBeforeOrAfter={props.onAddComponentBeforeOrAfter}
            onDuplicateElement={props.onDuplicateElement}
            onCopyElement={props.onCopyElement}
            onPasteElement={props.onPasteElement}
            onPasteStyleElement={props.onPasteStyleElement}
            onSaveAsGlobal={props.onSaveAsGlobal}
            copiedElement={props.copiedElement}
            canPaste={props.canPaste}
          />
        )}
      </div>
    </div>
  );
}
