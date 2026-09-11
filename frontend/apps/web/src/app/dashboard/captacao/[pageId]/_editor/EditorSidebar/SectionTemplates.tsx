'use client';

import React from 'react';
import { Layout, Columns, LayoutGrid, Plus } from 'lucide-react';
import { Section } from '../types';

interface SectionTemplatesProps {
  onAddSection: (label?: string) => void;
}

export function SectionTemplates({ onAddSection }: SectionTemplatesProps) {
  const templates = [
    {
      id: '1-col',
      title: 'Seção de 1 Coluna',
      desc: 'Container simples full-width para hero, avisos ou banners.',
      icon: Layout,
      action: () => onAddSection('Seção (1 Coluna)'),
    },
    {
      id: '2-cols',
      title: 'Seção de 2 Colunas (50/50)',
      desc: 'Dois containers lado a lado para texto e imagem ou cards.',
      icon: Columns,
      action: () => onAddSection('Seção (2 Colunas)'),
    },
    {
      id: '3-cols',
      title: 'Seção de 3 Colunas',
      desc: 'Três containers para grade de serviços ou diferenciais.',
      icon: LayoutGrid,
      action: () => onAddSection('Seção (3 Colunas)'),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Templates de Seção
        </h3>
        <p className="text-[10px] text-slate-500">
          Adicione novas seções de nível 1 ao canvas para organizar seu layout.
        </p>
      </div>

      <div className="space-y-2">
        {templates.map((tpl) => {
          const Icon = tpl.icon;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={tpl.action}
              className="w-full p-3 rounded-xl border border-[var(--surface-border)] glass-sm hover:border-[var(--brand-gradient-start)] hover:glass-md transition-all text-left flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] group-hover:brand-accent group-hover:text-white transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    {tpl.title}
                  </span>
                  <span className="text-[9px] text-slate-500 block">{tpl.desc}</span>
                </div>
              </div>
              <Plus className="w-4 h-4 text-slate-400 group-hover:text-[var(--brand-gradient-start)]" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
