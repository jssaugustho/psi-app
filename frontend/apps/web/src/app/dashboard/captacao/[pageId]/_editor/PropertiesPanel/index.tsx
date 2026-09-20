'use client';

import React from 'react';
import { CanvasData, SelectionState, Section, DivComponent, CarouselComponent, AtomicComponent, ViewportMode } from '../types';
import { findElementInCanvas } from '../utils/canvasHelpers';
import { SectionProperties } from './SectionProperties';
import { DivProperties } from './DivProperties';
import { CarouselProperties } from './CarouselProperties';
import { ComponentProperties } from './ComponentProperties';

interface PropertiesPanelProps {
  canvasData: CanvasData | null;
  selection: SelectionState;
  viewportMode?: ViewportMode;
  page?: any;
  onUpdateSection: (id: string, patch: Partial<Section>) => void;
  onRemoveSection: (id: string) => void;
  onMoveSection?: (fromIndex: number, toIndex: number) => void;
  onUpdateComponent: (id: string, patch: any) => void;
  onRemoveComponent: (id: string) => void;
  onAddComponent?: (parentId: string, comp: any) => void;
  onSelectElement?: (id: string | null, type?: any) => void;
  onDeselect: () => void;
  onUpdateSiteConfig?: (patch: any) => void;
}

export function PropertiesPanel({
  canvasData,
  selection,
  viewportMode = 'desktop',
  page,
  onUpdateSection,
  onRemoveSection,
  onMoveSection,
  onUpdateComponent,
  onRemoveComponent,
  onAddComponent,
  onSelectElement,
  onDeselect,
  onUpdateSiteConfig,
}: PropertiesPanelProps) {
  if (!selection.id || !canvasData) {
    return null;
  }

  const found = findElementInCanvas(canvasData, selection.id);
  if (!found) {
    return (
      <aside className="w-full h-full border-r border-[var(--surface-border)] glass-sm p-4 text-center text-xs text-slate-400">
        Elemento não encontrado no canvas.
      </aside>
    );
  }

  const { element } = found;

  return (
    <aside className="w-full h-full border-r border-[var(--surface-border)] glass-sm flex flex-col shrink-0">
      {element.type === 'section' && (
        <SectionProperties
          section={element as Section}
          canvasData={canvasData}
          viewportMode={viewportMode}
          page={page}
          onUpdateSection={onUpdateSection}
          onRemoveSection={onRemoveSection}
          onMoveSection={onMoveSection}
          onDeselect={onDeselect}
        />
      )}

      {element.type === 'carousel' && (
        <CarouselProperties
          carouselComponent={element as CarouselComponent}
          viewportMode={viewportMode}
          page={page}
          onUpdateComponent={onUpdateComponent}
          onRemoveComponent={onRemoveComponent}
          onAddComponent={onAddComponent}
          onSelect={onSelectElement}
          onDeselect={onDeselect}
        />
      )}

      {element.type === 'div' && (
        <DivProperties
          divComponent={element as DivComponent}
          canvasData={canvasData}
          viewportMode={viewportMode}
          page={page}
          onUpdateComponent={onUpdateComponent}
          onRemoveComponent={onRemoveComponent}
          onDeselect={onDeselect}
        />
      )}

      {element.type !== 'section' && element.type !== 'div' && element.type !== 'carousel' && (
        <ComponentProperties
          component={element as AtomicComponent}
          canvasData={canvasData}
          viewportMode={viewportMode}
          page={page}
          onUpdateComponent={onUpdateComponent}
          onRemoveComponent={onRemoveComponent}
          onDeselect={onDeselect}
          onUpdateSiteConfig={onUpdateSiteConfig}
        />
      )}
    </aside>
  );
}
