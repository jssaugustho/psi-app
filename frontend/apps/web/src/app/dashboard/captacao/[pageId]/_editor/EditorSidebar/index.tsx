'use client';

import React, { useState, useEffect } from 'react';
import { AddPalette } from './AddPalette';
import { LayersPanel, findParentChainIds } from './LayersPanel';
import { SidebarSettingsPanel } from './SidebarSettingsPanel';
import { Plus, Layers, Settings } from 'lucide-react';
import { CanvasData, AtomicComponentType, Section, Component, ViewportMode } from '../types';
import { CapturePage } from '@/lib/api';

interface EditorSidebarProps {
  canvasData: CanvasData | null;
  selectedId: string | null;
  selectedType?: string | null;
  viewportMode?: ViewportMode;
  page?: CapturePage | null;
  onAddSection: (label?: string) => void;
  onAddCustomSection?: (section: Section) => void;
  onAddComponent: (type: 'div' | 'carousel' | AtomicComponentType, preset?: string) => void;
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
}

export function EditorSidebar({
  canvasData,
  selectedId,
  selectedType,
  viewportMode = 'desktop',
  page,
  onAddSection,
  onAddCustomSection,
  onAddComponent,
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
}: EditorSidebarProps) {
  const [tab, setTab] = useState<'add' | 'layers' | 'settings'>('add');

  // Estado com memória de quais camadas estão ABERTAS (Inicialmente VAZIO = tudo FECHADO)
  const [openLayerIds, setOpenLayerIds] = useState<Set<string>>(new Set());

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
  }, [selectedId, canvasData]);

  return (
    <aside className="w-full h-full border-r border-[var(--surface-border)] glass-sm flex flex-col shrink-0 select-none">
      {/* Abas da Sidebar (Unificadas em 3 Abas Principais) */}
      <div className="flex items-center border-b border-[var(--surface-border)] p-1 glass-sm">
        <button
          type="button"
          onClick={() => setTab('add')}
          className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            tab === 'add'
              ? 'brand-accent text-white shadow-sm font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
          title="Adicionar Seções, Cabeçalhos e Elementos"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Adicionar</span>
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
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {tab === 'add' && (
          <AddPalette
            onAddSection={onAddSection}
            onAddCustomSection={onAddCustomSection}
            onAddComponent={onAddComponent}
          />
        )}

        {tab === 'layers' && (
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
        )}

        {tab === 'settings' && (
          <SidebarSettingsPanel
            page={page}
            viewportMode={viewportMode}
            onUpdateSiteConfig={onUpdateSiteConfig}
            onUpdatePage={onUpdatePage}
          />
        )}
      </div>
    </aside>
  );
}
