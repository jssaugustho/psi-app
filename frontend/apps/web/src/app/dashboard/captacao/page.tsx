'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api, CapturePage } from '@/lib/api';
import { Card, Button, LoadingSpinner, ConfirmModal } from '@psi/ui';
import { Globe, Plus, Trash2, Edit, ExternalLink, Sparkles, AlertCircle, Copy, Loader2, Clock, ArrowRight, Edit3, X, ChevronRight } from 'lucide-react';
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
  const [drafts, setDrafts] = useState<any[]>([]);
  const [showDraftModal, setShowDraftModal] = useState(false);

  // Load all drafts from localStorage with legacy key migration
  const loadDrafts = useCallback(() => {
    if (typeof window === 'undefined') return;

    const tenantId = tenant?.id;
    const draftsStorageKey = tenantId ? `psi_page_drafts_${tenantId}` : 'psi_page_drafts_global';
    const legacyKey = tenantId ? `psi_page_creation_draft_${tenantId}` : 'psi_page_creation_draft_global';

    let draftsList: any[] = [];

    // 1. Read multi-draft key
    try {
      const raw = localStorage.getItem(draftsStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          draftsList = parsed;
        }
      }
    } catch {}

    // 2. Check legacy key for existing tenant
    try {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        if (legacyParsed && typeof legacyParsed === 'object') {
          const legacyId = legacyParsed.id || 'draft_legacy';
          if (!draftsList.some((d) => d.id === legacyId)) {
            const legacyDraft = {
              id: legacyId,
              tenantId: tenantId,
              updatedAt: legacyParsed.updatedAt || new Date().toISOString(),
              currentStep: legacyParsed.currentStep || 1,
              newTitle: legacyParsed.newTitle || 'Rascunho de Página',
              newLogoUrl: legacyParsed.newLogoUrl,
              newFaviconUrl: legacyParsed.newFaviconUrl,
              isCustomColor: legacyParsed.isCustomColor,
              selectedPaletteId: legacyParsed.selectedPaletteId,
              customPrimaryStart: legacyParsed.customPrimaryStart,
              customPrimaryEnd: legacyParsed.customPrimaryEnd,
              customContrast: legacyParsed.customContrast,
              fontHeading: legacyParsed.fontHeading,
              fontBody: legacyParsed.fontBody,
              domainMode: legacyParsed.domainMode,
              subdomainInput: legacyParsed.subdomainInput,
              customDomainInput: legacyParsed.customDomainInput,
              newSlug: legacyParsed.newSlug,
            };
            draftsList.unshift(legacyDraft);
            localStorage.setItem(draftsStorageKey, JSON.stringify(draftsList));
          }
        }
      }
    } catch {}

    // 3. Also check global legacy key
    try {
      const globalLegacy = localStorage.getItem('psi_page_creation_draft_global');
      if (globalLegacy) {
        const globalParsed = JSON.parse(globalLegacy);
        if (globalParsed && typeof globalParsed === 'object' && (globalParsed.newTitle || globalParsed.currentStep)) {
          const globalId = globalParsed.id || 'draft_legacy_global';
          if (!draftsList.some((d) => d.id === globalId)) {
            draftsList.unshift({
              ...globalParsed,
              id: globalId,
              updatedAt: globalParsed.updatedAt || new Date().toISOString(),
            });
            localStorage.setItem(draftsStorageKey, JSON.stringify(draftsList));
          }
        }
      }
    } catch {}

    setDrafts(draftsList);
  }, [tenant?.id]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const handleDeleteDraft = (draftId: string) => {
    if (typeof window === 'undefined') return;
    const tenantId = tenant?.id;
    const draftsStorageKey = tenantId ? `psi_page_drafts_${tenantId}` : 'psi_page_drafts_global';
    const legacyKey = tenantId ? `psi_page_creation_draft_${tenantId}` : 'psi_page_creation_draft_global';

    try {
      localStorage.removeItem(legacyKey);
      localStorage.removeItem('psi_page_creation_draft_global');

      const raw = localStorage.getItem(draftsStorageKey);
      let list: any[] = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list)) {
        list = list.filter((d) => d.id !== draftId);
        localStorage.setItem(draftsStorageKey, JSON.stringify(list));
        setDrafts(list);
      }
    } catch {}
  };

  const handleNewPageClick = () => {
    if (drafts.length > 0) {
      setShowDraftModal(true);
    } else {
      router.push('/dashboard/captacao/nova?fresh=true');
    }
  };

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
  const getPageProductionUrl = (page: CapturePage) => {
    if (!tenant) return '#';

    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'theraos.app';
    const domainHost = tenant.domain ? tenant.domain : `${tenant.slug}.${baseDomain}`;
    const pagePath = page.slug ? `/${page.slug}` : '/';

    return `https://${domainHost}${pagePath}`;
  };

  const getVerSiteUrl = (page: CapturePage) => {
    return getPageProductionUrl(page);
  };

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-md border border-[var(--surface-border)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[var(--brand-gradient-start)]">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Marketing & Captação</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Páginas de Captação</h1>
        </div>
        <div className="shrink-0 flex items-center gap-3">
          <Button
            type="button"
            onClick={handleNewPageClick}
            className="brand-accent text-xs font-bold uppercase h-10 px-4 flex items-center gap-2 cursor-pointer border-none shadow-md hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Nova Página
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Pages & Drafts List */}
      {pages.length === 0 && drafts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center space-y-4 glass-sm border border-dashed border-[var(--surface-border)]">
          <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-2xl text-slate-500 border border-[var(--surface-border)]">
            <Globe className="h-8 w-8 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="space-y-1.5 max-w-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Nenhuma Página Criada</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Crie sua primeira landing page de captação para começar a colher respostas de triagem de pacientes.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleNewPageClick}
            className="brand-accent text-xs font-bold uppercase h-10 px-5 flex items-center gap-2 cursor-pointer border-none shadow-md hover:brightness-110 active:scale-95 transition-all mt-2"
          >
            <Plus className="h-4 w-4" />
            Criar Primeira Página
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Rascunhos Exibidos no Mesmo Grid */}
          {drafts.map((draft) => (
            <Card
              key={draft.id}
              className="p-5 glass-sm border border-amber-500/30 bg-amber-500/5 transition-all flex flex-col justify-between min-h-[200px] shadow-sm hover:shadow-md"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="truncate flex-1">
                    <h3 className="text-lg text-slate-900 dark:text-white font-bold truncate mb-0.5">
                      {draft.newTitle?.trim() || 'Página Sem Título'}
                    </h3>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wider">
                      {draft.updatedAt ? `Salvo às ${new Date(draft.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Rascunho Em Andamento'}
                    </span>
                  </div>

                  {/* Status Badge: RASCUNHO */}
                  <span className="h-6 px-2.5 rounded-full text-[9px] font-bold uppercase transition-all flex items-center justify-center bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                    Rascunho
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-[var(--surface-border)]">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Progresso:</span>
                    <span className="font-bold text-[var(--brand-gradient-start)]">
                      Etapa {draft.currentStep || 1} de 4
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Tipografia:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                      {draft.fontHeading || 'Playfair Display'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Cores Definidas:</span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                        style={{ backgroundColor: draft.customPrimaryStart || '#CC8667' }}
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                        style={{ backgroundColor: draft.customPrimaryEnd || '#E6A88A' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-[var(--surface-border)]">
                {/* Botão Excluir Rascunho */}
                <button
                  type="button"
                  onClick={() => handleDeleteDraft(draft.id)}
                  className="p-2.5 rounded-xl text-red-500/90 dark:text-red-400/80 hover:text-red-600 dark:hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer active:scale-95 flex items-center justify-center h-9 w-9"
                  aria-label="Excluir Rascunho"
                  title="Excluir Rascunho"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                {/* Botão Continuar Rascunho */}
                <Link href={`/dashboard/captacao/nova?draftId=${draft.id}`} className="no-underline">
                  <button
                    type="button"
                    className="brand-accent cursor-pointer text-xs font-bold h-9 px-4 flex items-center gap-1.5 whitespace-nowrap rounded-xl border-none shadow-md hover:brightness-110 active:scale-95 transition-all"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Continuar Rascunho</span>
                  </button>
                </Link>
              </div>
            </Card>
          ))}
          {pages.map((page) => (
            <Card 
              key={page.id} 
              className={`p-5 glass-sm border transition-all flex flex-col justify-between min-h-[200px] ${
                page.isActive ? 'border-[var(--surface-border)] hover:border-slate-300 dark:hover:border-slate-700' : 'border-[var(--surface-border)] opacity-70'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="truncate flex-1">
                    <h3 className="text-lg text-slate-900 dark:text-white font-medium truncate mb-0.5">{page.title}</h3>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wider uppercase">/{page.slug}</span>
                  </div>
                  {/* Status Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(page.id, page.isActive)}
                    className={`h-6 px-2.5 rounded-full text-[9px] font-bold uppercase transition-all cursor-pointer ${
                      page.isActive 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                        : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-300 dark:border-zinc-700/50'
                    }`}
                  >
                    {page.isActive ? 'Ativa' : 'Pausada'}
                  </button>
                </div>
                <div className="space-y-2 pt-2 border-t border-[var(--surface-border)]">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Tipo de Página:</span>
                    <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${!page.slug ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                      {!page.slug ? 'Página Principal (Home)' : `/${page.slug}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Endereço Gratuito:</span>
                    <a
                      href={`https://${tenant?.slug}.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'theraos.app'}${page.slug ? `/${page.slug}` : '/'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--brand-gradient-start)] hover:underline flex items-center gap-1 font-mono text-[11px] truncate max-w-[200px]"
                    >
                      {tenant?.slug}.{process.env.NEXT_PUBLIC_BASE_DOMAIN || 'theraos.app'}{page.slug ? `/${page.slug}` : '/'}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>

                  {tenant?.domain && (
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Domínio Próprio:</span>
                      <a
                        href={`https://${tenant.domain}${page.slug ? `/${page.slug}` : '/'}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-500 dark:text-emerald-400 hover:underline flex items-center gap-1 font-mono text-[11px] truncate max-w-[200px]"
                      >
                        {tenant.domain}{page.slug ? `/${page.slug}` : '/'}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-[var(--surface-border)]">
                {/* Botão Excluir */}
                <div className="relative group inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => setPageToDelete({ id: page.id, title: page.title })}
                    className="p-2.5 rounded-xl text-red-500/90 dark:text-red-400/80 hover:text-red-600 dark:hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer active:scale-95 flex items-center justify-center h-9 w-9"
                    aria-label="Excluir Página"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none px-2.5 py-1 bg-slate-900 text-red-200 text-[10px] font-medium rounded-lg border border-red-500/20 shadow-xl whitespace-nowrap z-30">
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
                      className="p-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] hover:border-slate-400 dark:hover:border-white/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center h-9 w-9 disabled:opacity-50"
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
                          className="p-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] hover:border-slate-400 dark:hover:border-white/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center h-9 w-9"
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

      {/* Modal de Escolha / Lista de Rascunhos */}
      {showDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-[var(--surface-border)] rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl text-white animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Nova Página de Captação</h3>
                  <p className="text-xs text-slate-400">Escolha um rascunho salvo ou comece do zero.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDraftModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ação: Criar Nova do Zero */}
            <button
              type="button"
              onClick={() => {
                setShowDraftModal(false);
                router.push('/dashboard/captacao/nova?fresh=true');
              }}
              className="w-full p-4 rounded-xl border border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 font-bold text-xs flex items-center justify-between transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Plus className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-white">Criar Nova Página do Zero</span>
                  <span className="text-[11px] text-slate-400 font-normal">Iniciar com um modelo em branco sem rascunho</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Lista de Rascunhos Existentes */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Ou continue um rascunho em andamento ({drafts.length})
              </span>
              <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                {drafts.map((d) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="truncate flex-1">
                      <h4 className="text-xs font-bold text-white truncate">
                        {d.newTitle || 'Página Sem Título'}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="text-amber-400 font-semibold">Etapa {d.currentStep || 1} de 4</span>
                        <span>•</span>
                        <span>{new Date(d.updatedAt).toLocaleDateString()} às {new Date(d.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeleteDraft(d.id)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
                        title="Excluir Rascunho"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDraftModal(false);
                          router.push(`/dashboard/captacao/nova?draftId=${d.id}`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span>Continuar</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
