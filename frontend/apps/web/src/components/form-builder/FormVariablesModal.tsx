'use client';

import React, { useState, useMemo } from 'react';
import { BrandModal, Button, Input } from '@psi/ui';
import { Target, Plus, Trash2, Database, ShieldCheck, Check, Loader2, Search, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

export interface FormVariablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  formFlow: { nodes: any[]; edges: any[] };
  customFieldDefs: Array<{ id?: string; workspace_id?: string; key: string; name: string; type?: string }>;
  workspaceId?: string;
  onRefreshCustomFields: () => Promise<void>;
}

const SYSTEM_VARIABLES_MAP: Record<string, { name: string; isStrict: boolean }> = {
  nome: { name: 'Nome Completo (Lead)', isStrict: true },
  celular: { name: 'WhatsApp / Celular', isStrict: true },
  maioridade: { name: 'Maioridade (18+)', isStrict: true },
  responsavel_nome: { name: 'Nome do Responsável Legal', isStrict: false },
  email: { name: 'E-mail de Contato', isStrict: false },
  cpf: { name: 'CPF do Paciente', isStrict: false },
  contato_secundario: { name: 'Contato de Emergência', isStrict: false },
  termo_consentimento: { name: 'Aceite do Contrato / Termo', isStrict: false },
};

export function FormVariablesModal({
  isOpen,
  onClose,
  formFlow,
  customFieldDefs,
  workspaceId,
  onRefreshCustomFields,
}: FormVariablesModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarName, setNewVarName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const nodes = formFlow?.nodes || [];

  // Extract variables used in the current form flow nodes
  const formVariableKeysMap = useMemo(() => {
    const map = new Map<string, string[]>(); // key -> step titles
    nodes.forEach((n) => {
      let key = n.data?.variableKey || n.type;
      if (n.type === 'nome') key = 'nome';
      if (n.type === 'maioridade') key = 'maioridade';
      if (n.type === 'celular') key = 'celular';
      if (n.type === 'start') return; // Skip start node

      const stepTitle = n.data?.title || `Etapa ${n.id}`;
      const existing = map.get(key) || [];
      existing.push(stepTitle);
      map.set(key, existing);
    });
    return map;
  }, [nodes]);

  // Consolidate all variables (System + Workspace Custom Field Defs + Extra keys used in form)
  const consolidatedVariables = useMemo(() => {
    const list: Array<{
      id?: string;
      key: string;
      name: string;
      isSystem: boolean;
      usedInSteps: string[];
    }> = [];

    const seenKeys = new Set<string>();

    // 1. Add System Variables
    Object.entries(SYSTEM_VARIABLES_MAP).forEach(([key, info]) => {
      seenKeys.add(key);
      list.push({
        key,
        name: info.name,
        isSystem: true,
        usedInSteps: formVariableKeysMap.get(key) || [],
      });
    });

    // 2. Add Registered Custom Fields
    (customFieldDefs || []).forEach((def) => {
      if (seenKeys.has(def.key)) return;
      seenKeys.add(def.key);
      list.push({
        id: def.id,
        key: def.key,
        name: def.name || def.key,
        isSystem: false,
        usedInSteps: formVariableKeysMap.get(def.key) || [],
      });
    });

    // 3. Add any extra keys found in form nodes
    formVariableKeysMap.forEach((steps, key) => {
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      list.push({
        key,
        name: key.replace(/_/g, ' ').toUpperCase(),
        isSystem: false,
        usedInSteps: steps,
      });
    });

    return list;
  }, [customFieldDefs, formVariableKeysMap]);

  // Filtered variables by search term
  const filteredVars = consolidatedVariables.filter(
    (v) =>
      v.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateVariable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !newVarKey.trim()) return;
    const cleanKey = newVarKey.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const nameToUse = newVarName.trim() || cleanKey.replace(/_/g, ' ').toUpperCase();

    setIsCreating(true);
    setErrorMsg('');
    try {
      await api.createCustomFieldDef(workspaceId, {
        key: cleanKey,
        name: nameToUse,
      });
      setNewVarKey('');
      setNewVarName('');
      await onRefreshCustomFields();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar variável no CRM');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCustomVar = async (varItem: any) => {
    if (!workspaceId || !varItem.id) return;
    setDeletingId(varItem.key);
    setErrorMsg('');
    try {
      await api.deleteCustomFieldDef(varItem.id, workspaceId);
      await onRefreshCustomFields();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao excluir variável do CRM');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <BrandModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-4 text-left p-1">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Gerenciador de Variáveis do Formulário
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualize, crie e remova as variáveis vinculadas ao CRM para este formulário.
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Search & Add Bar */}
        <div className="space-y-3">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome ou slug da variável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs font-semibold pl-9 pr-3 py-2 rounded-xl glass-sm border border-[var(--surface-border)] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-purple-500 transition-all"
            />
          </div>

          {/* Quick Create Form */}
          <form onSubmit={handleCreateVariable} className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
              + Cadastrar Nova Variável no CRM
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                type="text"
                placeholder="Slug ex: salario_pretendido"
                value={newVarKey}
                onChange={(e) => setNewVarKey(e.target.value)}
                className="brand-input text-xs font-mono"
              />
              <Input
                type="text"
                placeholder="Rótulo ex: Salário Pretendido"
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                className="brand-input text-xs"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isCreating || !newVarKey.trim()}
                className="brand-accent text-xs font-bold h-8 px-4 flex items-center gap-1.5 border-none cursor-pointer"
              >
                {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Criar Variável</span>
              </Button>
            </div>
          </form>
        </div>

        {/* Variables List */}
        <div className="nowheel space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
          {filteredVars.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">Nenhuma variável encontrada</div>
          ) : (
            filteredVars.map((v) => {
              const isDeleting = deletingId === v.key;
              const isUsedInForm = v.usedInSteps.length > 0;

              return (
                <div
                  key={v.key}
                  className="p-3 rounded-xl border border-[var(--surface-border)] glass-sm flex items-center justify-between gap-3 transition-all hover:bg-[var(--surface-hover)]"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20">
                        {v.key}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {v.name}
                      </span>
                      {v.isSystem ? (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-500 border border-slate-300 dark:border-zinc-700">
                          Sistema
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                          Personalizada
                        </span>
                      )}
                    </div>

                    {isUsedInForm ? (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Usada em: {v.usedInSteps.join(', ')}</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400">Não vinculada a etapas deste formulário</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!v.isSystem && v.id ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomVar(v)}
                        disabled={isDeleting}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Excluir Variável do CRM"
                      >
                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium px-2 py-1 rounded bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                        Protegida
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </BrandModal>
  );
}
