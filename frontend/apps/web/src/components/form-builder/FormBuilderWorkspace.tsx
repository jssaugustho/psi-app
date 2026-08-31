'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { api, ScreeningForm } from '@/lib/api';
import { useRealtime } from '@/context/RealtimeContext';
import { useBrand } from '@/context/BrandContext';
import { useEditorHistory } from '@/hooks/useEditorHistory';
import { Card, Button, Input } from '@psi/ui';
import { FontPicker } from '@/components/FontPicker';
import {
  Plus, Save, Undo, Redo, RefreshCw, AlertTriangle, Check, Sparkles, Trash2, Palette,
  Layers, HelpCircle, X, ChevronRight, Sliders, ArrowLeft, Sun, Moon, ExternalLink,
  PanelLeft, PanelLeftClose, User, Phone, Mail, CheckSquare, FileText, Eye
} from 'lucide-react';

import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  Position,
  Handle,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Node Types Customizados para o Fluxograma
const CustomNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const isStart = data.type === 'start';

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'start': return <Sparkles className="h-3.5 w-3.5 text-[var(--brand-gradient-start)]" />;
      case 'nome': return <User className="h-3.5 w-3.5 text-[var(--brand-gradient-start)]" />;
      case 'celular': return <Phone className="h-3.5 w-3.5 text-[var(--brand-gradient-start)]" />;
      case 'email': return <Mail className="h-3.5 w-3.5 text-[var(--brand-gradient-start)]" />;
      case 'seletor': return <CheckSquare className="h-3.5 w-3.5 text-[var(--brand-gradient-start)]" />;
      default: return <FileText className="h-3.5 w-3.5 text-[var(--brand-gradient-start)]" />;
    }
  };

  return (
    <div
      className={`px-4 py-3 rounded-2xl border transition-all duration-200 min-w-[240px] shadow-xl ${
        selected
          ? 'border-[var(--brand-gradient-start)] ring-2 ring-[var(--brand-gradient-start)]/40 bg-white dark:bg-zinc-950 text-slate-900 dark:text-white'
          : 'border-[var(--surface-border)] bg-white/95 dark:bg-zinc-950/90 text-slate-900 dark:text-white hover:border-zinc-400 dark:hover:border-zinc-700'
      }`}
    >
      {!isStart && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3.5 h-3.5 !bg-[var(--brand-gradient-start)] border-2 border-white dark:border-zinc-950 shadow-md"
        />
      )}

      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--brand-gradient-start)]/15 text-[var(--brand-gradient-start)] border border-[var(--brand-gradient-start)]/30">
          {getNodeIcon(data.type)}
          <span className="text-[9px] font-bold uppercase tracking-wider">
            {data.type || 'campo'}
          </span>
        </div>
        {data.isRequired && (
          <span className="text-[9px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider">*Obrigatório</span>
        )}
      </div>

      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
        {data.title || 'Sem título'}
      </h4>
      {data.placeholder && (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-tight">{data.placeholder}</p>
      )}

      {/* Render options preview if selector */}
      {data.type === 'seletor' && data.options && data.options.length > 0 ? (
        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1 relative pr-4">
          {data.options.map((opt: any, idx: number) => (
            <div key={idx} className="text-[9px] px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 truncate relative">
              • {opt.label || opt.value}
              <Handle
                type="source"
                position={Position.Right}
                id={`opt_${idx}`}
                style={{ top: '50%', transform: 'translateY(-50%)', right: '-12px' }}
                className="w-2.5 h-2.5 !bg-[var(--brand-gradient-start)] border-2 border-white dark:border-zinc-950 shadow-sm"
              />
            </div>
          ))}
        </div>
      ) : data.options && data.options.length > 0 ? (
        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
          {data.options.map((opt: any, idx: number) => (
            <div key={idx} className="text-[9px] px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 truncate">
              • {opt.label || opt.value}
            </div>
          ))}
        </div>
      ) : null}

      {data.type !== 'seletor' && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3.5 h-3.5 !bg-[var(--brand-gradient-start)] border-2 border-white dark:border-zinc-950 shadow-md"
        />
      )}
    </div>
  );
};

const nodeTypes = {
  start: CustomNode,
  nome: CustomNode,
  celular: CustomNode,
  email: CustomNode,
  cpf: CustomNode,
  maioridade: CustomNode,
  emergencia: CustomNode,
  contrato: CustomNode,
  texto: CustomNode,
  paragrafo: CustomNode,
  seletor: CustomNode,
};

interface FormBuilderWorkspaceProps {
  formId?: string;
  initialForm?: ScreeningForm;
  mode?: 'standalone' | 'embedded';
  onSave?: (form: ScreeningForm) => void;
}

export function FormBuilderWorkspace({
  formId,
  initialForm,
  mode = 'standalone',
  onSave,
}: FormBuilderWorkspaceProps) {
  const { subscribe } = useRealtime();
  const { tenant, theme, toggleTheme } = useBrand();
  const [form, setForm] = useState<ScreeningForm | null>(initialForm || null);
  const [loading, setLoading] = useState(!initialForm && !!formId);
  const [publishing, setPublishing] = useState(false);

  // Layout states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<'flow' | 'theme'>('flow');

  // Staging / Conflict warnings
  const [hasRemoteConflict, setHasRemoteConflict] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [publishErrors, setPublishErrors] = useState<string[]>([]);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const isTemplateAdded = useCallback((type: string) => {
    return nodes.some((n) => n.type === type);
  }, [nodes]);

  // Form title and theme draft state
  const [titleDraft, setTitleDraft] = useState(initialForm?.titleDraft || initialForm?.title || '');
  const [themeConfigDraft, setThemeConfigDraft] = useState<any>(
    initialForm?.themeConfigDraft || initialForm?.themeConfig || {
      primaryStart: tenant?.gradientColorStart || tenant?.defaultSitePrimaryColor || '#27272A',
      primaryEnd: tenant?.gradientColorEnd || tenant?.defaultSiteSecondaryColor || '#52525B',
      contrast: tenant?.contrastColor || '#FFFFFF',
      fontHeading: 'Playfair Display',
      fontBody: 'Inter',
    }
  );

  // Populate React Flow nodes and edges when form is loaded
  const populateFromForm = useCallback((formData: ScreeningForm) => {
    setForm(formData);
    setTitleDraft(formData.titleDraft || formData.title);
    setThemeConfigDraft(
      formData.themeConfigDraft || formData.themeConfig || {
        primaryStart: '#CC8667',
        primaryEnd: '#AA5533',
        contrast: '#FFFFFF',
        fontHeading: 'Playfair Display',
        fontBody: 'Inter',
      }
    );

    const flowData = formData.formFlowDraft || formData.formFlow || {};
    const rawNodes: any[] = flowData.nodes || [];
    const rawEdges: any[] = flowData.edges || [];

    const rfNodes: Node[] = rawNodes.map((n) => ({
      id: n.id,
      type: n.type || 'texto',
      position: n.position || { x: 100, y: 100 },
      data: {
        ...n.data,
        type: n.type,
      },
    }));

    const rfEdges: Edge[] = rawEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
    }));

    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [setNodes, setEdges]);

  // Load Form from API if formId provided
  const loadForm = useCallback(async () => {
    if (!formId) return;
    try {
      setLoading(true);
      const data = await api.getFormById(formId);
      populateFromForm(data);
      setHasRemoteConflict(false);
    } catch (err) {
      console.error('Erro ao carregar formulário:', err);
    } finally {
      setLoading(false);
    }
  }, [formId, populateFromForm]);

  useEffect(() => {
    if (formId) {
      loadForm();
    }
  }, [formId, loadForm]);

  const applyState = useCallback((state: any) => {
    if (!state) return;
    if (state.titleDraft !== undefined) setTitleDraft(state.titleDraft);
    if (state.themeConfigDraft !== undefined) setThemeConfigDraft(state.themeConfigDraft);
    if (state.nodes) setNodes(state.nodes);
    if (state.edges) setEdges(state.edges);
  }, [setNodes, setEdges]);

  const { undo, redo, canUndo, canRedo, recordChange, setInitialState } = useEditorHistory(
    form ? { titleDraft, themeConfigDraft, nodes, edges } : null,
    applyState
  );

  // Set initial state for history once loaded
  useEffect(() => {
    if (form && nodes.length > 0) {
      setInitialState({ titleDraft, themeConfigDraft, nodes, edges });
    }
  }, [form, nodes, edges, titleDraft, themeConfigDraft, setInitialState]);

  // Track state changes for Undo/Redo
  useEffect(() => {
    if (!loading && form) {
      recordChange({ titleDraft, themeConfigDraft, nodes, edges });
    }
  }, [nodes, edges, titleDraft, themeConfigDraft, loading, form, recordChange]);

  // WebSocket / Realtime Sync setup
  useEffect(() => {
    if (!formId) return;
    const unsub = subscribe(`form:${formId}`, (message: any) => {
      if (message.type === 'form_updated' && message.senderId !== 'current_session') {
        setHasRemoteConflict(true);
      }
    });
    return () => {
      unsub();
    };
  }, [formId, subscribe]);

  // Connect edges on React Flow canvas
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Selected Node reference
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  // Helper to add node
  const handleAddNode = (type: string, title?: string, placeholder?: string, options?: any[]) => {
    const id = `node_${Date.now()}`;
    const newY = nodes.length > 0 ? Math.max(...nodes.map((n) => n.position.y)) + 120 : 100;
    const newNode: Node = {
      id,
      type,
      position: { x: 300, y: newY },
      data: {
        title: title || (type === 'seletor' ? 'Qual opção melhor descreve você?' : 'Sua Pergunta'),
        placeholder: placeholder || (type === 'seletor' ? '' : 'Escreva sua resposta aqui...'),
        isRequired: true,
        type,
        options: options || (type === 'seletor' ? [
          { label: 'Opção 1', value: 'Opção 1' },
          { label: 'Opção 2', value: 'Opção 2' },
        ] : undefined),
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(id);

    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      const newEdge: Edge = {
        id: `e_${lastNode.id}_${id}`,
        source: lastNode.id,
        target: id,
      };
      setEdges((eds) => [...eds, newEdge]);
    }
  };

  // Helper to update selected node data
  const updateSelectedNodeData = (field: string, value: any) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              [field]: value,
            },
          };
        }
        return n;
      })
    );
  };

  // Option editor helpers for selector node
  const handleAddOption = () => {
    if (!selectedNode) return;
    const currentOptions = Array.isArray(selectedNode.data?.options) ? selectedNode.data.options : [];
    const nextNum = currentOptions.length + 1;
    const updatedOptions = [...currentOptions, { label: `Opção ${nextNum}`, value: `Opção ${nextNum}` }];
    updateSelectedNodeData('options', updatedOptions);
  };

  const handleUpdateOption = (index: number, label: string) => {
    if (!selectedNode) return;
    const currentOptions = Array.isArray(selectedNode.data?.options) ? [...selectedNode.data.options] : [];
    currentOptions[index] = { label, value: label };
    updateSelectedNodeData('options', currentOptions);
  };

  const handleRemoveOption = (index: number) => {
    if (!selectedNode) return;
    const updatedOptions = (Array.isArray(selectedNode.data?.options) ? selectedNode.data.options : []).filter((_: any, i: number) => i !== index);
    updateSelectedNodeData('options', updatedOptions);
  };

  const handleDeleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  // Auto-save draft to database (1.5s debounce)
  useEffect(() => {
    if (!formId || loading) return;
    const timer = setTimeout(async () => {
      try {
        const flowPayload = {
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data,
          })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
          })),
        };

        const updated = await api.updateForm(formId, {
          titleDraft,
          themeConfigDraft,
          formFlowDraft: flowPayload,
          isPublish: false,
        });

        setForm(updated);
      } catch (err) {
        console.error('Erro ao salvar rascunho do formulário:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [formId, nodes, edges, titleDraft, themeConfigDraft, loading]);

  // Publish handler
  const handlePublish = async () => {
    if (!formId) return;
    
    // Validar fluxo no frontend
    const errors: string[] = [];
    
    // 1. Verificar blocos obrigatórios
    const requiredTypes = ['nome', 'celular', 'maioridade', 'contrato'];
    for (const rType of requiredTypes) {
      const hasNode = nodes.some((n: any) => n.type === rType);
      if (!hasNode) {
        errors.push(`O bloco de template '${rType.toUpperCase()}' é obrigatório no fluxo.`);
      }
    }

    // 2. Verificar conexões de início
    const startNode = nodes.find((n: any) => n.type === 'start');
    if (!startNode) {
      errors.push("O bloco de 'Início' é obrigatório.");
    } else {
      const hasStartEdge = edges.some((e: any) => e.source === startNode.id);
      if (!hasStartEdge) {
        errors.push("O bloco de 'Início' deve estar conectado a outro bloco.");
      }
    }

    // 3. Verificar nós órfãos ou desconectados
    for (const node of nodes) {
      if (node.type === 'end' || node.type === 'start') continue;

      const nodeData = node.data as any;

      const hasIncoming = edges.some((e: any) => e.target === node.id);
      if (!hasIncoming) {
        errors.push(`O bloco '${nodeData?.title || node.id}' está órfão (não possui conexão de entrada).`);
      }

      const hasOutgoing = edges.some((e: any) => e.source === node.id);
      if (!hasOutgoing) {
        errors.push(`O bloco '${nodeData?.title || node.id}' não está conectado a nenhuma saída.`);
      }

      if (node.type === 'seletor') {
        const options = nodeData?.options || [];
        if (options.length === 0) {
          errors.push(`O bloco de escolha única '${nodeData?.title || node.id}' deve conter pelo menos uma opção.`);
        }
      }

      if (node.type === 'contrato') {
        const contractText = nodeData?.contractText || '';
        if (!contractText.trim()) {
          errors.push(`O termo do bloco de contrato está em branco.`);
        }
      }

      const isCustomField = ['texto', 'paragrafo', 'seletor'].includes(node.type || '');
      if (isCustomField && !nodeData?.variableKey) {
        errors.push(`O bloco personalizado '${nodeData?.title || node.id}' deve estar associado a uma variável do CRM.`);
      }
    }

    if (errors.length > 0) {
      setPublishErrors(errors);
      return;
    }

    setPublishErrors([]);

    try {
      setPublishing(true);
      const flowPayload = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
        })),
      };

      const updated = await api.updateForm(formId, {
        titleDraft,
        themeConfigDraft,
        formFlowDraft: flowPayload,
        isPublish: true,
      });

      setForm(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onSave) onSave(updated);
    } catch (err) {
      console.error('Erro ao publicar formulário:', err);
    } finally {
      setPublishing(false);
    }
  };

  const publicUrl = form?.slug
    ? `${typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':3002') : ''}/f/${form.slug}`
    : '#';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando editor de formulário...</span>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full flex flex-col overflow-hidden relative ${
        mode === 'embedded' ? 'glass-lg border border-[var(--surface-border)] rounded-2xl shadow-2xl' : 'bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-slate-100'
      }`}
    >
      {/* Remote conflict / Realtime Sync Alert Banner */}
      {hasRemoteConflict && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-amber-700 dark:text-amber-200 text-xs z-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Este formulário foi modificado em outra sessão.</span>
          </div>
          <Button
            onClick={loadForm}
            className="h-7 px-3 text-[10px] bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg border-none cursor-pointer"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Sincronizar
          </Button>
        </div>
      )}

      {/* Editor Topbar Header */}
      <div className="px-4 py-2.5 border-b border-[var(--surface-border)] bg-white/80 dark:bg-zinc-950/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 z-30">
        <div className="flex items-center gap-3">
          {mode === 'standalone' && (
            <Link href="/dashboard/captacao" className="no-underline">
              <button
                type="button"
                className="h-8 px-2.5 rounded-lg glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer font-medium"
                title="Voltar aos Criador de Sites"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Voltar</span>
              </button>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 w-8 rounded-lg glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
            title={sidebarCollapsed ? 'Expandir Painel' : 'Recolher Painel'}
          >
            {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>

          <Input
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            placeholder="Nome do Formulário"
            className="brand-input font-bold text-sm h-8 w-56 sm:w-64"
          />

          <div className="flex items-center glass-sm rounded-lg p-0.5 border border-[var(--surface-border)]">
            <button
              onClick={() => setWorkspaceTab('flow')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                workspaceTab === 'flow'
                  ? 'brand-accent text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Fluxograma</span>
            </button>

            {mode === 'standalone' && (
              <button
                onClick={() => setWorkspaceTab('theme')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  workspaceTab === 'theme'
                    ? 'brand-accent text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Palette className="h-3.5 w-3.5" />
                <span>Identidade Visual</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center glass-sm rounded-lg p-0.5 border border-[var(--surface-border)]">
            <button
              onClick={undo}
              disabled={!canUndo}
              className={`p-1.5 rounded transition-all ${
                canUndo ? 'text-slate-700 dark:text-slate-200 hover:bg-white/10 cursor-pointer' : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
              title="Desfazer (Ctrl+Z)"
            >
              <Undo className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className={`p-1.5 rounded transition-all ${
                canRedo ? 'text-slate-700 dark:text-slate-200 hover:bg-white/10 cursor-pointer' : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
              title="Refazer (Ctrl+Y)"
            >
              <Redo className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="h-8 w-8 rounded-lg glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all flex items-center justify-center shrink-0"
            title={`Alternar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {form?.slug && (
            <button
              type="button"
              onClick={() => window.open(publicUrl, '_blank')}
              className="h-8 px-2.5 rounded-lg glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0"
              title="Abrir Formulário Público em Nova Guia"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold hidden md:inline">Link Público</span>
            </button>
          )}

          <Button
            onClick={handlePublish}
            disabled={publishing}
            className="brand-accent h-8 text-xs px-4 rounded-xl flex items-center gap-1.5 font-bold shadow-md cursor-pointer border-none"
          >
            {publishing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>{publishing ? 'Publicando...' : saveSuccess ? 'Publicado!' : 'Publicar'}</span>
          </Button>
        </div>
      </div>

      {/* Main Workspace Body */}
      {workspaceTab === 'flow' ? (
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Toolbar: Node Spawner & Selected Node Editor */}
          <div
            className={`glass-md border-r border-[var(--surface-border)] flex flex-col gap-4 overflow-y-auto custom-scrollbar shrink-0 transition-all duration-300 ${
              sidebarCollapsed ? 'w-0 p-0 overflow-hidden border-none' : 'w-80 p-4'
            }`}
          >
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Adicionar Pergunta de Triagem
              </h4>

              <div className="space-y-2">
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide block">
                  Dados do Paciente (Templates):
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    disabled={isTemplateAdded('nome')}
                    onClick={() => handleAddNode('nome', 'Qual é o seu nome completo?', 'Escreva seu nome completo aqui..')}
                    className={`p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 group ${
                      isTemplateAdded('nome')
                        ? 'opacity-40 cursor-not-allowed bg-slate-200/10 dark:bg-zinc-900/10 border border-transparent'
                        : 'glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] hover:border-[var(--brand-gradient-start)] cursor-pointer'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-[var(--brand-gradient-start)]/15 text-[var(--brand-gradient-start)] shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <span className={`text-xs font-bold block ${!isTemplateAdded('nome') ? 'group-hover:text-[var(--brand-gradient-start)]' : ''} text-slate-800 dark:text-slate-200`}>
                        Nome Completo
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                        {isTemplateAdded('nome') ? 'Já adicionado' : 'Campo de identificação do lead'}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isTemplateAdded('celular')}
                    onClick={() => handleAddNode('celular', 'Qual é o seu WhatsApp de contato?', '(11) 99999-9999')}
                    className={`p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 group ${
                      isTemplateAdded('celular')
                        ? 'opacity-40 cursor-not-allowed bg-slate-200/10 dark:bg-zinc-900/10 border border-transparent'
                        : 'glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] hover:border-[var(--brand-gradient-start)] cursor-pointer'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-[var(--brand-gradient-start)]/15 text-[var(--brand-gradient-start)] shrink-0">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <span className={`text-xs font-bold block ${!isTemplateAdded('celular') ? 'group-hover:text-[var(--brand-gradient-start)]' : ''} text-slate-800 dark:text-slate-200`}>
                        WhatsApp / Celular
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                        {isTemplateAdded('celular') ? 'Já adicionado' : 'Campo de telefone internacional'}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isTemplateAdded('email')}
                    onClick={() => handleAddNode('email', 'Qual é o seu melhor e-mail?', 'seu.email@exemplo.com')}
                    className={`p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 group ${
                      isTemplateAdded('email')
                        ? 'opacity-40 cursor-not-allowed bg-slate-200/10 dark:bg-zinc-900/10 border border-transparent'
                        : 'glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] hover:border-[var(--brand-gradient-start)] cursor-pointer'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-[var(--brand-gradient-start)]/15 text-[var(--brand-gradient-start)] shrink-0">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <span className={`text-xs font-bold block ${!isTemplateAdded('email') ? 'group-hover:text-[var(--brand-gradient-start)]' : ''} text-slate-800 dark:text-slate-200`}>
                        E-mail de Contato
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                        {isTemplateAdded('email') ? 'Já adicionado' : 'Campo de validação de e-mail'}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isTemplateAdded('cpf')}
                    onClick={() => handleAddNode('cpf', 'Qual é o seu CPF?', '000.000.000-00')}
                    className={`p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 group ${
                      isTemplateAdded('cpf')
                        ? 'opacity-40 cursor-not-allowed bg-slate-200/10 dark:bg-zinc-900/10 border border-transparent'
                        : 'glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] hover:border-[var(--brand-gradient-start)] cursor-pointer'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-[var(--brand-gradient-start)]/15 text-[var(--brand-gradient-start)] shrink-0">
                      <Sliders className="h-4 w-4" />
                    </div>
                    <div>
                      <span className={`text-xs font-bold block ${!isTemplateAdded('cpf') ? 'group-hover:text-[var(--brand-gradient-start)]' : ''} text-slate-800 dark:text-slate-200`}>
                        CPF do Paciente
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                        {isTemplateAdded('cpf') ? 'Já adicionado' : 'Validação de CPF no banco'}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isTemplateAdded('maioridade')}
                    onClick={() => handleAddNode('maioridade', 'Você é maior de idade?')}
                    className={`p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 group ${
                      isTemplateAdded('maioridade')
                        ? 'opacity-40 cursor-not-allowed bg-slate-200/10 dark:bg-zinc-900/10 border border-transparent'
                        : 'glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] hover:border-[var(--brand-gradient-start)] cursor-pointer'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-[var(--brand-gradient-start)]/15 text-[var(--brand-gradient-start)] shrink-0">
                      <CheckSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <span className={`text-xs font-bold block ${!isTemplateAdded('maioridade') ? 'group-hover:text-[var(--brand-gradient-start)]' : ''} text-slate-800 dark:text-slate-200`}>
                        Validação de Maioridade
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                        {isTemplateAdded('maioridade') ? 'Já adicionado' : 'Diferencia menor e maior de idade'}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isTemplateAdded('emergencia')}
                    onClick={() => handleAddNode('emergencia', 'Contato de Emergência')}
                    className={`p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 group ${
                      isTemplateAdded('emergencia')
                        ? 'opacity-40 cursor-not-allowed bg-slate-200/10 dark:bg-zinc-900/10 border border-transparent'
                        : 'glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] hover:border-[var(--brand-gradient-start)] cursor-pointer'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-[var(--brand-gradient-start)]/15 text-[var(--brand-gradient-start)] shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <span className={`text-xs font-bold block ${!isTemplateAdded('emergencia') ? 'group-hover:text-[var(--brand-gradient-start)]' : ''} text-slate-800 dark:text-slate-200`}>
                        Contato de Emergência
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                        {isTemplateAdded('emergencia') ? 'Já adicionado' : 'Coleta nome, parentesco e celular'}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isTemplateAdded('contrato')}
                    onClick={() => handleAddNode('contrato', 'Termo de Consentimento Livre e Esclarecido', '', [])}
                    className={`p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 group ${
                      isTemplateAdded('contrato')
                        ? 'opacity-40 cursor-not-allowed bg-slate-200/10 dark:bg-zinc-900/10 border border-transparent'
                        : 'glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] hover:border-[var(--brand-gradient-start)] cursor-pointer'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-[var(--brand-gradient-start)]/15 text-[var(--brand-gradient-start)] shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <span className={`text-xs font-bold block ${!isTemplateAdded('contrato') ? 'group-hover:text-[var(--brand-gradient-start)]' : ''} text-slate-800 dark:text-slate-200`}>
                        Contrato / TCLE
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                        {isTemplateAdded('contrato') ? 'Já adicionado' : 'Termo de consentimento clínico'}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[var(--surface-border)]">
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide block">
                  Perguntas de Diagnóstico & Opções:
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddNode('seletor', 'Qual é o seu principal objetivo com a terapia?')}
                    className="p-2.5 rounded-xl glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] hover:border-[var(--brand-gradient-start)] text-left transition-all cursor-pointer flex items-center gap-2.5 group"
                  >
                    <div className="p-1.5 rounded-lg bg-[var(--brand-gradient-start)]/15 text-[var(--brand-gradient-start)] shrink-0">
                      <CheckSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[var(--brand-gradient-start)] block">
                        Múltipla Escolha
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                        Botões de escolha única/múltipla
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddNode('texto', 'Descreva em poucas palavras o motivo da busca')}
                    className="p-2.5 rounded-xl glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] hover:border-[var(--brand-gradient-start)] text-left transition-all cursor-pointer flex items-center gap-2.5 group"
                  >
                    <div className="p-1.5 rounded-lg bg-[var(--brand-gradient-start)]/15 text-[var(--brand-gradient-start)] shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[var(--brand-gradient-start)] block">
                        Texto Curto
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                        Campo de resposta livre curta
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddNode('paragrafo', 'Conte um pouco mais sobre seu momento atual')}
                    className="p-2.5 rounded-xl glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] hover:border-[var(--brand-gradient-start)] text-left transition-all cursor-pointer flex items-center gap-2.5 group"
                  >
                    <div className="p-1.5 rounded-lg bg-[var(--brand-gradient-start)]/15 text-[var(--brand-gradient-start)] shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[var(--brand-gradient-start)] block">
                        Parágrafo Longo
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                        Área de texto para mensagens longas
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Node Editor Inspector */}
            {selectedNode ? (
              <div className="space-y-4 pt-4 border-t border-[var(--surface-border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--brand-gradient-start)]/20 text-[var(--brand-gradient-start)] border border-[var(--brand-gradient-start)]/30">
                      {String(selectedNode.data.type || 'campo')}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Editar Pergunta</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedNodeId(null)}
                    className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer p-1"
                  >
                    Limpar
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                      Título da Pergunta
                    </label>
                    <Input
                      type="text"
                      className="brand-input text-xs"
                      value={String(selectedNode.data?.title || '')}
                      onChange={(e) => updateSelectedNodeData('title', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                      Placeholder
                    </label>
                    <Input
                      type="text"
                      className="brand-input text-xs"
                      value={String(selectedNode.data?.placeholder || '')}
                      onChange={(e) => updateSelectedNodeData('placeholder', e.target.value)}
                    />
                  </div>

                  {selectedNode.data.type === 'contrato' && (
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                        Minuta do Contrato / Termo de Consentimento
                      </label>
                      <textarea
                        rows={6}
                        className="w-full text-xs p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 focus:border-[var(--brand-gradient-start)] outline-none text-white placeholder:text-muted-foreground/40 resize-none font-sans"
                        placeholder="Escreva a minuta do contrato aqui..."
                        value={String(selectedNode.data?.contractText || '')}
                        onChange={(e) => updateSelectedNodeData('contractText', e.target.value)}
                      />
                    </div>
                  )}

                  {['texto', 'paragrafo', 'seletor'].includes((selectedNode.data as any).type) && (
                    <div className="space-y-3 pt-2 border-t border-[var(--surface-border)]">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                          Nome da Variável no CRM (Sem espaços)
                        </label>
                        <Input
                          type="text"
                          className="brand-input text-xs font-mono"
                          placeholder="ex: queixa_principal"
                          value={String(selectedNode.data?.variableKey || '')}
                          onChange={(e) => updateSelectedNodeData('variableKey', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                          Rótulo da Coluna no CRM
                        </label>
                        <Input
                          type="text"
                          className="brand-input text-xs"
                          placeholder="ex: Queixa Principal"
                          value={String(selectedNode.data?.variableLabel || '')}
                          onChange={(e) => updateSelectedNodeData('variableLabel', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {selectedNode.data.type === 'seletor' && (
                    <div className="space-y-2 pt-2 border-t border-[var(--surface-border)]">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                          Opções de Resposta
                        </label>
                        <button
                          type="button"
                          onClick={handleAddOption}
                          className="text-[10px] text-[var(--brand-gradient-start)] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Adicionar
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {(Array.isArray(selectedNode.data?.options) ? selectedNode.data.options : []).map((opt: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <Input
                              type="text"
                              className="brand-input text-xs py-1 px-2 h-7 flex-1"
                              value={opt.label || ''}
                              onChange={(e) => handleUpdateOption(idx, e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(idx)}
                              className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Campo Obrigatório</label>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedNode.data?.isRequired ?? true)}
                      onChange={(e) => updateSelectedNodeData('isRequired', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[var(--brand-gradient-start)] cursor-pointer"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={handleDeleteSelectedNode}
                      className="w-full h-8 text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir Bloco
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-[var(--surface-border)] pt-4 text-center space-y-2">
                <HelpCircle className="h-6 w-6 text-slate-400 dark:text-slate-500 mx-auto opacity-60" />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Clique em qualquer bloco do fluxograma à direita para editar sua pergunta e parâmetros.
                </p>
              </div>
            )}
          </div>

          {/* Center / Right Canvas: React Flow */}
          <div className="flex-1 h-full relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              fitView
              className={theme === 'dark' ? 'bg-[#09090b]' : 'bg-[#f8fafc]'}
            >
              <Controls />
              <Background
                color={theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : '#cbd5e1'}
                gap={16}
                className="opacity-25"
              />
            </ReactFlow>
          </div>
        </div>
      ) : (
        /* Tab 2: Theme & Visual Identity Configs with Live Interactive Form Card Preview */
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Color & Font Pickers */}
            <div className="space-y-6">
              <div className="space-y-1 border-b border-[var(--surface-border)] pb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Palette className="h-4 w-4 text-[var(--brand-gradient-start)]" />
                  Identidade Visual do Formulário
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure as cores e fontes de exibição quando o formulário for acessado via link direto público.
                </p>
              </div>

              <div className="space-y-4">
                {/* Primary Start Color */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Cor Primária do Gradiente</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themeConfigDraft?.primaryStart || tenant?.gradientColorStart || '#27272A'}
                      onChange={(e) => setThemeConfigDraft({ ...themeConfigDraft, primaryStart: e.target.value })}
                      className="w-10 h-10 rounded-xl border border-[var(--surface-border)] cursor-pointer bg-transparent"
                    />
                    <Input
                      type="text"
                      value={themeConfigDraft?.primaryStart || tenant?.gradientColorStart || '#27272A'}
                      onChange={(e) => setThemeConfigDraft({ ...themeConfigDraft, primaryStart: e.target.value })}
                      className="brand-input font-mono text-xs w-36"
                    />
                  </div>
                </div>

                {/* Primary End Color */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Cor Secundária do Gradiente</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themeConfigDraft?.primaryEnd || tenant?.gradientColorEnd || '#52525B'}
                      onChange={(e) => setThemeConfigDraft({ ...themeConfigDraft, primaryEnd: e.target.value })}
                      className="w-10 h-10 rounded-xl border border-[var(--surface-border)] cursor-pointer bg-transparent"
                    />
                    <Input
                      type="text"
                      value={themeConfigDraft?.primaryEnd || tenant?.gradientColorEnd || '#52525B'}
                      onChange={(e) => setThemeConfigDraft({ ...themeConfigDraft, primaryEnd: e.target.value })}
                      className="brand-input font-mono text-xs w-36"
                    />
                  </div>
                </div>

                {/* Contrast Color */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Cor do Texto de Botões (Contraste)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themeConfigDraft?.contrast || tenant?.contrastColor || '#FFFFFF'}
                      onChange={(e) => setThemeConfigDraft({ ...themeConfigDraft, contrast: e.target.value })}
                      className="w-10 h-10 rounded-xl border border-[var(--surface-border)] cursor-pointer bg-transparent"
                    />
                    <Input
                      type="text"
                      value={themeConfigDraft?.contrast || tenant?.contrastColor || '#FFFFFF'}
                      onChange={(e) => setThemeConfigDraft({ ...themeConfigDraft, contrast: e.target.value })}
                      className="brand-input font-mono text-xs w-36"
                    />
                  </div>
                </div>

                {/* Font Picker */}
                <div className="space-y-4 pt-4 border-t border-[var(--surface-border)]">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Fonte dos Títulos</label>
                    <FontPicker
                      label="Fonte dos Títulos"
                      value={String(themeConfigDraft?.fontHeading || 'Playfair Display')}
                      onChange={(font) => setThemeConfigDraft({ ...themeConfigDraft, fontHeading: font })}
                      type="heading"
                      onOpenCustomFontModal={() => {}}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Fonte dos Parágrafos</label>
                    <FontPicker
                      label="Fonte dos Parágrafos"
                      value={String(themeConfigDraft?.fontBody || 'Inter')}
                      onChange={(font) => setThemeConfigDraft({ ...themeConfigDraft, fontBody: font })}
                      type="body"
                      onOpenCustomFontModal={() => {}}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Form Card Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-[var(--brand-gradient-start)]" />
                  Visualização em Tempo Real
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Modo Typeform Público</span>
              </div>

              {/* Simulated Public Typeform Screen */}
              <div className="rounded-2xl border border-[var(--surface-border)] p-6 bg-slate-900 text-white shadow-2xl space-y-6 relative overflow-hidden">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-slate-300">
                    Pergunta 1 de {nodes.length || 3}
                  </span>
                  <h2
                    className="text-xl font-bold leading-snug"
                    style={{ fontFamily: `'${themeConfigDraft?.fontHeading || 'Playfair Display'}', serif` }}
                  >
                    Qual é o seu principal objetivo com a terapia?
                  </h2>
                  <p
                    className="text-xs text-slate-400"
                    style={{ fontFamily: `'${themeConfigDraft?.fontBody || 'Inter'}', sans-serif` }}
                  >
                    Selecione uma opção abaixo para continuarmos.
                  </p>
                </div>

                <div className="space-y-2">
                  {['Agendar Primeira Consulta', 'Tirar Dúvidas sobre Valores', 'Acompanhamento Contínuo'].map((opt, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 text-xs font-medium flex items-center justify-between cursor-pointer transition-all"
                      style={{ fontFamily: `'${themeConfigDraft?.fontBody || 'Inter'}', sans-serif` }}
                    >
                      <span>{opt}</span>
                      <span className="w-4 h-4 rounded-full border border-white/30" />
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    style={{
                      background: `linear-gradient(135deg, ${themeConfigDraft?.primaryStart || '#CC8667'}, ${themeConfigDraft?.primaryEnd || '#AA5533'})`,
                      color: themeConfigDraft?.contrast || '#FFFFFF',
                      fontFamily: `'${themeConfigDraft?.fontBody || 'Inter'}', sans-serif`,
                    }}
                    className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer border-none"
                  >
                    <span>Continuar</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {publishErrors.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-2xl border border-red-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Erros de Validação</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Corrija os problemas de fluxo abaixo antes de publicar o formulário público:
            </p>
            <ul className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {publishErrors.map((err, i) => (
                <li key={i} className="text-[11px] text-red-600 dark:text-red-400 leading-snug bg-red-500/5 px-2.5 py-1.5 rounded-lg border border-red-500/10">
                  {err}
                </li>
              ))}
            </ul>
            <div className="pt-2 flex justify-end">
              <Button
                onClick={() => setPublishErrors([])}
                className="h-8 px-4 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-900 dark:text-white rounded-lg border-none cursor-pointer"
              >
                Voltar ao Editor
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
