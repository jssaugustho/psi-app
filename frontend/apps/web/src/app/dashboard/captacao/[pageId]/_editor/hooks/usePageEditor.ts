import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { produce, produceWithPatches } from 'immer';
import { useIsAdjustingProperty } from '@psi/canvas-renderer';
import {
  CanvasData,
  NormalizedCanvasData,
  SelectionState,
  ViewportMode,
  Section,
  Component,
  NavbarConfig,
  GlobalComponentMaster,
  GlobalInstanceComponent,
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
  unlinkGlobalInstanceInCanvas,
  normalizeCanvasData,
  denormalizeCanvasData,
  removeNodeCascadeInFlatCanvas,
  isDescendantOf,
  getContainingSectionId,
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

  // Modo de Edição de Elemento Global Master (In-Place UI)
  const [editingMasterId, setEditingMasterId] = useState<string | null>(null);

  // Estados Visuais e de Navegação
  const [activeTab, setActiveTab] = useState<TabType>('layout');
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop');
  const [selection, setSelection] = useState<SelectionState>({
    id: null,
    type: null,
  });

  // Elemento Copiado na Memória (para Copiar / Colar)
  const [copiedElement, setCopiedElement] = useState<Section | Component | null>(null);

  // Normalized Canvas State (State by ID - Flat Hash Table)
  const [normalizedCanvas, setNormalizedCanvas] = useState<NormalizedCanvasData | null>(null);
  const history = useEditorHistory();
  const isAdjusting = useIsAdjustingProperty();

  // Referência para controlar o estado inicial de arrastes / sliders contínuos
  const dragStartStateRef = useRef<NormalizedCanvasData | null>(null);
  const dragLabelRef = useRef<string>('Ajuste de Propriedade');

  // Versão denormalizada memoizada (CanvasData v2.0) enviada ao CanvasRenderer, useAutoSave e apps/sites
  const canvasData = useMemo(() => {
    if (!normalizedCanvas) return null;
    return denormalizeCanvasData(normalizedCanvas);
  }, [normalizedCanvas]);

  // Carrega página e migra schema para estado normalizado (com busca de global_components do workspace)
  useEffect(() => {
    async function loadPage() {
      if (!pageId) return;
      setLoading(true);
      setError(null);
      try {
        const fetchedPage = await api.getCapturePage(pageId);
        setPage(fetchedPage);

        const workspaceId = fetchedPage.tenantId || (fetchedPage as any).workspaceId || (fetchedPage as any).workspace_id;
        let dbGlobalMap: Record<string, GlobalComponentMaster> = {};
        if (workspaceId) {
          dbGlobalMap = await api.getGlobalComponents(workspaceId);
        }

        const canvas = migrateLegacyCanvas(fetchedPage);
        canvas.globalComponentsMap = {
          ...(canvas.globalComponentsMap || {}),
          ...dbGlobalMap,
        };

        const normalized = normalizeCanvasData(canvas);

        setNormalizedCanvas(normalized);
        history.resetHistory(normalized);
      } catch (err: any) {
        console.error('❌ Erro ao carregar página no editor:', err);
        setError(err.message || 'Erro ao carregar dados da página.');
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [pageId]);

  // Efeito para consolidar transações de arrasto/slider contínuo (Batching no PointerUp)
  useEffect(() => {
    if (!isAdjusting && dragStartStateRef.current && normalizedCanvas) {
      const startState = dragStartStateRef.current;
      const currentState = normalizedCanvas;
      dragStartStateRef.current = null;

      if (startState !== currentState) {
        const [, patches, inversePatches] = produceWithPatches(startState, () => currentState);
        if (patches.length > 0) {
          history.pushPatches(patches, inversePatches, dragLabelRef.current);
        }
      }
    }
  }, [isAdjusting, normalizedCanvas, history]);

  // Integração Auto-Save
  const autoSave = useAutoSave({
    pageId,
    canvasData,
    publishedCanvas: (page as any)?.publishedCanvas || page?.siteConfig?.canvas_data || page?.siteConfig?.canvasData,
    enabled: !loading && canvasData !== null,
  });

  // Atualiza estado do Canvas e registra no histórico via Immer
  const updateCanvasState = useCallback(
    (
      nextStateOrRecipe: NormalizedCanvasData | CanvasData | ((draft: NormalizedCanvasData) => void),
      label: string = 'Alteração no Layout'
    ) => {
      setNormalizedCanvas((prev) => {
        if (!prev) return prev;

        // Se estiver no meio de um ajuste de slider/arrasto, atualiza transientemente sem criar novo patch de histórico
        if (isAdjusting) {
          if (!dragStartStateRef.current) {
            dragStartStateRef.current = prev;
            dragLabelRef.current = label;
          }
          if (typeof nextStateOrRecipe === 'function') {
            return produce(prev, nextStateOrRecipe);
          } else {
            return 'nodes' in nextStateOrRecipe
              ? (nextStateOrRecipe as NormalizedCanvasData)
              : normalizeCanvasData(nextStateOrRecipe as CanvasData);
          }
        }

        // Ação discreta comum (clique, remoção, adição): gera patch delta no histórico
        if (typeof nextStateOrRecipe === 'function') {
          return history.pushState(prev, nextStateOrRecipe, label);
        } else {
          const targetNormalized =
            'nodes' in nextStateOrRecipe
              ? (nextStateOrRecipe as NormalizedCanvasData)
              : normalizeCanvasData(nextStateOrRecipe as CanvasData);
          return history.pushState(prev, targetNormalized, label);
        }
      });
    },
    [isAdjusting, history]
  );

  // Seleção de Elementos
  const selectElement = useCallback(
    (id: string | null, type?: SelectionState['type']) => {
      if (!id || !normalizedCanvas) {
        setSelection({ id: null, type: null });
        return;
      }

      if (type) {
        setSelection({ id, type });
        return;
      }

      const node = normalizedCanvas.nodes[id];
      if (node) {
        setSelection({
          id,
          type: node.type as SelectionState['type'],
        });
      } else if (canvasData) {
        const found = findElementInCanvas(canvasData, id);
        if (found) {
          setSelection({
            id,
            type: found.element.type as SelectionState['type'],
          });
        } else {
          setSelection({ id: null, type: null });
        }
      } else {
        setSelection({ id: null, type: null });
      }
    },
    [normalizedCanvas, canvasData]
  );

  // Actions do Navbar
  const updateNavbar = useCallback(
    (patch: Partial<NavbarConfig>) => {
      if (!normalizedCanvas) return;
      const currentNavbar: NavbarConfig = normalizedCanvas.navbar || {
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

      updateCanvasState((draft) => {
        draft.navbar = updatedNavbar;
      }, 'Atualizou Cabeçalho / Navbar');
    },
    [normalizedCanvas, updateCanvasState]
  );

  // Actions de Seção
  const addSection = useCallback(
    (label?: string, index?: number) => {
      if (!canvasData) return;
      const updated = addSectionHelper(canvasData, label, index);
      updateCanvasState(updated, `Adicionou Seção "${label || 'Nova Seção'}"`);
    },
    [canvasData, updateCanvasState]
  );

  const addCustomSection = useCallback(
    (customSection: Section, index?: number) => {
      if (!canvasData) return;
      const sections = [...canvasData.sections];
      const isFooter =
        customSection.anchorId === 'sec-footer' ||
        (customSection.label && customSection.label.toLowerCase().includes('rodapé'));

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
    },
    [canvasData, updateCanvasState, selectElement]
  );

  // Remoção de Seção em Cascata O(1)
  const removeSection = useCallback(
    (sectionId: string) => {
      if (!normalizedCanvas) return;
      const adjacent = canvasData ? findAdjacentElementAfterRemoval(canvasData, sectionId) : null;
      updateCanvasState((draft) => {
        removeNodeCascadeInFlatCanvas(draft.nodes, sectionId);
        const root = draft.nodes['root'];
        if (root && Array.isArray(root.childrenIds)) {
          root.childrenIds = root.childrenIds.filter((id) => id !== sectionId);
        }
      }, 'Removeu Seção');

      if (adjacent) {
        selectElement(adjacent.id, adjacent.type);
      } else {
        selectElement(null);
      }
    },
    [normalizedCanvas, canvasData, updateCanvasState, selectElement]
  );

  const moveSection = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!canvasData) return;
      const updated = moveSectionHelper(canvasData, fromIndex, toIndex);
      updateCanvasState(updated, 'Reordenou Seções');
    },
    [canvasData, updateCanvasState]
  );

  const updateSection = useCallback(
    (sectionId: string, patch: Partial<Section>) => {
      if (!normalizedCanvas) return;
      updateCanvasState((draft) => {
        if (draft.nodes[sectionId]) {
          Object.assign(draft.nodes[sectionId], patch);
        }
      }, 'Editou Seção');
    },
    [normalizedCanvas, updateCanvasState]
  );

  // Actions de Componente
  const addComponent = useCallback(
    (parentId: string, component: Component, index?: number) => {
      if (!canvasData) return;
      const updated = addComponentHelper(canvasData, parentId, component, index);
      updateCanvasState(updated, `Adicionou "${component.label || component.type}"`);
      selectElement(component.id, component.type as SelectionState['type']);
    },
    [canvasData, updateCanvasState, selectElement]
  );

  // Remoção de Componente em Cascata O(1)
  const removeComponent = useCallback(
    (componentId: string) => {
      if (!normalizedCanvas) return;
      const adjacent = canvasData ? findAdjacentElementAfterRemoval(canvasData, componentId) : null;
      updateCanvasState((draft) => {
        removeNodeCascadeInFlatCanvas(draft.nodes, componentId);
      }, 'Removeu Componente');

      if (adjacent) {
        selectElement(adjacent.id, adjacent.type);
      } else {
        selectElement(null);
      }
    },
    [normalizedCanvas, canvasData, updateCanvasState, selectElement]
  );

  const updateComponent = useCallback(
    (componentId: string, patch: Partial<Component>) => {
      if (!normalizedCanvas) return;
      updateCanvasState((draft) => {
        if (draft.nodes[componentId]) {
          Object.assign(draft.nodes[componentId], patch);
        }
      }, 'Editou Componente');
    },
    [normalizedCanvas, updateCanvasState]
  );

  // 👯 DUPLICAR ELEMENTO
  const duplicateElement = useCallback(
    (id: string) => {
      if (!canvasData) return;
      const { canvas: updated, newId, newType } = duplicateElementInCanvas(canvasData, id);
      updateCanvasState(updated, 'Duplicou Elemento');
      if (newId && newType) {
        selectElement(newId, newType);
      }
    },
    [canvasData, updateCanvasState, selectElement]
  );

  // 📋 COPIAR ELEMENTO
  const copyElement = useCallback(
    (id: string) => {
      if (!canvasData) return;
      const found = findElementInCanvas(canvasData, id);
      if (found) {
        setCopiedElement(found.element);
      }
    },
    [canvasData]
  );

  // 📌 COLAR ELEMENTO
  const pasteElement = useCallback(
    (targetParentId: string) => {
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
    },
    [canvasData, copiedElement, updateCanvasState, selectElement]
  );

  // 🎨 COLAR APENAS ESTILO ENTRE ELEMENTOS DO MESMO TIPO
  const pasteStyleElement = useCallback(
    (targetId: string) => {
      if (!canvasData || !copiedElement) return;
      const updated = pasteStyleToElementInCanvas(canvasData, targetId, copiedElement);
      updateCanvasState(updated, 'Colou Estilo do Elemento');
      selectElement(targetId);
    },
    [canvasData, copiedElement, updateCanvasState, selectElement]
  );

  // 🚚 MOVER ELEMENTO DE CONTAINER / SEÇÃO
  const moveElement = useCallback(
    (elementId: string, targetParentId: string) => {
      if (!canvasData) return;
      const updated = moveElementInCanvas(canvasData, elementId, targetParentId);
      updateCanvasState(updated, 'Moveu Elemento');
      selectElement(elementId);
    },
    [canvasData, updateCanvasState, selectElement]
  );

  // ↕️ REORDENAR / MOVER ELEMENTO ANTES OU DEPOIS DE OUTRO
  const moveElementBeforeOrAfter = useCallback(
    (elementId: string, targetElementId: string, position: 'before' | 'after') => {
      if (!canvasData) return;
      const updated = moveElementBeforeOrAfterHelper(canvasData, elementId, targetElementId, position);
      updateCanvasState(updated, 'Reordenou Elemento');
      selectElement(elementId);
    },
    [canvasData, updateCanvasState, selectElement]
  );

  // ➕ ADICIONAR COMPONENTE ANTES OU DEPOIS DE OUTRO
  const addComponentBeforeOrAfter = useCallback(
    (targetElementId: string, component: Component, position: 'before' | 'after') => {
      if (!canvasData) return;
      const updated = addComponentBeforeOrAfterHelper(canvasData, targetElementId, component, position);
      updateCanvasState(updated, `Adicionou "${component.label || component.type}"`);
      selectElement(component.id, component.type as any);
    },
    [canvasData, updateCanvasState, selectElement]
  );

  // Undo / Redo handlers via Immer Patches
  const handleUndo = useCallback(() => {
    setNormalizedCanvas((prev) => {
      if (!prev) return prev;
      const undone = history.undo(prev);
      return undone || prev;
    });
  }, [history]);

  const handleRedo = useCallback(() => {
    setNormalizedCanvas((prev) => {
      if (!prev) return prev;
      const redone = history.redo(prev);
      return redone || prev;
    });
  }, [history]);

  const jumpToHistoryIndex = useCallback(
    (index: number) => {
      setNormalizedCanvas((prev) => {
        if (!prev) return prev;
        const target = history.jumpToIndex(index, prev);
        return target || prev;
      });
    },
    [history]
  );

  // 🎨 ATUALIZAÇÃO DO SITE CONFIG (CORES, TIPOGRAFIA, LOGO, ETC)
  const updateSiteConfig = useCallback(
    (patch: any) => {
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

        api
          .updateCapturePage(pageId, {
            siteConfigDraft: updatedSiteConfig,
            ...(patch.logoUrl !== undefined ? { logoUrl: patch.logoUrl } : {}),
          })
          .catch((err) => {
            console.error('❌ Erro ao salvar siteConfigDraft:', err);
          });

        return newPage;
      });
    },
    [pageId]
  );

  // ⚙️ ATUALIZAÇÃO DE PROPRIEDADES GERAIS DA PÁGINA
  const updatePage = useCallback(
    (patch: Partial<CapturePage>) => {
      setPage((prevPage) => {
        if (!prevPage) return prevPage;
        const newPage = { ...prevPage, ...patch };

        api.updateCapturePage(pageId, patch).catch((err) => {
          console.error('❌ Erro ao salvar página:', err);
        });

        return newPage;
      });
    },
    [pageId]
  );

  // 🚀 PUBLICAÇÃO DA PÁGINA
  const [isPublishing, setIsPublishing] = useState(false);

  const publishPage = useCallback(async () => {
    if (!pageId || !canvasData) return;
    setIsPublishing(true);
    try {
      await autoSave.forceSave();
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

  // 🌐 MODO DE EDIÇÃO DE ELEMENTO GLOBAL MASTER (IN-PLACE UI)
  const enterMasterEditing = useCallback(
    (masterId: string) => {
      setEditingMasterId(masterId);
      const master = canvasData?.globalComponentsMap?.[masterId];
      if (master && master.masterNode) {
        setSelection({ id: master.masterNode.id, type: master.masterNode.type as any });
      } else {
        setSelection({ id: null, type: null });
      }
    },
    [canvasData]
  );

  const exitMasterEditing = useCallback(() => {
    setEditingMasterId(null);
    setSelection({ id: null, type: null });
  }, []);

  // 🌐 CONVERTER NÓ DO CANVAS EM ELEMENTO GLOBAL MASTER (SEM MODAL POPUP)
  const createGlobalFromElement = useCallback(
    async (elementId: string) => {
      if (!canvasData || !page) return;

      const found = findElementInCanvas(canvasData, elementId);
      if (!found || !found.element || found.element.type === 'section') return;

      const targetComponent = found.element as Component;
      const workspaceId = page.tenantId || (page as any).workspaceId || (page as any).workspace_id || '';

      const masterId = crypto.randomUUID();
      const rawName = targetComponent.label || (targetComponent as any).props?.text || (targetComponent as any).props?.title || targetComponent.type;
      const cleanName = typeof rawName === 'string' ? rawName.slice(0, 30) : targetComponent.type;
      const name = cleanName.toLowerCase().startsWith('global:') ? cleanName : `Global: ${cleanName}`;

      const globalMaster: GlobalComponentMaster = {
        id: masterId,
        workspaceId,
        name,
        category: 'custom',
        iconName: 'Sparkles',
        masterNode: JSON.parse(JSON.stringify(targetComponent)),
        customizableProps: [], // Por padrão nada é personalizável
        updatedAt: new Date().toISOString(),
      };

      const newInstance: GlobalInstanceComponent = {
        id: targetComponent.id,
        type: 'global_instance',
        globalComponentId: masterId,
        overrides: {},
        layout: (targetComponent as any).layout,
      };

      const currentMap = canvasData.globalComponentsMap || {};
      const updatedMap = {
        ...currentMap,
        [globalMaster.id]: globalMaster,
      };

      const updatedCanvas = updateComponentHelper(canvasData, targetComponent.id, () => newInstance as any);

      updateCanvasState(
        {
          ...updatedCanvas,
          globalComponentsMap: updatedMap,
        },
        `Criou Elemento Global "${name}"`
      );

      selectElement(targetComponent.id, 'global_instance');

      if (workspaceId) {
        try {
          await api.createGlobalComponent({
            id: globalMaster.id,
            workspaceId,
            name: globalMaster.name,
            category: globalMaster.category,
            iconName: globalMaster.iconName,
            masterNode: globalMaster.masterNode,
            customizableProps: globalMaster.customizableProps,
          });
        } catch (err) {
          console.error('❌ Erro ao persistir elemento global no banco:', err);
        }
      }
    },
    [canvasData, page, updateCanvasState, selectElement]
  );

  // 🌐 ADICIONAR ELEMENTO GLOBAL MASTER E TRANSFORMAR EM INSTÂNCIA
  const addGlobalComponentMaster = useCallback(
    async (globalMaster: GlobalComponentMaster, newInstance: GlobalInstanceComponent) => {
      if (!canvasData) return;
      const currentMap = canvasData.globalComponentsMap || {};
      const updatedMap = {
        ...currentMap,
        [globalMaster.id]: globalMaster,
      };
      const updatedCanvas = updateComponentHelper(canvasData, newInstance.id, () => newInstance as any);
      updateCanvasState(
        {
          ...updatedCanvas,
          globalComponentsMap: updatedMap,
        },
        `Criou Elemento Global "${globalMaster.name}"`
      );
      selectElement(newInstance.id, 'global_instance');

      try {
        await api.createGlobalComponent({
          id: globalMaster.id,
          workspaceId: globalMaster.workspaceId,
          name: globalMaster.name,
          category: globalMaster.category,
          iconName: globalMaster.iconName,
          masterNode: globalMaster.masterNode,
          customizableProps: globalMaster.customizableProps,
        });
      } catch (err) {
        console.error('Erro ao persistir elemento global no banco:', err);
      }
    },
    [canvasData, updateCanvasState, selectElement]
  );

  // 🌐 ATUALIZAR ELEMENTO GLOBAL MASTER
  const updateGlobalComponentMaster = useCallback(
    async (updatedMaster: GlobalComponentMaster) => {
      if (!canvasData) return;
      const currentMap = canvasData.globalComponentsMap || {};
      const updatedMap = {
        ...currentMap,
        [updatedMaster.id]: updatedMaster,
      };
      updateCanvasState(
        {
          ...canvasData,
          globalComponentsMap: updatedMap,
        },
        `Atualizou Elemento Global Master "${updatedMaster.name}"`
      );

      try {
        await api.updateGlobalComponent(updatedMaster.id, {
          name: updatedMaster.name,
          category: updatedMaster.category,
          masterNode: updatedMaster.masterNode,
          customizableProps: updatedMaster.customizableProps,
        });
      } catch (err) {
        console.error('Erro ao atualizar elemento global no banco:', err);
      }
    },
    [canvasData, updateCanvasState]
  );

  // 🌐 LIBERAR OU REMOVER VARIÁVEL PERSONALIZÁVEL (+) NO MASTER
  const toggleExposedProp = useCallback(
    async (masterId: string, declaration: { path: string; nodeId: string; label: string; propKey: string; type: any; defaultValue?: any }) => {
      if (!canvasData) return;
      const master = canvasData.globalComponentsMap?.[masterId];
      if (!master) return;

      const currentProps = master.customizableProps || [];
      const exists = currentProps.some((p) => p.path === declaration.path);
      const updatedProps = exists
        ? currentProps.filter((p) => p.path !== declaration.path)
        : [...currentProps, declaration];

      const updatedMaster: GlobalComponentMaster = {
        ...master,
        customizableProps: updatedProps,
        updatedAt: new Date().toISOString(),
      };

      const updatedMap = {
        ...(canvasData.globalComponentsMap || {}),
        [masterId]: updatedMaster,
      };

      updateCanvasState(
        {
          ...canvasData,
          globalComponentsMap: updatedMap,
        },
        exists ? `Removeu personalização da propriedade "${declaration.label}"` : `Liberou personalização para "${declaration.label}"`
      );

      try {
        await api.updateGlobalComponent(masterId, { customizableProps: updatedProps });
      } catch (err) {
        console.error('Erro ao atualizar propriedade exposta no banco:', err);
      }
    },
    [canvasData, updateCanvasState]
  );

  // 🌐 DELETAR ELEMENTO GLOBAL DO WORKSPACE
  const deleteGlobalMaster = useCallback(
    async (masterId: string) => {
      if (!canvasData) return;
      const currentMap = { ...(canvasData.globalComponentsMap || {}) };
      delete currentMap[masterId];

      updateCanvasState(
        {
          ...canvasData,
          globalComponentsMap: currentMap,
        },
        'Excluiu Elemento Global'
      );

      if (editingMasterId === masterId) {
        setEditingMasterId(null);
      }

      try {
        await api.deleteGlobalComponent(masterId);
      } catch (err) {
        console.error('Erro ao excluir elemento global do banco:', err);
      }
    },
    [canvasData, updateCanvasState, editingMasterId]
  );

  // 🌐 DESVINCULAR INSTÂNCIA GLOBAL (DETACH)
  const unlinkInstance = useCallback(
    (instanceId: string) => {
      if (!canvasData) return;
      const updatedCanvas = unlinkGlobalInstanceInCanvas(canvasData, instanceId, canvasData.globalComponentsMap);
      updateCanvasState(updatedCanvas, 'Desvinculou Elemento Global (Detach)');
      selectElement(null);
    },
    [canvasData, updateCanvasState, selectElement]
  );

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
    normalizedCanvas,
    editingMasterId,
    editingMaster: editingMasterId ? canvasData?.globalComponentsMap?.[editingMasterId] || null : null,
    enterMasterEditing,
    exitMasterEditing,
    toggleExposedProp,
    deleteGlobalMaster,
    unlinkInstance,
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
    createGlobalFromElement,
    addGlobalComponentMaster,
    updateGlobalComponentMaster,
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

