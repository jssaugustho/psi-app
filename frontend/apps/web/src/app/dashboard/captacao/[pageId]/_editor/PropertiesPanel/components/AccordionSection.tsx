'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionItemProps {
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function AccordionItem({
  id,
  title,
  icon: Icon,
  badge,
  defaultOpen = false,
  children,
  className = '',
}: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-xl border border-[var(--surface-border)] glass-sm transition-all duration-200 ${isOpen ? 'overflow-visible z-10' : 'overflow-hidden'} ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 flex items-center justify-between text-left cursor-pointer hover:bg-[var(--mix-base)]/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="w-3.5 h-3.5 text-[var(--brand-gradient-start)] shrink-0" />}
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
            {title}
          </span>
          {badge && (
            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] border border-[var(--brand-gradient-start)]/20">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-[var(--brand-gradient-start)]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="p-3 border-t border-[var(--surface-border)]/60 space-y-4 bg-slate-50/50 dark:bg-slate-900/30">
          {children}
        </div>
      )}
    </div>
  );
}
