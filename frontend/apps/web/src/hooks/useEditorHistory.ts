import { useState, useRef, useCallback, useEffect } from 'react';

export interface HistoryState<T> {
  past: T[];
  future: T[];
}

export function useEditorHistory<T>(
  initialValue: T | null,
  onApplyState: (state: T) => void,
  debounceMs: number = 600
) {
  const historyRef = useRef<HistoryState<T>>({
    past: initialValue ? [JSON.parse(JSON.stringify(initialValue))] : [],
    future: [],
  });

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const ignoreHistoryRef = useRef(false);
  const timerRef = useRef<any>(null);

  const updateFlags = useCallback(() => {
    setCanUndo(historyRef.current.past.length > 1);
    setCanRedo(historyRef.current.future.length > 0);
  }, []);

  // Initialize initial state if loaded asynchronously
  const setInitialState = useCallback((val: T) => {
    if (historyRef.current.past.length === 0) {
      historyRef.current.past = [JSON.parse(JSON.stringify(val))];
      historyRef.current.future = [];
      updateFlags();
    }
  }, [updateFlags]);

  const recordChange = useCallback((val: T, forceImmediate = false) => {
    if (ignoreHistoryRef.current || !val) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const push = () => {
      const cloned = JSON.parse(JSON.stringify(val));
      const history = historyRef.current;
      const last = history.past[history.past.length - 1];

      // Avoid pushing identical state
      if (last && JSON.stringify(last) === JSON.stringify(cloned)) {
        return;
      }

      history.past.push(cloned);
      history.future = [];
      updateFlags();
    };

    if (forceImmediate) {
      push();
    } else {
      timerRef.current = setTimeout(push, debounceMs);
    }
  }, [debounceMs, updateFlags]);

  const undo = useCallback(() => {
    const history = historyRef.current;
    if (history.past.length <= 1) return;

    const current = history.past.pop();
    if (current) {
      history.future.push(current);
    }

    const previous = history.past[history.past.length - 1];
    if (previous) {
      ignoreHistoryRef.current = true;
      onApplyState(JSON.parse(JSON.stringify(previous)));
      setTimeout(() => {
        ignoreHistoryRef.current = false;
      }, 50);
    }

    updateFlags();
  }, [onApplyState, updateFlags]);

  const redo = useCallback(() => {
    const history = historyRef.current;
    if (history.future.length === 0) return;

    const next = history.future.pop();
    if (next) {
      history.past.push(next);
      ignoreHistoryRef.current = true;
      onApplyState(JSON.parse(JSON.stringify(next)));
      setTimeout(() => {
        ignoreHistoryRef.current = false;
      }, 50);
    }

    updateFlags();
  }, [onApplyState, updateFlags]);

  // Keyboard shortcut listener for Ctrl+Z and Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;

      const target = e.target as HTMLElement | null;
      // Don't intercept Ctrl+Z in input fields if user is typing text, unless handled
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isInput) return;

      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    recordChange,
    setInitialState,
    ignoreHistoryRef,
  };
}
