'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Check,
  Pencil,
  Trash2,
  Plus,
  X,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button, Input } from '@psi/ui';

export interface FormItem {
  id: string;
  title: string;
  titleDraft?: string | null;
  [key: string]: any;
}

export interface FormManagerSelectProps {
  forms: FormItem[];
  selectedFormId: string | null;
  onSelectForm: (formId: string) => void;
  onCreateForm: (title: string) => Promise<any>;
  onRenameForm: (formId: string, newTitle: string) => Promise<any>;
  onDeleteForm: (formId: string) => Promise<any>;
  placeholder?: string;
  className?: string;
}

export function FormManagerSelect({
  forms,
  selectedFormId,
  onSelectForm,
  onCreateForm,
  onRenameForm,
  onDeleteForm,
  placeholder = 'Selecione um formulário...',
  className = '',
}: FormManagerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Rename inline state
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isRenamingLoading, setIsRenamingLoading] = useState(false);

  // Delete inline confirmation state
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);

  // New form inline state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState('');
  const [isCreatingLoading, setIsCreatingLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setEditingFormId(null);
        setDeletingFormId(null);
        setIsCreatingNew(false);
        setErrorMsg('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedForm = forms.find((f) => f.id === selectedFormId) || forms[0];

  // Actions
  const handleStartRename = (e: React.MouseEvent, form: FormItem) => {
    e.stopPropagation();
    setEditingFormId(form.id);
    setEditingTitle(form.title || form.titleDraft || 'Formulário sem título');
    setDeletingFormId(null);
    setErrorMsg('');
  };

  const handleSaveRename = async (e: React.MouseEvent, formId: string) => {
    e.stopPropagation();
    if (!editingTitle.trim()) return;
    setIsRenamingLoading(true);
    setErrorMsg('');
    try {
      await onRenameForm(formId, editingTitle.trim());
      setEditingFormId(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao renomear formulário');
    } finally {
      setIsRenamingLoading(false);
    }
  };

  const handleConfirmDelete = async (e: React.MouseEvent, formId: string) => {
    e.stopPropagation();
    setIsDeletingLoading(true);
    setErrorMsg('');
    try {
      await onDeleteForm(formId);
      setDeletingFormId(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao excluir formulário');
    } finally {
      setIsDeletingLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormTitle.trim()) return;
    setIsCreatingLoading(true);
    setErrorMsg('');
    try {
      await onCreateForm(newFormTitle.trim());
      setNewFormTitle('');
      setIsCreatingNew(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar formulário');
    } finally {
      setIsCreatingLoading(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 px-3.5 rounded-xl glass-md bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border border-[var(--surface-border)] hover:border-purple-500/50 flex items-center justify-between gap-3 text-xs font-bold text-slate-900 dark:text-white cursor-pointer transition-all shadow-lg shadow-black/5 group"
      >
        <div className="flex items-center gap-2 truncate">
          <FileText className="w-4 h-4 text-purple-500 shrink-0" />
          <span className="truncate">
            {selectedForm ? selectedForm.title || selectedForm.titleDraft : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 group-hover:text-purple-500 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-purple-500' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="nowheel absolute top-full left-0 mt-1.5 z-50 w-72 glass-md bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-[var(--surface-border)] rounded-2xl shadow-2xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 flex items-center justify-between border-b border-[var(--surface-border)] pb-1.5 mb-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Formulários do Workspace ({forms.length})
            </span>
          </div>

          {errorMsg && (
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[10px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
              <span className="truncate flex-1">{errorMsg}</span>
            </div>
          )}

          {/* Forms List */}
          <div className="nowheel max-h-56 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
            {forms.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">Nenhum formulário cadastrado</div>
            ) : (
              forms.map((f) => {
                const isSelected = f.id === selectedFormId;
                const isEditing = editingFormId === f.id;
                const isDeleting = deletingFormId === f.id;

                if (isEditing) {
                  return (
                    <div key={f.id} className="p-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-1">
                      <Input
                        type="text"
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(e as any, f.id);
                          if (e.key === 'Escape') setEditingFormId(null);
                        }}
                        className="brand-input text-xs h-7 flex-1"
                      />
                      <button
                        type="button"
                        onClick={(e) => handleSaveRename(e, f.id)}
                        disabled={isRenamingLoading}
                        className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white cursor-pointer transition-all shrink-0"
                        title="Salvar Nome"
                      >
                        {isRenamingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingFormId(null)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer transition-all shrink-0"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                if (isDeleting) {
                  return (
                    <div key={f.id} className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 space-y-1.5 animate-in fade-in duration-150">
                      <p className="text-[10px] text-red-600 dark:text-red-400 font-bold leading-tight">
                        Excluir &quot;{f.title || f.titleDraft}&quot;?
                      </p>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDeletingFormId(null)}
                          className="px-2 py-0.5 text-[10px] rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleConfirmDelete(e, f.id)}
                          disabled={isDeletingLoading}
                          className="px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-red-600 hover:bg-red-500 text-white flex items-center gap-1 cursor-pointer"
                        >
                          {isDeletingLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={f.id}
                    onClick={() => {
                      onSelectForm(f.id);
                      setIsOpen(false);
                    }}
                    className={`p-2 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-purple-600/15 border border-purple-500/40 font-bold text-purple-900 dark:text-purple-200'
                        : 'hover:bg-slate-100 dark:hover:bg-zinc-900 border border-transparent text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                      <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-purple-500' : 'text-slate-400'}`} />
                      <span className="truncate">{f.title || f.titleDraft}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-500 mr-1" />}
                      <button
                        type="button"
                        onClick={(e) => handleStartRename(e, f)}
                        className="p-1 rounded text-slate-400 hover:text-purple-500 hover:bg-purple-500/10 cursor-pointer transition-all"
                        title="Renomear Formulário"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {forms.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingFormId(f.id);
                            setEditingFormId(null);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-all"
                          title="Excluir Formulário"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Action: Criar Novo Formulário */}
          <div className="pt-1.5 border-t border-[var(--surface-border)]">
            {isCreatingNew ? (
              <form onSubmit={handleCreateSubmit} className="p-1 space-y-2">
                <Input
                  type="text"
                  autoFocus
                  placeholder="Nome do Novo Formulário..."
                  value={newFormTitle}
                  onChange={(e) => setNewFormTitle(e.target.value)}
                  className="brand-input text-xs h-8"
                />
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNew(false);
                      setNewFormTitle('');
                    }}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <Button
                    type="submit"
                    disabled={isCreatingLoading || !newFormTitle.trim()}
                    className="brand-accent text-[10px] font-bold h-7 px-3 flex items-center gap-1 border-none cursor-pointer"
                  >
                    {isCreatingLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    <span>Criar</span>
                  </Button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNew(true);
                  setNewFormTitle('');
                  setErrorMsg('');
                }}
                className="w-full p-2 rounded-xl border border-dashed border-purple-500/30 hover:border-purple-500 bg-purple-500/5 hover:bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar Novo Formulário</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
