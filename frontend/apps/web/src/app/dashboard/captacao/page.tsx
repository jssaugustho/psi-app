'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api, CapturePage } from '@/lib/api';
import { Card, Button, Input, LoadingSpinner, BrandModal } from '@psi/ui';
import { Globe, Plus, Trash2, Edit, ExternalLink, Sparkles, AlertCircle, X } from 'lucide-react';
import { Link } from '@/components/Link';

export default function CaptacaoPage() {
  const { user } = useAuth();
  const { tenant } = useBrand();
  const router = useRouter();

  const [pages, setPages] = useState<CapturePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states for creating a new page (Step-by-step)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newCrp, setNewCrp] = useState('');
  const [newApproach, setNewApproach] = useState('Psicoterapia');
  const [newAddress, setNewAddress] = useState('Atendimento Online');
  const [newTitlePart1, setNewTitlePart1] = useState('Terapia para recuperar o seu ');
  const [newTitlePart2, setNewTitlePart2] = useState('equilíbrio interior');
  const [newDescription, setNewDescription] = useState('Cuidado clínico ético e acolhedor para ajudar você a superar desafios emocionais, desenvolver o autoconhecimento e viver com mais leveza.');
  const [newWhatsappMessageTemplate, setNewWhatsappMessageTemplate] = useState('Olá, acabei de enviar minha triagem inicial no seu site. Meu nome é {{nome}}.');
  const [submitting, setSubmitting] = useState(false);
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

  // Helper to check if a domain is active/reachable in background
  const checkDomainActive = useCallback(async (domain: string): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout
      await fetch(`https://${domain}`, {
        mode: 'no-cors',
        signal: controller.signal,
      });
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

  const handleOpenModal = () => {
    setCurrentStep(1);
    setNewTitle('');
    setNewSlug('');
    setNewCrp('');
    setNewApproach('Psicoterapia');
    setNewAddress('Atendimento Online');
    setNewTitlePart1('Terapia para recuperar o seu ');
    setNewTitlePart2('equilíbrio interior');
    setNewDescription('Cuidado clínico ético e acolhedor para ajudar você a superar desafios emocionais, desenvolver o autoconhecimento e viver com mais leveza.');
    setNewWhatsappMessageTemplate('Olá, acabei de enviar minha triagem inicial no seu site. Meu nome é {{nome}}.');
    setError('');
    setIsModalOpen(true);
  };

  // Auto-generate slug from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewTitle(val);
    const slugified = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9\s-]/g, '')    // remove special chars
      .replace(/\s+/g, '-')            // spaces to hyphens
      .replace(/-+/g, '-')             // remove consecutive hyphens
      .trim();
    setNewSlug(slugified);
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSlug.trim()) {
      setError('Por favor, preencha todos os campos do Passo 1.');
      setCurrentStep(1);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await api.createCapturePage({
        title: newTitle.trim(),
        slug: newSlug.trim(),
        tenantId: tenant?.id,
        crp: newCrp.trim() || undefined,
        approach: newApproach.trim() || undefined,
        address: newAddress.trim() || undefined,
        titlePart1: newTitlePart1.trim() || undefined,
        titlePart2: newTitlePart2.trim() || undefined,
        description: newDescription.trim() || undefined,
        whatsappMessageTemplate: newWhatsappMessageTemplate.trim() || undefined,
      });

      if (res.success) {
        setIsModalOpen(false);
        // Redirect directly to the newly created page editor
        router.push(`/dashboard/captacao/${res.page.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao instanciar nova página. Verifique se o slug já está em uso.');
    } finally {
      setSubmitting(false);
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

  const handleDeletePage = async (id: string, title: string) => {
    if (!confirm(`Tem certeza que deseja excluir permanentemente a página "${title}"? Todas as respostas e configurações serão perdidas.`)) {
      return;
    }

    try {
      await api.deleteCapturePage(id);
      setPages(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir página: ' + err.message);
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
          <Button
            onClick={handleOpenModal}
            className="brand-accent text-xs font-bold uppercase h-10 px-4 flex items-center gap-2 cursor-pointer border-none"
          >
            <Plus className="h-4 w-4" />
            Nova Página
          </Button>
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

              <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-white/5">
                <button
                  onClick={() => handleDeletePage(page.id, page.title)}
                  className="p-2 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-colors cursor-pointer"
                  title="Excluir Página"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2">
                  <Link href={`/dashboard/captacao/${page.id}`}>
                    <Button variant="secondary" className="cursor-pointer text-xs h-9 px-3 flex items-center gap-1.5">
                      <Edit className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                  </Link>
                  {page.isActive && (
                    <a
                      href={getVerSiteUrl(page)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="no-underline"
                    >
                      <Button className="brand-accent cursor-pointer text-xs h-9 px-3 flex items-center gap-1.5 border-none">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ver Site
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal Dialog (Step-by-step Wizard) */}
      <BrandModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setError(''); }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Nova Página de Captação</h3>
                <span className="text-[10px] text-slate-450 uppercase tracking-wider font-semibold">Passo {currentStep} de 4</span>
              </div>
              {/* Progress dots */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 w-6 rounded-full transition-all ${
                      step === currentStep 
                        ? 'bg-[var(--brand-gradient-start)]' 
                        : step < currentStep 
                        ? 'bg-emerald-500/60' 
                        : 'bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            <form onSubmit={currentStep === 4 ? handleCreatePage : (e) => e.preventDefault()} className="space-y-4">
              {/* STEP 1: Basic Info */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Defina o título identificador e o caminho de URL da sua landing page.
                  </p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Título da Página</label>
                    <Input
                      type="text"
                      required
                      placeholder="Ex: Terapia de Ansiedade Adulto"
                      value={newTitle}
                      onChange={handleTitleChange}
                      className="brand-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Slug da URL</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs text-slate-500 font-mono">/p/{tenant?.slug}/</span>
                      <Input
                        type="text"
                        required
                        placeholder="terapia-ansiedade"
                        value={newSlug}
                        onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        className="brand-input pl-[150px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Professional profile */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Insira seus dados profissionais de registro e atendimento para exibição.
                  </p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">CRP</label>
                    <Input
                      type="text"
                      placeholder="Ex: 06/123456"
                      value={newCrp}
                      onChange={(e) => setNewCrp(e.target.value)}
                      className="brand-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Abordagem Clínica / Especialidade</label>
                    <Input
                      type="text"
                      placeholder="Ex: Terapia Cognitivo-Comportamental"
                      value={newApproach}
                      onChange={(e) => setNewApproach(e.target.value)}
                      className="brand-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Endereço de Atendimento</label>
                    <Input
                      type="text"
                      placeholder="Ex: Atendimento Online & Presencial em São Paulo"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="brand-input"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Copywriting */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Redija o título chamativo e a descrição que os seus pacientes visualizarão no topo do site.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Título (Foco)</label>
                      <Input
                        type="text"
                        placeholder="Ex: Terapia para recuperar o seu "
                        value={newTitlePart1}
                        onChange={(e) => setNewTitlePart1(e.target.value)}
                        className="brand-input"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Título (Colorido)</label>
                      <Input
                        type="text"
                        placeholder="Ex: equilíbrio interior"
                        value={newTitlePart2}
                        onChange={(e) => setNewTitlePart2(e.target.value)}
                        className="brand-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Descrição Resumida</label>
                    <textarea
                      rows={3}
                      className="w-full text-xs p-3 bg-zinc-900 rounded-xl border border-zinc-700 focus:border-[#CC8667] outline-none text-white transition-colors resize-none"
                      placeholder="Escreva a descrição do seu serviço..."
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: Success & WhatsApp settings */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Defina o template da mensagem enviada no WhatsApp após o paciente finalizar a triagem.
                  </p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Mensagem Whatsapp</label>
                    <textarea
                      rows={4}
                      className="w-full text-xs p-3 bg-zinc-900 rounded-xl border border-zinc-700 focus:border-[#CC8667] outline-none text-white transition-colors resize-none"
                      placeholder="Olá, preenchi a triagem pelo site. Meu nome é {{nome}}."
                      value={newWhatsappMessageTemplate}
                      onChange={(e) => setNewWhatsappMessageTemplate(e.target.value)}
                    />
                    <p className="text-[9px] text-slate-500 pt-0.5 leading-relaxed">
                      Marcadores como <code className="text-slate-350 font-bold">{"{{nome}}"}</code> serão substituídos pelas respostas reais enviadas pelo paciente.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Footer buttons */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/5 mt-4">
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { setCurrentStep(prev => prev - 1); setError(''); }}
                    className="cursor-pointer text-xs h-10 px-4"
                  >
                    Voltar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { setIsModalOpen(false); setError(''); }}
                    className="cursor-pointer text-xs h-10 px-4"
                  >
                    Cancelar
                  </Button>
                )}

                {currentStep < 4 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (currentStep === 1 && (!newTitle.trim() || !newSlug.trim())) {
                        setError('Título e Slug são obrigatórios.');
                        return;
                      }
                      setError('');
                      setCurrentStep(prev => prev + 1);
                    }}
                    className="brand-accent text-xs font-semibold h-10 px-5 cursor-pointer border-none"
                  >
                    Avançar
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    onClick={handleCreatePage}
                    disabled={submitting}
                    className="brand-accent text-xs font-semibold h-10 px-5 cursor-pointer border-none"
                  >
                    {submitting ? 'Criando Página...' : 'Criar Página'}
                  </Button>
                )}
              </div>
            </form>
      </BrandModal>
    </div>
  );
}
