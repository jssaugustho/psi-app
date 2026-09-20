'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  X,
  Save,
  Plus,
  Layers,
  Settings,
  Type,
  Image as ImageIcon,
  Link as LinkIcon,
  Palette,
  CheckSquare,
  Square,
  Heading,
  AlignLeft,
  MousePointerClick,
  Award,
  CreditCard,
  User,
  Share2,
  Trash2,
  MoveUp,
  MoveDown
} from 'lucide-react';
import {
  GlobalComponentMaster,
  Component,
  CanvasData,
  DivComponent,
  ExposedPropDeclaration,
  CanvasRenderer as SharedCanvasRenderer,
  createDefaultComponent,
  createDefaultDiv,
  getDeepPropertyByPath
} from '@psi/canvas-renderer';

interface GlobalMasterEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  master: GlobalComponentMaster | null;
  page?: any;
  onSaveMaster: (updatedMaster: GlobalComponentMaster) => Promise<void>;
}

export function GlobalMasterEditorModal({
  isOpen,
  onClose,
  master,
  page,
  onSaveMaster,
}: GlobalMasterEditorModalProps) {
  const [workingMaster, setWorkingMaster] = useState<GlobalComponentMaster | null>(null);
  const [selectedSubNodeId, setSelectedSubNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'canvas' | 'props_matrix'>('canvas');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializa a cópia de trabalho isolada quando o modal abre
  useEffect(() => {
    if (master && isOpen) {
      const cloned = structuredClone(master);
      setWorkingMaster(cloned);
      setSelectedSubNodeId(cloned.masterNode.id);
    }
  }, [master, isOpen]);

  // Monta um CanvasData temporário e isolado exclusivamente para o nó Master
  const isolatedCanvasData: CanvasData | null = useMemo(() => {
    if (!workingMaster) return null;
    return {
      version: '2.0',
      sections: [
        {
          id: 'sec-isolated-master',
          type: 'section',
          label: 'Canvas Isolado Master',
          layout: {
            flexDirection: 'column',
            flexWrap: 'nowrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0px',
            minHeight: '100%',
            fullWidth: true,
            paddingTop: '40px',
            paddingBottom: '40px',
            paddingLeft: '24px',
            paddingRight: '24px',
            marginTop: '0px',
            marginBottom: '0px',
          },
          background: { type: 'none' },
          components: [workingMaster.masterNode],
        },
      ],
    };
  }, [workingMaster]);

  if (!isOpen || !workingMaster) return null;

  // Busca do nó selecionado dentro da árvore master
  const findSubNode = (root: Component, id: string): Component | null => {
    if (root.id === id) return root;
    if ('components' in root && Array.isArray((root as any).components)) {
      for (const child of (root as any).components) {
        const found = findSubNode(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedNode = findSubNode(workingMaster.masterNode, selectedSubNodeId || workingMaster.masterNode.id);

  // Auxiliar para atualizar um nó na árvore master de forma imutável
  const updateMasterNodeInTree = (updater: (node: Component) => Component) => {
    const updateRecursive = (current: Component): Component => {
      if (current.id === (selectedSubNodeId || workingMaster.masterNode.id)) {
        return updater(current);
      }
      if ('components' in current && Array.isArray((current as any).components)) {
        return {
          ...current,
          components: (current as any).components.map((c: Component) => updateRecursive(c)),
        } as Component;
      }
      return current;
    };

    setWorkingMaster((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        masterNode: updateRecursive(prev.masterNode),
      };
    });
  };

  // Adicionar novo elemento dentro do nó selecionado no master
  const handleAddChildToMasterNode = (type: string) => {
    const targetId = selectedSubNodeId || workingMaster.masterNode.id;
    const target = findSubNode(workingMaster.masterNode, targetId);

    if (!target || !('components' in target)) {
      alert('Selecione um contêiner (Div ou Card) para adicionar novos elementos.');
      return;
    }

    const newChild = type === 'div' ? createDefaultDiv('Novo Container') : createDefaultComponent(type as any);

    setWorkingMaster((prev) => {
      if (!prev) return prev;
      const addRecursive = (curr: Component): Component => {
        if (curr.id === targetId && 'components' in curr) {
          return {
            ...curr,
            components: [...((curr as any).components || []), newChild],
          } as Component;
        }
        if ('components' in curr && Array.isArray((curr as any).components)) {
          return {
            ...curr,
            components: (curr as any).components.map((c: Component) => addRecursive(c)),
          } as Component;
        }
        return curr;
      };

      return {
        ...prev,
        masterNode: addRecursive(prev.masterNode),
      };
    });

    setSelectedSubNodeId(newChild.id);
  };

  // Remover nó da árvore master
  const handleRemoveNodeFromMaster = (nodeId: string) => {
    if (nodeId === workingMaster.masterNode.id) {
      alert('Não é possível remover o nó raiz do elemento global.');
      return;
    }

    setWorkingMaster((prev) => {
      if (!prev) return prev;
      const removeRecursive = (curr: Component): Component => {
        if ('components' in curr && Array.isArray((curr as any).components)) {
          const filtered = (curr as any).components.filter((c: Component) => c.id !== nodeId);
          return {
            ...curr,
            components: filtered.map((c: Component) => removeRecursive(c)),
          } as Component;
        }
        return curr;
      };

      return {
        ...prev,
        masterNode: removeRecursive(prev.masterNode),
      };
    });

    setSelectedSubNodeId(workingMaster.masterNode.id);
  };

  // Alternar exposição de propriedade na Matriz de Propriedades
  const toggleExposedProp = (path: string, nodeId: string, label: string, propKey: string, type: any, defaultValue: any) => {
    setWorkingMaster((prev) => {
      if (!prev) return prev;
      const currentProps = prev.customizableProps || [];
      const exists = currentProps.some((p) => p.path === path);

      const nextProps = exists
        ? currentProps.filter((p) => p.path !== path)
        : [...currentProps, { path, nodeId, label, propKey, type, defaultValue }];

      return {
        ...prev,
        customizableProps: nextProps,
      };
    });
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      await onSaveMaster(workingMaster);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar componente master:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      {/* Header Bar Framer Style */}
      <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30">
                Canvas Isolado Master (Framer-Style)
              </span>
            </div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Editando Master:</span>
              <input
                type="text"
                value={workingMaster.name}
                onChange={(e) => setWorkingMaster({ ...workingMaster, name: e.target.value })}
                className="bg-transparent border-b border-slate-700 hover:border-purple-500 focus:border-purple-500 text-white font-extrabold px-1 py-0.5 focus:outline-none transition-colors"
              />
            </h2>
          </div>
        </div>

        {/* Alternador de Modo & Ações */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('canvas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'canvas'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎨 Canvas Isolado
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('props_matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'props_matrix'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Props Expostas ({workingMaster.customizableProps?.length || 0})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSave}
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Salvando Master...' : '💾 Salvar & Propagar Master'}</span>
          </button>
        </div>
      </div>

      {/* Body com 3 Colunas: Mini Palette / Canvas / Properties Panel */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'canvas' ? (
          <>
            {/* Coluna 1: Mini Palette & Árvore de Camadas Master */}
            <div className="w-64 border-r border-slate-800 bg-slate-900/60 p-3 flex flex-col space-y-4 shrink-0 overflow-y-auto custom-scrollbar select-none">
              <div>
                <h4 className="text-[11px] font-bold uppercase text-purple-400 tracking-wider mb-2 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar ao Master</span>
                </h4>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  {[
                    { type: 'heading', label: 'Título', icon: Heading },
                    { type: 'paragraph', label: 'Parágrafo', icon: AlignLeft },
                    { type: 'button', label: 'Botão', icon: MousePointerClick },
                    { type: 'image', label: 'Imagem', icon: ImageIcon },
                    { type: 'badge', label: 'Badge', icon: Award },
                    { type: 'div', label: 'Container', icon: Layers },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => handleAddChildToMasterNode(item.type)}
                        className="p-2 rounded-lg border border-slate-800 bg-slate-800/50 hover:bg-purple-500/20 hover:border-purple-500/50 text-slate-200 transition-all flex items-center gap-1.5 font-semibold text-left cursor-pointer"
                      >
                        <Icon className="w-3 h-3 text-purple-400" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Árvore de Camadas do Master */}
              <div className="flex-1 space-y-2">
                <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Estrutura do Master</span>
                </h4>

                <div className="space-y-1 p-1 bg-slate-950/50 rounded-xl border border-slate-800/80">
                  {/* Renderização da Árvore de Camadas */}
                  {function renderMasterTree(node: Component, depth = 0) {
                    const isSelected = selectedSubNodeId === node.id;
                    const nodeLabel = (node as any).label || (node as any).props?.text || node.type.toUpperCase();

                    return (
                      <div key={node.id} className="space-y-1">
                        <div
                          onClick={() => setSelectedSubNodeId(node.id)}
                          style={{ paddingLeft: `${depth * 12 + 8}px` }}
                          className={`py-1.5 pr-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600 text-white font-bold'
                              : 'text-slate-300 hover:bg-slate-800/80'
                          }`}
                        >
                          <span className="truncate">{nodeLabel}</span>
                          {node.id !== workingMaster.masterNode.id && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveNodeFromMaster(node.id);
                              }}
                              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                              title="Remover do Master"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {'components' in node &&
                          Array.isArray((node as any).components) &&
                          (node as any).components.map((child: Component) =>
                            renderMasterTree(child, depth + 1)
                          )}
                      </div>
                    );
                  }(workingMaster.masterNode)}
                </div>
              </div>
            </div>

            {/* Coluna 2: Canvas Central Isolado */}
            <div className="flex-1 bg-slate-950 flex justify-center items-center p-8 overflow-y-auto custom-scrollbar relative">
              <div className="w-full max-w-3xl p-8 rounded-3xl bg-slate-900/40 border border-slate-800 shadow-2xl relative">
                {isolatedCanvasData && (
                  <SharedCanvasRenderer
                    canvasData={isolatedCanvasData}
                    viewportMode="desktop"
                    selectedId={selectedSubNodeId}
                    page={page}
                    onSelectElement={(id) => {
                      if (id && id !== 'sec-isolated-master') {
                        setSelectedSubNodeId(id);
                      }
                    }}
                    isPublicView={false}
                  />
                )}
              </div>
            </div>

            {/* Coluna 3: Inspector de Propriedades do Nó Selecionado no Master */}
            <div className="w-80 border-l border-slate-800 bg-slate-900/80 p-4 space-y-4 shrink-0 overflow-y-auto custom-scrollbar text-xs">
              <h4 className="font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
                <span>Propriedades do Nó Master</span>
                <span className="text-[10px] text-purple-400 font-normal">
                  {selectedNode?.type.toUpperCase()}
                </span>
              </h4>

              {selectedNode ? (
                (() => {
                  const selectedNodeAny = selectedNode as any;
                  return (
                    <div className="space-y-4">
                      {/* Edição de Texto */}
                      {selectedNodeAny.props && typeof selectedNodeAny.props.text === 'string' && (
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Texto Base</label>
                          <input
                            type="text"
                            value={selectedNodeAny.props.text}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateMasterNodeInTree((n) => ({
                                ...n,
                                props: { ...(n as any).props, text: val },
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      )}

                      {/* Edição de Estilo Base */}
                      {selectedNodeAny.style && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-slate-400 font-semibold mb-1">Cor de Fundo Base</label>
                            <input
                              type="color"
                              value={selectedNodeAny.style.backgroundColor || '#000000'}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateMasterNodeInTree((n) => ({
                                  ...n,
                                  style: { ...(n as any).style, backgroundColor: val },
                                }));
                              }}
                              className="w-full h-8 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 font-semibold mb-1">Cor do Texto Base</label>
                            <input
                              type="color"
                              value={selectedNodeAny.style.color || '#ffffff'}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateMasterNodeInTree((n) => ({
                                  ...n,
                                  style: { ...(n as any).style, color: val },
                                }));
                              }}
                              className="w-full h-8 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <p className="text-slate-500 text-center py-4">Nenhum nó selecionado.</p>
              )}

            </div>
          </>
        ) : (
          /* Tab de Matriz de Propriedades Expostas */
          <div className="flex-1 bg-slate-950 p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-2xl mx-auto space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-400" />
                <span>Matriz de Exposição de Propriedades Personalizáveis</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                As propriedades marcadas abaixo poderão ser sobrescritas individualmente por cada página/instância. Propriedades desmarcadas continuam 100% integradas e herdadas do Master central.
              </p>

              <div className="space-y-2 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                {/* Exibição rápida de checkboxes */}
                <div className="space-y-2 text-xs text-slate-300">
                  {workingMaster.customizableProps.map((prop) => (
                    <div key={prop.path} className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <div>
                        <span className="font-bold text-white">{prop.label}</span>
                        <span className="text-[10px] text-slate-500 block">{prop.path}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-purple-500/20 text-purple-400 font-bold uppercase">
                        Exposta
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
