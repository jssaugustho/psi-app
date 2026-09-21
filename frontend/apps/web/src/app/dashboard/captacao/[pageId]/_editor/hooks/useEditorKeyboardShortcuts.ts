import { useEffect } from 'react';
import { CanvasData } from '../types';
import { findElementInCanvas } from '../utils/canvasHelpers';

interface UseEditorKeyboardShortcutsProps {
  selectedId: string | null;
  selectedType: string | null;
  copiedElement: any;
  canvasData: CanvasData | null;
  canUndo: boolean;
  canRedo: boolean;
  onSelectElement: (id: string | null, type?: any) => void;
  onDuplicateElement: (id: string) => void;
  onCopyElement: (id: string) => void;
  onPasteElement: (targetParentId: string) => void;
  onPasteStyleElement: (targetId: string) => void;
  onRemoveSection: (id: string) => void;
  onRemoveComponent: (id: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave?: () => void;
}

export function useEditorKeyboardShortcuts({
  selectedId,
  selectedType,
  copiedElement,
  canvasData,
  canUndo,
  canRedo,
  onSelectElement,
  onDuplicateElement,
  onCopyElement,
  onPasteElement,
  onPasteStyleElement,
  onRemoveSection,
  onRemoveComponent,
  onUndo,
  onRedo,
  onSave,
}: UseEditorKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditingText =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('contenteditable') === 'true' ||
          (typeof target.closest === 'function' && target.closest('[contenteditable="true"]') !== null));

      if (isEditingText) return;

      const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();

      // 1. ESCAPE (DESELECIONAR ELEMENTO SELECIONADO)
      if (key === 'escape') {
        if (selectedId) {
          e.preventDefault();
          onSelectElement(null);
        }
        return;
      }

      // 2. CTRL + S (SALVAR FORÇADO)
      if (isCmdOrCtrl && key === 's') {
        e.preventDefault();
        if (onSave) onSave();
        return;
      }

      // 3. CTRL + SHIFT + Z ou CTRL + Y (REFAZ)
      if (isCmdOrCtrl && ((e.shiftKey && key === 'z') || key === 'y')) {
        e.preventDefault();
        if (canRedo) onRedo();
        return;
      }

      // 4. CTRL + Z (DESFAZ)
      if (isCmdOrCtrl && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) onUndo();
        return;
      }

      // 5. CTRL + SHIFT + V (COLAR ESTILO)
      if (isCmdOrCtrl && e.shiftKey && key === 'v') {
        e.preventDefault();
        if (selectedId && copiedElement && copiedElement.type === selectedType) {
          onPasteStyleElement(selectedId);
        }
        return;
      }

      // 6. CTRL + V (COLAR)
      if (isCmdOrCtrl && key === 'v' && !e.shiftKey) {
        e.preventDefault();
        if (!copiedElement) return;

        if (selectedId) {
          onPasteElement(selectedId);
        } else if (canvasData && canvasData.sections.length > 0) {
          onPasteElement(canvasData.sections[0].id);
        }
        return;
      }

      // 7. CTRL + C (COPIAR)
      if (isCmdOrCtrl && key === 'c' && !e.shiftKey) {
        if (selectedId) {
          e.preventDefault();
          onCopyElement(selectedId);
        }
        return;
      }

      // 8. CTRL + X (RECORTAR)
      if (isCmdOrCtrl && key === 'x' && !e.shiftKey) {
        if (selectedId) {
          e.preventDefault();
          onCopyElement(selectedId);
          if (selectedType === 'section') {
            onRemoveSection(selectedId);
          } else {
            onRemoveComponent(selectedId);
          }
        }
        return;
      }

      // 9. CTRL + D (DUPLICAR)
      if (isCmdOrCtrl && key === 'd') {
        if (selectedId) {
          e.preventDefault();
          onDuplicateElement(selectedId);
        }
        return;
      }

      // 10. DELETE ou BACKSPACE (EXCLUIR ELEMENTO SELECIONADO)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        if (selectedType === 'section') {
          onRemoveSection(selectedId);
        } else {
          onRemoveComponent(selectedId);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedId,
    selectedType,
    copiedElement,
    canvasData,
    canUndo,
    canRedo,
    onSelectElement,
    onDuplicateElement,
    onCopyElement,
    onPasteElement,
    onPasteStyleElement,
    onRemoveSection,
    onRemoveComponent,
    onUndo,
    onRedo,
    onSave,
  ]);
}
