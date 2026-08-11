'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface SelectOptionWithHelper {
  value: string;
  label: string;
  helper?: string;
}

export interface SelectWithHelperProps {
  value: string;
  onChange: (e: { target: { value: string; name?: string } }) => void;
  options: (string | SelectOptionWithHelper)[];
  placeholder?: string;
  className?: string;
  name?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  label?: string;
  error?: string;
  variant?: 'default' | 'transparent' | 'glass';
}

export function SelectWithHelper({
  value,
  onChange,
  options,
  placeholder = 'Selecionar...',
  className = '',
  name,
  disabled = false,
  style,
  label,
  error,
  variant = 'default',
}: SelectWithHelperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt === '' ? placeholder : opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    if (disabled) return;
    onChange({ target: { value: val, name } });
    setIsOpen(false);
  };

  // Base classes for the trigger button
  const getTriggerClass = () => {
    const base = "flex items-center justify-between gap-2 w-full text-sm transition-colors cursor-pointer outline-none focus:outline-none";
    if (variant === 'transparent') {
      return `${base} bg-transparent border-none py-2 text-slate-800 dark:text-slate-200`;
    }
    if (variant === 'glass') {
      return `${base} glass-sm px-3.5 h-9 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-[var(--brand-gradient-start)]`;
    }
    // Default/brand-input style
    return `${base} rounded-xl px-4 py-2.5 brand-input text-slate-800 dark:text-slate-200 border border-[var(--surface-border)]`;
  };

  const getTriggerStyle = () => {
    if (variant === 'transparent') return style;
    if (variant === 'glass') return style;
    
    return {
      background: error
        ? 'var(--status-error-border, rgba(239,68,68,0.25))'
        : 'var(--surface-input, rgba(0,0,0,0.30))',
      border: error
        ? '1px solid var(--status-error-border, rgba(239,68,68,0.25))'
        : '1px solid var(--surface-border, rgba(255,255,255,0.08))',
      color: 'var(--brand-text-color)',
      ...style,
    };
  };

  return (
    <div ref={containerRef} className="relative w-full text-left">
      {label && (
        <label
          className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
          style={{ color: 'var(--brand-text-color)', opacity: 0.65 }}
        >
          {label}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`${getTriggerClass()} ${className}`}
        style={getTriggerStyle()}
      >
        <span className={selectedOption ? "text-slate-800 dark:text-slate-200 font-medium" : "text-slate-400 dark:text-slate-500"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 right-0 mt-1.5 z-[999] glass-lg rounded-xl border border-[var(--surface-border)] shadow-2xl py-1 overflow-visible"
        >
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`flex items-center justify-between w-full text-left px-4 py-2.5 text-sm transition-all border-none relative group/item ${
                  isSelected 
                    ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white font-medium' 
                    : 'text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{opt.label}</span>
                
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {isSelected && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  
                  {opt.helper && (
                    <div className="relative group/helper inline-flex items-center justify-center">
                      {/* Icon button */}
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold transition-all cursor-help ${
                        isSelected
                          ? 'border-white/60 text-white/80 hover:border-white hover:text-white'
                          : 'border-slate-400/50 dark:border-slate-500/50 text-slate-400 dark:text-slate-500 hover:border-slate-700 dark:hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}>
                        ?
                      </div>
                      
                      {/* Tooltip content */}
                      <div 
                        className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[9999] w-64 p-3 rounded-xl text-xs font-normal shadow-2xl border border-solid brand-popup transition-all duration-200 opacity-0 scale-95 pointer-events-none group-hover/helper:opacity-100 group-hover/helper:scale-100 group-hover/helper:pointer-events-auto"
                        style={{
                          borderColor: 'var(--surface-border)',
                          color: 'var(--brand-text-color)',
                        }}
                      >
                        {opt.helper}
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <span
          className="block text-xs font-medium mt-1.5"
          style={{ color: 'var(--status-error-text, #F87171)' }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
