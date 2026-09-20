'use client';

import React, { useState } from 'react';
import { CapturePage } from '@/lib/api';
import { CanvasData } from '../types';
import { X, Rocket, Globe, CheckCircle2, AlertTriangle, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '@psi/ui';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  page: CapturePage;
  canvasData: CanvasData | null;
  onPublish: () => Promise<void>;
  isPublishing: boolean;
}

export function PublishModal({
  isOpen,
  onClose,
  page,
  canvasData,
  onPublish,
  isPublishing,
}: PublishModalProps) {
  const [published, setPublished] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setPublished(false);
      setPublishError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Resolve URL do Site Público
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'theraos.app';
  const tenantSlug =
    page?.tenantSlug ||
    (page as any)?.workspace_domains?.[0]?.subdomain ||
    (page as any)?.tenants?.workspace_domains?.[0]?.subdomain ||
    (page as any)?.tenants?.slug ||
    'jose-augustho';
  const rawSlug = page?.slug || '';
  const pageSlug = (rawSlug === '_root_' || rawSlug === 'root') ? '' : rawSlug;
  const path = pageSlug ? `/${pageSlug}` : '';

  let publicUrl = '';
  if (isLocal) {
    publicUrl = `http://localhost:3005/p/${tenantSlug}${path}`;
  } else {
    const domain = (page as any)?.customDomain || `${tenantSlug}.${baseDomain}`;
    publicUrl = `https://${domain}${path}`;
  }

  // Pré-Validação de Segurança
  const validationErrors: string[] = [];
  if (!canvasData || !canvasData.sections || canvasData.sections.length === 0) {
    validationErrors.push('A página deve conter pelo menos uma seção ativa.');
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPublish = async () => {
    setPublishError(null);
    try {
      await onPublish();
      setPublished(true);
    } catch (err: any) {
      console.error('❌ Erro ao publicar página:', err);
      setPublishError(err.message || 'Falha ao publicar a página. Tente novamente.');
    }
  };

  const formattedLastPublish = page.publishedAt
    ? new Date(page.publishedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Nunca publicado';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card max-w-lg w-full rounded-2xl border border-[var(--surface-border)] shadow-2xl overflow-hidden flex flex-col bg-[var(--surface-base)] text-slate-900 dark:text-white">
        {/* Header do Modal */}
        <div className="p-5 border-b border-[var(--surface-border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] border border-[var(--brand-gradient-start)]/20">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {published ? 'Site Publicado ao Vivo!' : 'Publicar Alterações no Site'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {published
                  ? 'Suas alterações já estão visíveis para todos os visitantes.'
                  : 'Seu rascunho será promovido para o site público ao vivo.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 space-y-4 flex-1">
          {published ? (
            /* Tela de Sucesso */
            <div className="space-y-4 text-center py-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Publicação Concluída 🎉</h4>
                <p className="text-xs text-slate-500">
                  O conteúdo do rascunho foi gravado em produção e os servidores foram sincronizados.
                </p>
              </div>

              {/* Caixa da URL */}
              <div className="glass-sm p-3 rounded-xl border border-[var(--surface-border)] flex items-center justify-between gap-2 text-left">
                <div className="flex items-center gap-2 min-w-0">
                  <Globe className="w-4 h-4 text-[var(--brand-gradient-start)] shrink-0" />
                  <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                    {publicUrl}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-slate-500 text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          ) : (
            /* Tela de Confirmação & Pré-Flight */
            <>
              {/* Alerta de Validação se houver erros */}
              {validationErrors.length > 0 && (
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Atenção antes de publicar:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {publishError && (
                <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 text-xs font-semibold">
                  {publishError}
                </div>
              )}

              {/* Detalhes do Staging */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs p-3 glass-sm rounded-xl border border-[var(--surface-border)]">
                  <span className="text-slate-500 font-medium">Status Atual</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Rascunho Editado
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs p-3 glass-sm rounded-xl border border-[var(--surface-border)]">
                  <span className="text-slate-500 font-medium">Última Publicação</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                    {formattedLastPublish}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Endereço Público do Site
                  </label>
                  <div className="glass-sm p-3 rounded-xl border border-[var(--surface-border)] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe className="w-4 h-4 text-[var(--brand-gradient-start)] shrink-0" />
                      <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                        {publicUrl}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 border-t border-[var(--surface-border)] flex items-center justify-end gap-2.5 glass-sm">
          {published ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                Voltar ao Editor
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl brand-accent text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:brightness-110"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Acessar Site Publicado ↗
              </a>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <Button
                type="button"
                onClick={handleConfirmPublish}
                disabled={isPublishing || validationErrors.length > 0}
                className="brand-accent text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Rocket className={`w-3.5 h-3.5 ${isPublishing ? 'animate-bounce' : ''}`} />
                {isPublishing ? 'Publicando...' : '🚀 Confirmar e Publicar Agora'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
