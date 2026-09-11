'use client';

import React, { useEffect } from 'react';
import { Edit, Copy, Clipboard, Layers, Trash2 } from 'lucide-react';

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  targetId: string | null;
  targetType: 'section' | 'div' | string | null;
}

interface ContextMenuProps {
  menuState: ContextMenuState;
  onClose: () => void;
  onEdit: (id: string, type: any) => void;
  onDuplicate: (id: string) => void;
  onCopy: (id: string) => void;
  onPaste: (id: string) => void;
  onDelete: (id: string, type: any) => void;
  canPaste: boolean;
}

export function ContextMenu({
  menuState,
  onClose,
  onEdit,
  onDuplicate,
  onCopy,
  onPaste,
  onDelete,
  canPaste,
}: ContextMenuProps) {
  useEffect(() => {
    const handleClickOutside = () => onClose();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!menuState.isOpen || !menuState.targetId) return null;

  return (
    <div
      className="fixed z-50 w-48 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl backdrop-blur-md text-xs font-sans select-none animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: `${menuState.x}px`,
        top: `${menuState.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Opção 1: Editar */}
      <button
        type="button"
        onClick={() => {
          onEdit(menuState.targetId!, menuState.targetType);
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-2 font-semibold transition-colors cursor-pointer"
      >
        <Edit className="w-3.5 h-3.5" />
        <span>Editar Elemento</span>
      </button>

      {/* Opção 2: Duplicar */}
      <button
        type="button"
        onClick={() => {
          onDuplicate(menuState.targetId!);
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-2 font-semibold transition-colors cursor-pointer"
      >
        <Layers className="w-3.5 h-3.5" />
        <span>Duplicar</span>
      </button>

      {/* Opção 3: Copiar */}
      <button
        type="button"
        onClick={() => {
          onCopy(menuState.targetId!);
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-2 font-semibold transition-colors cursor-pointer"
      >
        <Copy className="w-3.5 h-3.5" />
        <span>Copiar</span>
      </button>

      {/* Opção 4: Colar */}
      <button
        type="button"
        disabled={!canPaste}
        onClick={() => {
          if (canPaste) {
            onPaste(menuState.targetId!);
            onClose();
          }
        }}
        className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-2 font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <Clipboard className="w-3.5 h-3.5" />
        <span>Colar</span>
      </button>

      <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

      {/* Opção 5: Excluir */}
      <button
        type="button"
        onClick={() => {
          onDelete(menuState.targetId!, menuState.targetType);
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-2 font-bold transition-colors cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Excluir</span>
      </button>
    </div>
  );
}
