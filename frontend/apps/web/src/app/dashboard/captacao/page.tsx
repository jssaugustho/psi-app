'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api, CapturePage } from '@/lib/api';
import { Card, Button, LoadingSpinner, ConfirmModal } from '@psi/ui';
import { Globe, Plus, Trash2, Edit, ExternalLink, Sparkles, AlertCircle, Copy, Loader2 } from 'lucide-react';
import { Link } from '@/components/Link';

export default function CaptacaoPage() {
  const { tenant } = useBrand();
  const router = useRouter();

  const [pages, setPages] = useState<CapturePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [pageToDelete, setPageToDelete] = useState<{ id: string; title: string } | null>(null);
  const [verifiedDomains, setVerifiedDomains] = useState<Record<string, boolean>>({});
  const [isTenantDomainActive, setIsTenantDomainActive] = useState(false);

  const loadPages = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.getCapturePages(tenant.id);
      setPages(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar as páginas de captação.');
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    if (tenant) {
      loadPages();
    }
  }, [tenant, loadPages]);

  // Helper to check if a domain is active/reachable via Cloudflare backend API
  const checkDomainActive = useCallback(async (domain: string): Promise<boolean> => {
    try {
      const res = await api.verifyCustomHostname(domain);
      if (res.sslActive || res.status === 'active') return true;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      await fetch(`https://${domain}`, { mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Check tenant custom domain active status in production
  useEffect(() => {
    if (tenant?.domain) {
      const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      if (!isLocal) {
        checkDomainActive(tenant.domain).then((active) => {
          setIsTenantDomainActive(active);
        });
      }
    }
  }, [tenant, checkDomainActive]);

  // Check pages custom domains active status in production
  useEffect(() => {
    if (pages.length > 0) {
      const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      if (!isLocal) {
        pages.forEach((page) => {
          if (page.customDomain) {
            checkDomainActive(page.customDomain).then((active) => {
              setVerifiedDomains((prev) => ({ ...prev, [page.customDomain!]: active }));
            });
          }
        });
      }
    }
  }, [pages, checkDomainActive]);

  // Explicit Duplicate Page Action (carries over EVERYTHING including photos, sections, texts)
  const handleDuplicatePage = async (sourcePage: CapturePage) => {
    setDuplicatingId(sourcePage.id);
    setError('');
    try {
      const newTitle = `${sourcePage.title} (Cópia)`;
      const baseSlug = `${sourcePage.slug}-copia`;
      const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

      const res = await api.createCapturePage({
        title: newTitle,
        slug: uniqueSlug,
        tenantId: tenant?.id,
        crp: sourcePage.crp || sourcePage.siteConfig?.professional?.crp || undefined,
        logoText: sourcePage.logoText || sourcePage.siteConfig?.logoConfig?.text || newTitle,
        primaryStart: sourcePage.primaryStart || sourcePage.siteConfig?.theme?.colors?.primaryStart || '#CC8667',
        primaryEnd: sourcePage.primaryEnd || sourcePage.siteConfig?.theme?.colors?.primaryEnd || '#AA5533',
        contrast: sourcePage.contrast || sourcePage.siteConfig?.theme?.colors?.contrast || '#FFFFFF',
        logoUrl: sourcePage.logoUrl || sourcePage.siteConfig?.logoUrl || undefined,
        faviconUrl: sourcePage.faviconUrl || sourcePage.siteConfig?.faviconUrl || undefined,
        seoConfig: sourcePage.seoConfig,
        siteConfig: sourcePage.siteConfig,
        dictionary: sourcePage.dictionary,
        formFlow: sourcePage.formFlow,
      });

      if (res.success && res.page?.id) {
        await api.updateCapturePage(res.page.id, {
          siteConfig: sourcePage.siteConfig,
          siteConfigDraft: sourcePage.siteConfig,
          dictionary: sourcePage.dictionary,
          dictionaryDraft: sourcePage.dictionary,
          formFlow: sourcePage.formFlow,
          formFlowDraft: sourcePage.formFlow,
          seoConfig: sourcePage.seoConfig,
          seoConfigDraft: sourcePage.seoConfig,
        });

        // Redirect directly to duplicated page in editor
        router.push(`/dashboard/captacao/${res.page.id}`);
      }
    } catch (err: any) {
      alert('Erro ao duplicar página: ' + (err.message || 'Falha ao duplicar página.'));
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleToggleActive = async (id: string, currentVal: boolean) => {
    try {
      const updated = await api.updateCapturePage(id, { isActive: !currentVal });
      setPages(prev => prev.map(p => p.id === id ? { ...p, isActive: updated.isActive } : p));
    } catch (err: any) {
      alert('Falha ao alternar status da página: ' + err.message);
    }
  };

  const handleDeletePage = async (id: string) => {
    try {
      await api.deleteCapturePage(id);
      setPages(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      setError('Erro ao excluir página: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Paths resolve helpers
  const getPageLocalUrl = (slug: string) => {
    if (!tenant) return '#';
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    if (isLocal) {
      return `http://localhost:3002/p/${tenant.slug}/${slug}`;
    }
    return `https://sites.psiapp.com.br/p/${tenant.slug}/${slug}`;
  };

  const getPageProductionUrl = (page: CapturePage) => {
    if (!tenant) return '#';

    // 1. If page custom domain is set and active, use it
    if (page.customDomain && verifiedDomains[page.customDomain]) {
      return `https://${page.customDomain}`;
    }

    // 2. If tenant domain is set and active, use it
    if (tenant.domain && isTenantDomainActive) {
      return `https://${tenant.domain}/p/${tenant.slug}/${page.slug}`;
    }

    // 3. Fallback to platform default domain
    return `https://sites.psiapp.com.br/p/${tenant.slug}/${page.slug}`;
  };

  const getVerSiteUrl = (page: CapturePage) => {
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    if (isLocal) {
      return getPageLocalUrl(page.slug);
    }
    return page.customDomain ? getPageProductionUrl(page) : getPageLocalUrl(page.slug);
  };

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[var(--brand-gradient-start)]">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Marketing & Captação</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Páginas de Captação</h1>
        </div>
        <div className="shrink-0 flex items-center gap-3">
          <Link href="/dashboard/captacao/nova" className="no-underline">
            <Button
              type="button"
              className="brand-accent text-xs font-bold uppercase h-10 px-4 flex items-center gap-2 cursor-pointer border-none shadow-md hover:brightness-110 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              Nova Página
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Pages List */}
      {pages.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center space-y-4 glass-sm border-dashed">
          <div className="h-16 w-16 rounded-full bg-slate-900 flex items-center justify-center text-2xl text-slate-500 border border-white/5">
            <Globe className="h-8 w-8" />
          </div>
          <div className="space-y-1.5 max-w-xs">
            <h3 className="text-base font-bold text-white">Nenhuma Página Criada</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Crie sua primeira landing page de captação para começar a colher respostas de triagem de pacientes.
            </p>
          </div>
          <Link href="/dashboard/captacao/nova" className="no-underline pt-2">
            <Button
              type="button"
              className="brand-accent text-xs font-bold uppercase h-10 px-5 flex items-center gap-2 cursor-pointer border-none shadow-md hover:brightness-110 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              Criar Primeira Página
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pages.map((page) => (
            <Card 
              key={page.id} 
              className={`p-5 glass-sm border hover:border-slate-800 transition-all flex flex-col justify-between min-h-[200px] ${
                page.isActive ? 'border-white/10' : 'border-white/5 opacity-70'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="truncate flex-1">
                    <h3 className="text-lg text-white font-medium truncate mb-0.5">{page.title}</h3>
                    <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">/{page.slug}</span>
                  </div>
                  {/* Status Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(page.id, page.isActive)}
                    className={`h-6 px-2.5 rounded-full text-[9px] font-bold uppercase transition-all cursor-pointer ${
                      page.isActive 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'
                    }`}
                  >
                    {page.isActive ? 'Ativa' : 'Pausada'}
                  </button>
                </div>

                <div className="space-y-2 border-t border-white/5 pt-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Domínio:</span>
                    <span className="font-semibold text-white max-w-[150px] truncate">
                      {page.customDomain || 'Sem domínio próprio'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Local Teste:</span>
                    <a
                      href={getPageLocalUrl(page.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--brand-gradient-start)] hover:underline flex items-center gap-1 font-mono text-[10px] truncate max-w-[180px]"
                    >
                      /p/{tenant?.slug}/{page.slug}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-white/5">
                {/* Botão Excluir */}
                <div className="relative group inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => setPageToDelete({ id: page.id, title: page.title })}
                    className="p-2.5 rounded-xl text-red-400/80 hover:text-red-400 bg-red-500/5 hover:bg-red-500/15 border border-red-500/10 hover:border-red-500/30 transition-all cursor-pointer active:scale-95 flex items-center justify-center h-9 w-9"
                    aria-label="Excluir Página"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none px-2.5 py-1 bg-slate-900 text-red-300 text-[10px] font-medium rounded-lg border border-red-500/20 shadow-xl whitespace-nowrap z-30">
                    Excluir Página
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-red-500/20 rotate-45" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Botão Duplicar */}
                  <div className="relative group inline-flex items-center">
                    <button
                      type="button"
                      disabled={duplicatingId === page.id}
                      onClick={() => handleDuplicatePage(page)}
                      className="p-2.5 rounded-xl text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 border border-white/10 hover:border-white/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center h-9 w-9 disabled:opacity-50"
                      aria-label="Duplicar Página"
                    >
                      {duplicatingId === page.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-gradient-start)]" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none px-2.5 py-1 bg-slate-900 text-slate-200 text-[10px] font-medium rounded-lg border border-white/10 shadow-xl whitespace-nowrap z-30">
                      {duplicatingId === page.id ? 'Duplicando...' : 'Duplicar Página'}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-white/10 rotate-45" />
                    </div>
                  </div>

                  {/* Botão Ver Site */}
                  {page.isActive && (
                    <div className="relative group inline-flex items-center">
                      <a
                        href={getVerSiteUrl(page)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="no-underline"
                      >
                        <button
                          type="button"
                          className="p-2.5 rounded-xl text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 border border-white/10 hover:border-white/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center h-9 w-9"
                          aria-label="Ver Site"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </a>
                      <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none px-2.5 py-1 bg-slate-900 text-slate-200 text-[10px] font-medium rounded-lg border border-white/10 shadow-xl whitespace-nowrap z-30">
                        Ver Site
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-white/10 rotate-45" />
                      </div>
                    </div>
                  )}

                  {/* Botão Editar */}
                  <Link href={`/dashboard/captacao/${page.id}`} className="no-underline">
                    <button
                      type="button"
                      className="brand-accent cursor-pointer text-xs font-bold h-9 px-4 flex items-center gap-1.5 whitespace-nowrap rounded-xl border-none shadow-md hover:brightness-110 active:scale-95 transition-all"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Editar Página</span>
                    </button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!pageToDelete}
        onClose={() => setPageToDelete(null)}
        onConfirm={async () => {
          if (pageToDelete) {
            await handleDeletePage(pageToDelete.id);
            setPageToDelete(null);
          }
        }}
        title="Excluir Página de Captação"
        description={`Tem certeza que deseja excluir permanentemente a página "${pageToDelete?.title || ''}"? Todas as respostas e configurações serão perdidas.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}
