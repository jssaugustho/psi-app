import { useState, useCallback, useRef } from 'react';
import { produceWithPatches, applyPatches, Patch, enablePatches } from 'immer';
import { NormalizedCanvasData } from '../types';

// Habilita a funcionalidade de patches no Immer
enablePatches();

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  label: string;
  patches: Patch[];
  inversePatches: Patch[];
}

interface UseEditorHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  entries: HistoryEntry[];
  currentIndex: number;
  pushState: (
    currentState: NormalizedCanvasData,
    nextStateOrRecipe: NormalizedCanvasData | ((draft: NormalizedCanvasData) => void),
    label?: string
  ) => NormalizedCanvasData;
  pushPatches: (patches: Patch[], inversePatches: Patch[], label?: string) => void;
  undo: (currentState: NormalizedCanvasData) => NormalizedCanvasData | null;
  redo: (currentState: NormalizedCanvasData) => NormalizedCanvasData | null;
  jumpToIndex: (targetIndex: number, currentState: NormalizedCanvasData) => NormalizedCanvasData | null;
  resetHistory: (initialState: NormalizedCanvasData) => void;
}

const MAX_HISTORY_LENGTH = 50;

export function useEditorHistory(initialState?: NormalizedCanvasData): UseEditorHistoryReturn {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  // Armazena a referência mais recente das entradas para cálculos atômicos
  const entriesRef = useRef<HistoryEntry[]>(entries);
  entriesRef.current = entries;
  const indexRef = useRef<number>(currentIndex);
  indexRef.current = currentIndex;

  const pushState = useCallback(
    (
      currentState: NormalizedCanvasData,
      nextStateOrRecipe: NormalizedCanvasData | ((draft: NormalizedCanvasData) => void),
      label: string = 'Alteração no Layout'
    ): NormalizedCanvasData => {
      let nextState: NormalizedCanvasData;
      let patches: Patch[];
      let inversePatches: Patch[];

      if (typeof nextStateOrRecipe === 'function') {
        [nextState, patches, inversePatches] = produceWithPatches(currentState, nextStateOrRecipe);
      } else {
        [nextState, patches, inversePatches] = produceWithPatches(currentState, () => nextStateOrRecipe);
      }

      // Se não houve nenhuma mudança de dados real, não adiciona ao histórico
      if (patches.length === 0) {
        return currentState;
      }

      const newEntry: HistoryEntry = {
        id: 'entry-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        timestamp: new Date(),
        label,
        patches,
        inversePatches,
      };

      const currIdx = indexRef.current;
      const validHistory = entriesRef.current.slice(0, currIdx + 1);
      const updatedEntries = [...validHistory, newEntry];

      let finalEntries = updatedEntries;
      let newIdx = validHistory.length;

      if (updatedEntries.length > MAX_HISTORY_LENGTH) {
        finalEntries = updatedEntries.slice(updatedEntries.length - MAX_HISTORY_LENGTH);
        newIdx = finalEntries.length - 1;
      }

      setEntries(finalEntries);
      setCurrentIndex(newIdx);

      return nextState;
    },
    []
  );

  const pushPatches = useCallback(
    (patches: Patch[], inversePatches: Patch[], label: string = 'Alteração no Layout') => {
      if (!patches || patches.length === 0) return;

      const newEntry: HistoryEntry = {
        id: 'entry-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        timestamp: new Date(),
        label,
        patches,
        inversePatches,
      };

      const currIdx = indexRef.current;
      const validHistory = entriesRef.current.slice(0, currIdx + 1);
      const updatedEntries = [...validHistory, newEntry];

      let finalEntries = updatedEntries;
      let newIdx = validHistory.length;

      if (updatedEntries.length > MAX_HISTORY_LENGTH) {
        finalEntries = updatedEntries.slice(updatedEntries.length - MAX_HISTORY_LENGTH);
        newIdx = finalEntries.length - 1;
      }

      setEntries(finalEntries);
      setCurrentIndex(newIdx);
    },
    []
  );

  const undo = useCallback(
    (currentState: NormalizedCanvasData): NormalizedCanvasData | null => {
      const currIdx = indexRef.current;
      const currentEntries = entriesRef.current;

      if (currIdx < 0 || currIdx >= currentEntries.length) return null;

      const entryToUndo = currentEntries[currIdx];
      if (!entryToUndo) return null;

      const previousState = applyPatches(currentState, entryToUndo.inversePatches);
      setCurrentIndex(currIdx - 1);

      return previousState;
    },
    []
  );

  const redo = useCallback(
    (currentState: NormalizedCanvasData): NormalizedCanvasData | null => {
      const currIdx = indexRef.current;
      const currentEntries = entriesRef.current;

      if (currIdx >= currentEntries.length - 1) return null;

      const nextIdx = currIdx + 1;
      const entryToRedo = currentEntries[nextIdx];
      if (!entryToRedo) return null;

      const nextState = applyPatches(currentState, entryToRedo.patches);
      setCurrentIndex(nextIdx);

      return nextState;
    },
    []
  );

  const jumpToIndex = useCallback(
    (targetIndex: number, currentState: NormalizedCanvasData): NormalizedCanvasData | null => {
      const currentEntries = entriesRef.current;
      const currIdx = indexRef.current;

      if (targetIndex < -1 || targetIndex >= currentEntries.length) return null;
      if (targetIndex === currIdx) return currentState;

      let state = currentState;

      if (targetIndex < currIdx) {
        // Desfaz sequencialmente do currIdx até targetIndex + 1
        for (let i = currIdx; i > targetIndex; i--) {
          const entry = currentEntries[i];
          if (entry) {
            state = applyPatches(state, entry.inversePatches);
          }
        }
      } else {
        // Refaz sequencialmente de currIdx + 1 até targetIndex
        for (let i = currIdx + 1; i <= targetIndex; i++) {
          const entry = currentEntries[i];
          if (entry) {
            state = applyPatches(state, entry.patches);
          }
        }
      }

      setCurrentIndex(targetIndex);
      return state;
    },
    []
  );

  const resetHistory = useCallback((initialState: NormalizedCanvasData) => {
    setEntries([]);
    setCurrentIndex(-1);
  }, []);

  return {
    canUndo: currentIndex >= 0,
    canRedo: currentIndex < entries.length - 1,
    entries,
    currentIndex,
    pushState,
    pushPatches,
    undo,
    redo,
    jumpToIndex,
    resetHistory,
  };
}
