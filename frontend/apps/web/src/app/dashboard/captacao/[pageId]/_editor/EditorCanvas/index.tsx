'use client';

import React from 'react';
import { CanvasRenderer as SharedCanvasRenderer, CanvasData, ViewportMode, Section } from '@psi/canvas-renderer';

export interface EditorCanvasProps {
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
  onAddCustomSection?: (section: Section) => void;
  onMoveSection?: (fromIndex: number, toIndex: number) => void;
  onMoveElement?: (elementId: string, targetParentId: string) => void;
  onMoveElementBeforeOrAfter?: (elementId: string, targetElementId: string, position: 'before' | 'after') => void;
  onAddComponentBeforeOrAfter?: (targetElementId: string, comp: any, position: 'before' | 'after') => void;
  onDuplicateElement?: (id: string) => void;
  onCopyElement?: (id: string) => void;
  onPasteElement?: (id: string) => void;
  onPasteStyleElement?: (id: string) => void;
  copiedElement?: any;
  canPaste?: boolean;
  isPublicView?: boolean;
}

export function EditorCanvas(props: EditorCanvasProps) {
  return <SharedCanvasRenderer {...props} isPublicView={props.isPublicView ?? false} />;
}
