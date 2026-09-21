'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';

interface PropertyResetBadgeProps {
  isCustomized?: boolean;
  onReset: () => void;
  label?: string;
}

export function PropertyResetBadge({
  isCustomized = false,
  onReset,
  label = 'Restaurar Padrão',
}: PropertyResetBadgeProps) {
  if (!isCustomized) return null;

  return (
    <button
      type="button"
      onClick={onReset}
      className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-500 hover:text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 px-1.5 py-0.5 rounded-full transition-all cursor-pointer"
      title={label}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
      <RotateCcw className="w-2.5 h-2.5" />
    </button>
  );
}
