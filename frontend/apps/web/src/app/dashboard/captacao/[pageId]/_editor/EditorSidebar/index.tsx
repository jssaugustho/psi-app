'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AddPalette } from './AddPalette';
import { LayersPanel, findParentChainIds } from './LayersPanel';
import { SidebarSettingsPanel } from './SidebarSettingsPanel';
import { PropertiesPanel } from '../PropertiesPanel';
import { Plus, Layers, Settings, Sliders } from 'lucide-react';
import { CanvasData, AtomicComponentType, Section, Component, ViewportMode, GlobalComponentMaster, ExposedPropDeclaration } from '../types';
import { CapturePage } from '@/lib/api';
import { useEditorStateMemory, useSidebarScrollMemory } from '../context/EditorStateMemoryContext';

interface EditorSidebarProps {
  canvasData: CanvasData | null;
  selectedId: string | null;
  selectedType?: string | null;
  viewportMode?: ViewportMode;
  page?: CapturePage | null;
  editingMaster?: GlobalComponentMaster | null;
  onAddSection: (label?: string) => void;
  onAddCustomSection?: (section: Section) => void;
  onAddComponent: (type: 'div' | 'carousel' | 'global_instance' | AtomicComponentType, preset?: string) => void;
  onAddComponentToParent?: (parentId: string, comp: any) => void;
  onSelectElement: (id: string | null, type?: any) => void;
  onRemoveSection: (id: string) => void;
  onRemoveComponent: (id: string) => void;
  onUpdateSection: (id: string, patch: Partial<Section>) => void;
  onUpdateComponent: (id: string, patch: Partial<Component>) => void;
  onMoveSection?: (fromIndex: number, toIndex: number) => void;
  onMoveElement?: (elementId: string, targetParentId: string) => void;
  onMoveElementBeforeOrAfter?: (elementId: string, targetElementId: string, position: 'before' | 'after') => void;
  onUpdateSiteConfig?: (patch: any) => void;
  onUpdatePage?: (patch: Partial<CapturePage>) => void;
  onEditMaster?: (globalComponentId: string) => void;
  onUpdateMaster?: (patch: Partial<GlobalComponentMaster>) => void;
  onToggleExposedProp?: (declaration: ExposedPropDeclaration) => void;
  onDeleteMaster?: () => void;
  onExitMasterEditing?: () => void;
  onUnlinkInstance?: (instanceId: string) => void;
}

export function EditorSidebar({
  canvasData,
  selectedId,
  selectedType,
  viewportMode = 'desktop',
  page,
  editingMaster,
  onAddSection,
  onAddCustomSection,
  onAddComponent,
  onAddComponentToParent,
  onSelectElement,
  onRemoveSection,
  onRemoveComponent,
  onUpdateSection,
  onUpdateComponent,
  onMoveSection,
  onMoveElement,
  onMoveElementBeforeOrAfter,
  onUpdateSiteConfig,
  onUpdatePage,
  onEditMaster,
  onUpdateMaster,
  onToggleExposedProp,
  onDeleteMaster,
  onExitMasterEditing,
  onUnlinkInstance,
}: EditorSidebarProps) {
  const [tab, setTab] = useState<'add' | 'layers' | 'settings'>('add');
  const memory = useEditorStateMemory();
  const prevSelectedIdRef = useRef(selectedId);

  // Auto-switch para aba 'add' (propriedades) quando um elemento for recém-selecionado a partir da tela de configurações
  useEffect(() => {
    if (prevSelectedIdRef.current === null && selectedId !== null) {
      if (tab === 'settings') {
        setTab('add');
      }
    }
    prevSelectedIdRef.current = selectedId;
  }, [selectedId, tab]);

  // Estado com memória de quais camadas estão ABERTAS
  const localOpenLayerIdsState = useState<Set<string>>(new Set());
  const openLayerIds = memory ? memory.openLayerIds : localOpenLayerIdsState[0];
  const setOpenLayerIds = memory ? memory.setOpenLayerIds : localOpenLayerIdsState[1];

  // Memória de Posição de Scroll por Aba da Sidebar
  const { containerRef: sidebarScrollRef, handleScroll: handleSidebarScroll } = useSidebarScrollMemory(`sidebar:tab:${tab}`);

  // Auto-expandir apenas os containers pais do elemento selecionado no canvas
  useEffect(() => {
    if (selectedId && canvasData) {
      const parentIds = findParentChainIds(canvasData, selectedId);
      if (parentIds.length > 0) {
        setOpenLayerIds((prev) => {
          let changed = false;
          const next = new Set(prev);
          parentIds.forEach((pId) => {
            if (!next.has(pId)) {
              next.add(pId);
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      }
    }
  }, [selectedId, canvasData, setOpenLayerIds]);

  return (
    <aside className="w-full h-full border-r border-[var(--surface-border)] glass-sm flex flex-col shrink-0 select-none">
      {/* Abas da Sidebar (Unificadas em 3 Abas Principais) */}
      <div className="flex items-center border-b border-[var(--surface-border)] p-1 glass-sm shrink-0">
        <button
          type="button"
          onClick={() => setTab('add')}
          className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            tab === 'add'
              ? 'brand-accent text-white shadow-sm font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
          title={selectedId ? 'Propriedades do Elemento Selecionado' : 'Adicionar Seções, Cabeçalhos e Elementos'}
        >
          {selectedId ? (
            <>
              <Sliders className="w-3.5 h-3.5 text-amber-300" />
              <span>Propriedades</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>+ Adicionar</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTab('layers')}
          className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            tab === 'layers'
              ? 'brand-accent text-white shadow-sm font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
          title="Estrutura de Camadas"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Camadas</span>
          {selectedId && tab !== 'layers' && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setTab('settings')}
          className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            tab === 'settings'
              ? 'brand-accent text-white shadow-sm font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
          title="Configurações Globais da Página e Tema"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Configurações</span>
        </button>
      </div>

      {/* Conteúdo da Aba Selecionada */}
      <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
        {tab === 'add' && (
          selectedId || editingMaster ? (
            <PropertiesPanel
              canvasData={canvasData}
              selection={{ id: selectedId, type: (selectedType as any) || null }}
              viewportMode={viewportMode}
              page={page}
              editingMaster={editingMaster}
              onUpdateSection={onUpdateSection}
              onRemoveSection={onRemoveSection}
              onMoveSection={onMoveSection}
              onUpdateComponent={onUpdateComponent}
              onRemoveComponent={onRemoveComponent}
              onAddComponent={onAddComponentToParent}
              onSelectElement={onSelectElement}
              onDeselect={() => onSelectElement(null)}
              onUpdateSiteConfig={onUpdateSiteConfig}
              onEditMaster={onEditMaster}
              onUpdateMaster={onUpdateMaster}
              onToggleExposedProp={onToggleExposedProp}
              onDeleteMaster={onDeleteMaster}
              onExitMasterEditing={onExitMasterEditing}
              onUnlinkInstance={onUnlinkInstance}
            />
          ) : (
            <div ref={sidebarScrollRef} onScroll={handleSidebarScroll} className="flex-1 overflow-y-auto custom-scrollbar">
              <AddPalette
                onAddSection={onAddSection}
                onAddCustomSection={onAddCustomSection}
                onAddComponent={onAddComponent}
                globalComponentsMap={canvasData?.globalComponentsMap}
                onEditMaster={onEditMaster}
                onDeleteMaster={onDeleteMaster}
              />
            </div>
          )
        )}

        {tab === 'layers' && (
          <div ref={sidebarScrollRef} onScroll={handleSidebarScroll} className="flex-1 overflow-y-auto custom-scrollbar">
            <LayersPanel
              canvasData={canvasData}
              selectedId={selectedId}
              openLayerIds={openLayerIds}
              onSetOpenLayerIds={setOpenLayerIds}
              onSelectElement={onSelectElement}
              onRemoveSection={onRemoveSection}
              onRemoveComponent={onRemoveComponent}
              onUpdateSection={onUpdateSection}
              onUpdateComponent={onUpdateComponent}
              onMoveSection={onMoveSection}
              onMoveElement={onMoveElement}
              onMoveElementBeforeOrAfter={onMoveElementBeforeOrAfter}
            />
          </div>
        )}

        {tab === 'settings' && (
          <div ref={sidebarScrollRef} onScroll={handleSidebarScroll} className="flex-1 overflow-y-auto custom-scrollbar">
            <SidebarSettingsPanel
              page={page}
              viewportMode={viewportMode}
              onUpdateSiteConfig={onUpdateSiteConfig}
              onUpdatePage={onUpdatePage}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
