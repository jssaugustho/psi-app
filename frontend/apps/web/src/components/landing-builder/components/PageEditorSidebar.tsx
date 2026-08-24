'use client';

import React from 'react';
import { Layers, Palette, Search, Globe, Plus, Trash2, GripVertical } from 'lucide-react';

interface PageEditorSidebarProps {
  activeTab: 'secoes' | 'tema' | 'seo' | 'dominio';
  onChangeTab: (tab: 'secoes' | 'tema' | 'seo' | 'dominio') => void;
  page: any;
  onChangePage: (updater: (prev: any) => any) => void;
  visualIdentity: any;
}

const AVAILABLE_SECTIONS = [
  { id: 'hero', name: 'Hero / Apresentação Inicial', icon: '✨' },
  { id: 'about', name: 'Sobre Mim & Trajetória', icon: '👤' },
  { id: 'services', name: 'Serviços & Especialidades', icon: '💼' },
  { id: 'faq', name: 'Perguntas Frequentes (FAQ)', icon: '❓' },
  { id: 'contact', name: 'Formulário de Contato / Agendamento', icon: '📅' },
];

export function PageEditorSidebar({
  activeTab,
  onChangeTab,
  page,
  onChangePage,
  visualIdentity,
}: PageEditorSidebarProps) {
  const sections = page?.sections || [];

  const handleAddSection = (typeId: string) => {
    const newSec = {
      id: `${typeId}-${Date.now().toString().slice(-4)}`,
      type: typeId,
      title: AVAILABLE_SECTIONS.find((s) => s.id === typeId)?.name || 'Nova Seção',
      content: {},
    };
    onChangePage((prev: any) => ({
      ...prev,
      sections: [...(prev.sections || []), newSec],
    }));
  };

  const handleRemoveSection = (secId: string) => {
    onChangePage((prev: any) => ({
      ...prev,
      sections: (prev.sections || []).filter((s: any) => s.id !== secId),
    }));
  };

  return (
    <aside className="w-80 border-r border-zinc-800/80 bg-zinc-950/60 flex flex-col shrink-0">
      {/* Abas de Configuração */}
      <div className="flex border-b border-zinc-800 p-1.5 gap-1 bg-zinc-900/40">
        <button
          type="button"
          onClick={() => onChangeTab('secoes')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none ${
            activeTab === 'secoes' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
          title="Seções da Página"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Seções</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeTab('tema')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none ${
            activeTab === 'tema' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
          title="Tema & Cores"
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Tema</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeTab('seo')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none ${
            activeTab === 'seo' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
          title="SEO & Google"
        >
          <Search className="w-3.5 h-3.5" />
          <span>SEO</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeTab('dominio')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none ${
            activeTab === 'dominio' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
          title="Domínio Próprio"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Domínio</span>
        </button>
      </div>

      {/* Conteúdo da Aba Ativa */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'secoes' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Estrutura da Página</h4>

            {/* Lista de Seções Adicionadas */}
            <div className="space-y-2">
              {sections.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                  Nenhuma seção adicionada ainda. Clique em uma das opções abaixo para começar!
                </div>
              ) : (
                sections.map((sec: any, index: number) => (
                  <div
                    key={sec.id}
                    className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-2 group hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab shrink-0" />
                      <span className="text-xs font-semibold text-zinc-200 truncate">{sec.title || `Seção ${index + 1}`}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(sec.id)}
                      className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer bg-transparent border-none"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Adicionar Novas Seções */}
            <div className="pt-2 space-y-2">
              <h5 className="text-[11px] font-semibold text-zinc-500">Adicionar Blocos</h5>
              <div className="grid grid-cols-1 gap-1.5">
                {AVAILABLE_SECTIONS.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleAddSection(sec.id)}
                    className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 hover:border-violet-500/50 hover:bg-zinc-900 transition-all flex items-center gap-2.5 text-xs text-zinc-300 hover:text-white cursor-pointer text-left"
                  >
                    <span>{sec.icon}</span>
                    <span className="font-semibold flex-1 truncate">{sec.name}</span>
                    <Plus className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tema' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Identidade Visual da Página</h4>
            <p className="text-xs text-zinc-500">
              Esta página herda automaticamente as cores e tipografia configuradas para o consultório em Configurações da Clínica.
            </p>

            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Cor Primária:</span>
                <span className="font-mono font-bold text-white" style={{ color: visualIdentity.primaryColor }}>
                  {visualIdentity.primaryColor}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Cor Secundária:</span>
                <span className="font-mono font-bold text-white" style={{ color: visualIdentity.secondaryColor }}>
                  {visualIdentity.secondaryColor}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Fonte Títulos:</span>
                <span className="font-bold text-zinc-200">{visualIdentity.fontHeading}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Otimização SEO (Google)</h4>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Título no Google (Meta Title)</label>
              <input
                type="text"
                value={page?.title || ''}
                onChange={(e) => onChangePage((prev: any) => ({ ...prev, title: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Endereço Amigável (Slug)</label>
              <input
                type="text"
                value={page?.slug || ''}
                onChange={(e) => onChangePage((prev: any) => ({ ...prev, slug: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
        )}

        {activeTab === 'dominio' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Domínio da Página</h4>
            <p className="text-xs text-zinc-500">
              Associe um subdomínio ou domínio próprio para publicar esta landing page de forma profissional.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
