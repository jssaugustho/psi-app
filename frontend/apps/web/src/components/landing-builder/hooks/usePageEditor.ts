'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, Workspace } from '@/lib/api';
import { useBrand } from '@/context/BrandContext';
import { getWorkspaceVisualIdentity } from '@/lib/visual-identity';

export interface LandingPageData {
  id?: string;
  workspaceId: string;
  title: string;
  slug: string;
  description?: string | null;
  customDomain?: string | null;
  isPublished?: boolean;
  publishedAt?: string | null;
  sections?: any[];
  themeConfig?: any;
  seoConfig?: any;
  draftData?: any;
}

export function usePageEditor(pageId?: string, isNewPage?: boolean) {
  const router = useRouter();
  const { tenant: activeWorkspace } = useBrand();
  const visualIdentity = getWorkspaceVisualIdentity(activeWorkspace);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState<LandingPageData | null>(null);
  const [activeTab, setActiveTab] = useState<'secoes' | 'tema' | 'seo' | 'dominio'>('secoes');
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'mobile'>('desktop');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carregar página existente ou inicializar nova
  useEffect(() => {
    async function loadPage() {
      if (isNewPage) {
        setPage({
          workspaceId: activeWorkspace?.id || '',
          title: 'Minha Landing Page',
          slug: 'minha-pagina-' + Date.now().toString().slice(-4),
          sections: [],
          themeConfig: {
            primaryStart: visualIdentity.primaryColor,
            primaryEnd: visualIdentity.secondaryColor,
            contrast: visualIdentity.contrastColor,
            fontHeading: visualIdentity.fontHeading,
            fontBody: visualIdentity.fontBody,
          },
        });
        setLoading(false);
        return;
      }

      if (!pageId) return;

      try {
        setLoading(true);
        const data = await api.getCapturePage(pageId);
        if (data) {
          setPage({
            id: data.id,
            workspaceId: data.tenantId,
            title: data.title,
            slug: data.slug,
            customDomain: data.customDomain,
            isPublished: data.isActive,
            seoConfig: data.seoConfig,
          });
        } else {
          setMessage({ type: 'error', text: 'Página não encontrada.' });
        }
      } catch (err: any) {
        console.error(err);
        setMessage({ type: 'error', text: 'Falha ao carregar dados da página.' });
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [pageId, isNewPage, activeWorkspace, visualIdentity.primaryColor, visualIdentity.secondaryColor, visualIdentity.contrastColor, visualIdentity.fontHeading, visualIdentity.fontBody]);

  // Salvar rascunho
  const saveDraft = useCallback(async () => {
    if (!page || !activeWorkspace) return;
    setSaving(true);
    setMessage(null);

    try {
      if (isNewPage) {
        const created = await api.createCapturePage({
          tenantId: activeWorkspace.id,
          title: page.title,
          slug: page.slug,
          seoConfig: page.seoConfig,
        });
        setMessage({ type: 'success', text: 'Rascunho criado com sucesso!' });
        router.push(`/dashboard/captacao/${created.page.id}`);
      } else if (page.id) {
        await api.updateCapturePage(page.id, {
          title: page.title,
          slug: page.slug,
          seoConfig: page.seoConfig,
        });
        setMessage({ type: 'success', text: 'Rascunho salvo com sucesso!' });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar rascunho.' });
    } finally {
      setSaving(false);
    }
  }, [page, activeWorkspace, isNewPage, router]);

  // Publicar página
  const publishPage = useCallback(async () => {
    if (!page?.id) return;
    setSaving(true);

    try {
      await api.updateCapturePage(page.id, { isActive: true });
      setPage((prev) => (prev ? { ...prev, isPublished: true, publishedAt: new Date().toISOString() } : null));
      setMessage({ type: 'success', text: 'Página publicada com sucesso no Cloudflare!' });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erro ao publicar página.' });
    } finally {
      setSaving(false);
    }
  }, [page]);

  return {
    loading,
    saving,
    page,
    setPage,
    activeTab,
    setActiveTab,
    devicePreview,
    setDevicePreview,
    message,
    setMessage,
    saveDraft,
    publishPage,
    activeWorkspace,
    visualIdentity,
  };
}
