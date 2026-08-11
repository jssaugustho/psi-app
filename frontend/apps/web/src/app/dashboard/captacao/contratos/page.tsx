'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api, ContractTemplate } from '@/lib/api';
import { Card, Button, Input, BrandModal } from '@psi/ui';
import { FileText, Plus, Trash2, Edit, ArrowLeft, AlertCircle, Save } from 'lucide-react';
import Link from 'next/link';

export default function ContratosPage() {
  const { user } = useAuth();
  const { tenant } = useBrand();

  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal and Editor states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.getContractTemplates(tenant.id);
      setTemplates(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar modelos de contrato.');
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    if (tenant) {
      loadTemplates();
    }
  }, [tenant, loadTemplates]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tpl: ContractTemplate) => {
    setEditingId(tpl.id);
    setTitle(tpl.title);
    setContent(tpl.content);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !tenant) return;

    setSubmitting(true);
    setError('');
    try {
      if (editingId) {
        // Edit existing
        const updated = await api.updateContractTemplate(editingId, { title, content });
        setTemplates(prev => prev.map(t => t.id === editingId ? updated : t));
      } else {
        // Create new
        const created = await api.createContractTemplate({
          tenant_id: tenant.id,
          title: title.trim(),
          content: content.trim(),
        });
        setTemplates(prev => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar o contrato.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o modelo de contrato "${name}"?`)) {
      return;
    }

    try {
      await api.deleteContractTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir contrato: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header Banner */}
      <div className="flex items-center justify-between p-6 rounded-2xl glass-md">
        <div className="space-y-1.5">
          <Link href="/dashboard/captacao" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors decoration-0">
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para Captação
          </Link>
          <div className="flex items-center gap-2 text-[var(--brand-gradient-start)]">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Modelos Legais</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Contratos Clínicos</h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Cadastre as minutas dos seus termos de consentimento terapêutico ou contratos. Você poderá associar estes documentos às etapas de aceite nos formulários de triagem.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="brand-accent text-xs font-bold uppercase h-10 px-4 flex items-center gap-2 cursor-pointer border-none"
        >
          <Plus className="h-4 w-4" />
          Novo Contrato
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Contract List */}
      {templates.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center space-y-6 glass-sm border-dashed">
          <div className="h-16 w-16 rounded-full bg-slate-900 flex items-center justify-center text-2xl text-slate-500 border border-white/5">
            <FileText className="h-8 w-8" />
          </div>
          <div className="space-y-1.5 max-w-xs">
            <h3 className="text-base font-bold text-white">Nenhum Contrato Cadastrado</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Adicione minutas de contrato clínico personalizados (ex: TCC Adulto, Infantil) para coletar assinaturas eletrônicas.
            </p>
          </div>
          <Button
            onClick={handleOpenCreate}
            className="brand-accent text-xs font-semibold h-10 px-6 cursor-pointer border-none"
          >
            Cadastrar Primeiro Contrato
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tpl) => (
            <Card 
              key={tpl.id}
              className="p-5 glass-sm border border-white/10 hover:border-slate-800 transition-all flex flex-col justify-between min-h-[160px]"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="truncate flex-1">
                    <h3 className="text-base text-white font-medium truncate">{tpl.title}</h3>
                    <span className="text-[9px] text-slate-500 font-mono block pt-0.5">Criado em {new Date(tpl.createdAt).toLocaleDateString()}</span>
                  </div>
                  <FileText className="h-5 w-5 text-slate-500 shrink-0" />
                </div>
                <p className="text-xs text-slate-400 line-clamp-3 font-light leading-relaxed">
                  {tpl.content}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5 mt-4">
                <button
                  onClick={() => handleDelete(tpl.id, tpl.title)}
                  className="p-2 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-colors cursor-pointer"
                  title="Excluir Contrato"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <Button 
                  onClick={() => handleOpenEdit(tpl)}
                  variant="secondary" 
                  className="cursor-pointer text-xs h-9 px-3 flex items-center gap-1.5"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Editar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <BrandModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setError(''); }}
        maxWidth="max-w-2xl"
      >
        <h3 className="text-lg font-bold text-white mb-1.5">
          {editingId ? 'Editar Contrato Clínico' : 'Novo Contrato Clínico'}
        </h3>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Escreva os termos do contrato clínico. O texto será exibido para aceite do paciente no formulário de triagem.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nome Identificador</label>
                <Input
                  type="text"
                  required
                  placeholder="Ex: Contrato de Psicoterapia - TCC Adulto"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="brand-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conteúdo do Contrato</label>
                <textarea
                  required
                  rows={10}
                  placeholder="Escreva os termos do seu contrato aqui..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full text-sm p-3 bg-zinc-900 rounded-xl border border-zinc-700 focus:border-[#CC8667] outline-none text-foreground placeholder:text-muted-foreground/35 transition-colors resize-y min-h-[150px]"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setIsModalOpen(false); setError(''); }}
                  className="cursor-pointer text-xs h-10 px-4"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="brand-accent text-xs font-semibold h-10 px-5 cursor-pointer border-none flex items-center gap-1.5"
                >
                  <Save className="h-4 w-4" />
                  {submitting ? 'Salvando...' : 'Salvar Contrato'}
                </Button>
              </div>
            </form>
      </BrandModal>
    </div>
  );
}

// Simple placeholder fallback helper for compilation since LoadingSpinner type is resolved correctly
const LoadingSpinner = ({ size = 'md' }) => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CC8667]" />
);
