'use client';

import React, { useState, createContext, useContext } from 'react';
import { ChevronDown } from 'lucide-react';
import { useEditorStateMemory } from '../../context/EditorStateMemoryContext';

interface AccordionScopeContextType {
  scopeId?: string;
  typeFallback?: string;
}

const AccordionScopeContext = createContext<AccordionScopeContextType | null>(null);

export interface AccordionScopeProviderProps {
  scopeId: string;
  typeFallback?: string;
  children: React.ReactNode;
}

export function AccordionScopeProvider({ scopeId, typeFallback, children }: AccordionScopeProviderProps) {
  return (
    <AccordionScopeContext.Provider value={{ scopeId, typeFallback }}>
      {children}
    </AccordionScopeContext.Provider>
  );
}

export interface AccordionItemProps {
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  defaultOpen?: boolean;
  scopeId?: string;
  typeFallback?: string;
  children: React.ReactNode;
  className?: string;
}

export function AccordionItem({
  id,
  title,
  icon: Icon,
  badge,
  defaultOpen = false,
  scopeId: explicitScopeId,
  typeFallback: explicitTypeFallback,
  children,
  className = '',
}: AccordionItemProps) {
  const scopeCtx = useContext(AccordionScopeContext);
  const memory = useEditorStateMemory();

  const effectiveScopeId = explicitScopeId || scopeCtx?.scopeId;
  const effectiveTypeFallback = explicitTypeFallback || scopeCtx?.typeFallback;

  // Fallback local se não houver contexto de memória nem scopeId
  const [localIsOpen, setLocalIsOpen] = useState(defaultOpen);

  const isOpen =
    memory && effectiveScopeId
      ? memory.isAccordionOpen(effectiveScopeId, id, defaultOpen, effectiveTypeFallback)
      : localIsOpen;

  const handleToggle = () => {
    if (memory && effectiveScopeId) {
      memory.toggleAccordion(effectiveScopeId, id, defaultOpen, effectiveTypeFallback);
    } else {
      setLocalIsOpen(!localIsOpen);
    }
  };

  const itemRef = React.useRef<HTMLDivElement | null>(null);
  const prevIsOpenRef = React.useRef(isOpen);

  // Auto-scroll para alinhar o elemento na visão ao abrir o acordeão
  React.useEffect(() => {
    if (!prevIsOpenRef.current && isOpen) {
      const timer = setTimeout(() => {
        const el = itemRef.current;
        if (!el) return;

        const container = el.closest('.overflow-y-auto');
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const itemRect = el.getBoundingClientRect();

          const isBottomCutOff = itemRect.bottom > containerRect.bottom;
          const isTopCutOff = itemRect.top < containerRect.top;

          if (isBottomCutOff || isTopCutOff) {
            // Se a altura total do acordeão cabe na barra lateral
            if (itemRect.height <= containerRect.height - 32) {
              if (isBottomCutOff) {
                const scrollDiff = itemRect.bottom - containerRect.bottom + 16;
                container.scrollBy({ top: scrollDiff, behavior: 'smooth' });
              } else if (isTopCutOff) {
                const scrollDiff = itemRect.top - containerRect.top - 12;
                container.scrollBy({ top: scrollDiff, behavior: 'smooth' });
              }
            } else {
              // Se o acordeão for mais alto que a barra lateral, alinha o topo dele no topo da visão
              const scrollDiff = itemRect.top - containerRect.top - 12;
              container.scrollBy({ top: scrollDiff, behavior: 'smooth' });
            }
          }
        } else {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 60);

      return () => clearTimeout(timer);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  return (
    <div
      ref={itemRef}
      className={`rounded-xl border border-[var(--surface-border)] glass-sm transition-all duration-200 ${isOpen ? 'overflow-visible z-10' : 'overflow-hidden'} ${className}`}
    >
      <button
        type="button"
        onClick={handleToggle}
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
