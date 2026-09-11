'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePageEditor } from './hooks/usePageEditor';
import { ThemeTab } from './tabs/ThemeTab';
import { SettingsTab } from './tabs/SettingsTab';
import { DestinationTab } from './tabs/DestinationTab';
import { EditorSidebar } from './EditorSidebar';
import { EditorCanvas } from './EditorCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { createDefaultDiv, createDefaultComponent } from './constants';
import { loadGoogleFonts } from './utils/googleFonts';
import {
  ArrowLeft,
  Layout,
  Palette,
  Target,
  Settings,
  Monitor,
  Smartphone,
  Undo,
  Redo,
  Save,
  Loader2,
  Check
} from 'lucide-react';

interface EditorLayoutProps {
  pageId: string;
}

export function EditorLayout({ pageId }: EditorLayoutProps) {
  const {
    page,
    loading,
    error,
    activeTab,
    setActiveTab,
    viewportMode,
    setViewportMode,
    selection,
    selectElement,
    canvasData,
    updateNavbar,
    addSection,
    removeSection,
    moveSection,
    updateSection,
    addComponent,
    removeComponent,
    updateComponent,
    moveElement,
    moveElementBeforeOrAfter,
    addComponentBeforeOrAfter,
    duplicateElement,
    copyElement,
    pasteElement,
    copiedElement,
    updateSiteConfig,
    updatePage,
    canUndo,
    canRedo,
    undo,
    redo,
    saving,
    hasUnsavedChanges,
    lastSavedTime,
    forceSave,
  } = usePageEditor(pageId);

  // Injeta automaticamente as fontes do tema no document.head do editor
  useEffect(() => {
    if (page?.siteConfig?.theme) {
      loadGoogleFonts([page.siteConfig.theme.fontHeading, page.siteConfig.theme.fontBody]);
    } else {
      loadGoogleFonts();
    }
  }, [page?.siteConfig?.theme]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-gradient-start)]" />
          <span className="text-xs text-slate-500 font-semibold">Carregando editor...</span>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center p-4">
        <div className="glass-card p-6 rounded-2xl max-w-md w-full text-center space-y-4 border border-red-500/20">
          <h2 className="text-base font-bold text-red-500">Erro ao Carregar Editor</h2>
          <p className="text-xs text-slate-500">{error || 'Página não encontrada.'}</p>
          <Link
            href="/dashboard/captacao"
            className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-xl brand-accent text-white font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Páginas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-slate-900 dark:text-white flex flex-col font-sans select-none overflow-hidden h-screen">
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* TOP BAR FIXO DO EDITOR */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-[var(--surface-border)] px-4 flex items-center justify-between glass-sm shrink-0 z-40">
        {/* Lado Esquerdo: Botão Voltar & Título da Página */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/captacao"
            className="p-2 rounded-xl hover:bg-[var(--surface-hover)] text-slate-600 dark:text-slate-300 transition-colors"
            title="Voltar ao Painel"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
              {page.title || 'Página sem título'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">/{page.slug || ''}</span>
          </div>
        </div>

        {/* Centro: Tabs de Navegação Principal */}
        <nav className="flex items-center gap-1 glass-sm p-1 rounded-xl border border-[var(--surface-border)]">
          <button
            type="button"
            onClick={() => setActiveTab('layout')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'layout'
                ? 'brand-accent text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            Conteúdo & Seções
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'theme'
                ? 'brand-accent text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            Cores & Estilo
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('flow')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'flow'
                ? 'brand-accent text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Destino
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'brand-accent text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Configurações
          </button>
        </nav>

        {/* Lado Direito: Viewport Toggle, Undo/Redo & Status de Salve */}
        <div className="flex items-center gap-3">
          {/* Seletor Desktop / Mobile */}
          {activeTab === 'layout' && (
            <div className="flex items-center glass-sm p-1 rounded-xl border border-[var(--surface-border)]">
              <button
                type="button"
                onClick={() => setViewportMode('desktop')}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  viewportMode === 'desktop'
                    ? 'brand-accent text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                }`}
                title="Visualizar Desktop"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('mobile')}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  viewportMode === 'mobile'
                    ? 'brand-accent text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                }`}
                title="Visualizar Mobile"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Undo / Redo */}
          <div className="flex items-center gap-1 border-r border-[var(--surface-border)] pr-3">
            <button
              type="button"
              disabled={!canUndo}
              onClick={undo}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Desfazer (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!canRedo}
              onClick={redo}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Refazer (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          {/* Status de Salve */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            {saving ? (
              <span className="flex items-center gap-1.5 text-amber-500 font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Salvando...
              </span>
            ) : hasUnsavedChanges ? (
              <button
                type="button"
                onClick={forceSave}
                className="flex items-center gap-1.5 text-amber-600 hover:underline cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar Alterações
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Check className="w-3.5 h-3.5" />
                Salvo
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* CONTEÚDO PRINCIPAL (RELAÇÃO DE ABAS) */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'layout' && (
          <>
            {/* Sidebar Esquerda (Paleta ou PropertiesPanel) */}
            {selection.id !== null ? (
              <PropertiesPanel
                canvasData={canvasData}
                selection={selection}
                viewportMode={viewportMode}
                page={page}
                onUpdateSection={updateSection}
                onRemoveSection={removeSection}
                onUpdateComponent={updateComponent}
                onRemoveComponent={removeComponent}
                onDeselect={() => selectElement(null)}
              />
            ) : (
              <EditorSidebar
                canvasData={canvasData}
                selectedId={selection.id}
                onAddSection={addSection}
                onAddComponent={(type, preset) => {
                  if (!canvasData || canvasData.sections.length === 0) {
                    addSection('Nova Seção');
                    return;
                  }
                  const targetSectionId = canvasData.sections[0].id;
                  if (type === 'div') {
                    const newDiv = createDefaultDiv('Container (Div)');
                    if (preset === '2col') {
                      const col1 = createDefaultDiv('Coluna 1');
                      const col2 = createDefaultDiv('Coluna 2');
                      col1.layout.flexBasis = '50%';
                      col2.layout.flexBasis = '50%';
                      newDiv.components = [col1, col2];
                      newDiv.layout.flexDirection = 'row';
                    } else if (preset === '3col') {
                      const col1 = createDefaultDiv('Coluna 1');
                      const col2 = createDefaultDiv('Coluna 2');
                      const col3 = createDefaultDiv('Coluna 3');
                      col1.layout.flexBasis = '33.33%';
                      col2.layout.flexBasis = '33.33%';
                      col3.layout.flexBasis = '33.33%';
                      newDiv.components = [col1, col2, col3];
                      newDiv.layout.flexDirection = 'row';
                    }
                    addComponent(targetSectionId, newDiv as any);
                  } else {
                    const newComp = createDefaultComponent(type as any);
                    addComponent(targetSectionId, newComp as any);
                  }
                }}
                onSelectElement={selectElement}
                onRemoveSection={removeSection}
                onRemoveComponent={removeComponent}
                onUpdateSection={updateSection}
                onUpdateComponent={updateComponent}
                onUpdateNavbar={updateNavbar}
              />
            )}

            {/* Canvas Central Interativo (Ocupa 100% da largura restante!) */}
            <EditorCanvas
              canvasData={canvasData}
              viewportMode={viewportMode}
              selectedId={selection.id}
              page={page}
              onSelectElement={selectElement}
              onUpdateCanvas={() => {}}
              onRemoveSection={removeSection}
              onRemoveComponent={removeComponent}
              onUpdateSection={updateSection}
              onUpdateComponent={updateComponent}
              onAddComponent={addComponent}
              onMoveElement={moveElement}
              onMoveElementBeforeOrAfter={moveElementBeforeOrAfter}
              onAddComponentBeforeOrAfter={addComponentBeforeOrAfter}
              onDuplicateElement={duplicateElement}
              onCopyElement={copyElement}
              onPasteElement={pasteElement}
              canPaste={!!copiedElement}
            />
          </>
        )}

        {activeTab === 'theme' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <ThemeTab
              page={page}
              onUpdateSiteConfig={updateSiteConfig}
              tenant={(page as any)?.tenant || (page as any)?.workspace}
            />
          </div>
        )}

        {activeTab === 'flow' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <DestinationTab
              page={page}
              onUpdatePage={updatePage}
              availableForms={[]}
              tenantId={page.tenantId}
              onFormSelect={() => {}}
              onCreateForm={async () => {}}
              onRenameForm={async () => {}}
              onDeleteForm={async () => {}}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <SettingsTab
              page={page}
              onUpdatePage={updatePage}
              tenant={(page as any)?.tenant || (page as any)?.workspace}
            />
          </div>
        )}
      </main>
    </div>
  );
}
