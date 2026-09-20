'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePageEditor } from './hooks/usePageEditor';
import { useEditorKeyboardShortcuts } from './hooks/useEditorKeyboardShortcuts';
import { SettingsTab } from './tabs/SettingsTab';
import { DestinationTab } from './tabs/DestinationTab';
import { EditorSidebar } from './EditorSidebar';
import { EditorCanvas } from './EditorCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { HistoryModal } from './components/HistoryModal';
import { CreateGlobalComponentModal } from './components/CreateGlobalComponentModal';
import { GlobalMasterEditorModal } from './components/GlobalMasterEditorModal';
import { createDefaultDiv, createDefaultCarousel, createDefaultComponent } from './constants';
import { findElementInCanvas } from './utils/canvasHelpers';
import { Component, GlobalInstanceComponent, GlobalComponentMaster } from '@psi/canvas-renderer';
import { loadGoogleFonts } from './utils/googleFonts';
import { useBrand } from '@/context/BrandContext';
import {
  ArrowLeft,
  Layout,
  Target,
  Settings,
  Monitor,
  Smartphone,
  Undo,
  Redo,
  Save,
  Loader2,
  Check,
  CheckCircle2,
  FileText,
  History,
  Eye,
  Sun,
  Moon,
  ExternalLink,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
  Rocket,
  Plus
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
    selectedId,
    selectedType,
    selectElement,
    canvasData,
    updateNavbar,
    addSection,
    addCustomSection,
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
    pasteStyleElement,
    copiedElement,
    updateSiteConfig,
    updatePage,
    addGlobalComponentMaster,
    updateGlobalComponentMaster,
    canUndo,
    canRedo,
    historyEntries,
    historyIndex,
    jumpToHistoryIndex,
    undo,
    redo,
    saving,
    hasUnsavedChanges,
    hasUnpublishedChanges,
    lastSavedTime,
    forceSave,
    publishPage,
    isPublishing,
  } = usePageEditor(pageId);

  const { theme, toggleTheme } = useBrand();
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [justPublished, setJustPublished] = React.useState(false);
  const [historyModalOpen, setHistoryModalOpen] = React.useState(false);
  const [isGlobalModalOpen, setIsGlobalModalOpen] = React.useState(false);
  const [globalModalTarget, setGlobalModalTarget] = React.useState<Component | null>(null);

  const [isMasterEditorOpen, setIsMasterEditorOpen] = React.useState(false);
  const [editingMaster, setEditingMaster] = React.useState<GlobalComponentMaster | null>(null);

  const handleOpenMasterEditor = (globalComponentId: string) => {
    const master = canvasData?.globalComponentsMap?.[globalComponentId];
    if (master) {
      setEditingMaster(master);
      setIsMasterEditorOpen(true);
    }
  };

  const handleOpenSaveAsGlobal = (id: string) => {
    if (!canvasData) return;
    const found = findElementInCanvas(canvasData, id);
    if (found && found.element && found.element.type !== 'section') {
      setGlobalModalTarget(found.element as Component);
      setIsGlobalModalOpen(true);
    }
  };


  const handlePublish = async () => {
    if (isPublishing) return;
    try {
      await publishPage();
      setJustPublished(true);
      setTimeout(() => setJustPublished(false), 3000);
    } catch (err) {
      console.error('❌ Erro ao publicar página:', err);
    }
  };
  useEditorKeyboardShortcuts({
    selectedId: selectedId || null,
    selectedType: selectedType || null,
    copiedElement,
    canvasData,
    canUndo,
    canRedo,
    onSelectElement: selectElement,
    onDuplicateElement: duplicateElement,
    onCopyElement: copyElement,
    onPasteElement: pasteElement,
    onPasteStyleElement: pasteStyleElement,
    onRemoveSection: removeSection,
    onRemoveComponent: removeComponent,
    onUndo: undo,
    onRedo: redo,
  });

  // Estados de Visibilidade dos Controles (Sidebar e Header / Modo Foco)
  const [sidebarVisible, setSidebarVisible] = React.useState<boolean>(true);
  const [controlsVisible, setControlsVisible] = React.useState<boolean>(true);

  // Tecla ESC para restaurar controles quando no modo foco
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !controlsVisible) {
        setControlsVisible(true);
        setSidebarVisible(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controlsVisible]);

  // Estado e Handler de Redimensionamento da Sidebar Esquerda
  const [sidebarWidth, setSidebarWidth] = React.useState<number>(320);
  const isResizingRef = React.useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem('psi_editor_sidebar_width');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 260 && parsed <= 560) {
        setSidebarWidth(parsed);
      }
    }
  }, []);

  const handleMouseDownResize = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = Math.max(260, Math.min(560, moveEvent.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      const finalWidth = Math.max(260, Math.min(560, upEvent.clientX));
      localStorage.setItem('psi_editor_sidebar_width', finalWidth.toString());
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

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
      {controlsVisible && (
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
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                  {page.title || 'Página sem título'}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    page.isPublished
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {page.isPublished ? 'Publicado' : 'Rascunho'}
                </span>
              </div>
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
            {/* 1. Status de Salve (Detector Rascunho vs Publicado + Histórico) */}
            <button
              type="button"
              onClick={() => setHistoryModalOpen(true)}
              className="flex items-center gap-2 text-xs font-medium border-r border-[var(--surface-border)] pr-3 hover:opacity-80 transition-all cursor-pointer group/badge"
              title="Clique para abrir o Histórico de Alterações da sessão"
            >
              {saving ? (
                <span className="flex items-center gap-1.5 text-amber-500 font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Salvando...
                </span>
              ) : hasUnsavedChanges ? (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <Save className="w-3.5 h-3.5" />
                  Alterações Pendentes
                </span>
              ) : hasUnpublishedChanges ? (
                <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  Rascunho Salvo
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Publicado ao Vivo
                </span>
              )}
            </button>

            {/* Seletor Desktop / Mobile & Toggle Sidebar */}
            {activeTab === 'layout' && (
              <div className="flex items-center gap-1 glass-sm p-1 rounded-xl border border-[var(--surface-border)]">
                {/* 2. Hide da Sidebar */}
                <button
                  type="button"
                  onClick={() => setSidebarVisible(!sidebarVisible)}
                  className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    !sidebarVisible
                      ? 'bg-[var(--brand-gradient-start)]/20 text-[var(--brand-gradient-start)] border border-[var(--brand-gradient-start)]/30 font-bold'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                  }`}
                  title={sidebarVisible ? 'Ocultar Barra Lateral' : 'Mostrar Barra Lateral'}
                >
                  {sidebarVisible ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                </button>

                <div className="w-[1px] h-4 bg-[var(--surface-border)] mx-0.5" />

                {/* 3. Mobile / Desktop */}
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

            {/* 4. Tela Cheia (Modo Foco / Zen) */}
            <button
              type="button"
              onClick={() => setControlsVisible(false)}
              className="p-2 rounded-xl hover:bg-[var(--surface-hover)] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Ocultar Controles (Modo Foco / Tela Cheia)"
            >
              <Maximize2 className="w-4 h-4 text-[var(--brand-gradient-start)]" />
            </button>

            {/* 5. Modo Claro / Escuro */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-[var(--surface-hover)] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title={`Alternar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* 6. Visualizar (Site Real) */}
            <button
              type="button"
              onClick={() => {
                const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
                const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'theraos.app';
                const tenantSlug =
                  page?.tenantSlug ||
                  (page as any)?.workspace_domains?.[0]?.subdomain ||
                  (page as any)?.tenants?.workspace_domains?.[0]?.subdomain ||
                  (page as any)?.tenants?.slug ||
                  'jose-augustho';
                const rawSlug = page?.slug || '';
                const pageSlug = (rawSlug === '_root_' || rawSlug === 'root') ? '' : rawSlug;
                const path = pageSlug ? `/${pageSlug}` : '';
                const previewQuery = '?preview=true';

                let targetUrl = '';
                if (isLocal) {
                  targetUrl = `http://localhost:3005/p/${tenantSlug}${path}${previewQuery}`;
                } else {
                  const domain = (page as any)?.customDomain || `${tenantSlug}.${baseDomain}`;
                  targetUrl = `https://${domain}${path}${previewQuery}`;
                }

                window.open(targetUrl, '_blank');
              }}
              className="px-3 py-1.5 rounded-xl border border-[var(--brand-gradient-start)]/30 bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] hover:bg-[var(--brand-gradient-start)]/20 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Abrir site real no app de sites em nova aba"
            >
              <Eye className="w-3.5 h-3.5" />
              Visualizar
            </button>

            {/* 7. Publicar (Promover Rascunho -> Ao Vivo via RPC em 1 Clique) */}
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing}
              className={`px-3.5 py-1.5 rounded-xl text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                justPublished
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'brand-accent hover:opacity-90'
              } ${
                (hasUnpublishedChanges || hasUnsavedChanges) && !justPublished
                  ? 'ring-2 ring-purple-500/50 ring-offset-2 ring-offset-slate-900 animate-pulse hover:brightness-110'
                  : ''
              }`}
              title="Publicar rascunho no site público ao vivo com 1 clique"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Publicando...</span>
                </>
              ) : justPublished ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Publicado com Sucesso!</span>
                </>
              ) : (
                <>
                  <Rocket className="w-3.5 h-3.5" />
                  <span>{hasUnpublishedChanges ? 'Publicar Alterações' : 'Publicar'}</span>
                </>
              )}
            </button>
          </div>
        </header>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* CONTEÚDO PRINCIPAL (RELAÇÃO DE ABAS) */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden relative">
        {activeTab === 'layout' && (
          <>
            {/* Sidebar Esquerda Redimensionável (Paleta ou PropertiesPanel) */}
            {controlsVisible && sidebarVisible && (
              <div style={{ width: `${sidebarWidth}px` }} className="relative flex shrink-0 h-full group/sidebar">
                {selection.id !== null ? (
                  <PropertiesPanel
                    canvasData={canvasData}
                    selection={selection}
                    viewportMode={viewportMode}
                    page={page}
                    onUpdateSection={updateSection}
                    onRemoveSection={removeSection}
                    onMoveSection={moveSection}
                    onUpdateComponent={updateComponent}
                    onRemoveComponent={removeComponent}
                    onAddComponent={addComponent}
                    onSelectElement={selectElement}
                    onDeselect={() => selectElement(null)}
                    onUpdateSiteConfig={updateSiteConfig}
                    onEditMaster={handleOpenMasterEditor}
                  />

                ) : (
                  <EditorSidebar
                    canvasData={canvasData}
                    selectedId={selection.id}
                    selectedType={selection.type}
                    viewportMode={viewportMode}
                    page={page}
                    onAddSection={addSection}
                    onAddCustomSection={addCustomSection}
                    onAddComponent={(type, preset) => {
                      if (!canvasData || canvasData.sections.length === 0) {
                        addSection('Nova Seção');
                        return;
                      }
                      const targetSectionId = canvasData.sections[0].id;
                      if (type === 'carousel') {
                        const newCarousel = createDefaultCarousel('Galeria / Carrossel');
                        addComponent(targetSectionId, newCarousel as any);
                      } else if (type === 'div') {
                        const newDiv = createDefaultDiv('Container (Div)');
                        if (preset === '2col') {
                          const col1 = createDefaultDiv('Coluna 1');
                          const col2 = createDefaultDiv('Coluna 2');
                          col1.layout.flexBasis = '50%';
                          col1.layout.width = '50%';
                          col2.layout.flexBasis = '50%';
                          col2.layout.width = '50%';
                          newDiv.components = [col1, col2];
                          newDiv.layout.flexDirection = 'row';
                        } else if (preset === '3col') {
                          const col1 = createDefaultDiv('Coluna 1');
                          const col2 = createDefaultDiv('Coluna 2');
                          const col3 = createDefaultDiv('Coluna 3');
                          col1.layout.flexBasis = '33.33%';
                          col1.layout.width = '33.33%';
                          col2.layout.flexBasis = '33.33%';
                          col2.layout.width = '33.33%';
                          col3.layout.flexBasis = '33.33%';
                          col3.layout.width = '33.33%';
                          newDiv.components = [col1, col2, col3];
                          newDiv.layout.flexDirection = 'row';
                        }
                        addComponent(targetSectionId, newDiv as any);
                        const compType = typeof type === 'object' ? (type as any).type : type;
                        const compPreset = typeof type === 'object' ? (type as any).preset : preset;
                        const newComp = createDefaultComponent(compType as any, compPreset);
                        addComponent(targetSectionId, newComp as any);
                      }
                    }}
                    onSelectElement={selectElement}
                    onRemoveSection={removeSection}
                    onRemoveComponent={removeComponent}
                    onUpdateSection={updateSection}
                    onUpdateComponent={updateComponent}
                    onMoveSection={moveSection}
                    onMoveElement={moveElement}
                    onMoveElementBeforeOrAfter={moveElementBeforeOrAfter}
                    onUpdateSiteConfig={updateSiteConfig}
                    onUpdatePage={updatePage}
                  />
                )}

                {/* Handle Interativo de Redimensionamento */}
                <div
                  onMouseDown={handleMouseDownResize}
                  className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[var(--brand-gradient-start)] active:bg-[var(--brand-gradient-start)] transition-colors z-50 group-hover/sidebar:bg-[var(--surface-border)]"
                  title="Arraste para ajustar a largura da barra lateral"
                />
              </div>
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
              onAddCustomSection={addCustomSection}
              onMoveSection={moveSection}
              onMoveElement={moveElement}
              onMoveElementBeforeOrAfter={moveElementBeforeOrAfter}
              onAddComponentBeforeOrAfter={addComponentBeforeOrAfter}
              onDuplicateElement={duplicateElement}
              onCopyElement={copyElement}
              onPasteElement={pasteElement}
              onPasteStyleElement={pasteStyleElement}
              copiedElement={copiedElement}
              canPaste={!!copiedElement}
              onSaveAsGlobal={handleOpenSaveAsGlobal}
              isPublicView={!controlsVisible}
            />
          </>
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

        {/* Botão Flutuante para Mostrar Controles Novamente (Modo Foco / Zen) */}
        {!controlsVisible && (
          <button
            type="button"
            onClick={() => {
              setControlsVisible(true);
              setSidebarVisible(true);
            }}
            className="fixed top-4 left-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 text-white dark:bg-slate-800/90 backdrop-blur-md border border-slate-700/80 shadow-2xl hover:scale-105 transition-all cursor-pointer text-xs font-bold group"
            title="Mostrar controles do editor (Header e Sidebar) — Pressione ESC"
          >
            <Minimize2 className="w-4 h-4 text-[var(--brand-gradient-start)] group-hover:rotate-12 transition-transform" />
            <span>Mostrar Controles</span>
          </button>
        )}

        {/* Botão Flutuante para Re-expandir Apenas a Barra Lateral */}
        {controlsVisible && !sidebarVisible && activeTab === 'layout' && (
          <button
            type="button"
            onClick={() => setSidebarVisible(true)}
            className="fixed top-16 left-4 z-40 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 text-white dark:bg-slate-800/90 backdrop-blur-md border border-slate-700/80 shadow-xl hover:scale-105 transition-all cursor-pointer text-xs font-bold"
            title="Mostrar barra lateral"
          >
            <PanelLeftOpen className="w-4 h-4 text-[var(--brand-gradient-start)]" />
            <span>Mostrar Barra Lateral</span>
          </button>
        )}
      </main>

      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL DE PREVIEW FULLSCREEN DO SITE */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
          {/* Header do Preview */}
          <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between glass-md shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                Modo de Visualização (Preview)
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                {page.title || 'Página'}
              </span>
            </div>

            {/* Seletor de Viewport no Preview */}
            <div className="flex items-center gap-2 glass-sm p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setViewportMode('desktop')}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  viewportMode === 'desktop'
                    ? 'brand-accent text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Visualização Desktop"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('mobile')}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  viewportMode === 'mobile'
                    ? 'brand-accent text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Visualização Mobile"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            {/* Ações: Nova aba & Fechar */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
                  const targetUrl = (page as any).publishedUrl || (isLocal ? `${window.location.origin}/dashboard/captacao/${pageId}` : `${window.location.origin}/p/${page.slug || pageId}`);
                  window.open(targetUrl, '_blank');
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-500 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir em Nova Aba
              </button>

              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar Preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Renderizador do Canvas sem ferramentas de edição */}
          <div className="flex-1 overflow-y-auto bg-slate-900/50 flex justify-center p-4">
            <div
              className={`transition-all duration-300 ${
                viewportMode === 'mobile'
                  ? 'w-[375px] my-4 rounded-[40px] border-[12px] border-slate-800 shadow-2xl overflow-hidden bg-white dark:bg-slate-950 h-[750px] overflow-y-auto custom-scrollbar'
                  : 'w-full max-w-[1280px] bg-white dark:bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-y-auto custom-scrollbar'
              }`}
            >
              <EditorCanvas
                canvasData={canvasData}
                viewportMode={viewportMode}
                selectedId={null}
                page={page}
                onSelectElement={() => {}}
                onUpdateCanvas={() => {}}
                onRemoveSection={() => {}}
                onRemoveComponent={() => {}}
                onUpdateSection={() => {}}
                onUpdateComponent={() => {}}
                onAddComponent={() => {}}
              />
            </div>
          </div>
        </div>
      )}

      {/* 📜 MODAL DE HISTÓRICO DE ALTERAÇÕES DA SESSÃO */}
      <HistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        entries={historyEntries}
        currentIndex={historyIndex}
        onJumpToIndex={jumpToHistoryIndex}
      />

      {/* ✨ MODAL DE CRIAÇÃO DE ELEMENTO GLOBAL */}
      <CreateGlobalComponentModal
        isOpen={isGlobalModalOpen}
        onClose={() => {
          setIsGlobalModalOpen(false);
          setGlobalModalTarget(null);
        }}
        targetComponent={globalModalTarget}
        workspaceId={(page as any)?.workspace_id || (page as any)?.workspaceId}
        onSave={async (globalMaster, newInstance) => {
          addGlobalComponentMaster(globalMaster, newInstance);
        }}
      />

      {/* 🎨 MODAL DE EDIÇÃO ISOLADA DO COMPONENTE MASTER (ESTILO FRAMER) */}
      <GlobalMasterEditorModal
        isOpen={isMasterEditorOpen}
        onClose={() => {
          setIsMasterEditorOpen(false);
          setEditingMaster(null);
        }}
        master={editingMaster}
        page={page}
        onSaveMaster={async (updatedMaster) => {
          updateGlobalComponentMaster(updatedMaster);
        }}
      />
    </div>
  );
}


