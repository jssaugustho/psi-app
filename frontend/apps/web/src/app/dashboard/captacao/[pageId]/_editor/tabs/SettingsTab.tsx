'use client';

import React, { useState } from 'react';
import { Input, Button, ConfirmModal } from '@psi/ui';
import { Settings, Globe, Trash2, Sparkles } from 'lucide-react';
import { ImageUploader } from '../components/ImageUploader';
import { CapturePage, api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface SettingsTabProps {
  page: CapturePage;
  onUpdatePage: (patch: Partial<CapturePage>) => void;
  tenant: any;
}

export function SettingsTab({ page, onUpdatePage, tenant }: SettingsTabProps) {
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const seo = page.seoConfig || {
    metaTitle: page.title || '',
    metaDescription: '',
    keywords: '',
    socialImage: '',
  };

  const handleSeoChange = (key: string, value: any) => {
    onUpdatePage({
      seoConfig: {
        ...seo,
        [key]: value,
      },
    });
  };

  const handleDeletePage = async () => {
    setDeleting(true);
    try {
      await api.deleteCapturePage(page.id);
      router.push('/dashboard/captacao');
    } catch (err: any) {
      alert('Erro ao excluir página: ' + (err.message || 'Ocorreu um erro.'));
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--surface-border)] pb-4">
        <div className="p-2.5 rounded-xl brand-accent text-white shadow-md">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Configurações Gerais da Página</h2>
          <p className="text-xs text-slate-500">Defina título, endereço (URL), dados de SEO e redes sociais.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identificação Básica */}
        <div className="glass-card p-5 rounded-2xl border border-[var(--surface-border)] space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[var(--brand-gradient-start)]" />
            Identificação & Endereço
          </h3>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Título da Página</label>
              <Input
                type="text"
                value={page.title || ''}
                onChange={(e) => onUpdatePage({ title: e.target.value })}
                placeholder="Ex: Psicologia Clínica - Atendimento Presencial"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Slug na URL (Caminho)</label>
              <div className="flex items-center gap-1 text-xs font-mono glass-sm p-2 rounded-xl border border-[var(--surface-border)]">
                <span className="text-slate-400">/</span>
                <input
                  type="text"
                  value={page.slug || ''}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '');
                    onUpdatePage({ slug: val });
                  }}
                  className="bg-transparent border-none outline-none font-mono text-slate-900 dark:text-white flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SEO & Redes Sociais */}
        <div className="glass-card p-5 rounded-2xl border border-[var(--surface-border)] space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--brand-gradient-start)]" />
            SEO & Compartilhamento Social
          </h3>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Meta Título (Google)</label>
              <Input
                type="text"
                value={seo.metaTitle || ''}
                onChange={(e) => handleSeoChange('metaTitle', e.target.value)}
                placeholder="Título exibido nas buscas..."
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Meta Descrição</label>
              <textarea
                rows={3}
                value={seo.metaDescription || ''}
                onChange={(e) => handleSeoChange('metaDescription', e.target.value)}
                placeholder="Resumo exibido abaixo do título no Google..."
                className="w-full text-xs p-2.5 rounded-xl border border-[var(--surface-border)] bg-transparent text-slate-900 dark:text-white outline-none resize-none"
              />
            </div>

            <ImageUploader
              label="Imagem de Capa (Social Share / OG Image)"
              value={seo.socialImage || ''}
              onChange={(url) => handleSeoChange('socialImage', url)}
              tenantId={page.tenantId}
              aspectRatio={1200 / 630}
              targetWidth={1200}
              targetHeight={630}
            />
          </div>
        </div>

        {/* Zona de Perigo - Exclusão */}
        <div className="glass-card p-5 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Excluir esta Página
              </h3>
              <p className="text-xs text-slate-500">
                Uma vez excluída, esta página deixará de estar acessível no seu endereço web.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalOpen(true)}
              className="text-xs text-red-600 border-red-500/30 hover:bg-red-500/10 cursor-pointer"
            >
              Excluir Página
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeletePage}
        title="Tem certeza que deseja excluir esta página?"
        description="Esta ação não pode ser desfeita e a página será despublicada imediatamente."
        confirmText="Sim, Excluir"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
