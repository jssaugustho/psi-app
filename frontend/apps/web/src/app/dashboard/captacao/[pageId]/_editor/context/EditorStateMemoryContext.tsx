'use client';

import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';

interface EditorStateMemoryContextType {
  isAccordionOpen: (scopeId: string, accordionId: string, defaultOpen?: boolean, typeFallback?: string) => boolean;
  toggleAccordion: (scopeId: string, accordionId: string, defaultOpen?: boolean, typeFallback?: string) => void;
  setAccordionOpen: (scopeId: string, accordionId: string, isOpen: boolean, typeFallback?: string) => void;
  getScrollPosition: (key: string) => number;
  saveScrollPosition: (key: string, scrollTop: number) => void;
  openLayerIds: Set<string>;
  setOpenLayerIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const EditorStateMemoryContext = createContext<EditorStateMemoryContextType | null>(null);

export interface EditorStateMemoryProviderProps {
  pageId: string;
  children: React.ReactNode;
}

const STORAGE_PREFIX = 'psi_editor_state_v1_';

export function EditorStateMemoryProvider({ pageId, children }: EditorStateMemoryProviderProps) {
  const [accordionMap, setAccordionMap] = useState<Record<string, boolean>>({});
  const [openLayerIds, setOpenLayerIds] = useState<Set<string>>(new Set());

  // Mutable Refs para leitura instantânea e persistência sem re-renderizar
  const accordionMapRef = useRef<Record<string, boolean>>({});
  const openLayerIdsRef = useRef<Set<string>>(new Set());
  const scrollMapRef = useRef<Record<string, number>>({});
  const isInitializedRef = useRef(false);

  // Mantém refs sincronizadas com o estado
  useEffect(() => {
    accordionMapRef.current = accordionMap;
  }, [accordionMap]);

  useEffect(() => {
    openLayerIdsRef.current = openLayerIds;
  }, [openLayerIds]);

  // Carrega estado memorizado do sessionStorage ao inicializar
  useEffect(() => {
    if (!pageId || typeof window === 'undefined') return;
    try {
      const stored = sessionStorage.getItem(`${STORAGE_PREFIX}${pageId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.accordions) {
          setAccordionMap(parsed.accordions);
          accordionMapRef.current = parsed.accordions;
        }
        if (parsed.scrolls) {
          scrollMapRef.current = parsed.scrolls;
        }
        if (Array.isArray(parsed.openLayers)) {
          const layerSet = new Set<string>(parsed.openLayers);
          setOpenLayerIds(layerSet);
          openLayerIdsRef.current = layerSet;
        }
      }
    } catch (err) {
      console.warn('⚠️ Não foi possível carregar memória de estado do editor:', err);
    } finally {
      isInitializedRef.current = true;
    }
  }, [pageId]);

  // Persiste alterações no sessionStorage de forma auto-salva (debounced)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const syncToStorage = useCallback(() => {
    if (!isInitializedRef.current || !pageId || typeof window === 'undefined') return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const payload = {
          accordions: accordionMapRef.current,
          scrolls: scrollMapRef.current,
          openLayers: Array.from(openLayerIdsRef.current),
        };
        sessionStorage.setItem(`${STORAGE_PREFIX}${pageId}`, JSON.stringify(payload));
      } catch (_) {}
    }, 300);
  }, [pageId]);

  const isAccordionOpen = useCallback(
    (scopeId: string, accordionId: string, defaultOpen = false, typeFallback?: string): boolean => {
      const exactKey = `${scopeId}:${accordionId}`;
      if (exactKey in accordionMap) {
        return accordionMap[exactKey];
      }
      if (typeFallback) {
        const fallbackKey = `${typeFallback}:${accordionId}`;
        if (fallbackKey in accordionMap) {
          return accordionMap[fallbackKey];
        }
      }
      return defaultOpen;
    },
    [accordionMap]
  );

  const toggleAccordion = useCallback(
    (scopeId: string, accordionId: string, defaultOpen = false, typeFallback?: string) => {
      setAccordionMap((prev) => {
        const currentVal = isAccordionOpen(scopeId, accordionId, defaultOpen, typeFallback);
        const nextVal = !currentVal;
        const nextMap = { ...prev, [`${scopeId}:${accordionId}`]: nextVal };
        if (typeFallback) {
          nextMap[`${typeFallback}:${accordionId}`] = nextVal;
        }
        accordionMapRef.current = nextMap;
        syncToStorage();
        return nextMap;
      });
    },
    [isAccordionOpen, syncToStorage]
  );

  const setAccordionOpen = useCallback(
    (scopeId: string, accordionId: string, isOpen: boolean, typeFallback?: string) => {
      setAccordionMap((prev) => {
        const nextMap = { ...prev, [`${scopeId}:${accordionId}`]: isOpen };
        if (typeFallback) {
          nextMap[`${typeFallback}:${accordionId}`] = isOpen;
        }
        accordionMapRef.current = nextMap;
        syncToStorage();
        return nextMap;
      });
    },
    [syncToStorage]
  );

  const getScrollPosition = useCallback((key: string): number => {
    return scrollMapRef.current[key] || 0;
  }, []);

  const saveScrollPosition = useCallback(
    (key: string, scrollTop: number) => {
      if (scrollMapRef.current[key] === scrollTop) return;
      scrollMapRef.current[key] = scrollTop;
      syncToStorage();
    },
    [syncToStorage]
  );

  const handleSetOpenLayerIds: React.Dispatch<React.SetStateAction<Set<string>>> = useCallback(
    (action) => {
      setOpenLayerIds((prev) => {
        const next = typeof action === 'function' ? action(prev) : action;
        openLayerIdsRef.current = next;
        syncToStorage();
        return next;
      });
    },
    [syncToStorage]
  );

  return (
    <EditorStateMemoryContext.Provider
      value={{
        isAccordionOpen,
        toggleAccordion,
        setAccordionOpen,
        getScrollPosition,
        saveScrollPosition,
        openLayerIds,
        setOpenLayerIds: handleSetOpenLayerIds,
      }}
    >
      {children}
    </EditorStateMemoryContext.Provider>
  );
}

export function useEditorStateMemory() {
  const ctx = useContext(EditorStateMemoryContext);
  return ctx;
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useSidebarScrollMemory(key: string) {
  const memory = useEditorStateMemory();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !memory) return;
    const targetPos = memory.getScrollPosition(key);
    if (targetPos > 0) {
      el.scrollTop = targetPos;
    }
  }, [key]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!memory) return;
      memory.saveScrollPosition(key, e.currentTarget.scrollTop);
    },
    [key, memory]
  );

  return { containerRef, handleScroll };
}
