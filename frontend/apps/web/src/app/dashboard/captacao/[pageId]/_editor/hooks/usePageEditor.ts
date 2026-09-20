import { useState, useEffect, useCallback } from 'react';
import {
  CanvasData,
  SelectionState,
  ViewportMode,
  Section,
  Component,
  NavbarConfig
} from '../types';
import { migrateLegacyCanvas } from '../utils/migrateCanvas';
import {
  addSection as addSectionHelper,
  removeSection as removeSectionHelper,
  moveSection as moveSectionHelper,
  updateSection as updateSectionHelper,
  addComponentToParent as addComponentHelper,
  removeComponentFromCanvas as removeComponentHelper,
  updateComponentInCanvas as updateComponentHelper,
  duplicateElementInCanvas,
  findAdjacentElementAfterRemoval,
  cloneElementWithNewIds,
  findElementInCanvas,
  moveElementInCanvas,
  addComponentBeforeOrAfter as addComponentBeforeOrAfterHelper,
  moveElementBeforeOrAfter as moveElementBeforeOrAfterHelper,
  pasteStyleToElementInCanvas,
  normalizeCanvasData
} from '../utils/canvasHelpers';
import { useEditorHistory } from './useEditorHistory';
import { useAutoSave } from './useAutoSave';
import { api, CapturePage } from '@/lib/api';

import { getThemeColors, sanitizeCanvasColors } from '../utils/colorHelpers';

export type TabType = 'layout' | 'flow' | 'settings';

export function usePageEditor(pageId: string) {
  const [page, setPage] = useState<CapturePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados Visuais e de Navegação
  const [activeTab, setActiveTab] = useState<TabType>('layout');
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop');
  const [selection, setSelection] = useState<SelectionState>({
    id: null,
    type: null,
  });

  // Elemento Copiado na Memória (para Copiar / Colar)
  const [copiedElement, setCopiedElement] = useState<Section | Component | null>(null);

  // Canvas Data & History
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
  const history = useEditorHistory();

  // Carrega página e migra schema se necessário
  useEffect(() => {
    async function loadPage() {
      if (!pageId) return;
      setLoading(true);
      setError(null);
      try {
        const fetchedPage = await api.getCapturePage(pageId);
        setPage(fetchedPage);

        const themeColors = getThemeColors(fetchedPage);
        const canvas = migrateLegacyCanvas(fetchedPage);
        const cleanCanvas = sanitizeCanvasColors(canvas, themeColors.siteBg);
        const normalizedCanvas = normalizeCanvasData(cleanCanvas);

        setCanvasData(normalizedCanvas);
        history.resetHistory(normalizedCanvas);
      } catch (err: any) {
        console.error('❌ Erro ao carregar página no editor:', err);
        setError(err.message || 'Erro ao carregar dados da página.');
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [pageId]);


  // Integração Auto-Save
  const autoSave = useAutoSave({
    pageId,
    canvasData,
    publishedCanvas: (page as any)?.publishedCanvas || page?.siteConfig?.canvas_data || page?.siteConfig?.canvasData,
    enabled: !loading && canvasData !== null,
  });

  // Atualiza estado do Canvas e registra no histórico
  const updateCanvasState = useCallback((newCanvas: CanvasData, label?: string) => {
    const normalized = normalizeCanvasData(newCanvas);
    setCanvasData(normalized);
    history.pushState(normalized, label);
  }, [history]);

  // Seleção de Elementos
  const selectElement = useCallback((id: string | null, type?: SelectionState['type']) => {
    if (!id || !canvasData) {
      setSelection({ id: null, type: null });
      return;
    }

    if (type) {
      setSelection({ id, type });
      return;
    }

    const found = findElementInCanvas(canvasData, id);
    if (found) {
      setSelection({
        id,
        type: found.element.type as SelectionState['type'],
      });
    } else {
      setSelection({ id: null, type: null });
    }
  }, [canvasData]);

  // Actions do Navbar
  const updateNavbar = useCallback((patch: Partial<NavbarConfig>) => {
    if (!canvasData) return;
    const currentNavbar: NavbarConfig = canvasData.navbar || {
      enabled: true,
      logoMode: 'workspace',
      sticky: true,
      links: [],
      showCtaButton: true,
      ctaButtonText: 'Agendar Consulta',
      ctaButtonAction: 'cta_primary',
    };

    const updatedNavbar: NavbarConfig = {
      ...currentNavbar,
      ...patch,
    };

    updateCanvasState({
      ...canvasData,
      navbar: updatedNavbar,
    }, 'Atualizou Cabeçalho / Navbar');
  }, [canvasData, updateCanvasState]);

  // Actions de Seção
  const addSection = useCallback((label?: string, index?: number) => {
    if (!canvasData) return;
    const updated = addSectionHelper(canvasData, label, index);
    updateCanvasState(updated, `Adicionou Seção "${label || 'Nova Seção'}"`);
  }, [canvasData, updateCanvasState]);

  const addCustomSection = useCallback((customSection: Section, index?: number) => {
    if (!canvasData) return;
    const sections = [...canvasData.sections];
    const isFooter = customSection.anchorId === 'sec-footer' || (customSection.label && customSection.label.toLowerCase().includes('rodapé'));

    if (index !== undefined && index >= 0 && index <= sections.length) {
      sections.splice(index, 0, customSection);
    } else if (isFooter) {
      sections.push(customSection);
    } else {
      sections.unshift(customSection);
    }
    const updated: CanvasData = {
      ...canvasData,
      sections,
    };
    updateCanvasState(updated, `Adicionou Seção "${customSection.label || 'Customizada'}"`);
    selectElement(customSection.id, 'section');
  }, [canvasData, updateCanvasState, selectElement]);

  const removeSection = useCallback((sectionId: string) => {
    if (!canvasData) return;
    const adjacent = findAdjacentElementAfterRemoval(canvasData, sectionId);
    const updated = removeSectionHelper(canvasData, sectionId);
    updateCanvasState(updated, 'Removeu Seção');
    if (adjacent) {
      selectElement(adjacent.id, adjacent.type);
    } else {
      selectElement(null);
    }
  }, [canvasData, updateCanvasState, selectElement]);

  const moveSection = useCallback((fromIndex: number, toIndex: number) => {
    if (!canvasData) return;
    const updated = moveSectionHelper(canvasData, fromIndex, toIndex);
    updateCanvasState(updated, 'Reordenou Seções');
  }, [canvasData, updateCanvasState]);

  const updateSection = useCallback((sectionId: string, patch: Partial<Section>) => {
    if (!canvasData) return;
    const updated = updateSectionHelper(canvasData, sectionId, patch);
    updateCanvasState(updated, 'Editou Seção');
  }, [canvasData, updateCanvasState]);

  // Actions de Componente
  const addComponent = useCallback((parentId: string, component: Component, index?: number) => {
    if (!canvasData) return;
    const updated = addComponentHelper(canvasData, parentId, component, index);
    updateCanvasState(updated, `Adicionou "${component.label || component.type}"`);
    selectElement(component.id, component.type as SelectionState['type']);
  }, [canvasData, updateCanvasState, selectElement]);

  const removeComponent = useCallback((componentId: string) => {
    if (!canvasData) return;
    const adjacent = findAdjacentElementAfterRemoval(canvasData, componentId);
    const updated = removeComponentHelper(canvasData, componentId);
    updateCanvasState(updated, 'Removeu Componente');
    if (adjacent) {
      selectElement(adjacent.id, adjacent.type);
    } else {
      selectElement(null);
    }
  }, [canvasData, updateCanvasState, selectElement]);

  const updateComponent = useCallback((componentId: string, patch: Partial<Component>) => {
    if (!canvasData) return;
    const updated = updateComponentHelper(canvasData, componentId, patch);
    updateCanvasState(updated, 'Editou Componente');
  }, [canvasData, updateCanvasState]);

  // 👯 DUPLICAR ELEMENTO (SEMPRE SELECIONA O NOVO ELEMENTO)
  const duplicateElement = useCallback((id: string) => {
    if (!canvasData) return;
    const { canvas: updated, newId, newType } = duplicateElementInCanvas(canvasData, id);
    updateCanvasState(updated, 'Duplicou Elemento');
    if (newId && newType) {
      selectElement(newId, newType);
    }
  }, [canvasData, updateCanvasState, selectElement]);

  // 📋 COPIAR ELEMENTO
  const copyElement = useCallback((id: string) => {
    if (!canvasData) return;
    const found = findElementInCanvas(canvasData, id);
    if (found) {
      setCopiedElement(found.element);
    }
  }, [canvasData]);

  // 📌 COLAR ELEMENTO
  const pasteElement = useCallback((targetParentId: string) => {
    if (!canvasData || !copiedElement) return;

    const cloned = cloneElementWithNewIds(copiedElement);

    if (cloned.type === 'section') {
      const sections = [...canvasData.sections, cloned as Section];
      updateCanvasState({ ...canvasData, sections }, 'Colou Seção');
      selectElement(cloned.id, 'section');
    } else {
      const updated = addComponentHelper(canvasData, targetParentId, cloned as Component);
      updateCanvasState(updated, 'Colou Elemento');
      selectElement(cloned.id, cloned.type);
    }
  }, [canvasData, copiedElement, updateCanvasState, selectElement]);

  // 🎨 COLAR APENAS ESTILO ENTRE ELEMENTOS DO MESMO TIPO
  const pasteStyleElement = useCallback((targetId: string) => {
    if (!canvasData || !copiedElement) return;
    const updated = pasteStyleToElementInCanvas(canvasData, targetId, copiedElement);
    updateCanvasState(updated, 'Colou Estilo do Elemento');
    selectElement(targetId);
  }, [canvasData, copiedElement, updateCanvasState, selectElement]);

  // 🚚 MOVER ELEMENTO DE CONTAINER / SEÇÃO
  const moveElement = useCallback((elementId: string, targetParentId: string) => {
    if (!canvasData) return;
    const updated = moveElementInCanvas(canvasData, elementId, targetParentId);
    updateCanvasState(updated, 'Moveu Elemento');
    selectElement(elementId);
  }, [canvasData, updateCanvasState, selectElement]);

  // ↕️ REORDENAR / MOVER ELEMENTO ANTES OU DEPOIS DE OUTRO
  const moveElementBeforeOrAfter = useCallback((elementId: string, targetElementId: string, position: 'before' | 'after') => {
    if (!canvasData) return;
    const updated = moveElementBeforeOrAfterHelper(canvasData, elementId, targetElementId, position);
    updateCanvasState(updated, 'Reordenou Elemento');
    selectElement(elementId);
  }, [canvasData, updateCanvasState, selectElement]);

  // ➕ ADICIONAR COMPONENTE ANTES OU DEPOIS DE OUTRO
  const addComponentBeforeOrAfter = useCallback((targetElementId: string, component: Component, position: 'before' | 'after') => {
    if (!canvasData) return;
    const updated = addComponentBeforeOrAfterHelper(canvasData, targetElementId, component, position);
    updateCanvasState(updated, `Adicionou "${component.label || component.type}"`);
    selectElement(component.id, component.type as any);
  }, [canvasData, updateCanvasState, selectElement]);

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    const prev = history.undo();
    if (prev) setCanvasData(prev);
  }, [history]);

  const handleRedo = useCallback(() => {
    const next = history.redo();
    if (next) setCanvasData(next);
  }, [history]);

  const jumpToHistoryIndex = useCallback((index: number) => {
    const targetData = history.jumpToIndex(index);
    if (targetData) setCanvasData(targetData);
  }, [history]);

  // 🎨 ATUALIZAÇÃO DO SITE CONFIG (CORES, TIPOGRAFIA, LOGO, ETC)
  const updateSiteConfig = useCallback((patch: any) => {
    setPage((prevPage) => {
      if (!prevPage) return prevPage;
      const updatedTheme = {
        ...(prevPage.siteConfig?.theme || {}),
        ...(patch.theme || {}),
      };
      const updatedSiteConfig = {
        ...(prevPage.siteConfig || {}),
        ...patch,
        theme: updatedTheme,
      };
      const newPage = {
        ...prevPage,
        siteConfig: updatedSiteConfig,
        ...(patch.logoUrl !== undefined ? { logoUrl: patch.logoUrl } : {}),
      };

      // Dispara atualização assíncrona no backend PostgREST para o rascunho em staging
      api.updateCapturePage(pageId, {
        siteConfigDraft: updatedSiteConfig,
        ...(patch.logoUrl !== undefined ? { logoUrl: patch.logoUrl } : {}),
      }).catch((err) => {
        console.error('❌ Erro ao salvar siteConfigDraft:', err);
      });

      return newPage;
    });
  }, [pageId]);

  // ⚙️ ATUALIZAÇÃO DE PROPRIEDADES GERAIS DA PÁGINA
  const updatePage = useCallback((patch: Partial<CapturePage>) => {
    setPage((prevPage) => {
      if (!prevPage) return prevPage;
      const newPage = { ...prevPage, ...patch };

      api.updateCapturePage(pageId, patch).catch((err) => {
        console.error('❌ Erro ao salvar página:', err);
      });

      return newPage;
    });
  }, [pageId]);

  // 🚀 PUBLICAÇÃO DA PÁGINA (PROMOTE DRAFT -> CANVAS_DATA ATÔMICO VIA RPC)
  const [isPublishing, setIsPublishing] = useState(false);

  const publishPage = useCallback(async () => {
    if (!pageId || !canvasData) return;
    setIsPublishing(true);
    try {
      // 1. Força a gravação SÍNCRONA do rascunho no banco antes de disparar a RPC
      await autoSave.forceSave();
      // 2. Dispara a chamada RPC para copiar draft_data -> canvas_data
      const updatedPage = await api.publishCapturePage(pageId);
      setPage(updatedPage);
      autoSave.markAsPublished(canvasData);
    } catch (err: any) {
      console.error('❌ Erro ao publicar página:', err);
      throw err;
    } finally {
      setIsPublishing(false);
    }
  }, [pageId, canvasData, autoSave]);

  return {
    page,
    loading,
    error,
    activeTab,
    setActiveTab,
    viewportMode,
    setViewportMode,
    selection,
    selectedId: selection.id,
    selectedType: selection.type,
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
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    historyEntries: history.entries,
    historyIndex: history.currentIndex,
    jumpToHistoryIndex,
    undo: handleUndo,
    redo: handleRedo,
    saving: autoSave.saving,
    hasUnsavedChanges: autoSave.hasUnsavedChanges,
    hasUnpublishedChanges: autoSave.hasUnpublishedChanges,
    lastSavedTime: autoSave.lastSavedTime,
    forceSave: autoSave.forceSave,
    publishPage,
    isPublishing,
  };
}

