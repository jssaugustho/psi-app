'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Sparkles } from 'lucide-react';

export const CustomStartNode = ({ data }: any) => {
  const isSelected = data.isSelected;

  return (
    <div 
      className={`nowheel w-[240px] rounded-2xl border transition-all duration-200 shadow-xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-slate-100 relative ${
        isSelected 
          ? 'border-emerald-500 ring-2 ring-emerald-500/30' 
          : 'border-slate-200/90 dark:border-zinc-800/90 hover:border-slate-300 dark:hover:border-zinc-700'
      }`}
    >
      <div className="flex items-center justify-between px-3.5 py-3 bg-emerald-500/10 dark:bg-emerald-500/10 rounded-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg shrink-0 border bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 truncate">
            Início do Fluxo
          </span>
        </div>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-wide shrink-0">
          Início
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className="!w-3.5 !h-3.5 !bg-emerald-500 border-2 border-white dark:border-zinc-950 shadow-md -right-[7px]"
      />
    </div>
  );
};
