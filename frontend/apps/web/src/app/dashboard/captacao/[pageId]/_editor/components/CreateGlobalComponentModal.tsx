'use client';

import React, { useState, useMemo } from 'react';
import { Sparkles, X, CheckSquare, Square, Layers, Tag, Type, Image as ImageIcon, Link as LinkIcon, Palette } from 'lucide-react';
import { Component, GlobalComponentMaster, GlobalInstanceComponent, ExposedPropDeclaration } from '@psi/canvas-renderer';

interface CreateGlobalComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetComponent: Component | null;
  workspaceId?: string | null;
  onSave: (globalMaster: GlobalComponentMaster, newInstance: GlobalInstanceComponent) => Promise<void>;
}

interface ComponentPropCandidate {
  path: string;
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  label: string;
  propKey: string;
  type: 'text' | 'color' | 'image' | 'link' | 'number' | 'boolean' | 'select';
  defaultValue: any;
  defaultChecked: boolean;
}

export function CreateGlobalComponentModal({
  isOpen,
  onClose,
  targetComponent,
  workspaceId,
  onSave,
}: CreateGlobalComponentModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('custom');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Record<string, boolean>>({});

  // Extração recursiva de candidato a propriedades expostas da sub-árvore
  const candidates = useMemo(() => {
    if (!targetComponent) return [];

    const list: ComponentPropCandidate[] = [];

    const traverse = (node: Component, currentPath: string, depth = 0) => {
      const nodeAny = node as any;
      const nodeProps = nodeAny.props;
      const nodeStyle = nodeAny.style;
      const nodeLabel = nodeAny.label || nodeProps?.text || node.type.toUpperCase();

      // 1. Atributos de Conteúdo em `props`
      if (nodeProps) {
        if (typeof nodeProps.text === 'string') {
          const path = `${currentPath}.props.text`;
          list.push({
            path,
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel,
            label: `Texto ("${nodeProps.text.slice(0, 20)}...")`,
            propKey: 'props.text',
            type: 'text',
            defaultValue: nodeProps.text,
            defaultChecked: true,
          });
        }
        if (typeof nodeProps.html === 'string') {
          const path = `${currentPath}.props.html`;
          list.push({
            path,
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel,
            label: 'Conteúdo HTML',
            propKey: 'props.html',
            type: 'text',
            defaultValue: nodeProps.html,
            defaultChecked: true,
          });
        }
        if (typeof nodeProps.src === 'string') {
          const path = `${currentPath}.props.src`;
          list.push({
            path,
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel,
            label: 'URL da Imagem/Mídia',
            propKey: 'props.src',
            type: 'image',
            defaultValue: nodeProps.src,
            defaultChecked: true,
          });
        }
        if (typeof nodeProps.imageUrl === 'string') {
          const path = `${currentPath}.props.imageUrl`;
          list.push({
            path,
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel,
            label: 'Imagem de Capa',
            propKey: 'props.imageUrl',
            type: 'image',
            defaultValue: nodeProps.imageUrl,
            defaultChecked: true,
          });
        }
        if (typeof nodeProps.url === 'string' || typeof nodeProps.externalUrl === 'string') {
          const path = nodeProps.externalUrl ? `${currentPath}.props.externalUrl` : `${currentPath}.props.url`;
          list.push({
            path,
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel,
            label: 'Link de Destino',
            propKey: nodeProps.externalUrl ? 'props.externalUrl' : 'props.url',
            type: 'link',
            defaultValue: nodeProps.externalUrl || nodeProps.url,
            defaultChecked: true,
          });
        }
        if (typeof nodeProps.whatsappMessage === 'string') {
          const path = `${currentPath}.props.whatsappMessage`;
          list.push({
            path,
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel,
            label: 'Mensagem do WhatsApp',
            propKey: 'props.whatsappMessage',
            type: 'text',
            defaultValue: nodeProps.whatsappMessage,
            defaultChecked: true,
          });
        }
        if (typeof nodeProps.title === 'string') {
          const path = `${currentPath}.props.title`;
          list.push({
            path,
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel,
            label: `Título ("${nodeProps.title.slice(0, 20)}...")`,
            propKey: 'props.title',
            type: 'text',
            defaultValue: nodeProps.title,
            defaultChecked: true,
          });
        }
      }

      // 2. Estilos Principais em `style`
      if (nodeStyle) {
        if (nodeStyle.backgroundColor) {
          const path = `${currentPath}.style.backgroundColor`;
          list.push({
            path,
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel,
            label: 'Cor de Fundo',
            propKey: 'style.backgroundColor',
            type: 'color',
            defaultValue: nodeStyle.backgroundColor,
            defaultChecked: false,
          });
        }
        if (nodeStyle.color) {
          const path = `${currentPath}.style.color`;
          list.push({
            path,
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel,
            label: 'Cor do Texto',
            propKey: 'style.color',
            type: 'color',
            defaultValue: nodeStyle.color,
            defaultChecked: false,
          });
        }
      }

      // Traversal para nós filhos (`components`)
      if ('components' in node && Array.isArray((node as any).components)) {
        (node as any).components.forEach((child: Component, index: number) => {
          traverse(child, `${currentPath}.components[${index}]`, depth + 1);
        });
      }
    };

    traverse(targetComponent, 'root');

    // Inicializar estado de seleção padrão
    const initialSelected: Record<string, boolean> = {};
    list.forEach((c) => {
      initialSelected[c.path] = c.defaultChecked;
    });
    setSelectedPaths(initialSelected);

    // Sugerir um nome padrão baseado no elemento
    const defaultName = targetComponent.label || (targetComponent as any).props?.text || `Elemento ${targetComponent.type.toUpperCase()}`;
    setName(`Global: ${defaultName}`);

    return list;
  }, [targetComponent]);

  if (!isOpen || !targetComponent) return null;

  const togglePath = (path: string) => {
    setSelectedPaths((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleCreate = async () => {
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);

      const exposedDeclarations: ExposedPropDeclaration[] = candidates
        .filter((c) => selectedPaths[c.path])
        .map((c) => ({
          path: c.path,
          nodeId: c.nodeId,
          label: `${c.nodeLabel} — ${c.label}`,
          propKey: c.propKey,
          type: c.type,
          defaultValue: c.defaultValue,
        }));

      const masterId = crypto.randomUUID();

      const globalMaster: GlobalComponentMaster = {
        id: masterId,
        workspaceId: workspaceId || '',
        name: name.trim(),
        category,
        iconName: 'Sparkles',
        masterNode: structuredClone(targetComponent),
        customizableProps: exposedDeclarations,
        updatedAt: new Date().toISOString(),
      };

      const newInstance: GlobalInstanceComponent = {
        id: targetComponent.id,
        type: 'global_instance',
        globalComponentId: masterId,
        overrides: {},
        layout: (targetComponent as any).layout,
      };

      await onSave(globalMaster, newInstance);
      onClose();
    } catch (err) {
      console.error('Erro ao criar elemento global:', err);
    } finally {
      setIsSubmitting(false);
    }
  };



  // Agrupamento por Nó da Árvore
  const groupedCandidates = candidates.reduce((acc, candidate) => {
    if (!acc[candidate.nodeId]) {
      acc[candidate.nodeId] = {
        label: candidate.nodeLabel,
        type: candidate.nodeType,
        items: [],
      };
    }
    acc[candidate.nodeId].items.push(candidate);
    return acc;
  }, {} as Record<string, { label: string; type: string; items: ComponentPropCandidate[] }>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-purple-500/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Criar Elemento Global</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Reutilizável em todo o workspace com herança</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Campo Nome */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nome do Elemento Global
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Card Depoimento VIP"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Matriz de Exposição de Propriedades */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Propriedades Personalizáveis por Instância
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
              Selecione quais atributos poderão ser sobrescritos em cada cópia. Tudo o mais é herdado do componente master.
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto p-2 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 custom-scrollbar">
              {Object.keys(groupedCandidates).length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  Nenhuma propriedade personalizável encontrada neste elemento.
                </div>
              ) : (
                Object.entries(groupedCandidates).map(([nodeId, group]) => (
                  <div key={nodeId} className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                      <Layers className="w-3 h-3" />
                      <span>{group.label} ({group.type})</span>
                    </div>

                    <div className="pl-3 space-y-1">
                      {group.items.map((item) => {
                        const isChecked = !!selectedPaths[item.path];
                        return (
                          <div
                            key={item.path}
                            onClick={() => togglePath(item.path)}
                            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-zinc-900 cursor-pointer select-none text-xs transition-colors"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              {item.type === 'text' && <Type className="w-3 h-3 text-slate-400 shrink-0" />}
                              {item.type === 'image' && <ImageIcon className="w-3 h-3 text-blue-400 shrink-0" />}
                              {item.type === 'link' && <LinkIcon className="w-3 h-3 text-emerald-400 shrink-0" />}
                              {item.type === 'color' && <Palette className="w-3 h-3 text-pink-400 shrink-0" />}
                              <span className="text-slate-800 dark:text-slate-200 font-medium truncate">{item.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-zinc-950">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!name.trim() || isSubmitting}
            onClick={handleCreate}
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Criando...' : 'Salvar Elemento Global'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
