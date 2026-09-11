import { useEffect, useRef, useState, useCallback } from 'react';
import { CanvasData } from '../types';
import { api } from '@/lib/api';

interface UseAutoSaveProps {
  pageId: string;
  canvasData: CanvasData | null;
  enabled?: boolean;
  debounceMs?: number;
}

export function useAutoSave({
  pageId,
  canvasData,
  enabled = true,
  debounceMs = 1500,
}: UseAutoSaveProps) {
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initialLoadedRef = useRef(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedJsonRef = useRef<string>('');

  const saveCanvasData = useCallback(async (data: CanvasData) => {
    if (!pageId) return;
    setSaving(true);
    setError(null);

    try {
      await api.updateCapturePage(pageId, {
        canvas_data: data as any,
      });

      lastSavedJsonRef.current = JSON.stringify(data);
      setHasUnsavedChanges(false);
      setLastSavedTime(new Date());
    } catch (err: any) {
      console.error('❌ Erro no Auto-Save do Canvas:', err);
      setError(err.message || 'Falha ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  }, [pageId]);

  useEffect(() => {
    if (!canvasData || !enabled) return;

    const currentJson = JSON.stringify(canvasData);

    // Na primeira carga, define a referência inicial sem salvar
    if (!initialLoadedRef.current) {
      initialLoadedRef.current = true;
      lastSavedJsonRef.current = currentJson;
      return;
    }

    // Se os dados mudaram em relação à última versão salva
    if (currentJson !== lastSavedJsonRef.current) {
      setHasUnsavedChanges(true);

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        saveCanvasData(canvasData);
      }, debounceMs);
    }

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [canvasData, enabled, debounceMs, saveCanvasData]);

  const forceSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    if (canvasData) {
      saveCanvasData(canvasData);
    }
  }, [canvasData, saveCanvasData]);

  return {
    saving,
    hasUnsavedChanges,
    lastSavedTime,
    error,
    forceSave,
  };
}
