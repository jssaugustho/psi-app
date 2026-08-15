'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api } from '@/lib/api';
import { Card, Button, Input, LoadingSpinner } from '@psi/ui';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  AlertCircle,
  Globe,
  Upload,
  Image as ImageIcon,
  Monitor,
  Smartphone,
  ShieldCheck,
  Search,
  Palette,
  Layout,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { Link } from '@/components/Link';
import { MediaLibraryModal } from '@/components/media-library-modal';

const COLOR_PALETTES = [
  {
    id: 'salvia',
    name: 'Verde Sálvia & Terracota',
    tag: 'Sereno / Recomendado',
    primaryStart: '#458270',
    primaryEnd: '#A64E2B',
    contrast: '#FFFFFF',
  },
  {
    id: 'azul',
    name: 'Azul Pétreo & Areia',
    tag: 'Clínico / Confiável',
    primaryStart: '#2C5282',
    primaryEnd: '#D69E2E',
    contrast: '#FFFFFF',
  },
  {
    id: 'rosa',
    name: 'Nude Rosa & Café',
    tag: 'Acolhedor / Humano',
    primaryStart: '#B85B56',
    primaryEnd: '#7B341E',
    contrast: '#FFFFFF',
  },
  {
    id: 'dark',
    name: 'Grafite & Ouro',
    tag: 'Sofisticado / Moderno',
    primaryStart: '#31363F',
    primaryEnd: '#D4AF37',
    contrast: '#FFFFFF',
  },
];

const DEFAULT_TEMPLATE_MODEL = {
  siteConfig: {
    sections: [
      { id: 'diagnostic', type: 'diagnostic', isActive: true, name: 'Especialidades' },
      { id: 'about', type: 'about', isActive: true, name: 'Sobre Mim' },
      { id: 'process', type: 'process', isActive: true, name: 'Como Funciona' },
      { id: 'space', type: 'space', isActive: true, name: 'Consultório & Espaço' },
      { id: 'faq', type: 'faq', isActive: true, name: 'Perguntas Frequentes (FAQ)' },
    ],
    images: {
      hero: '',
      portrait: '',
      officeSpace: '',
      gallery: [],
    },
    theme: {
      fontFamily: 'Inter',
      colors: {
        primaryStart: '#CC8667',
        primaryEnd: '#AA5533',
        contrast: '#FFFFFF',
        bgDark: '#FAFAFA',
        textDark: '#18181B',
      }
    }
  },
  dictionary: {
    hero: {
      badge: 'Atendimento Online & Presencial',
      title: 'Psicologia Clínica & Saúde Emocional',
      description: 'Cuidado clínico ético e acolhedor para ajudar você a superar desafios emocionais, desenvolver o autoconhecimento e viver com mais leveza.',
      ctaPrimary: 'Iniciar Triagem',
      ctaSecondary: 'Saiba Mais',
      badgeCrp: 'CRP Ativo',
      badgeApproach: 'Abordagem TCC',
      badgeEthic: 'Sigilo Ético',
    },
    about: {
      badge: 'Sobre a Psicóloga',
      title: 'Acolhimento humanizado focado em transformação',
      bio: 'Sou especialista em psicologia clínica com foco em ansiedade, depressão e desenvolvimento pessoal. Meu trabalho é oferecer um espaço seguro para que você possa ressignificar suas dores e alcançar seu bem-estar.',
    },
    process: {
      badge: 'Como Funciona',
      title: 'Seu processo terapêutico em passos simples',
      steps: [
        { title: '1. Triagem Inicial', description: 'Preencha um breve formulário para entendermos sua demanda.' },
        { title: '2. Agendamento', description: 'Escolhemos o melhor horário para sua sessão online ou presencial.' },
        { title: '3. Primeira Sessão', description: 'Realizamos a primeira consulta de acolhimento e alinhamento de objetivos.' }
      ]
    },
    faq: {
      badge: 'Dúvidas Frequentes',
      title: 'Perguntas mais comuns sobre a terapia',
      items: [
        { question: 'Como funciona a primeira consulta?', answer: 'A primeira consulta é um momento de escuta e acolhimento para compreendermos suas necessidades e definirmos a frequência das sessões.' },
        { question: 'As sessões online possuem a mesma eficácia?', answer: 'Sim. A terapia online possui regulamentação pelo CFP e a mesma eficácia comprovada do atendimento presencial.' },
        { question: 'Qual é a duração de cada sessão?', answer: 'Cada sessão individual dura em média 50 minutos.' }
      ]
    }
  },
  formFlow: {
    nodes: [
      {
        id: 'welcome',
        type: 'step',
        position: { x: 50, y: 150 },
        data: {
          stepType: 'welcome',
          title: 'Bem-vinda(o) ao Atendimento Psicológico',
          description: 'Responda a algumas perguntas simples para iniciarmos o seu atendimento de forma segura.',
          buttonText: 'Começar Agora'
        }
      },
      {
        id: 'name',
        type: 'step',
        position: { x: 350, y: 150 },
        data: {
          stepType: 'question',
          questionType: 'text',
          title: 'Qual é o seu nome completo?',
          placeholder: 'Digite seu nome...',
          required: true
        }
      },
      {
        id: 'phone',
        type: 'step',
        position: { x: 650, y: 150 },
        data: {
          stepType: 'question',
          questionType: 'phone',
          title: 'Qual é o seu WhatsApp para contato?',
          placeholder: '(11) 99999-9999',
          required: true
        }
      },
      {
        id: 'reason',
        type: 'step',
        position: { x: 950, y: 150 },
        data: {
          stepType: 'question',
          questionType: 'textarea',
          title: 'Qual o principal motivo da sua busca por atendimento neste momento?',
          placeholder: 'Descreva brevemente o que você está sentindo...',
          required: false
        }
      },
      {
        id: 'thankyou',
        type: 'step',
        position: { x: 1250, y: 150 },
        data: {
          stepType: 'thankyou',
          title: 'Obrigado por responder!',
          description: 'Sua solicitação foi recebida. Entraremos em contato via WhatsApp em breve.',
          buttonText: 'Concluir'
        }
      }
    ],
    edges: [
      { id: 'e-welcome-name', source: 'welcome', target: 'name' },
      { id: 'e-name-phone', source: 'name', target: 'phone' },
      { id: 'e-phone-reason', source: 'phone', target: 'reason' },
      { id: 'e-reason-thankyou', source: 'reason', target: 'thankyou' }
    ]
  }
};

export default function NovaPaginaCaptacaoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { tenant } = useBrand();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  
  // Visual & Brand states
  const [selectedPalette, setSelectedPalette] = useState(COLOR_PALETTES[0]);
  const [isCustomColor, setIsCustomColor] = useState(false);
  const [customPrimaryStart, setCustomPrimaryStart] = useState('#458270');
  const [customPrimaryEnd, setCustomPrimaryEnd] = useState('#A64E2B');
  const [customContrast, setCustomContrast] = useState('#FFFFFF');
  const [newLogoUrl, setNewLogoUrl] = useState('');

  // SEO states (auto-computed)
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // Media library state
  const [libraryOpen, setLibraryOpen] = useState(false);

  // Extract only the first two words from name string without adding any title prefixes
  const extractFirstTwoWords = (nameStr: string): string => {
    if (!nameStr) return '';
    const parts = nameStr.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 2) return parts.join(' ');
    return `${parts[0]} ${parts[1]}`;
  };

  // Inherit psychologist's user name automatically (first 2 words, no prefix)
  useEffect(() => {
    if (newTitle) return; // Only set initial value once if empty

    let rawName = '';
    if (user?.nome) {
      rawName = user.sobrenome ? `${user.nome} ${user.sobrenome}`.trim() : user.nome.trim();
    } else if (tenant?.name) {
      rawName = tenant.name.trim();
    }

    const defaultName = extractFirstTwoWords(rawName);

    if (defaultName) {
      setNewTitle(defaultName);
      const generatedSlug = defaultName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      setNewSlug(generatedSlug);
      setMetaTitle(`${defaultName} | Psicologia Clínica`);
      setMetaDescription(`Atendimento psicológico especializado com ${defaultName}. Agende sua consulta de forma segura.`);
    }
  }, [user, tenant, newTitle]);

  // Auto generate slug & SEO from Title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewTitle(val);
    const generatedSlug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    setNewSlug(generatedSlug);

    if (val.trim()) {
      setMetaTitle(`${val.trim()} | Psicologia Clínica`);
      setMetaDescription(`Atendimento psicológico especializado com ${val.trim()}. Agende sua consulta de forma segura.`);
    }
  };

  // Compute active colors
  const activePrimaryStart = isCustomColor ? customPrimaryStart : selectedPalette.primaryStart;
  const activePrimaryEnd = isCustomColor ? customPrimaryEnd : selectedPalette.primaryEnd;
  const activeContrast = isCustomColor ? customContrast : selectedPalette.contrast;

  // Form submit -> create page and redirect
  const handleCreatePage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!newTitle.trim() || !newSlug.trim()) {
      setError('Preencha o Nome e o Endereço (Slug) da página.');
      setCurrentStep(1);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const templateModel = DEFAULT_TEMPLATE_MODEL;
      let baseSiteConfig = JSON.parse(JSON.stringify(templateModel.siteConfig));
      let baseDictionary = JSON.parse(JSON.stringify(templateModel.dictionary));
      let baseFormFlow = JSON.parse(JSON.stringify(templateModel.formFlow));

      // Inject custom CRP if provided
      baseSiteConfig = {
        ...baseSiteConfig,
        logoUrl: newLogoUrl.trim() || undefined,
        images: {
          hero: '',
          portrait: '',
          officeSpace: '',
          gallery: [],
        },
        theme: {
          ...(baseSiteConfig.theme || {}),
          colors: {
            ...(baseSiteConfig.theme?.colors || {}),
            primaryStart: activePrimaryStart,
            primaryEnd: activePrimaryEnd,
            contrast: activeContrast,
            bgDark: '#FAFAFA',
            textDark: '#18181B',
          }
        }
      };

      const seoConfig = {
        metaTitle: metaTitle.trim() || `${newTitle.trim()} | Psicologia Clínica`,
        metaDescription: metaDescription.trim() || `Atendimento psicológico especializado com ${newTitle.trim()}. Agende sua consulta.`,
        keywords: 'psicologia, terapia, consulta psicologica, atendimento online'
      };

      const effectiveSlug = (domainMode === 'subdomain' && subdomainInput.trim()) ? subdomainInput.trim() : newSlug.trim();
      const effectiveCustomDomain = (domainMode === 'custom' && customDomainInput.trim()) ? customDomainInput.trim() : undefined;

      const res = await api.createCapturePage({
        title: newTitle.trim(),
        slug: effectiveSlug,
        tenantId: tenant?.id,
        customDomain: effectiveCustomDomain,
        logoText: newTitle.trim(),
        primaryStart: activePrimaryStart,
        primaryEnd: activePrimaryEnd,
        contrast: activeContrast,
        logoUrl: newLogoUrl.trim() || undefined,
        seoConfig,
        siteConfig: baseSiteConfig,
        dictionary: baseDictionary,
        formFlow: baseFormFlow,
      });

      if (res.success && res.page?.id) {
        await api.updateCapturePage(res.page.id, {
          slug: effectiveSlug,
          slugDraft: effectiveSlug,
          customDomain: effectiveCustomDomain,
          customDomainDraft: effectiveCustomDomain,
          siteConfig: baseSiteConfig,
          siteConfigDraft: baseSiteConfig,
          dictionary: baseDictionary,
          dictionaryDraft: baseDictionary,
          formFlow: baseFormFlow,
          formFlowDraft: baseFormFlow,
          seoConfig: seoConfig,
          seoConfigDraft: seoConfig,
        });

        router.push(`/dashboard/captacao/${res.page.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar página. Verifique se o endereço (slug) já está sendo utilizado.');
    } finally {
      setSubmitting(false);
    }
  };

  // Domain Choice states
  const [domainMode, setDomainMode] = useState<'subdomain' | 'custom' | 'path'>('subdomain');
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [subdomainInput, setSubdomainInput] = useState('');
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [dnsRecords, setDnsRecords] = useState<Array<{ type: string; name: string; value: string; description: string }>>([]);
  const [registeringCustom, setRegisteringCustom] = useState(false);
  const [baseDomain, setBaseDomain] = useState('psiapp.com.br');

  useEffect(() => {
    api.getPlatformSetupStatus()
      .then((res) => {
        if (res.base_domain) setBaseDomain(res.base_domain);
      })
      .catch(() => {});
  }, []);

  // Auto check subdomain availability
  const checkSubdomain = useCallback(async (slugToCheck: string) => {
    if (!slugToCheck.trim()) {
      setSubdomainAvailable(null);
      return;
    }
    setCheckingSubdomain(true);
    try {
      const res = await api.checkSubdomainAvailability(slugToCheck);
      setSubdomainAvailable(res.available);
    } catch {
      setSubdomainAvailable(null);
    } finally {
      setCheckingSubdomain(false);
    }
  }, []);

  const handleRegisterCustomDomain = async () => {
    if (!customDomainInput.trim()) return;
    setRegisteringCustom(true);
    setError('');
    try {
      const res = await api.registerCustomHostname(null, customDomainInput.trim());
      if (res.dnsRecords) {
        setDnsRecords(res.dnsRecords);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar domínio no Cloudflare.');
    } finally {
      setRegisteringCustom(false);
    }
  };

  const nextStep = () => {
    setError('');
    if (currentStep === 1 && (!newTitle.trim() || !newSlug.trim())) {
      setError('Preencha o Nome e o Endereço (Slug) da página.');
      return;
    }
    if (currentStep === 3 && domainMode === 'subdomain' && subdomainInput.trim()) {
      checkSubdomain(subdomainInput.trim());
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setError('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="min-h-[85vh] space-y-6 animate-page-enter max-w-7xl mx-auto pb-12">
      {/* Top Bar / Breadcrumb Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl glass-md border border-white/10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/captacao" className="no-underline">
            <button
              type="button"
              className="h-9 w-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span>Captação</span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span className="text-[var(--brand-gradient-start)] font-bold">Nova Página</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Criar Nova Página de Captação</h1>
          </div>
        </div>

        {/* Step Progress Pill Nav */}
        <div className="flex items-center gap-2 bg-zinc-950/80 p-1.5 rounded-xl border border-white/10">
          {[
            { num: 1, title: 'Identificação' },
            { num: 2, title: 'Estilo Visual' },
            { num: 3, title: 'Escolha de Domínio' },
            { num: 4, title: 'Revisão & Conclusão' }
          ].map((s) => {
            const isActive = currentStep === s.num;
            const isDone = currentStep > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (s.num < currentStep || (currentStep === 1 && newTitle.trim() && newSlug.trim())) {
                    setCurrentStep(s.num);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-md'
                    : isDone
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-black/20">
                  {isDone ? <Check className="h-3 w-3" /> : s.num}
                </span>
                <span className="hidden sm:inline">{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Split View Container: Left Form Steps | Right Live Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Steps Card */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6 md:p-8 glass-sm border border-white/10 rounded-2xl space-y-6 shadow-xl">
            {/* STEP 1: Identificação & Slug */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-1 border-b border-white/5 pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-gradient-start)] block">
                    Etapa 1 de 3
                  </span>
                  <h2 className="text-lg font-bold text-white">Configurações da Página & Endereço</h2>
                  <p className="text-xs text-slate-400">
                    Defina o nome de exibição da psicóloga/clínica e o endereço (slug) de acesso exclusivo.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-200 block">
                      Nome da Página / Psicóloga <span className="text-red-400">*</span>
                    </label>
                    <Input
                      type="text"
                      required
                      placeholder="Ex: Geovanna Bastos - Psicologia Clínica"
                      value={newTitle}
                      onChange={handleTitleChange}
                      className="brand-input text-sm h-11"
                    />
                    <span className="text-[11px] text-slate-500 block">
                      Este nome aparecerá em destaque no cabeçalho e títulos principais do site.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-200 block">
                      Endereço do Site (Slug da URL) <span className="text-red-400">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs text-slate-500 font-mono select-none">
                        /p/{tenant?.slug || 'clínica'}/
                      </span>
                      <Input
                        type="text"
                        required
                        placeholder="terapia-online"
                        value={newSlug}
                        onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        className="brand-input pl-[150px] text-sm h-11 font-mono"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      Endereço amigável utilizado para divulgar em redes sociais e WhatsApp.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Estilo Visual & Cores */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-gradient-start)] block">
                      Etapa 2 de 3
                    </span>
                    <h2 className="text-lg font-bold text-white">Identidade Visual & Cores</h2>
                    <p className="text-xs text-slate-400">
                      Escolha uma paleta de cores acolhedora para transmitir a energia do seu atendimento.
                    </p>
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-white/10 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsCustomColor(false)}
                      className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        !isCustomColor ? 'bg-[var(--brand-gradient-start)] text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Paletas
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomColor(true)}
                      className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        isCustomColor ? 'bg-[var(--brand-gradient-start)] text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Customizado
                    </button>
                  </div>
                </div>

                {!isCustomColor ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {COLOR_PALETTES.map((palette) => {
                      const isSelected = selectedPalette.id === palette.id;
                      return (
                        <div
                          key={palette.id}
                          onClick={() => setSelectedPalette(palette)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                            isSelected
                              ? 'bg-zinc-800/90 border-[var(--brand-gradient-start)] shadow-lg ring-1 ring-[var(--brand-gradient-start)]'
                              : 'bg-zinc-900/60 border-white/10 hover:border-slate-700 hover:bg-zinc-900'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{palette.name}</span>
                            {isSelected && (
                              <span className="text-[9px] font-bold text-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/15 px-2 py-0.5 rounded-full border border-[var(--brand-gradient-start)]/30">
                                Selecionada
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <div
                              className="h-6 flex-1 rounded-lg shadow-inner border border-white/10"
                              style={{ background: `linear-gradient(135deg, ${palette.primaryStart}, ${palette.primaryEnd})` }}
                            />
                            <div
                              className="h-6 w-6 rounded-lg border border-white/20 shadow-sm"
                              style={{ background: palette.contrast }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">{palette.tag}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-5 bg-zinc-900/80 border border-white/10 rounded-xl space-y-4">
                    <span className="text-xs font-bold text-white block">Cores Personalizadas</span>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 uppercase font-semibold block">Cor Primária</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={customPrimaryStart}
                            onChange={(e) => setCustomPrimaryStart(e.target.value)}
                            className="h-10 w-12 rounded border border-white/10 bg-transparent cursor-pointer p-0"
                          />
                          <span className="text-xs font-mono text-slate-300">{customPrimaryStart}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 uppercase font-semibold block">Cor Secundária</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={customPrimaryEnd}
                            onChange={(e) => setCustomPrimaryEnd(e.target.value)}
                            className="h-10 w-12 rounded border border-white/10 bg-transparent cursor-pointer p-0"
                          />
                          <span className="text-xs font-mono text-slate-300">{customPrimaryEnd}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 uppercase font-semibold block">Texto/Contraste</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={customContrast}
                            onChange={(e) => setCustomContrast(e.target.value)}
                            className="h-10 w-12 rounded border border-white/10 bg-transparent cursor-pointer p-0"
                          />
                          <span className="text-xs font-mono text-slate-300">{customContrast}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Logotipo opcional */}
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-white block">Logotipo em Imagem</label>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Opcional</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Se não enviado, o sistema utilizará o Nome da Psicóloga em formato de tipografia elegante.
                  </p>
                  {newLogoUrl ? (
                    <div className="flex items-center justify-between gap-3 p-3 bg-zinc-950 rounded-xl border border-white/10">
                      <img src={newLogoUrl} alt="Logo" className="h-8 max-w-[180px] object-contain" />
                      <button
                        type="button"
                        onClick={() => setNewLogoUrl('')}
                        className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLibraryOpen(true)}
                      className="w-full py-3 px-4 rounded-xl bg-zinc-900 border border-dashed border-zinc-700 hover:border-[var(--brand-gradient-start)] text-xs text-slate-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Upload className="h-4 w-4 text-[var(--brand-gradient-start)]" />
                      <span>Selecionar Imagem de Logotipo</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Escolha de Domínio / Publicação */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-1 border-b border-white/5 pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-gradient-start)] block">
                    Etapa 3 de 4
                  </span>
                  <h2 className="text-lg font-bold text-white">Escolha de Domínio & Publicação</h2>
                  <p className="text-xs text-slate-400">
                    Defina como seus pacientes acessarão seu site na internet.
                  </p>
                </div>

                {/* Domínio Mode Tabs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div
                    onClick={() => {
                      setDomainMode('subdomain');
                      if (!subdomainInput) setSubdomainInput(newSlug);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      domainMode === 'subdomain'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg'
                        : 'border-zinc-800 bg-zinc-900/60 text-slate-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-indigo-400 mb-1">
                      <Sparkles className="h-4 w-4" />
                      <span>Subdomínio Gratuito</span>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-80">
                      Endereço exclusivo no app com SSL automático ativado na hora.
                    </p>
                  </div>

                  <div
                    onClick={() => setDomainMode('custom')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      domainMode === 'custom'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg'
                        : 'border-zinc-800 bg-zinc-900/60 text-slate-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-emerald-400 mb-1">
                      <Globe className="h-4 w-4" />
                      <span>Domínio Próprio</span>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-80">
                      Use seu próprio endereço (ex: <code className="text-slate-300">terapia.seunome.com.br</code>) via Cloudflare.
                    </p>
                  </div>

                  <div
                    onClick={() => setDomainMode('path')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      domainMode === 'path'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg'
                        : 'border-zinc-800 bg-zinc-900/60 text-slate-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-300 mb-1">
                      <Layout className="h-4 w-4" />
                      <span>Link Padrão</span>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-80">
                      Link direto sob o caminho padrão da clínica.
                    </p>
                  </div>
                </div>

                {/* Subdomínio Gratuito Option Body */}
                {domainMode === 'subdomain' && (
                  <div className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-4">
                    <label className="text-xs font-bold text-slate-200 block">
                      Escolha seu prefixo de subdomínio
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={subdomainInput || newSlug}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                          setSubdomainInput(val);
                          setSubdomainAvailable(null);
                        }}
                        placeholder="dra-geovanna"
                        className="brand-input font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => checkSubdomain(subdomainInput || newSlug)}
                        disabled={checkingSubdomain}
                        className="shrink-0 text-xs"
                      >
                        {checkingSubdomain ? 'Verificando...' : 'Verificar'}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 text-xs font-mono text-indigo-300">
                      <span>https://{(subdomainInput || newSlug || 'seu-nome')}.{baseDomain}</span>
                      {subdomainAvailable === true && (
                        <span className="text-emerald-400 font-sans font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Disponível!
                        </span>
                      )}
                      {subdomainAvailable === false && (
                        <span className="text-red-400 font-sans font-bold flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" /> Indisponível
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Domínio Próprio Option Body */}
                {domainMode === 'custom' && (
                  <div className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-4">
                    <label className="text-xs font-bold text-slate-200 block">
                      Seu Domínio Customizado
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={customDomainInput}
                        onChange={(e) => setCustomDomainInput(e.target.value)}
                        placeholder="consulta.psicologageovanna.com.br"
                        className="brand-input font-mono text-xs"
                      />
                      <Button
                        type="button"
                        onClick={handleRegisterCustomDomain}
                        disabled={registeringCustom || !customDomainInput.trim()}
                        className="shrink-0 text-xs"
                      >
                        {registeringCustom ? 'Gerando DNS...' : 'Gerar Registros DNS'}
                      </Button>
                    </div>

                    {dnsRecords.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                          📋 Registros DNS a incluir no seu Provedor (Registro.br / Cloudflare / GoDaddy)
                        </label>
                        <div className="space-y-2">
                          {dnsRecords.map((rec, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono space-y-1">
                              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                                <span className="font-bold text-indigo-400">{rec.type}</span>
                                <span>{rec.description}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-white">
                                <span className="truncate"><strong>Host:</strong> {rec.name}</span>
                                <span className="truncate text-slate-300"><strong>Valor:</strong> {rec.value}</span>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(rec.value)}
                                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-slate-200 shrink-0 font-sans cursor-pointer"
                                >
                                  Copiar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Revisão & Instanciação */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-1 border-b border-white/5 pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-gradient-start)] block">
                    Etapa 4 de 4
                  </span>
                  <h2 className="text-lg font-bold text-white">Revisão & Instanciação</h2>
                  <p className="text-xs text-slate-400">
                    Confira o resumo da sua nova página de captação antes de entrar no editor visual.
                  </p>
                </div>

                {/* General Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Nome da Página</span>
                    <span className="text-sm font-bold text-white block truncate">
                      {newTitle || 'Sem nome'}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Link de Acesso (Slug)</span>
                    <span className="text-xs font-mono text-[var(--brand-gradient-start)] block truncate">
                      /p/{tenant?.slug || 'clínica'}/{newSlug}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Paleta de Cores</span>
                    <div className="flex items-center gap-2 pt-1">
                      <div
                        className="h-4 w-12 rounded shadow-inner"
                        style={{ background: `linear-gradient(135deg, ${activePrimaryStart}, ${activePrimaryEnd})` }}
                      />
                      <span className="text-xs font-medium text-slate-300">
                        {isCustomColor ? 'Customizada' : selectedPalette.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Google SEO Card Preview */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Pré-visualização no Busca do Google (SEO)
                  </span>
                  <div className="p-4 rounded-xl bg-zinc-950 border border-white/10 space-y-1.5 font-sans">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                      <Search className="h-3 w-3 text-slate-500 shrink-0" />
                      <span>https://sites.psiapp.com.br/p/{tenant?.slug}/{newSlug}</span>
                    </div>
                    <div className="text-sm font-semibold text-blue-400 truncate hover:underline cursor-pointer">
                      {metaTitle || `${newTitle} | Psicologia Clínica`}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {metaDescription || `Atendimento psicológico especializado com ${newTitle}. Agende sua consulta de forma segura.`}
                    </p>
                  </div>
                </div>

                {/* Template Ready Box */}
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <span>Tudo pronto para a criação!</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-emerald-200/80">
                    Ao clicar no botão abaixo, sua landing page será instanciada com seções prontas (Sobre mim, Como Funciona, FAQ e Triagem). Você poderá customizar todo o conteúdo no editor.
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-6 border-t border-white/10">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={prevStep}
                  className="w-auto h-11 px-6 text-slate-300 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition-all border border-white/10"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              ) : (
                <Link href="/dashboard/captacao" className="no-underline">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-auto h-11 px-6 text-slate-400 hover:text-white text-xs font-semibold rounded-xl cursor-pointer transition-all border border-white/10"
                  >
                    Cancelar
                  </Button>
                </Link>
              )}

              {currentStep < 4 ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={nextStep}
                  className="w-auto h-11 px-8 brand-accent text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer border-none shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  <span>Avançar</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  disabled={submitting}
                  onClick={() => handleCreatePage()}
                  className="w-auto h-11 px-8 brand-accent text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer border-none shadow-xl hover:brightness-110 active:scale-95 transition-all"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner />
                      <span>Criando Página...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Criar Página e Ir para o Editor</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Live Mockup Preview Widget */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Monitor className="h-4 w-4 text-[var(--brand-gradient-start)]" />
              Pré-Visualização ao Vivo
            </span>
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setPreviewMode('desktop')}
                className={`p-1.5 rounded transition-all cursor-pointer ${
                  previewMode === 'desktop' ? 'bg-zinc-800 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Visão Desktop"
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('mobile')}
                className={`p-1.5 rounded transition-all cursor-pointer ${
                  previewMode === 'mobile' ? 'bg-zinc-800 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Visão Mobile"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Screen Container */}
          <div
            className={`transition-all duration-300 mx-auto rounded-2xl border border-white/15 bg-zinc-950 shadow-2xl overflow-hidden ${
              previewMode === 'mobile' ? 'max-w-[340px] border-zinc-800' : 'w-full'
            }`}
          >
            {/* Mockup Browser/Phone Top bar */}
            <div className="bg-zinc-900/90 border-b border-white/10 px-3 py-2 flex items-center justify-between select-none">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="bg-zinc-950 px-3 py-0.5 rounded-md text-[10px] text-slate-400 font-mono border border-white/5 truncate max-w-[200px]">
                /p/{tenant?.slug || 'clínica'}/{newSlug || 'sua-pagina'}
              </div>
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {/* Mockup Page Content Area */}
            <div className="bg-white text-zinc-900 p-5 space-y-6 min-h-[360px] select-none">
              {/* Header inside Mockup */}
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                {newLogoUrl ? (
                  <img src={newLogoUrl} alt="Logo Preview" className="h-7 max-w-[140px] object-contain" />
                ) : (
                  <div className="flex items-center gap-2 font-serif">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shadow"
                      style={{
                        background: `linear-gradient(135deg, ${activePrimaryStart}, ${activePrimaryEnd})`,
                        color: activeContrast
                      }}
                    >
                      Ψ
                    </div>
                    <span className="text-sm font-serif font-semibold text-zinc-900 truncate max-w-[180px]">
                      {newTitle.trim() || 'Nome da Psicóloga'}
                    </span>
                  </div>
                )}
                <div className="h-6 px-2.5 rounded bg-zinc-100 text-[9px] font-bold uppercase text-zinc-600 flex items-center">
                  Contato
                </div>
              </div>

              {/* Hero Banner Mockup */}
              <div className="space-y-3 text-center py-4 px-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-[10px] font-medium text-zinc-700">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  <span>Atendimento Online & Presencial</span>
                </div>

                <h3 className="text-lg font-bold font-serif text-zinc-900 leading-tight">
                  Psicologia Clínica & Saúde Emocional
                </h3>

                <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto">
                  Cuidado clínico ético e acolhedor para ajudar você a superar desafios emocionais.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <div
                    className="w-full sm:w-auto h-9 px-5 rounded-xl font-bold text-xs flex items-center justify-center shadow-md cursor-default"
                    style={{
                      background: `linear-gradient(135deg, ${activePrimaryStart}, ${activePrimaryEnd})`,
                      color: activeContrast
                    }}
                  >
                    Iniciar Triagem
                  </div>
                  <div className="w-full sm:w-auto h-9 px-4 rounded-xl font-medium text-xs bg-zinc-100 text-zinc-700 flex items-center justify-center cursor-default">
                    Saiba Mais
                  </div>
                </div>
              </div>

              {/* Specialities cards mockup */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100">
                <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100 text-left space-y-1">
                  <div className="h-2 w-12 rounded bg-zinc-300" />
                  <div className="h-1.5 w-16 rounded bg-zinc-200" />
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100 text-left space-y-1">
                  <div className="h-2 w-14 rounded bg-zinc-300" />
                  <div className="h-1.5 w-12 rounded bg-zinc-200" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media Library Modal for image selection */}
      {tenant && (
        <MediaLibraryModal
          isOpen={libraryOpen}
          onClose={() => setLibraryOpen(false)}
          tenantId={tenant.id}
          onSelectImage={(asset) => {
            setNewLogoUrl(asset.url);
            setLibraryOpen(false);
          }}
          uploadType="logo"
        />
      )}
    </div>
  );
}
