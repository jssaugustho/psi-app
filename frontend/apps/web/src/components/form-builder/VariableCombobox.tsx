'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Target, Plus, Check, Search, Sparkles, Database } from 'lucide-react';

export interface VariableItem {
  key: string;
  name: string;
  category: 'system' | 'custom';
}

const SYSTEM_VARIABLES: VariableItem[] = [
  { key: 'nome', name: 'Nome Completo (Lead)', category: 'system' },
  { key: 'celular', name: 'WhatsApp / Celular', category: 'system' },
  { key: 'maioridade', name: 'Maioridade (18+)', category: 'system' },
  { key: 'responsavel_nome', name: 'Nome do Responsável Legal', category: 'system' },
  { key: 'email', name: 'E-mail de Contato', category: 'system' },
  { key: 'cpf', name: 'CPF do Paciente', category: 'system' },
  { key: 'contato_secundario', name: 'Contato de Emergência', category: 'system' },
  { key: 'termo_consentimento', name: 'Aceite do Contrato / Termo', category: 'system' },
];

interface VariableComboboxProps {
  value: string;
  onChange: (key: string) => void;
  customFieldDefs?: Array<{ key: string; name: string }>;
  onRegisterNewVariable?: (key: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  disabledBadge?: string;
  className?: string;
}

export function VariableCombobox({
  value,
  onChange,
  customFieldDefs = [],
  onRegisterNewVariable,
  placeholder = 'ex: cpf, email, profissao...',
  disabled = false,
  disabledBadge,
  className = '',
}: VariableComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync search input with value prop when value changes externally
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Click outside listener
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

  // Combine system variables + workspace custom field definitions
  const allAvailableVariables = useMemo(() => {
    const customVars: VariableItem[] = (customFieldDefs || [])
      .filter((def) => !SYSTEM_VARIABLES.some((sys) => sys.key === def.key))
      .map((def) => ({
        key: def.key,
        name: def.name || def.key,
        category: 'custom',
      }));

    return [...SYSTEM_VARIABLES, ...customVars];
  }, [customFieldDefs]);

  // Filtered variables based on search input
  const filteredVariables = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanSearch) return allAvailableVariables;

    return allAvailableVariables.filter(
      (v) => v.key.toLowerCase().includes(cleanSearch) || v.name.toLowerCase().includes(cleanSearch)
    );
  }, [allAvailableVariables, searchTerm]);

  const cleanSearchKey = searchTerm.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const exactMatchExists = allAvailableVariables.some((v) => v.key === cleanSearchKey);
  const showCreateOption = cleanSearchKey.length > 0 && !exactMatchExists;

  const handleSelect = (key: string) => {
    onChange(key);
    setSearchTerm(key);
    setIsOpen(false);
  };

  const handleCreateNew = async () => {
    if (!cleanSearchKey) return;
    onChange(cleanSearchKey);
    setSearchTerm(cleanSearchKey);
    setIsOpen(false);

    if (onRegisterNewVariable) {
      try {
        await onRegisterNewVariable(cleanSearchKey);
      } catch (err) {
        console.warn('Erro ao auto-registrar variável:', err);
      }
    }
  };

  if (disabled) {
    return (
      <div className={`flex items-center justify-between p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs ${className}`}>
        <span className="font-mono font-bold uppercase text-[10px]">{disabledBadge || value || 'fixo'}</span>
        <span className="text-[9px] text-slate-400 font-semibold">(Variável Fixa)</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative w-full text-left ${className}`}>
      <div className="relative flex items-center">
        <input
          type="text"
          className="nodrag nopan w-full text-xs font-mono font-semibold pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-purple-600 dark:text-purple-300 placeholder:text-slate-400/70 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all"
          placeholder={placeholder}
          value={searchTerm}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            const raw = e.target.value;
            setSearchTerm(raw);
            const slug = raw.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            onChange(slug);
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && showCreateOption) {
              e.preventDefault();
              handleCreateNew();
            }
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
        />
        <Target className="w-3.5 h-3.5 text-purple-500 absolute left-2.5 pointer-events-none" />
      </div>

      {/* Autocomplete Dropdown Menu */}
      {isOpen && (
        <div className="nowheel absolute top-full left-0 right-0 mt-1 z-50 glass-md bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-[var(--surface-border)] rounded-xl shadow-2xl p-1.5 space-y-1 max-h-52 overflow-y-auto custom-scrollbar animate-in fade-in duration-150">
          <div className="px-2 py-1 flex items-center justify-between border-b border-[var(--surface-border)] pb-1 mb-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Database className="w-3 h-3 text-purple-500" />
              Variáveis do CRM ({filteredVariables.length})
            </span>
          </div>

          {filteredVariables.map((item) => {
            const isSelected = item.key === value;
            return (
              <div
                key={item.key}
                onClick={() => handleSelect(item.key)}
                className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-purple-600/15 border border-purple-500/40 text-purple-900 dark:text-purple-200 font-bold'
                    : 'hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-mono text-[11px] font-bold text-purple-600 dark:text-purple-400">
                    {item.key}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">({item.name})</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {item.category === 'system' && (
                    <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-500">
                      CRM
                    </span>
                  )}
                  {isSelected && <Check className="w-3.5 h-3.5 text-purple-500" />}
                </div>
              </div>
            );
          })}

          {showCreateOption && (
            <div
              onClick={handleCreateNew}
              className="p-2 rounded-lg bg-purple-500/10 border border-dashed border-purple-500/40 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all mt-1"
            >
              <Plus className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span className="truncate">Criar variável &quot;{cleanSearchKey}&quot;</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
