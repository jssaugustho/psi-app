'use client';

import React, { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Input } from '@psi/ui';
import { IconPicker } from './IconPicker';

export interface ListItem {
  text: string;
  iconName?: string;
}

interface ListItemsEditorProps {
  items: ListItem[];
  showIconPicker?: boolean;
  onChange: (items: ListItem[]) => void;
}

export function ListItemsEditor({ items, showIconPicker = false, onChange }: ListItemsEditorProps) {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [iconPickerOpenIdx, setIconPickerOpenIdx] = useState<number | null>(null);

  const handleTextChange = (idx: number, text: string) => {
    const next = items.map((it, i) => (i === idx ? { ...it, text } : it));
    onChange(next);
  };

  const handleIconChange = (idx: number, iconName: string) => {
    const next = items.map((it, i) => (i === idx ? { ...it, iconName } : it));
    onChange(next);
    setIconPickerOpenIdx(null);
  };

  const handleAdd = () => {
    onChange([...items, { text: 'Novo item', iconName: 'Check' }]);
  };

  const handleRemove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...items];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  };

  const handleMoveDown = (idx: number) => {
    if (idx === items.length - 1) return;
    const next = [...items];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDraggingIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggingIdx === null || draggingIdx === idx) return;
    const next = [...items];
    const [moved] = next.splice(draggingIdx, 1);
    next.splice(idx, 0, moved);
    setDraggingIdx(idx);
    onChange(next);
  };

  const handleDragEnd = () => setDraggingIdx(null);

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div
          key={idx}
          draggable
          onDragStart={(e) => handleDragStart(e, idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDragEnd={handleDragEnd}
          className={`flex items-start gap-1.5 p-2 rounded-xl border transition-all ${
            draggingIdx === idx
              ? 'border-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/10 opacity-60'
              : 'glass-sm'
          }`}
        >
          {/* Drag handle */}
          <div className="mt-2 cursor-grab active:cursor-grabbing text-slate-400 shrink-0">
            <GripVertical className="w-3 h-3" />
          </div>

          <div className="flex-1 space-y-1.5">
            <Input
              type="text"
              value={item.text}
              onChange={(e) => handleTextChange(idx, e.target.value)}
              className="text-xs"
              placeholder="Texto do item..."
            />

            {showIconPicker && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIconPickerOpenIdx(iconPickerOpenIdx === idx ? null : idx)}
                  className="text-[9px] font-bold px-2 py-1 rounded-lg border border-[var(--surface-border)] text-slate-500 hover:text-blue-600 hover:border-blue-400 transition-colors cursor-pointer"
                >
                  Icone: {item.iconName || 'Check'}
                </button>
                {iconPickerOpenIdx === idx && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 p-2 bg-white dark:bg-zinc-900 border border-[var(--surface-border)] rounded-xl shadow-xl">
                    <IconPicker
                      selectedName={item.iconName || 'Check'}
                      onSelectIcon={(name) => handleIconChange(idx, name)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reorder buttons */}
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => handleMoveUp(idx)}
              disabled={idx === 0}
              className="p-0.5 rounded text-slate-400 hover:text-blue-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
              title="Mover para cima"
            >
              <span className="text-[10px] leading-none">▲</span>
            </button>
            <button
              type="button"
              onClick={() => handleMoveDown(idx)}
              disabled={idx === items.length - 1}
              className="p-0.5 rounded text-slate-400 hover:text-blue-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
              title="Mover para baixo"
            >
              <span className="text-[10px] leading-none">▼</span>
            </button>
          </div>

          {/* Remove */}
          <button
            type="button"
            onClick={() => handleRemove(idx)}
            className="mt-1.5 p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer shrink-0"
            title="Remover item"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAdd}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-[var(--surface-border)] text-[10px] font-bold text-slate-500 hover:text-blue-600 hover:border-blue-400 transition-colors cursor-pointer"
      >
        <Plus className="w-3 h-3" />
        Adicionar Item
      </button>
    </div>
  );
}