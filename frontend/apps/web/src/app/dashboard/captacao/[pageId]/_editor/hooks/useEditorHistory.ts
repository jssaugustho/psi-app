import { useState, useCallback } from 'react';
import { CanvasData } from '../types';

interface UseEditorHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  pushState: (newState: CanvasData) => void;
  undo: () => CanvasData | null;
  redo: () => CanvasData | null;
  resetHistory: (initialState: CanvasData) => void;
}

const MAX_HISTORY_LENGTH = 30;

export function useEditorHistory(initialState?: CanvasData): UseEditorHistoryReturn {
  const [past, setPast] = useState<CanvasData[]>([]);
  const [present, setPresent] = useState<CanvasData | null>(initialState || null);
  const [future, setFuture] = useState<CanvasData[]>([]);

  const pushState = useCallback((newState: CanvasData) => {
    setPast((prevPast) => {
      const currentPresent = present;
      const updatedPast = currentPresent ? [...prevPast, currentPresent] : prevPast;
      if (updatedPast.length > MAX_HISTORY_LENGTH) {
        return updatedPast.slice(updatedPast.length - MAX_HISTORY_LENGTH);
      }
      return updatedPast;
    });
    setPresent(newState);
    setFuture([]);
  }, [present]);

  const undo = useCallback((): CanvasData | null => {
    if (past.length === 0) return null;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setPast(newPast);
    if (present) {
      setFuture((prevFuture) => [present, ...prevFuture]);
    }
    setPresent(previous);

    return previous;
  }, [past, present]);

  const redo = useCallback((): CanvasData | null => {
    if (future.length === 0) return null;

    const next = future[0];
    const newFuture = future.slice(1);

    if (present) {
      setPast((prevPast) => [...prevPast, present]);
    }
    setPresent(next);
    setFuture(newFuture);

    return next;
  }, [future, present]);

  const resetHistory = useCallback((initial: CanvasData) => {
    setPast([]);
    setPresent(initial);
    setFuture([]);
  }, []);

  return {
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    pushState,
    undo,
    redo,
    resetHistory,
  };
}
