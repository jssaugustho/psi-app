'use client';

import React from 'react';
import { CanvasData, SelectionState, Section, DivComponent, AtomicComponent, ViewportMode } from '../types';
import { findElementInCanvas } from '../utils/canvasHelpers';
import { SectionProperties } from './SectionProperties';
import { DivProperties } from './DivProperties';
import { ComponentProperties } from './ComponentProperties';

interface PropertiesPanelProps {
  canvasData: CanvasData | null;
  selection: SelectionState;
  viewportMode?: ViewportMode;
  page?: any;
  onUpdateSection: (id: string, patch: Partial<Section>) => void;
  onRemoveSection: (id: string) => void;
  onUpdateComponent: (id: string, patch: any) => void;
  onRemoveComponent: (id: string) => void;
  onDeselect: () => void;
}

export function PropertiesPanel({
  canvasData,
  selection,
  viewportMode = 'desktop',
  page,
  onUpdateSection,
  onRemoveSection,
  onUpdateComponent,
  onRemoveComponent,
  onDeselect,
}: PropertiesPanelProps) {
  if (!selection.id || !canvasData) {
    return null;
  }

  const found = findElementInCanvas(canvasData, selection.id);
  if (!found) {
    return (
      <aside className="w-80 border-r border-[var(--surface-border)] glass-sm p-4 text-center text-xs text-slate-400">
        Elemento não encontrado no canvas.
      </aside>
    );
  }

  const { element } = found;

  return (
    <aside className="w-80 border-r border-[var(--surface-border)] glass-sm flex flex-col shrink-0">
      {element.type === 'section' && (
        <SectionProperties
          section={element as Section}
          viewportMode={viewportMode}
          page={page}
          onUpdateSection={onUpdateSection}
          onRemoveSection={onRemoveSection}
          onDeselect={onDeselect}
        />
      )}

      {element.type === 'div' && (
        <DivProperties
          divComponent={element as DivComponent}
          viewportMode={viewportMode}
          page={page}
          onUpdateComponent={onUpdateComponent}
          onRemoveComponent={onRemoveComponent}
          onDeselect={onDeselect}
        />
      )}

      {element.type !== 'section' && element.type !== 'div' && (
        <ComponentProperties
          component={element as AtomicComponent}
          viewportMode={viewportMode}
          page={page}
          onUpdateComponent={onUpdateComponent}
          onRemoveComponent={onRemoveComponent}
          onDeselect={onDeselect}
        />
      )}
    </aside>
  );
}
