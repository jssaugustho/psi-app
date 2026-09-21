'use client';

import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  text: string;
  title?: string;
}

export function HelpTooltip({ text, title }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="text-slate-400 hover:text-blue-500 transition-colors p-0.5 rounded-full cursor-pointer focus:outline-none"
        title={title || 'Clique ou passe o mouse para saber mais'}
      >
        <HelpCircle className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 p-2.5 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-normal leading-relaxed shadow-xl border border-slate-700/50 backdrop-blur-md z-50 pointer-events-none transition-all animate-in fade-in zoom-in-95">
          {title && <div className="font-bold text-blue-400 mb-1 border-b border-slate-700/60 pb-0.5 text-[10px]">{title}</div>}
          <p className="text-slate-200">{text}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95 dark:border-t-slate-800/95" />
        </div>
      )}
    </div>
  );
}
