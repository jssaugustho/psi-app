'use client';

import React from 'react';
import { Card, Button, Input } from '@psi/ui';
import { Sparkles, MessageSquare, Globe, FileText, Check, ArrowRight } from 'lucide-react';

export interface FormDestinationSettingsProps {
  ctaType: 'form' | 'whatsapp' | 'external_url';
  setCtaType: (type: 'form' | 'whatsapp' | 'external_url') => void;
  ctaWhatsappMessage: string;
  setCtaWhatsappMessage: (val: string) => void;
  ctaExternalUrl: string;
  setCtaExternalUrl: (val: string) => void;
  whatsappMessageTemplate: string;
  setWhatsappMessageTemplate: (val: string) => void;
  onConfirm?: () => void;
  confirmButtonText?: string;
  showConfirmButton?: boolean;
}

export function FormDestinationSettings({
  ctaType,
  setCtaType,
  ctaWhatsappMessage,
  setCtaWhatsappMessage,
  ctaExternalUrl,
  setCtaExternalUrl,
  whatsappMessageTemplate,
  setWhatsappMessageTemplate,
  onConfirm,
  confirmButtonText = 'Confirmar Configurações de Destino',
  showConfirmButton = false,
}: FormDestinationSettingsProps) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 🎯 DESTINO DO BOTÃO PRINCIPAL (CTA) */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            🎯 Destino do Botão Principal (CTA)
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Escolha a ação acionada quando o paciente clica no botão principal do site.
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider block">
            O que acontece quando o paciente clica no CTA do site?
          </label>

          <div className="grid grid-cols-1 gap-3">
            {/* Opção 1: Formulário de Triagem Interno */}
            <button
              type="button"
              onClick={() => setCtaType('form')}
              className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                (ctaType || 'form') === 'form'
                  ? 'border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/30'
                  : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/60'
              }`}
            >
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Formulário de Triagem Interno
                  </div>
                  {ctaType === 'form' && <Check className="w-4 h-4 text-violet-500" />}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Abre o modal de triagem e captação de dados clínica.
                </div>
              </div>
            </button>

            {/* Opção 2: Conversa Direta no WhatsApp */}
            <button
              type="button"
              onClick={() => setCtaType('whatsapp')}
              className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                ctaType === 'whatsapp'
                  ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                  : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/60'
              }`}
            >
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Conversa Direta no WhatsApp
                  </div>
                  {ctaType === 'whatsapp' && <Check className="w-4 h-4 text-emerald-500" />}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Redireciona o paciente direto para o seu WhatsApp de atendimento.
                </div>
              </div>
            </button>

            {/* Opção 3: Link / URL Externa */}
            <button
              type="button"
              onClick={() => setCtaType('external_url')}
              className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                ctaType === 'external_url'
                  ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                  : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/60'
              }`}
            >
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Link / URL Externa
                  </div>
                  {ctaType === 'external_url' && <Check className="w-4 h-4 text-blue-500" />}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Redireciona para um sistema de agendamento (Calendly, Google Forms, etc.).
                </div>
              </div>
            </button>
          </div>

          {/* Condicional WhatsApp */}
          {ctaType === 'whatsapp' && (
            <div className="space-y-1.5 pt-2 animate-in fade-in duration-200">
              <label className="text-xs text-slate-700 dark:text-zinc-300 font-semibold uppercase tracking-wider block">
                Mensagem Inicial do WhatsApp
              </label>
              <textarea
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-emerald-500 transition-colors resize-y min-h-[68px]"
                placeholder="Ex: Olá! Vim pelo seu site e gostaria de agendar uma consulta."
                value={ctaWhatsappMessage || ''}
                onChange={(e) => setCtaWhatsappMessage(e.target.value)}
              />
            </div>
          )}

          {/* Condicional URL Externa */}
          {ctaType === 'external_url' && (
            <div className="space-y-1.5 pt-2 animate-in fade-in duration-200">
              <label className="text-xs text-slate-700 dark:text-zinc-300 font-semibold uppercase tracking-wider block">
                Link Externo de Destino
              </label>
              <Input
                type="text"
                className="font-mono text-xs"
                placeholder="https://calendly.com/sua-agenda"
                value={ctaExternalUrl || ''}
                onChange={(e) => setCtaExternalUrl(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* 💬 REDIRECIONAMENTO PÓS-TRIAGEM */}
      <div className="pt-6 border-t border-slate-200 dark:border-zinc-800 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            💬 Redirecionamento Pós-Triagem
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Mensagem enviada automaticamente pelo paciente ao finalizar o preenchimento da triagem.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-slate-700 dark:text-zinc-300 font-semibold uppercase tracking-wider block">
            Mensagem Padrão WhatsApp
          </label>
          <textarea
            rows={3}
            className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 outline-none focus:border-violet-500 transition-colors resize-y min-h-[72px]"
            placeholder="Olá! Preenchi a triagem inicial pelo seu site e gostaria de agendar minha sessão. Meu nome é {{nome}}."
            value={whatsappMessageTemplate || ''}
            onChange={(e) => setWhatsappMessageTemplate(e.target.value)}
          />
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 pt-0.5 leading-relaxed">
            Você pode usar o marcador <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-violet-600 dark:text-violet-400 font-mono font-bold text-[11px]">{"{{nome}}"}</code> para inserir dinamicamente a resposta digitada pelo paciente.
          </p>
        </div>
      </div>

      {showConfirmButton && onConfirm && (
        <div className="pt-4 flex justify-end">
          <Button
            type="button"
            onClick={onConfirm}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <span>{confirmButtonText}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
