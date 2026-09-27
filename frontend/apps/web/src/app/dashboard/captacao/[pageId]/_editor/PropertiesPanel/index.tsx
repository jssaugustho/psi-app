'use client';

import React from 'react';
import {
  CanvasData,
  SelectionState,
  Section,
  DivComponent,
  CarouselComponent,
  AtomicComponent,
  ViewportMode,
  GlobalComponentMaster,
  ExposedPropDeclaration,
  GlobalInstanceComponent,
} from '../types';
import { findElementInCanvas } from '../utils/canvasHelpers';
import { ArrowLeft } from 'lucide-react';
import { SectionProperties } from './SectionProperties';
import { DivProperties } from './DivProperties';
import { CarouselProperties } from './CarouselProperties';
import { ComponentProperties } from './ComponentProperties';
import { GlobalInstanceProperties } from './GlobalInstanceProperties';
import { MasterPropertiesPanel } from './MasterPropertiesPanel';

interface PropertiesPanelProps {
  canvasData: CanvasData | null;
  selection: SelectionState;
  viewportMode?: ViewportMode;
  page?: any;
  editingMaster?: GlobalComponentMaster | null;
  onUpdateSection: (id: string, patch: Partial<Section>) => void;
  onRemoveSection: (id: string) => void;
  onMoveSection?: (fromIndex: number, toIndex: number) => void;
  onUpdateComponent: (id: string, patch: any) => void;
  onRemoveComponent: (id: string) => void;
  onAddComponent?: (parentId: string, comp: any) => void;
  onSelectElement?: (id: string | null, type?: any) => void;
  onDeselect: () => void;
  onUpdateSiteConfig?: (patch: any) => void;
  onEditMaster?: (globalComponentId: string) => void;
  onUpdateMaster?: (patch: Partial<GlobalComponentMaster>) => void;
  onToggleExposedProp?: (declaration: ExposedPropDeclaration) => void;
  onDeleteMaster?: () => void;
  onExitMasterEditing?: () => void;
  onUnlinkInstance?: (instanceId: string) => void;
}

export function PropertiesPanel({
  canvasData,
  selection,
  viewportMode = 'desktop',
  page,
  editingMaster,
  onUpdateSection,
  onRemoveSection,
  onMoveSection,
  onUpdateComponent,
  onRemoveComponent,
  onAddComponent,
  onSelectElement,
  onDeselect,
  onUpdateSiteConfig,
  onEditMaster,
  onUpdateMaster,
  onToggleExposedProp,
  onDeleteMaster,
  onExitMasterEditing,
  onUnlinkInstance,
}: PropertiesPanelProps) {
  if (!canvasData) {
    return null;
  }

  const found = selection.id ? findElementInCanvas(canvasData, selection.id) : null;
  const element = found ? found.element : null;

  // 🌐 MODO DE EDIÇÃO DE COMPONENTE MESTRE (IN-PLACE)
  if (editingMaster) {
    const childrenPanel = element ? (
      <div className="space-y-3 pt-2">
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
        {element.type !== 'section' && element.type !== 'div' && element.type !== 'carousel' && element.type !== 'global_instance' && (
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
      </div>
    ) : null;

    return (
      <MasterPropertiesPanel
        editingMaster={editingMaster}
        selectedNode={element && element.type !== 'section' ? (element as any) : null}
        onUpdateMaster={onUpdateMaster || (() => {})}
        onToggleExposedProp={onToggleExposedProp || (() => {})}
        onDeleteMaster={onDeleteMaster || (() => {})}
        onExitMasterEditing={onExitMasterEditing || (() => {})}
        childrenNodePanel={childrenPanel}
      />
    );
  }

  if (!element) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col shrink-0 min-h-0">
      {/* Barra Superior de Navegação (Voltar para + Adicionar Elementos) */}
      <div className="px-3.5 py-2.5 border-b border-[var(--surface-border)] bg-[var(--surface-base)] flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onDeselect}
          className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors cursor-pointer"
          title="Voltar para a paleta de adicionar elementos"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para Adicionar</span>
        </button>
        <span className="text-[10px] font-semibold text-slate-400">
          Propriedades
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
      {element.type === 'global_instance' && (
        <GlobalInstanceProperties
          instance={element as GlobalInstanceComponent}
          globalMaster={canvasData.globalComponentsMap?.[(element as GlobalInstanceComponent).globalComponentId] || null}
          onUpdateOverride={(path, value) => {
            const currentOverrides = (element as GlobalInstanceComponent).overrides || {};
            const nextOverrides = { ...currentOverrides };
            if (value === undefined) {
              delete nextOverrides[path];
            } else {
              nextOverrides[path] = value;
            }
            onUpdateComponent(element.id, { overrides: nextOverrides });
          }}
          onUnlinkInstance={() => {
            if (onUnlinkInstance) {
              onUnlinkInstance(element.id);
            }
          }}
          onEditMaster={() => {
            if (onEditMaster) {
              onEditMaster((element as GlobalInstanceComponent).globalComponentId);
            }
          }}
        />
      )}

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

      {element.type !== 'section' && element.type !== 'div' && element.type !== 'carousel' && element.type !== 'global_instance' && (
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
      </div>
    </div>
  );
}
