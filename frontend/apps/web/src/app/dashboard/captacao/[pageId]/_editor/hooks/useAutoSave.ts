import { useEffect, useRef, useState, useCallback } from 'react';
import { CanvasData, compactCanvasData } from '../types';
import { api } from '@/lib/api';

interface UseAutoSaveProps {
  pageId: string;
  canvasData: CanvasData | null;
  publishedCanvas?: CanvasData | null;
  enabled?: boolean;
  debounceMs?: number;
}

export function useAutoSave({
  pageId,
  canvasData,
  publishedCanvas,
  enabled = true,
  debounceMs = 1500,
}: UseAutoSaveProps) {
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initialLoadedRef = useRef(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedJsonRef = useRef<string>('');
  const lastPublishedJsonRef = useRef<string>('');

  // Define a referência da versão publicada inicial
  useEffect(() => {
    if (publishedCanvas && !lastPublishedJsonRef.current) {
      const compacted = compactCanvasData(publishedCanvas);
      lastPublishedJsonRef.current = JSON.stringify(compacted);
    }
  }, [publishedCanvas]);

  const saveCanvasData = useCallback(async (data: CanvasData) => {
    if (!pageId) return;
    setSaving(true);
    setError(null);

    try {
      const compacted = compactCanvasData(data);
      const currentJson = JSON.stringify(compacted);

      await api.updateCapturePage(pageId, {
        canvas_data: compacted as any,
      });

      lastSavedJsonRef.current = currentJson;
      setHasUnsavedChanges(false);
      setLastSavedTime(new Date());

      // Atualiza o estado de alterações não publicadas
      if (lastPublishedJsonRef.current) {
        setHasUnpublishedChanges(currentJson !== lastPublishedJsonRef.current);
      } else {
        setHasUnpublishedChanges(true);
      }
    } catch (err: any) {
      console.error('❌ Erro no Auto-Save do Canvas:', err);
      setError(err.message || 'Falha ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  }, [pageId]);

  useEffect(() => {
    if (!canvasData || !enabled) return;

    const compacted = compactCanvasData(canvasData);
    const currentJson = JSON.stringify(compacted);

    // Na primeira carga, define a referência inicial sem salvar
    if (!initialLoadedRef.current) {
      initialLoadedRef.current = true;
      lastSavedJsonRef.current = currentJson;
      if (!lastPublishedJsonRef.current) {
        lastPublishedJsonRef.current = currentJson;
      }
      return;
    }

    // Se os dados mudaram em relação à última versão salva
    if (currentJson !== lastSavedJsonRef.current) {
      setHasUnsavedChanges(true);
      setHasUnpublishedChanges(true);

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        saveCanvasData(canvasData);
      }, debounceMs);
    } else {
      setHasUnsavedChanges(false);
      if (lastPublishedJsonRef.current) {
        setHasUnpublishedChanges(currentJson !== lastPublishedJsonRef.current);
      }
    }

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [canvasData, enabled, debounceMs, saveCanvasData]);

  const forceSave = useCallback(async (): Promise<void> => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    if (canvasData) {
      await saveCanvasData(canvasData);
    }
  }, [canvasData, saveCanvasData]);

  const markAsPublished = useCallback((publishedData: CanvasData) => {
    const compacted = compactCanvasData(publishedData);
    const currentJson = JSON.stringify(compacted);
    lastPublishedJsonRef.current = currentJson;
    lastSavedJsonRef.current = currentJson;
    setHasUnsavedChanges(false);
    setHasUnpublishedChanges(false);
  }, []);

  return {
    saving,
    hasUnsavedChanges,
    hasUnpublishedChanges,
    lastSavedTime,
    error,
    forceSave,
    markAsPublished,
  };
}

