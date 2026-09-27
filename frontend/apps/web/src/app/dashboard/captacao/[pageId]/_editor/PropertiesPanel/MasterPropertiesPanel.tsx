'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Check,
  ArrowLeft,
  Type,
  Image as ImageIcon,
  Link as LinkIcon,
  Palette,
  Layers,
  Info,
  X,
} from 'lucide-react';
import { Component, GlobalComponentMaster, ExposedPropDeclaration } from '@psi/canvas-renderer';
import { AccordionItem, AccordionScopeProvider } from './components/AccordionSection';

interface MasterPropertiesPanelProps {
  editingMaster: GlobalComponentMaster;
  selectedNode: Component | null;
  onUpdateMaster: (patch: Partial<GlobalComponentMaster>) => void;
  onToggleExposedProp: (declaration: ExposedPropDeclaration) => void;
  onDeleteMaster: () => void;
  onExitMasterEditing: () => void;
  childrenNodePanel?: React.ReactNode;
}

export function getExposableCandidatesForNode(node: Component, currentPath: string = 'root'): ExposedPropDeclaration[] {
  if (!node) return [];

  const list: ExposedPropDeclaration[] = [];
  const nodeAny = node as any;
  const nodeProps = nodeAny.props || {};
  const nodeStyle = nodeAny.style || {};
  const nodeLabel = nodeAny.label || nodeProps.text || nodeProps.title || node.type.toUpperCase();

  // 1. Atributos de Conteúdo em `props`
  if (typeof nodeProps.text === 'string') {
    list.push({
      path: `${currentPath}.props.text`,
      nodeId: node.id,
      label: `${nodeLabel} — Texto`,
      propKey: 'props.text',
      type: 'text',
      defaultValue: nodeProps.text,
    });
  }
  if (typeof nodeProps.html === 'string') {
    list.push({
      path: `${currentPath}.props.html`,
      nodeId: node.id,
      label: `${nodeLabel} — Conteúdo HTML`,
      propKey: 'props.html',
      type: 'text',
      defaultValue: nodeProps.html,
    });
  }
  if (typeof nodeProps.src === 'string') {
    list.push({
      path: `${currentPath}.props.src`,
      nodeId: node.id,
      label: `${nodeLabel} — URL da Imagem`,
      propKey: 'props.src',
      type: 'image',
      defaultValue: nodeProps.src,
    });
  }
  if (typeof nodeProps.imageUrl === 'string') {
    list.push({
      path: `${currentPath}.props.imageUrl`,
      nodeId: node.id,
      label: `${nodeLabel} — Imagem de Capa`,
      propKey: 'props.imageUrl',
      type: 'image',
      defaultValue: nodeProps.imageUrl,
    });
  }
  if (typeof nodeProps.url === 'string' || typeof nodeProps.externalUrl === 'string') {
    const key = nodeProps.externalUrl ? 'props.externalUrl' : 'props.url';
    list.push({
      path: `${currentPath}.${key}`,
      nodeId: node.id,
      label: `${nodeLabel} — Link de Destino`,
      propKey: key,
      type: 'link',
      defaultValue: nodeProps.externalUrl || nodeProps.url,
    });
  }
  if (typeof nodeProps.title === 'string') {
    list.push({
      path: `${currentPath}.props.title`,
      nodeId: node.id,
      label: `${nodeLabel} — Título`,
      propKey: 'props.title',
      type: 'text',
      defaultValue: nodeProps.title,
    });
  }

  // 2. Estilos Principais em `style`
  if (nodeStyle.backgroundColor) {
    list.push({
      path: `${currentPath}.style.backgroundColor`,
      nodeId: node.id,
      label: `${nodeLabel} — Cor de Fundo`,
      propKey: 'style.backgroundColor',
      type: 'color',
      defaultValue: nodeStyle.backgroundColor,
    });
  }
  if (nodeStyle.color) {
    list.push({
      path: `${currentPath}.style.color`,
      nodeId: node.id,
      label: `${nodeLabel} — Cor do Texto`,
      propKey: 'style.color',
      type: 'color',
      defaultValue: nodeStyle.color,
    });
  }

  return list;
}

export function MasterPropertiesPanel({
  editingMaster,
  selectedNode,
  onUpdateMaster,
  onToggleExposedProp,
  onDeleteMaster,
  onExitMasterEditing,
  childrenNodePanel,
}: MasterPropertiesPanelProps) {
  const [name, setName] = useState(editingMaster.name);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const customizableProps = editingMaster.customizableProps || [];

  const handleNameBlur = () => {
    if (name.trim() && name.trim() !== editingMaster.name) {
      onUpdateMaster({ name: name.trim() });
    }
  };

  // Candidatos do nó selecionado no momento
  const selectedCandidates = selectedNode
    ? getExposableCandidatesForNode(selectedNode, 'root')
    : [];

  return (
    <AccordionScopeProvider scopeId={`master:${editingMaster.id}`} typeFallback="type:master_editing">
      <div className="w-full h-full flex flex-col shrink-0 min-h-0 bg-[var(--surface-base)] text-slate-900 dark:text-white font-sans text-xs">
        {/* Banner Superior de Edição Master */}
        <div className="p-3 border-b border-[var(--surface-border)] bg-gradient-to-r from-purple-600/10 via-purple-500/10 to-indigo-600/10 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onExitMasterEditing}
              className="p-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 transition-colors cursor-pointer shrink-0 flex items-center gap-1 text-[11px] font-bold"
              title="Voltar aos elementos (+ Adicionar)"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>

            <div className="flex flex-col min-w-0 border-l border-purple-500/20 pl-2">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                EDITANDO MESTRE
              </span>
              <span className="font-extrabold text-slate-900 dark:text-white truncate max-w-[120px]">
                {editingMaster.name}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onExitMasterEditing}
            className="px-2.5 py-1 rounded-xl brand-accent text-white font-extrabold text-[11px] flex items-center gap-1 shadow-sm hover:opacity-90 transition-all cursor-pointer shrink-0"
            title="Concluir edição do componente mestre e voltar ao canvas da página"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Concluir</span>
          </button>
        </div>

        {/* Scroll Principal do Painel */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
          {/* 1. Painel de Propriedades Padrão do Componente Selecionado */}
          {childrenNodePanel}

          {/* 2. Seletor de Variáveis Expôstas (+) para o Nó Selecionado */}
          {selectedNode && (
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-purple-500" />
                  Personalização nos Filhos (+)
                </span>
                <span className="text-[9px] text-purple-500 font-medium">Nó: {selectedNode.type}</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Clique no botão <strong>(+)</strong> ao lado das propriedades para liberá-las como variáveis editáveis nas instâncias.
              </p>

              {selectedCandidates.length === 0 ? (
                <div className="text-[10px] text-slate-400 italic py-1">
                  Nenhum atributo exponível neste elemento.
                </div>
              ) : (
                <div className="space-y-1.5 pt-1">
                  {selectedCandidates.map((cand) => {
                    const isExposed = customizableProps.some((p) => p.path === cand.path);
                    return (
                      <div
                        key={cand.path}
                        onClick={() => onToggleExposedProp(cand)}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                          isExposed
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm font-bold'
                            : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hover:border-purple-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {cand.type === 'text' && <Type className="w-3.5 h-3.5 shrink-0" />}
                          {cand.type === 'image' && <ImageIcon className="w-3.5 h-3.5 shrink-0" />}
                          {cand.type === 'link' && <LinkIcon className="w-3.5 h-3.5 shrink-0" />}
                          {cand.type === 'color' && <Palette className="w-3.5 h-3.5 shrink-0" />}
                          <span className="truncate">{cand.label}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {isExposed ? (
                            <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Personalizável
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 flex items-center gap-1">
                              <Plus className="w-3 h-3" /> Liberar (+)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Configurações Gerais do Componente Mestre */}
          <AccordionItem
            id="acc-master-settings"
            title="CONFIGURAÇÕES DO MESTRE"
            icon={Sparkles}
            defaultOpen={true}
          >
            <div className="space-y-3 p-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Componente Mestre
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleNameBlur}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                />
              </div>

              {/* Lista de Variáveis Personalizáveis Ativas */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Variáveis Expôstas ({customizableProps.length})
                  </label>
                </div>

                {customizableProps.length === 0 ? (
                  <div className="p-3 text-center rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-[11px] text-slate-400">
                    Nenhuma variável exposta. Por padrão, nada é personalizável nas instâncias.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                    {customizableProps.map((prop) => (
                      <div
                        key={prop.path}
                        className="flex items-center justify-between p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {prop.type === 'text' && <Type className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                          {prop.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                          {prop.type === 'link' && <LinkIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                          {prop.type === 'color' && <Palette className="w-3.5 h-3.5 text-pink-500 shrink-0" />}
                          <span className="font-bold text-slate-900 dark:text-white truncate">{prop.label}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onToggleExposedProp(prop)}
                          className="p-1 rounded-lg hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 transition-colors"
                          title="Remover personalização desta propriedade"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botão de Excluir Componente Mestre */}
              <div className="pt-2 border-t border-[var(--surface-border)]">
                {showConfirmDelete ? (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2">
                    <p className="text-[11px] text-red-600 dark:text-red-400 font-bold text-center">
                      Tem certeza? Excluir este Mestre removerá o modelo do workspace.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowConfirmDelete(false)}
                        className="flex-1 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={onDeleteMaster}
                        className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold shadow-sm hover:bg-red-700"
                      >
                        Excluir Mestre
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="w-full py-2 px-3 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Componente Mestre</span>
                  </button>
                )}
              </div>
            </div>
          </AccordionItem>
        </div>
      </div>
    </AccordionScopeProvider>
  );
}
