import { useState, useCallback } from 'react';
import { CanvasData } from '../types';

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  label: string;
  canvasData: CanvasData;
}

interface UseEditorHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  entries: HistoryEntry[];
  currentIndex: number;
  pushState: (newState: CanvasData, label?: string) => void;
  undo: () => CanvasData | null;
  redo: () => CanvasData | null;
  jumpToIndex: (index: number) => CanvasData | null;
  resetHistory: (initialState: CanvasData) => void;
}

const MAX_HISTORY_LENGTH = 30;

export function useEditorHistory(initialState?: CanvasData): UseEditorHistoryReturn {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => {
    if (!initialState) return [];
    return [
      {
        id: 'init-' + Date.now(),
        timestamp: new Date(),
        label: 'Estado Inicial da Página',
        canvasData: initialState,
      },
    ];
  });

  const [currentIndex, setCurrentIndex] = useState<number>(() => (initialState ? 0 : -1));

  const pushState = useCallback((newState: CanvasData, label: string = 'Alteração no Layout') => {
    setEntries((prevEntries) => {
      // Trunca o histórico futuro se estivemos no meio de um undo
      const validHistory = prevEntries.slice(0, currentIndex + 1);
      const newEntry: HistoryEntry = {
        id: 'entry-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        timestamp: new Date(),
        label,
        canvasData: newState,
      };

      const updated = [...validHistory, newEntry];
      if (updated.length > MAX_HISTORY_LENGTH) {
        return updated.slice(updated.length - MAX_HISTORY_LENGTH);
      }
      return updated;
    });

    setCurrentIndex((prev) => {
      const validLen = prev + 1;
      return validLen >= MAX_HISTORY_LENGTH ? MAX_HISTORY_LENGTH - 1 : validLen;
    });
  }, [currentIndex]);

  const undo = useCallback((): CanvasData | null => {
    if (currentIndex <= 0 || entries.length === 0) return null;

    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    return entries[newIndex]?.canvasData || null;
  }, [currentIndex, entries]);

  const redo = useCallback((): CanvasData | null => {
    if (currentIndex >= entries.length - 1 || entries.length === 0) return null;

    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    return entries[newIndex]?.canvasData || null;
  }, [currentIndex, entries]);

  const jumpToIndex = useCallback((index: number): CanvasData | null => {
    if (index < 0 || index >= entries.length) return null;
    setCurrentIndex(index);
    return entries[index].canvasData;
  }, [entries]);

  const resetHistory = useCallback((initial: CanvasData) => {
    const initEntry: HistoryEntry = {
      id: 'init-' + Date.now(),
      timestamp: new Date(),
      label: 'Estado Inicial da Página',
      canvasData: initial,
    };
    setEntries([initEntry]);
    setCurrentIndex(0);
  }, []);

  return {
    canUndo: currentIndex > 0,
    canRedo: currentIndex < entries.length - 1,
    entries,
    currentIndex,
    pushState,
    undo,
    redo,
    jumpToIndex,
    resetHistory,
  };
}

