'use client';

import React from 'react';
import { Layout, Columns, LayoutGrid, Plus, Compass, Sparkles, PanelBottom } from 'lucide-react';
import { createHeaderSectionTemplate, createFooterSectionTemplate } from '../constants';
import { Section } from '../types';

interface SectionTemplatesProps {
  onAddSection: (label?: string) => void;
  onAddCustomSection?: (section: Section) => void;
}

export function SectionTemplates({ onAddSection, onAddCustomSection }: SectionTemplatesProps) {
  const headerTemplates = [
    {
      id: 'hdr-classic',
      title: 'Navbar Clássico (Sticky)',
      desc: 'Cabeçalho no topo com fundo sólido e borda inferior.',
      icon: Compass,
      action: () => onAddCustomSection?.(createHeaderSectionTemplate('classic')),
    },
    {
      id: 'hdr-floating',
      title: 'Navbar Flutuante (Glass)',
      desc: 'Cabeçalho suspenso com bordas arredondadas e efeito de vidro.',
      icon: Sparkles,
      action: () => onAddCustomSection?.(createHeaderSectionTemplate('floating')),
    },
  ];

  const footerTemplates = [
    {
      id: 'ftr-default',
      title: 'Rodapé do Site',
      desc: 'Rodapé completo com marca, mensagem, redes sociais, links e copyright.',
      icon: PanelBottom,
      action: () => onAddCustomSection?.(createFooterSectionTemplate()),
    },
  ];

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
    <div className="p-4 space-y-5 custom-scrollbar overflow-y-auto">
      {/* 📌 SEÇÃO: CABEÇALHOS & NAVBARS */}
      <div className="space-y-2">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[var(--brand-gradient-start)]" />
            Cabeçalhos & Navbars
          </h3>
          <p className="text-[10px] text-slate-500">
            Adicione um menu de navegação personalizável no topo da página.
          </p>
        </div>

        <div className="space-y-2">
          {headerTemplates.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={tpl.action}
                className="w-full p-3 rounded-xl border border-[var(--surface-border)] glass-sm hover:border-[var(--brand-gradient-start)] hover:glass-md transition-all text-left flex items-center justify-between group/tpl cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] group-hover/tpl:brand-accent group-hover/tpl:text-white transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {tpl.title}
                    </span>
                    <span className="text-[9px] text-slate-500 block">{tpl.desc}</span>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-slate-400 group-hover/tpl:text-[var(--brand-gradient-start)]" />
              </button>
            );
          })}
        </div>
      </div>

      {/* 📌 SEÇÃO: RODAPÉS & FOOTERS */}
      <div className="space-y-2 pt-3 border-t border-[var(--surface-border)]">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <PanelBottom className="w-3.5 h-3.5 text-[var(--brand-gradient-start)]" />
            Rodapés & Footers
          </h3>
          <p className="text-[10px] text-slate-500">
            Adicione um rodapé completo com marca, navegação, redes sociais e copyright.
          </p>
        </div>

        <div className="space-y-2">
          {footerTemplates.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={tpl.action}
                className="w-full p-3 rounded-xl border border-[var(--surface-border)] glass-sm hover:border-[var(--brand-gradient-start)] hover:glass-md transition-all text-left flex items-center justify-between group/tpl cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] group-hover/tpl:brand-accent group-hover/tpl:text-white transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {tpl.title}
                    </span>
                    <span className="text-[9px] text-slate-500 block">{tpl.desc}</span>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-slate-400 group-hover/tpl:text-[var(--brand-gradient-start)]" />
              </button>
            );
          })}
        </div>
      </div>

      {/* 📐 SEÇÃO: LAYOUTS DE SEÇÃO */}
      <div className="space-y-2 pt-3 border-t border-[var(--surface-border)]">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Layout className="w-3.5 h-3.5 text-purple-400" />
            Estrutura de Colunas
          </h3>
          <p className="text-[10px] text-slate-500">
            Adicione seções de nível 1 ao canvas para organizar seu layout.
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
                className="w-full p-3 rounded-xl border border-[var(--surface-border)] glass-sm hover:border-[var(--brand-gradient-start)] hover:glass-md transition-all text-left flex items-center justify-between group/tpl cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] group-hover/tpl:brand-accent group-hover/tpl:text-white transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {tpl.title}
                    </span>
                    <span className="text-[9px] text-slate-500 block">{tpl.desc}</span>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-slate-400 group-hover/tpl:text-[var(--brand-gradient-start)]" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
