'use client';

import React, { useState } from 'react';
import { SectionTemplates } from './SectionTemplates';
import { ElementPalette } from './ElementPalette';
import { LayersPanel } from './LayersPanel';
import { NavbarPanel } from './NavbarPanel';
import { Layout, Plus, Layers, Compass } from 'lucide-react';
import { CanvasData, AtomicComponentType, Section, Component, NavbarConfig } from '../types';

interface EditorSidebarProps {
  canvasData: CanvasData | null;
  selectedId: string | null;
  onAddSection: (label?: string) => void;
  onAddComponent: (type: 'div' | AtomicComponentType, preset?: string) => void;
  onSelectElement: (id: string | null, type?: any) => void;
  onRemoveSection: (id: string) => void;
  onRemoveComponent: (id: string) => void;
  onUpdateSection: (id: string, patch: Partial<Section>) => void;
  onUpdateComponent: (id: string, patch: Partial<Component>) => void;
  onUpdateNavbar?: (patch: Partial<NavbarConfig>) => void;
}

export function EditorSidebar({
  canvasData,
  selectedId,
  onAddSection,
  onAddComponent,
  onSelectElement,
  onRemoveSection,
  onRemoveComponent,
  onUpdateSection,
  onUpdateComponent,
  onUpdateNavbar,
}: EditorSidebarProps) {
  const [tab, setTab] = useState<'elements' | 'navbar' | 'layers'>('elements');

  return (
    <aside className="w-80 border-r border-[var(--surface-border)] glass-sm flex flex-col shrink-0 select-none">
      {/* Abas da Sidebar (Unificadas em 3 Abas Principais) */}
      <div className="flex items-center border-b border-[var(--surface-border)] p-1 glass-sm">
        <button
          type="button"
          onClick={() => setTab('elements')}
          className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            tab === 'elements'
              ? 'brand-accent text-white shadow-sm font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
          title="Adicionar Elementos & Seções"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Elementos</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('navbar')}
          className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            tab === 'navbar'
              ? 'brand-accent text-white shadow-sm font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
          title="Configurações do Navbar"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Navbar</span>
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
      </div>

      {/* Conteúdo da Aba Selecionada */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {tab === 'elements' && <ElementPalette onAddComponent={onAddComponent} />}

        {tab === 'navbar' && (
          <NavbarPanel
            canvasData={canvasData}
            onUpdateNavbar={(patch) => onUpdateNavbar?.(patch)}
          />
        )}

        {tab === 'layers' && (
          <LayersPanel
            canvasData={canvasData}
            selectedId={selectedId}
            onSelectElement={onSelectElement}
            onRemoveSection={onRemoveSection}
            onRemoveComponent={onRemoveComponent}
            onUpdateSection={onUpdateSection}
            onUpdateComponent={onUpdateComponent}
          />
        )}
      </div>
    </aside>
  );
}
