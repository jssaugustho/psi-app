'use client';

import React from 'react';
import { Target, MessageCircle, Link as LinkIcon, FileText } from 'lucide-react';
import { FormManagerSelect } from '@/components/FormManagerSelect';
import { FormDestinationSettings } from '@/components/form-builder/FormDestinationSettings';
import { CapturePage } from '@/lib/api';

interface DestinationTabProps {
  page: CapturePage;
  onUpdatePage: (patch: Partial<CapturePage>) => void;
  availableForms: any[];
  tenantId: string;
  onFormSelect: (formId: string) => void;
  onCreateForm: (title: string) => Promise<void>;
  onRenameForm: (formId: string, newTitle: string) => Promise<void>;
  onDeleteForm: (formId: string) => Promise<void>;
}

export function DestinationTab({
  page,
  onUpdatePage,
  availableForms,
  tenantId,
  onFormSelect,
  onCreateForm,
  onRenameForm,
  onDeleteForm,
}: DestinationTabProps) {
  const ctaType = page.ctaType || 'form';

  const handleCtaTypeChange = (newType: 'form' | 'whatsapp' | 'external_url') => {
    onUpdatePage({
      ctaType: newType,
      formId: newType === 'form' ? page.formId || availableForms[0]?.id : null,
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--surface-border)] pb-4">
        <div className="p-2.5 rounded-xl brand-accent text-white shadow-md">
          <Target className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Destino do Botão CTA Principal</h2>
          <p className="text-xs text-slate-500">Escolha para onde o paciente será direcionado ao clicar nos botões de chamada para ação.</p>
        </div>
      </div>

      {/* Seleção do Tipo de Destino (Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => handleCtaTypeChange('form')}
          className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
            ctaType === 'form'
              ? 'border-[var(--brand-gradient-start)] ring-2 ring-[var(--brand-gradient-start)]/20 glass-md'
              : 'border-[var(--surface-border)] glass-sm hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
            {ctaType === 'form' && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full brand-accent text-white">
                Ativo
              </span>
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Formulário de Triagem</h3>
            <p className="text-[10px] text-slate-500 mt-1">Abre modal interativo para coletar dados do paciente no seu CRM.</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleCtaTypeChange('whatsapp')}
          className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
            ctaType === 'whatsapp'
              ? 'border-[var(--brand-gradient-start)] ring-2 ring-[var(--brand-gradient-start)]/20 glass-md'
              : 'border-[var(--surface-border)] glass-sm hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            {ctaType === 'whatsapp' && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full brand-accent text-white">
                Ativo
              </span>
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">WhatsApp Direto</h3>
            <p className="text-[10px] text-slate-500 mt-1">Redireciona o visitante diretamente para conversa no seu WhatsApp.</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleCtaTypeChange('external_url')}
          className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
            ctaType === 'external_url'
              ? 'border-[var(--brand-gradient-start)] ring-2 ring-[var(--brand-gradient-start)]/20 glass-md'
              : 'border-[var(--surface-border)] glass-sm hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <LinkIcon className="w-5 h-5" />
            </div>
            {ctaType === 'external_url' && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full brand-accent text-white">
                Ativo
              </span>
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Link Externo</h3>
            <p className="text-[10px] text-slate-500 mt-1">Redireciona para um link externo (Calendly, Google Forms, etc).</p>
          </div>
        </button>
      </div>

      {/* Conteúdo Contextual do Destino */}
      {ctaType === 'form' ? (
        <div className="glass-card p-5 rounded-2xl border border-[var(--surface-border)] space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Formulário Vinculado à Página
          </h3>

          <FormManagerSelect
            forms={availableForms}
            selectedFormId={page.formId || null}
            onSelectForm={onFormSelect}
            onCreateForm={onCreateForm}
            onRenameForm={onRenameForm}
            onDeleteForm={onDeleteForm}
          />
        </div>
      ) : (
        <div className="glass-card p-5 rounded-2xl border border-[var(--surface-border)] space-y-4">
          <FormDestinationSettings
            ctaType={ctaType}
            setCtaType={handleCtaTypeChange}
            ctaWhatsappMessage={page.ctaWhatsappMessage || ''}
            setCtaWhatsappMessage={(msg: string) => onUpdatePage({ ctaWhatsappMessage: msg })}
            ctaExternalUrl={page.ctaExternalUrl || ''}
            setCtaExternalUrl={(url: string) => onUpdatePage({ ctaExternalUrl: url })}
            whatsappMessageTemplate={page.ctaWhatsappMessage || ''}
            setWhatsappMessageTemplate={(msg: string) => onUpdatePage({ ctaWhatsappMessage: msg })}
          />
        </div>
      )}
    </div>
  );
}
