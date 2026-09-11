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
  cloneElementWithNewIds,
  findElementInCanvas,
  moveElementInCanvas,
  addComponentBeforeOrAfter as addComponentBeforeOrAfterHelper,
  moveElementBeforeOrAfter as moveElementBeforeOrAfterHelper
} from '../utils/canvasHelpers';
import { useEditorHistory } from './useEditorHistory';
import { useAutoSave } from './useAutoSave';
import { api, CapturePage } from '@/lib/api';

import { getThemeColors, sanitizeCanvasColors } from '../utils/colorHelpers';

export type TabType = 'layout' | 'flow' | 'theme' | 'settings';

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

        setCanvasData(cleanCanvas);
        history.resetHistory(cleanCanvas);
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
    enabled: !loading && canvasData !== null,
  });

  // Atualiza estado do Canvas e registra no histórico
  const updateCanvasState = useCallback((newCanvas: CanvasData) => {
    setCanvasData(newCanvas);
    history.pushState(newCanvas);
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
    });
  }, [canvasData, updateCanvasState]);

  // Actions de Seção
  const addSection = useCallback((label?: string, index?: number) => {
    if (!canvasData) return;
    const updated = addSectionHelper(canvasData, label, index);
    updateCanvasState(updated);
  }, [canvasData, updateCanvasState]);

  const removeSection = useCallback((sectionId: string) => {
    if (!canvasData) return;
    const updated = removeSectionHelper(canvasData, sectionId);
    updateCanvasState(updated);
    if (selection.id === sectionId) {
      selectElement(null);
    }
  }, [canvasData, updateCanvasState, selection.id, selectElement]);

  const moveSection = useCallback((fromIndex: number, toIndex: number) => {
    if (!canvasData) return;
    const updated = moveSectionHelper(canvasData, fromIndex, toIndex);
    updateCanvasState(updated);
  }, [canvasData, updateCanvasState]);

  const updateSection = useCallback((sectionId: string, patch: Partial<Section>) => {
    if (!canvasData) return;
    const updated = updateSectionHelper(canvasData, sectionId, patch);
    updateCanvasState(updated);
  }, [canvasData, updateCanvasState]);

  // Actions de Componente
  const addComponent = useCallback((parentId: string, component: Component, index?: number) => {
    if (!canvasData) return;
    const updated = addComponentHelper(canvasData, parentId, component, index);
    updateCanvasState(updated);
    selectElement(component.id, component.type as SelectionState['type']);
  }, [canvasData, updateCanvasState, selectElement]);

  const removeComponent = useCallback((componentId: string) => {
    if (!canvasData) return;
    const updated = removeComponentHelper(canvasData, componentId);
    updateCanvasState(updated);
    if (selection.id === componentId) {
      selectElement(null);
    }
  }, [canvasData, updateCanvasState, selection.id, selectElement]);

  const updateComponent = useCallback((componentId: string, patch: Partial<Component>) => {
    if (!canvasData) return;
    const updated = updateComponentHelper(canvasData, componentId, patch);
    updateCanvasState(updated);
  }, [canvasData, updateCanvasState]);

  // 👯 DUPLICAR ELEMENTO
  const duplicateElement = useCallback((id: string) => {
    if (!canvasData) return;
    const { canvas: updated, newId } = duplicateElementInCanvas(canvasData, id);
    updateCanvasState(updated);
    if (newId) {
      selectElement(newId);
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
      updateCanvasState({ ...canvasData, sections });
      selectElement(cloned.id, 'section');
    } else {
      const updated = addComponentHelper(canvasData, targetParentId, cloned as Component);
      updateCanvasState(updated);
      selectElement(cloned.id, cloned.type);
    }
  }, [canvasData, copiedElement, updateCanvasState, selectElement]);

  // 🚚 MOVER ELEMENTO DE CONTAINER / SEÇÃO
  const moveElement = useCallback((elementId: string, targetParentId: string) => {
    if (!canvasData) return;
    const updated = moveElementInCanvas(canvasData, elementId, targetParentId);
    updateCanvasState(updated);
    selectElement(elementId);
  }, [canvasData, updateCanvasState, selectElement]);

  // ↕️ REORDENAR / MOVER ELEMENTO ANTES OU DEPOIS DE OUTRO
  const moveElementBeforeOrAfter = useCallback((elementId: string, targetElementId: string, position: 'before' | 'after') => {
    if (!canvasData) return;
    const updated = moveElementBeforeOrAfterHelper(canvasData, elementId, targetElementId, position);
    updateCanvasState(updated);
    selectElement(elementId);
  }, [canvasData, updateCanvasState, selectElement]);

  // ➕ ADICIONAR COMPONENTE ANTES OU DEPOIS DE OUTRO
  const addComponentBeforeOrAfter = useCallback((targetElementId: string, component: Component, position: 'before' | 'after') => {
    if (!canvasData) return;
    const updated = addComponentBeforeOrAfterHelper(canvasData, targetElementId, component, position);
    updateCanvasState(updated);
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
        ...(patch.logoUrl ? { logoUrl: patch.logoUrl } : {}),
      };

      // Dispara atualização assíncrona no backend PostgREST
      api.updateCapturePage(pageId, {
        siteConfig: updatedSiteConfig,
        ...(patch.logoUrl ? { logoUrl: patch.logoUrl } : {}),
      }).catch((err) => {
        console.error('❌ Erro ao salvar siteConfig:', err);
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

  return {
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
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    undo: handleUndo,
    redo: handleRedo,
    saving: autoSave.saving,
    hasUnsavedChanges: autoSave.hasUnsavedChanges,
    lastSavedTime: autoSave.lastSavedTime,
    forceSave: autoSave.forceSave,
  };
}
