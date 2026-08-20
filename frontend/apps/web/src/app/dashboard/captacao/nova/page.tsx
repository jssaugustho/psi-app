'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api } from '@/lib/api';
import { Card, Button, Input, LoadingSpinner, BrandModal, DnsInstructions } from '@psi/ui';
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
  Type,
  Layout,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Plus,
  Loader2,
  Clock,
  X,
  ExternalLink,
  Share2,
  FileText,
  Eye,
  FolderOpen,
  Trash2
} from 'lucide-react';
import { Link } from '@/components/Link';
import { MediaLibraryModal } from '@/components/media-library-modal';
import { FontPicker } from '@/components/FontPicker';
import { DomainManager } from '@/components/domain-manager';

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

interface SocialCoverBannerProps {
  logoUrl?: string;
  faviconUrl?: string;
  title: string;
  description: string;
  domainUrl: string;
  bgLightColor?: string;
  activePrimaryStart?: string;
  activePrimaryEnd?: string;
  fontHeading?: string;
  fontBody?: string;
  className?: string;
}

function SocialCoverBanner({
  logoUrl,
  faviconUrl,
  title,
  description,
  domainUrl,
  bgLightColor = '#FFFFFF',
  activePrimaryStart = '#c5825d',
  activePrimaryEnd = '#458270',
  fontHeading = 'Playfair Display',
  fontBody = 'Plus Jakarta Sans',
  className = ''
}: SocialCoverBannerProps) {
  return (
    <div
      className={`w-full aspect-[1.91/1] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 relative flex flex-col justify-between select-none transition-all ${className}`}
      style={{
        backgroundColor: bgLightColor,
        color: '#18181B',
        fontFamily: `'${fontBody}', sans-serif`
      }}
    >
      {/* Top Main Section (77% Height) - Site Background Color & Dark Text */}
      <div className="p-5 sm:p-7 flex-1 flex flex-col justify-between relative overflow-hidden">
        {/* Watermark Psi Monogram */}
        <div className="absolute right-3 bottom-1 text-[130px] sm:text-[180px] font-bold text-zinc-900/5 pointer-events-none select-none leading-none">
          Ψ
        </div>

        {/* Prominent Main Logo / Brand Name (Without Headline Title) */}
        <div className="flex items-center z-10 pt-1">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-12 sm:h-18 max-w-[360px] sm:max-w-[420px] object-contain" />
          ) : faviconUrl ? (
            <div className="flex items-center gap-3 sm:gap-4">
              <img src={faviconUrl} alt="Ícone" className="h-9 w-9 sm:h-12 sm:w-12 object-contain rounded-xl border border-slate-200 dark:border-zinc-700 bg-white p-1 shadow-sm" />
              <span
                className="text-base sm:text-2xl font-bold tracking-tight text-zinc-900 uppercase truncate max-w-[320px]"
                style={{ fontFamily: `'${fontHeading}', serif` }}
              >
                {title || 'GEOVANNA SANTOS'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center font-bold text-sm sm:text-lg text-white shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${activePrimaryStart} 0%, ${activePrimaryEnd} 100%)`
                }}
              >
                Ψ
              </div>
              <span
                className="text-base sm:text-2xl font-bold tracking-tight text-zinc-900 uppercase truncate max-w-[320px]"
                style={{ fontFamily: `'${fontHeading}', serif` }}
              >
                {title || 'GEOVANNA SANTOS'}
              </span>
            </div>
          )}
        </div>

        {/* Subtitle Description */}
        <div className="z-10 my-auto pr-4">
          <p className="text-xs sm:text-sm text-zinc-600 line-clamp-3 leading-relaxed font-light max-w-[92%]">
            {description}
          </p>
        </div>
      </div>

      {/* Bottom Solid Accent Bar (23% Height) - Button Gradient */}
      <div
        className="px-5 sm:px-7 py-3 flex items-center justify-between z-10 text-white font-mono text-[11px] sm:text-xs font-bold tracking-wide"
        style={{
          background: `linear-gradient(135deg, ${activePrimaryStart} 0%, ${activePrimaryEnd} 100%)`
        }}
      >
        <span className="truncate max-w-[300px] opacity-95">
          {domainUrl}
        </span>

        <span className="font-extrabold uppercase tracking-wider text-[9px] sm:text-[11px] bg-white/25 px-3.5 py-1.5 rounded-xl backdrop-blur-xs shrink-0 shadow-xs">
          AGENDE SUA CONSULTA →
        </span>
      </div>
    </div>
  );
}

export default function NovaPaginaCaptacaoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { tenant, primaryTenant } = useBrand();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  
  // Visual & Brand states initialized from psychologist's site default branding
  const [selectedPalette, setSelectedPalette] = useState(COLOR_PALETTES[0]);
  const [isCustomColor, setIsCustomColor] = useState(false);
  const [customPrimaryStart, setCustomPrimaryStart] = useState(tenant?.defaultSitePrimaryColor || primaryTenant?.defaultSitePrimaryColor || '#CC8667');
  const [customPrimaryEnd, setCustomPrimaryEnd] = useState(tenant?.defaultSiteSecondaryColor || primaryTenant?.defaultSiteSecondaryColor || '#E6A88A');
  const [customContrast, setCustomContrast] = useState(tenant?.contrastColor || primaryTenant?.contrastColor || '#FFFFFF');
  const [newLogoUrl, setNewLogoUrl] = useState(tenant?.defaultSiteLogoUrl || primaryTenant?.defaultSiteLogoUrl || '');
  const [newFaviconUrl, setNewFaviconUrl] = useState(tenant?.defaultSiteFaviconUrl || primaryTenant?.defaultSiteFaviconUrl || '');
  const [uploadTarget, setUploadTarget] = useState<'logo' | 'favicon'>('logo');

  // Font Typography states
  const [fontHeading, setFontHeading] = useState((tenant as any)?.defaultSiteFontHeading || (primaryTenant as any)?.defaultSiteFontHeading || 'Playfair Display');
  const [fontBody, setFontBody] = useState((tenant as any)?.defaultSiteFontBody || (primaryTenant as any)?.defaultSiteFontBody || 'Plus Jakarta Sans');

  // Domain Choice states
  const [domainMode, setDomainMode] = useState<'subdomain' | 'custom' | 'path'>('subdomain');
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [subdomainInput, setSubdomainInput] = useState('');
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [dnsRecords, setDnsRecords] = useState<Array<{ type: string; name: string; value: string; description: string }>>([]);
  const [registeringCustom, setRegisteringCustom] = useState(false);
  const [baseDomain, setBaseDomain] = useState(process.env.NEXT_PUBLIC_BASE_DOMAIN || 'theraos.app');
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Verificação se a conta já possui subdomínio ou domínio próprio cadastrado
  const hasAccountDomainConfigured = Boolean(tenant?.slug || tenant?.domain);

  // Dynamically load Google Fonts for real-time preview
  useEffect(() => {
    if (!fontHeading && !fontBody) return;
    const fontsToLoad = Array.from(new Set([fontHeading, fontBody].filter(Boolean)));
    const fontFamilies = fontsToLoad.map(f => f.replace(/\s+/g, '+')).join('&family=');
    const href = `https://fonts.googleapis.com/css2?family=${fontFamilies}:wght@400;600;700&display=swap`;

    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  }, [fontHeading, fontBody]);

  // SEO states (auto-computed)
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // Media library state
  const [libraryOpen, setLibraryOpen] = useState(false);

  // Extracted Brand Colors from uploaded Logo or Favicon
  const [extractedBrandColors, setExtractedBrandColors] = useState<string[]>([]);
  const [isExtractingColors, setIsExtractingColors] = useState(false);
  const [activeColorPopover, setActiveColorPopover] = useState<'primaryStart' | 'primaryEnd' | 'contrast' | null>(null);

  // SEO & Social Media Optimization states
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoSocialImage, setSeoSocialImage] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [seoKeywordsInput, setSeoKeywordsInput] = useState('');
  const [seoAllowIndexing, setSeoAllowIndexing] = useState(true);
  const [seoLibraryOpen, setSeoLibraryOpen] = useState(false);
  const [seoPreviewTab, setSeoPreviewTab] = useState<'google' | 'social'>('google');

  // Draft Storage & Auto-save Logic (Multi-draft support)
  const draftsStorageKey = tenant?.id ? `psi_page_drafts_${tenant.id}` : 'psi_page_drafts_global';

  const [currentDraftId, setCurrentDraftId] = useState<string>('');
  const [savedDraftsList, setSavedDraftsList] = useState<any[]>([]);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [hasDraftRestored, setHasDraftRestored] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const isInitialDraftCheckDone = useRef(false);

  // Helper to load a draft object and sync URL search parameter
  const loadDraftData = (draftToLoad: any) => {
    if (!draftToLoad) return;
    setCurrentDraftId(draftToLoad.id);
    if (draftToLoad.newTitle) setNewTitle(draftToLoad.newTitle);
    if (draftToLoad.newLogoUrl) setNewLogoUrl(draftToLoad.newLogoUrl);
    if (draftToLoad.newFaviconUrl) setNewFaviconUrl(draftToLoad.newFaviconUrl);
    if (draftToLoad.customPrimaryStart) setCustomPrimaryStart(draftToLoad.customPrimaryStart);
    if (draftToLoad.customPrimaryEnd) setCustomPrimaryEnd(draftToLoad.customPrimaryEnd);
    if (draftToLoad.customContrast) setCustomContrast(draftToLoad.customContrast);
    if (draftToLoad.isCustomColor !== undefined) setIsCustomColor(draftToLoad.isCustomColor);
    if (draftToLoad.selectedPaletteId) {
      const found = COLOR_PALETTES.find((p) => p.id === draftToLoad.selectedPaletteId);
      if (found) setSelectedPalette(found);
    }
    if (draftToLoad.fontHeading) setFontHeading(draftToLoad.fontHeading);
    if (draftToLoad.fontBody) setFontBody(draftToLoad.fontBody);
    if (draftToLoad.domainMode) setDomainMode(draftToLoad.domainMode);
    if (draftToLoad.subdomainInput) setSubdomainInput(draftToLoad.subdomainInput);
    if (draftToLoad.customDomainInput) setCustomDomainInput(draftToLoad.customDomainInput);
    if (draftToLoad.newSlug) setNewSlug(draftToLoad.newSlug);
    if (draftToLoad.seoTitle) setSeoTitle(draftToLoad.seoTitle);
    if (draftToLoad.seoDescription) setSeoDescription(draftToLoad.seoDescription);
    setSeoSocialImage('');
    if (draftToLoad.seoKeywords) setSeoKeywords(draftToLoad.seoKeywords);
    if (draftToLoad.seoAllowIndexing !== undefined) setSeoAllowIndexing(draftToLoad.seoAllowIndexing);
    if (draftToLoad.currentStep && draftToLoad.currentStep >= 1 && draftToLoad.currentStep <= 5) {
      setCurrentStep(draftToLoad.currentStep);
    }
    setHasDraftRestored(true);
    setShowDraftsModal(false);

    // Sync URL search parameter without page reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('draftId', draftToLoad.id);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Helper to start a fresh draft
  const startFreshDraft = () => {
    const freshId = `draft_${Date.now()}`;
    setCurrentDraftId(freshId);
    setNewTitle('');
    setNewLogoUrl('');
    setNewFaviconUrl('');
    setIsCustomColor(false);
    setSelectedPalette(COLOR_PALETTES[0]);
    setCustomPrimaryStart('');
    setCustomPrimaryEnd('');
    setCustomContrast('');
    setFontHeading('Playfair Display');
    setFontBody('Plus Jakarta Sans');
    setDomainMode('subdomain');
    setSubdomainInput('');
    setCustomDomainInput('');
    setNewSlug('');
    setSeoTitle('');
    setSeoDescription('');
    setSeoSocialImage('');
    setSeoKeywords('');
    setSeoAllowIndexing(true);
    setCurrentStep(1);
    setHasDraftRestored(false);
    setShowDraftsModal(false);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('draftId', freshId);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Helper to delete a specific draft from storage
  const deleteDraft = (draftIdToDelete: string) => {
    try {
      const raw = localStorage.getItem(draftsStorageKey);
      let drafts: any[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(drafts)) drafts = [];
      const updated = drafts.filter((d) => d.id !== draftIdToDelete);
      localStorage.setItem(draftsStorageKey, JSON.stringify(updated));
      setSavedDraftsList(updated);

      if (currentDraftId === draftIdToDelete) {
        if (updated.length > 0) {
          loadDraftData(updated[0]);
        } else {
          startFreshDraft();
        }
      }
    } catch {}
  };

  // Restore draft on initial mount
  useEffect(() => {
    if (typeof window === 'undefined' || isInitialDraftCheckDone.current) return;
    isInitialDraftCheckDone.current = true;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const targetDraftId = urlParams.get('draftId');

      const raw = localStorage.getItem(draftsStorageKey);
      let drafts: any[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(drafts)) drafts = [];

      // Filter out empty ghost drafts
      const validDrafts = drafts.filter((d) => d.newTitle?.trim() || d.newLogoUrl || d.subdomainInput || d.currentStep > 1);
      setSavedDraftsList(validDrafts);

      if (targetDraftId && validDrafts.length > 0) {
        const found = validDrafts.find((d) => d.id === targetDraftId);
        if (found) {
          loadDraftData(found);
          return;
        }
      }

      // If targetDraftId exists in URL (e.g. F5 refresh on a new draft)
      if (targetDraftId) {
        setCurrentDraftId(targetDraftId);
        const url = new URL(window.location.href);
        url.searchParams.set('draftId', targetDraftId);
        window.history.replaceState({}, '', url.toString());
        return;
      }

      // If there are saved drafts and no targetDraftId in URL, open draft selection popup!
      if (validDrafts.length > 0) {
        setShowDraftsModal(true);
        setCurrentDraftId(validDrafts[0].id);
      } else {
        startFreshDraft();
      }
    } catch {
      startFreshDraft();
    }
  }, [draftsStorageKey]);

  // Auto-save draft on form state updates and sync URL
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialDraftCheckDone.current || !currentDraftId) return;

    const hasDataToSave = Boolean(
      newTitle.trim() ||
      newLogoUrl ||
      newFaviconUrl ||
      currentStep > 1 ||
      subdomainInput ||
      customDomainInput ||
      newSlug ||
      seoTitle ||
      seoDescription ||
      seoSocialImage
    );

    if (!hasDataToSave) return;

    // Sync URL search parameter with currentDraftId
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('draftId') !== currentDraftId) {
      const url = new URL(window.location.href);
      url.searchParams.set('draftId', currentDraftId);
      window.history.replaceState({}, '', url.toString());
    }

    const draftData = {
      id: currentDraftId,
      tenantId: tenant?.id,
      updatedAt: new Date().toISOString(),
      currentStep,
      newTitle,
      newLogoUrl,
      newFaviconUrl,
      isCustomColor,
      selectedPaletteId: selectedPalette.id,
      customPrimaryStart,
      customPrimaryEnd,
      customContrast,
      fontHeading,
      fontBody,
      domainMode,
      subdomainInput,
      customDomainInput,
      newSlug,
      seoTitle,
      seoDescription,
      seoSocialImage: '',
      seoKeywords,
      seoAllowIndexing,
    };

    try {
      const raw = localStorage.getItem(draftsStorageKey);
      let drafts: any[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(drafts)) drafts = [];

      const idx = drafts.findIndex((d) => d.id === currentDraftId);
      if (idx >= 0) {
        drafts[idx] = draftData;
      } else {
        drafts.unshift(draftData);
      }

      localStorage.setItem(draftsStorageKey, JSON.stringify(drafts));
      setSavedDraftsList(drafts);
      setIsDraftSaved(true);
    } catch {
      // Ignore storage quota errors
    }
  }, [
    draftsStorageKey,
    currentDraftId,
    tenant?.id,
    currentStep,
    newTitle,
    newLogoUrl,
    newFaviconUrl,
    isCustomColor,
    selectedPalette.id,
    customPrimaryStart,
    customPrimaryEnd,
    customContrast,
    fontHeading,
    fontBody,
    domainMode,
    subdomainInput,
    customDomainInput,
    newSlug,
    seoTitle,
    seoDescription,
    seoSocialImage,
    seoKeywords,
    seoAllowIndexing,
  ]);

  const handleDiscardDraft = () => {
    if (typeof window !== 'undefined' && currentDraftId) {
      try {
        const raw = localStorage.getItem(draftsStorageKey);
        let drafts: any[] = raw ? JSON.parse(raw) : [];
        if (Array.isArray(drafts)) {
          drafts = drafts.filter((d) => d.id !== currentDraftId);
          localStorage.setItem(draftsStorageKey, JSON.stringify(drafts));
        }
      } catch {}
    }
    setHasDraftRestored(false);
    setIsDraftSaved(false);
    setCurrentDraftId(`draft_${Date.now()}`);
    setNewTitle('');
    setNewLogoUrl('');
    setNewFaviconUrl('');
    setSubdomainInput('');
    setCustomDomainInput('');
    setNewSlug('');
    setCurrentStep(1);
  };

  // Extract colors from both logo and icon via Canvas API & Color Clustering
  useEffect(() => {
    if (!newLogoUrl && !newFaviconUrl) {
      setExtractedBrandColors([]);
      setIsExtractingColors(false);
      return;
    }

    let isMounted = true;
    setIsExtractingColors(true);

    const rgbToHsl = (r: number, g: number, b: number) => {
      const rNorm = r / 255;
      const gNorm = g / 255;
      const bNorm = b / 255;
      const max = Math.max(rNorm, gNorm, bNorm);
      const min = Math.min(rNorm, gNorm, bNorm);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
          case gNorm: h = (bNorm - rNorm) / d + 2; break;
          case bNorm: h = (rNorm - gNorm) / d + 4; break;
        }
        h /= 6;
      }
      return { h, s, l };
    };

    const hexToRgb = (hex: string) => {
      const cleanHex = hex.replace('#', '');
      return {
        r: parseInt(cleanHex.substring(0, 2), 16),
        g: parseInt(cleanHex.substring(2, 4), 16),
        b: parseInt(cleanHex.substring(4, 6), 16)
      };
    };

    const colorDistance = (c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }) => {
      return Math.sqrt(
        Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2)
      );
    };

    const extractSingleImageColors = (imageUrl: string): Promise<string[]> => {
      if (!imageUrl) return Promise.resolve([]);

      return new Promise<string[]>((resolve) => {
        const processDataUrl = (dataUrl: string) => {
          const img = new Image();
          img.onload = () => {
            try {
              const targetSize = 128;
              const canvas = document.createElement('canvas');
              canvas.width = targetSize;
              canvas.height = targetSize;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (!ctx) return resolve([]);

              ctx.drawImage(img, 0, 0, targetSize, targetSize);

              let imgData: ImageData;
              try {
                imgData = ctx.getImageData(0, 0, targetSize, targetSize);
              } catch {
                return resolve([]);
              }

              const data = imgData.data;
              const colorClusters: Record<string, { r: number; g: number; b: number; count: number; satScore: number; isNeutral: boolean }> = {};

              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];

                if (a < 50) continue; // Skip transparent background

                const { s, l } = rgbToHsl(r, g, b);

                const isPureWhite = l > 0.96 && s < 0.08;
                const isPureBlack = l < 0.04 && s < 0.08;
                const isNeutralGray = s < 0.08;
                const isNeutral = isPureWhite || isPureBlack || isNeutralGray;

                // Quantize RGB in steps of 16 for clean color grouping
                const qr = Math.min(255, Math.floor(r / 16) * 16 + 8);
                const qg = Math.min(255, Math.floor(g / 16) * 16 + 8);
                const qb = Math.min(255, Math.floor(b / 16) * 16 + 8);

                const hex = `#${((1 << 24) + (qr << 16) + (qg << 8) + qb).toString(16).slice(1).toUpperCase()}`;

                if (!colorClusters[hex]) {
                  colorClusters[hex] = { r: qr, g: qg, b: qb, count: 0, satScore: s, isNeutral };
                }
                colorClusters[hex].count += 1;
              }

              // Score clusters: Vibrant colors get up to 5x weight boost over neutral grays
              const sortedClusters = Object.entries(colorClusters)
                .map(([hex, d]) => ({
                  hex,
                  ...d,
                  score: d.count * (d.isNeutral ? 0.3 : (1 + d.satScore * 4))
                }))
                .sort((a, b) => b.score - a.score);

              // Select top distinct colors (minimum visual distance = 30)
              const resultColors: string[] = [];
              for (const item of sortedClusters) {
                const rgb = { r: item.r, g: item.g, b: item.b };
                const isTooClose = resultColors.some(existingHex => {
                  const existingRgb = hexToRgb(existingHex);
                  return colorDistance(rgb, existingRgb) < 30;
                });

                if (!isTooClose) {
                  resultColors.push(item.hex);
                }
                if (resultColors.length >= 6) break;
              }

              resolve(resultColors);
            } catch {
              resolve([]);
            }
          };

          img.onerror = () => resolve([]);
          img.src = dataUrl;
        };

        if (imageUrl.startsWith('data:')) {
          processDataUrl(imageUrl);
          return;
        }

        // Use local proxy endpoint to guarantee 100% same-origin data URL loading without CORS canvas tainting
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
        fetch(proxyUrl)
          .then((res) => {
            if (!res.ok) throw new Error(`Proxy fetch failed: ${res.status}`);
            return res.blob();
          })
          .then((blob) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const resData = reader.result as string;
              if (resData) {
                processDataUrl(resData);
              } else {
                resolve([]);
              }
            };
            reader.onerror = () => resolve([]);
            reader.readAsDataURL(blob);
          })
          .catch(() => {
            fetch(imageUrl, { mode: 'cors' })
              .then(res => res.blob())
              .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => processDataUrl(reader.result as string);
                reader.onerror = () => resolve([]);
                reader.readAsDataURL(blob);
              })
              .catch(() => resolve([]));
          });
      });
    };

    Promise.all([
      extractSingleImageColors(newLogoUrl),
      extractSingleImageColors(newFaviconUrl),
    ]).then(([logoColors, faviconColors]) => {
      if (!isMounted) return;
      const combined = [...logoColors, ...faviconColors];
      const deduplicated: string[] = [];

      for (const hex of combined) {
        if (!deduplicated.includes(hex)) {
          deduplicated.push(hex);
        }
      }

      // Always include #FFFFFF (Branco) and #000000 (Preto) in extractedBrandColors
      if (!deduplicated.includes('#FFFFFF')) deduplicated.push('#FFFFFF');
      if (!deduplicated.includes('#000000')) deduplicated.push('#000000');

      setExtractedBrandColors(deduplicated.slice(0, 10));
      setIsExtractingColors(false);

      // Auto-set optimal contrast text color (White #FFFFFF or Black #000000) for customContrast
      const primaryHex = deduplicated[0] || '#7808C8';
      const bestContrast = getContrastColor(primaryHex);
      setCustomContrast(bestContrast);
    }).catch(() => {
      if (isMounted) setIsExtractingColors(false);
    });

    return () => {
      isMounted = false;
    };
  }, [newLogoUrl, newFaviconUrl]);

  // Extract only the first two words from name string without adding any title prefixes
  const extractFirstTwoWords = (nameStr: string): string => {
    if (!nameStr) return '';
    const parts = nameStr.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 2) return parts.join(' ');
    return `${parts[0]} ${parts[1]}`;
  };

  // Inherit psychologist default site branding & user name automatically
  useEffect(() => {
    const activeSiteLogo = tenant?.defaultSiteLogoUrl || primaryTenant?.defaultSiteLogoUrl;
    const activePrimaryColor = tenant?.defaultSitePrimaryColor || primaryTenant?.defaultSitePrimaryColor;
    const activeSecondaryColor = tenant?.defaultSiteSecondaryColor || primaryTenant?.defaultSiteSecondaryColor;
    const activeContrastColor = tenant?.contrastColor || primaryTenant?.contrastColor;

    const activeSiteFavicon = tenant?.defaultSiteFaviconUrl || primaryTenant?.defaultSiteFaviconUrl;

    if (activePrimaryColor) {
      setCustomPrimaryStart(activePrimaryColor);
    }
    if (activeSecondaryColor) {
      setCustomPrimaryEnd(activeSecondaryColor);
    }
    if (activeContrastColor) {
      setCustomContrast(activeContrastColor);
    }
    if (activeSiteLogo && !newLogoUrl) {
      setNewLogoUrl(activeSiteLogo);
    }
    if (activeSiteFavicon && !newFaviconUrl) {
      setNewFaviconUrl(activeSiteFavicon);
    }
  }, [tenant, primaryTenant]);

  const hasInitializedTitle = useRef(false);

  useEffect(() => {
    if (hasInitializedTitle.current) return;
    if (!user && !tenant) return;

    let rawName = '';
    if (user?.nome) {
      rawName = user.sobrenome ? `${user.nome} ${user.sobrenome}`.trim() : user.nome.trim();
    } else if (tenant?.name) {
      rawName = tenant.name.trim();
    }

    const defaultName = extractFirstTwoWords(rawName);

    if (defaultName) {
      hasInitializedTitle.current = true;
      setNewTitle(defaultName);
      const generatedSlug = defaultName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      setNewSlug(generatedSlug);
      setSeoTitle(`${defaultName} | Psicologia Clínica`);
      setSeoDescription(`Atendimento psicológico especializado com ${defaultName}. Agende sua consulta presencial ou online com segurança.`);
    }
  }, [user, tenant]);

  const checkRootAvailabilityAndSetDefaultSlug = useCallback(async () => {
    if (!tenant?.id) return;
    try {
      const existingPages = await api.getCapturePages(tenant.id);
      const isRootTaken = existingPages.some((p: any) => !p.slug || p.slug.trim() === '');
      if (!isRootTaken) {
        setNewSlug('');
      } else {
        const generatedSlug = newTitle
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-');
        setNewSlug(generatedSlug);
      }
    } catch {
      // Ignorar erros
    }
  }, [tenant?.id, newTitle]);

  useEffect(() => {
    if (currentStep === 3) {
      checkRootAvailabilityAndSetDefaultSlug();
    }
  }, [currentStep, checkRootAvailabilityAndSetDefaultSlug]);

  // Auto generate SEO from Title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewTitle(val);

    if (val.trim()) {
      setSeoTitle(`${val.trim()} | Psicologia Clínica`);
      setSeoDescription(`Atendimento psicológico especializado com ${val.trim()}. Agende sua consulta presencial ou online com segurança.`);
    }
  };

  // Compute active colors
  const activePrimaryStart = isCustomColor ? customPrimaryStart : selectedPalette.primaryStart;
  const activePrimaryEnd = isCustomColor ? customPrimaryEnd : selectedPalette.primaryEnd;
  const activeContrast = isCustomColor ? customContrast : selectedPalette.contrast;

  // Form submit -> create page and redirect
  const handleCreatePage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    for (let step = 1; step <= 3; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      const templateModel = DEFAULT_TEMPLATE_MODEL;
      let baseSiteConfig = JSON.parse(JSON.stringify(templateModel.siteConfig));
      let baseDictionary = JSON.parse(JSON.stringify(templateModel.dictionary));
      let baseFormFlow = JSON.parse(JSON.stringify(templateModel.formFlow));

      // Inject custom site defaults if provided
      baseSiteConfig = {
        ...baseSiteConfig,
        logoUrl: newLogoUrl.trim() || tenant?.defaultSiteLogoUrl || primaryTenant?.defaultSiteLogoUrl || undefined,
        logoConfig: tenant?.defaultSiteLogoConfig || primaryTenant?.defaultSiteLogoConfig || { mode: 'html', text: newTitle.trim(), iconType: 'psi' },
        faviconUrl: newFaviconUrl.trim() || tenant?.defaultSiteFaviconUrl || primaryTenant?.defaultSiteFaviconUrl || undefined,
        images: {
          hero: '',
          portrait: '',
          officeSpace: '',
          gallery: [],
        },
        theme: {
          ...(baseSiteConfig.theme || {}),
          typography: {
            fontHeading,
            fontBody,
          },
          colors: {
            ...(baseSiteConfig.theme?.colors || {}),
            primaryStart: activePrimaryStart,
            primaryEnd: activePrimaryEnd,
            contrast: activeContrast,
            bgDark: tenant?.bgLightColor || '#FAFAFA',
            textDark: '#18181B',
          }
        }
      };

      let activeSocialImage = seoSocialImage.trim();
      if (!activeSocialImage) {
        const autoCover = await autoGenerateCanvasSocialImage();
        if (autoCover) activeSocialImage = autoCover;
      }

      const seoConfig = {
        metaTitle: seoTitle.trim() || `${newTitle.trim()} | Psicologia Clínica`,
        metaDescription: seoDescription.trim() || `Atendimento psicológico especializado com ${newTitle.trim()}. Agende sua consulta de forma segura.`,
        socialImage: activeSocialImage || undefined,
        keywords: seoKeywords.trim() || 'psicologia, terapia, consulta psicologica, atendimento online',
        allowIndexing: seoAllowIndexing,
      };

      const effectiveSlug = newSlug.trim().toLowerCase().replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9-]/g, '');
      const effectiveSubdomain = (subdomainInput || tenant?.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

      // Dupla checagem de segurança da disponibilidade da slug antes de salvar no banco
      const isSlugAvailable = await validateSlugAvailability(effectiveSlug);
      if (!isSlugAvailable) {
        setSubmitting(false);
        setCurrentStep(3);
        return;
      }

      // Atualiza os registros no nível da conta APENAS se a conta ainda não possuir subdomínio ou domínio cadastrado
      const tenantUpdates: Record<string, any> = {};
      if (!tenant?.slug && effectiveSubdomain && tenant?.id) {
        tenantUpdates.slug = effectiveSubdomain;
      }
      if (!tenant?.domain && domainMode === 'custom' && customDomainInput.trim() && tenant?.id) {
        tenantUpdates.domain = customDomainInput.trim().toLowerCase();
      }

      if (Object.keys(tenantUpdates).length > 0 && tenant?.id) {
        await api.updateTenantBranding(tenant.id, tenantUpdates).catch(() => {});
      }

      const res = await api.createCapturePage({
        title: newTitle.trim(),
        slug: effectiveSlug,
        tenantId: tenant?.id,
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
        if (typeof window !== 'undefined' && currentDraftId) {
          try {
            const raw = localStorage.getItem(draftsStorageKey);
            let drafts: any[] = raw ? JSON.parse(raw) : [];
            if (Array.isArray(drafts)) {
              drafts = drafts.filter((d) => d.id !== currentDraftId);
              localStorage.setItem(draftsStorageKey, JSON.stringify(drafts));
            }
          } catch {}
        }
        await api.updateCapturePage(res.page.id, {
          slug: effectiveSlug,
          slugDraft: effectiveSlug,
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

  // DNS Setup & Verification Modal states
  const [showDnsModal, setShowDnsModal] = useState(false);
  const [verifyingDns, setVerifyingDns] = useState(false);
  const [domainVerified, setDomainVerified] = useState<boolean | null>(null);
  const [domainStatus, setDomainStatus] = useState<string>('pending');
  const [copiedField, setCopiedField] = useState<string | null>(null);

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
      const res = await api.checkSubdomainAvailability(slugToCheck, tenant?.id);
      setSubdomainAvailable(res.available);
    } catch {
      setSubdomainAvailable(null);
    } finally {
      setCheckingSubdomain(false);
    }
  }, [tenant?.id]);

  // Open DNS Setup Modal & Register Custom Hostname
  const handleOpenSetupModal = async () => {
    if (!customDomainInput.trim()) {
      setError('Digite o seu domínio próprio antes de abrir o setup.');
      return;
    }
    setRegisteringCustom(true);
    setError('');
    try {
      const res = await api.registerCustomHostname(null, customDomainInput.trim());
      if (res.dnsRecords && res.dnsRecords.length > 0) {
        setDnsRecords(res.dnsRecords);
      } else {
        setDnsRecords([
          { type: 'CNAME', name: 'www', value: `cname.${baseDomain}`, description: 'Redirecionamento do subdomínio www' },
          { type: 'A', name: '@ (ou em branco)', value: '185.199.108.153', description: 'Endereço IP do servidor do site' }
        ]);
      }
      if (res.status === 'active' || res.status === 'verified') {
        setDomainVerified(true);
        setDomainStatus('active');
      }
      setShowDnsModal(true);
    } catch (err: any) {
      // Fallback em caso de falha de API ou sem chaves configuradas
      setDnsRecords([
        { type: 'CNAME', name: 'www', value: `cname.${baseDomain}`, description: 'Redirecionamento do subdomínio www' },
        { type: 'A', name: '@ (ou em branco)', value: '185.199.108.153', description: 'Endereço IP do servidor do site' }
      ]);
      setShowDnsModal(true);
    } finally {
      setRegisteringCustom(false);
    }
  };

  // Live Verification of DNS Pointing
  const handleVerifyDomainDns = async () => {
    if (!customDomainInput.trim()) return;
    setVerifyingDns(true);
    setError('');
    try {
      const res = await api.verifyCustomHostname(customDomainInput.trim());
      const isOk = Boolean(res.sslActive || res.status === 'active' || res.status === 'verified');
      setDomainVerified(isOk);
      setDomainStatus(res.status || (isOk ? 'active' : 'pending'));
    } catch {
      setDomainVerified(false);
      setDomainStatus('pending');
    } finally {
      setVerifyingDns(false);
    }
  };

  // Generate Automatic 1200x630px Open Graph Social Image via Canvas API (Pixel-perfect replicate of site branding & button gradient)
  const autoGenerateCanvasSocialImage = async (): Promise<string | null> => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const siteBgColor = tenant?.bgLightColor || '#FFFFFF';
      const startColor = activePrimaryStart || '#c5825d';
      const endColor = activePrimaryEnd || '#458270';
      const textDarkColor = '#18181B';
      const textMutedColor = '#4B5563';

      // 1. Top Section Background (77% height = 485px) - EXACT SITE BACKGROUND
      ctx.fillStyle = siteBgColor;
      ctx.fillRect(0, 0, 1200, 485);

      // 2. Bottom Accent Bar (23% height = 145px) - EXACT BUTTON GRADIENT
      const gradient = ctx.createLinearGradient(0, 485, 1200, 630);
      gradient.addColorStop(0, startColor);
      gradient.addColorStop(1, endColor);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 485, 1200, 145);

      // 3. Draw subtle background watermark / monogram on top right
      ctx.save();
      ctx.fillStyle = 'rgba(24, 24, 27, 0.04)';
      ctx.font = 'bold 360px sans-serif';
      ctx.fillText('Ψ', 840, 410);
      ctx.restore();

      // 4. Top Left: Draw EXACT Site Logo or Brand Icon + Title
      const logoToDraw = newLogoUrl.trim() || (tenant as any)?.siteConfig?.logoUrl || (tenant as any)?.logoUrl || '';
      const iconToDraw = newFaviconUrl.trim() || (tenant as any)?.siteConfig?.faviconUrl || (tenant as any)?.faviconUrl || '';

      if (logoToDraw) {
        // CASO 1: Logotipo em Imagem enviado
        try {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
            img.src = logoToDraw;
          });
          const maxH = 170;
          const aspect = img.width / img.height;
          const logoW = Math.min(560, maxH * aspect);
          const logoH = logoW / aspect;
          ctx.drawImage(img, 80, 55, logoW, logoH);
        } catch {
          ctx.fillStyle = textDarkColor;
          ctx.font = `bold 44px '${fontHeading || 'serif'}', serif`;
          ctx.fillText((newTitle || 'GEOVANNA SANTOS').toUpperCase(), 80, 115);
        }
      } else if (iconToDraw) {
        // CASO 2: Apenas Ícone/Favicon enviado + Nome da Psicóloga em texto (1ª etapa)
        try {
          const iconImg = new window.Image();
          iconImg.crossOrigin = 'anonymous';
          await new Promise((res, rej) => {
            iconImg.onload = res;
            iconImg.onerror = rej;
            iconImg.src = iconToDraw;
          });
          ctx.drawImage(iconImg, 80, 55, 80, 80);
          ctx.fillStyle = textDarkColor;
          ctx.font = `bold 44px '${fontHeading || 'serif'}', serif`;
          ctx.fillText((newTitle || 'GEOVANNA SANTOS').toUpperCase(), 180, 112);
        } catch {
          ctx.fillStyle = startColor;
          ctx.fillRect(80, 55, 80, 80);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 44px sans-serif';
          ctx.fillText('Ψ', 104, 112);

          ctx.fillStyle = textDarkColor;
          ctx.font = `bold 44px '${fontHeading || 'serif'}', serif`;
          ctx.fillText((newTitle || 'GEOVANNA SANTOS').toUpperCase(), 180, 112);
        }
      } else {
        // CASO 3: Nada enviado (Fallback padrão: Caixa Psi com gradiente + Nome da Psicóloga da 1ª etapa)
        ctx.fillStyle = startColor;
        ctx.fillRect(80, 55, 80, 80);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 44px sans-serif';
        ctx.fillText('Ψ', 104, 112);

        ctx.fillStyle = textDarkColor;
        ctx.font = `bold 44px '${fontHeading || 'serif'}', serif`;
        ctx.fillText((newTitle || 'GEOVANNA SANTOS').toUpperCase(), 180, 112);
      }

      // 5. Subheadline Description Text (muted site text, fontBody)
      ctx.fillStyle = textMutedColor;
      ctx.font = `300 26px '${fontBody || 'sans-serif'}', sans-serif`;

      const subText = seoDescription.trim() || `Atendimento psicológico especializado com ${newTitle || 'a profissional'}. Agende sua consulta presencial ou online com segurança e clareza.`;
      const subWords = subText.split(' ');
      let subLine = '';
      let subY = 275;
      for (let j = 0; j < subWords.length; j++) {
        const testSub = subLine + subWords[j] + ' ';
        const subMetrics = ctx.measureText(testSub);
        if (subMetrics.width > 960 && j > 0) {
          ctx.fillText(subLine, 80, subY);
          subLine = subWords[j] + ' ';
          subY += 40;
        } else {
          subLine = testSub;
        }
      }
      ctx.fillText(subLine, 80, subY);

      // 7. Bottom Bar Content (Gradient Bar)
      // Left: Website Domain URL in white
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px monospace';
      const domainText = `https://${domainMode === 'custom' && customDomainInput.trim() ? customDomainInput.trim() : `${subdomainInput || tenant?.slug || 'sua-clinica'}.${baseDomain}`}${newSlug ? `/${newSlug}` : '/'}`;
      ctx.fillText(domainText, 80, 560);

      // Right: Large Prominent CTA
      ctx.font = 'bold 22px sans-serif';
      const ctaText = 'AGENDE SUA CONSULTA →';
      const ctaWidth = ctx.measureText(ctaText).width;

      // Subtle pill background for CTA
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(1120 - ctaWidth - 30, 530, ctaWidth + 30, 48, 14);
      } else {
        ctx.rect(1120 - ctaWidth - 30, 530, ctaWidth + 30, 48);
      }
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(ctaText, 1120 - ctaWidth - 15, 562);

      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', 0.92));
      if (!blob) return null;

      const file = new File([blob], `social-cover-${Date.now()}.webp`, { type: 'image/webp' });
      const { url } = await api.uploadImage(file, 'asset');
      return url || null;
    } catch (err) {
      console.error('Auto generate social cover error:', err);
      return null;
    }
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

/**
 * Calcula a melhor cor de contraste (Branco #FFFFFF ou Preto #000000)
 * baseada na luminância relativa da cor hexadecimal.
 */
function getContrastColor(hexColor: string): '#FFFFFF' | '#000000' {
  if (!hexColor || !hexColor.startsWith('#')) return '#FFFFFF';
  const cleanHex = hexColor.replace('#', '');
  if (cleanHex.length !== 6 && cleanHex.length !== 3) return '#FFFFFF';

  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }

  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.55 ? '#000000' : '#FFFFFF';
}

  // Render a color swatch button with popover dropdown (if logo/icon is present)
  const renderColorPickerWithPopover = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    popoverKey: 'primaryStart' | 'primaryEnd' | 'contrast'
  ) => {
    const isOpen = activeColorPopover === popoverKey;
    const hasImageUploaded = Boolean(newLogoUrl || newFaviconUrl);

    const handleSwatchClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Se o usuário selecionou ao menos um logotipo ou ícone, abre o overlay
      if (hasImageUploaded) {
        setActiveColorPopover(isOpen ? null : popoverKey);
      } else {
        // Caso contrário (sem imagem), dispara diretamente o seletor nativo hexadecimal
        const colorInput = e.currentTarget.parentElement?.querySelector<HTMLInputElement>('input[type="color"]');
        colorInput?.click();
      }
    };

    return (
      <div className="space-y-1.5 relative">
        <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">
          {label}
        </label>
        
        <div className="flex items-center gap-2">
          {/* Swatch Button */}
          <button
            type="button"
            onClick={handleSwatchClick}
            className="h-10 w-12 rounded-xl border border-[var(--surface-border)] shadow-sm cursor-pointer p-1 transition-all hover:scale-105 flex items-center justify-center relative overflow-hidden shrink-0"
            style={{ backgroundColor: value }}
            title={hasImageUploaded ? "Escolher entre as cores da marca" : "Escolher Cor Hexadecimal"}
          >
            <div className="w-full h-full rounded-lg border border-black/10 dark:border-white/20" />
          </button>

          {/* Hidden native color input triggered directly when no image is present */}
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />

          {/* Hex Text Input */}
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`brand-input text-xs font-mono h-10 ${
              value && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value) ? '!border-red-500/80 focus:!border-red-500' : ''
            }`}
          />
        </div>
        {value && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value) && (
          <span className="text-[10px] text-red-500 font-medium flex items-center gap-1 pt-0.5">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>Hexadecimal inválido (ex: #C5825D)</span>
          </span>
        )}

        {/* POPOVER OVERLAY DROPDOWN (Apenas se tiver logotipo ou ícone) */}
        {isOpen && hasImageUploaded && (
          <>
            {/* Backdrop click to close */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setActiveColorPopover(null)}
            />

            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-full left-0 mt-2 z-50 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-700 shadow-2xl space-y-3 min-w-[220px] animate-in fade-in zoom-in-95 duration-150 bg-white dark:bg-zinc-950 text-slate-900 dark:text-white backdrop-blur-md"
            >
              {/* Seção Única: CORES DO LOGOTIPO */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> CORES DA SUA MARCA
                </span>

                {isExtractingColors ? (
                  <div className="flex items-center gap-2 py-1 text-slate-500 dark:text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    <span className="text-[11px] italic">Lendo cores da imagem...</span>
                  </div>
                ) : extractedBrandColors.length > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {extractedBrandColors.map((hex, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          onChange(hex);
                          setActiveColorPopover(null);
                        }}
                        className={`h-7 w-7 rounded-lg border border-slate-300 dark:border-white/20 transition-all hover:scale-110 cursor-pointer shadow-xs ${
                          value.toUpperCase() === hex.toUpperCase() ? 'ring-2 ring-amber-500 dark:ring-amber-400 scale-105' : ''
                        }`}
                        style={{ backgroundColor: hex }}
                        title={`Cor ${hex}`}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-1 text-slate-500 dark:text-slate-400">
                    <span className="text-[11px] italic">Nenhuma cor adicional identificada.</span>
                  </div>
                )}
              </div>

              {/* Opção Seletor Livre Hex (+) */}
              <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Outra Cor:</span>
                <label
                  onClick={(e) => e.stopPropagation()}
                  className="h-7 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-zinc-600 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>Escolher +</span>
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => {
                      onChange(e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Step validation logic for mandatory configurations
  const validateStep = (stepToValidate: number): boolean => {
    setError('');

    // Etapa 1: Nome da Psicóloga & Logotipo
    if (stepToValidate === 1) {
      const trimmedTitle = newTitle.trim();
      if (!trimmedTitle) {
        setError('O Nome da Psicóloga / Página é obrigatório para continuar.');
        return false;
      }
      if (trimmedTitle.length < 2) {
        setError('O Nome da Psicóloga / Página deve conter pelo menos 2 caracteres.');
        return false;
      }
    }

    // Etapa 2: Paleta de Cores & Estilo
    if (stepToValidate === 2) {
      if (isCustomColor) {
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!customPrimaryStart || !hexRegex.test(customPrimaryStart)) {
          setError('A Cor Primária deve ter um formato hexadecimal válido (ex: #458270).');
          return false;
        }
        if (!customPrimaryEnd || !hexRegex.test(customPrimaryEnd)) {
          setError('A Cor Secundária deve ter um formato hexadecimal válido (ex: #A64E2B).');
          return false;
        }
        if (!customContrast || !hexRegex.test(customContrast)) {
          setError('A Cor de Contraste deve ter um formato hexadecimal válido (ex: #FFFFFF).');
          return false;
        }
      }
    }

    // Etapa 3: Escolha do Endereço na Internet (Domínio & Slug)
    if (stepToValidate === 3) {
      if (!hasAccountDomainConfigured) {
        if (domainMode === 'subdomain') {
          const sub = (subdomainInput || tenant?.slug || '').trim().toLowerCase();
          if (!sub) {
            setError('Informe o nome do subdomínio TheraOS para continuar.');
            return false;
          }
          if (!/^[a-z0-9-]+$/.test(sub)) {
            setError('O subdomínio deve conter apenas letras minúsculas, números e hífens.');
            return false;
          }
          if (subdomainAvailable === false) {
            setError('O subdomínio informado já está em uso por outro site. Escolha outro subdomínio.');
            return false;
          }
        } else if (domainMode === 'custom') {
          const custom = customDomainInput.trim().toLowerCase();
          if (!custom) {
            setError('Informe o seu domínio próprio (ex: www.suaclinica.com.br) para continuar.');
            return false;
          }
          const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
          if (!domainRegex.test(custom)) {
            setError('Informe um formato de domínio próprio válido (ex: www.suaclinica.com.br).');
            return false;
          }
        }
      }

      if (newSlug.trim()) {
        const cleanSlug = newSlug.trim().toLowerCase();
        if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
          setError('O endereço da página (slug) deve conter apenas letras minúsculas, números e hífens.');
          return false;
        }
      }
    }

    // Etapa 4: SEO & Redes Sociais
    if (stepToValidate === 4) {
      const trimmedSeoTitle = seoTitle.trim();
      if (!trimmedSeoTitle) {
        setError('O Meta Title de SEO é obrigatório para continuar.');
        return false;
      }
      if (trimmedSeoTitle.length < 2) {
        setError('O Meta Title de SEO deve conter pelo menos 2 caracteres.');
        return false;
      }
      const trimmedSeoDesc = seoDescription.trim();
      if (!trimmedSeoDesc) {
        setError('A Meta Description de SEO é obrigatória para continuar.');
        return false;
      }
      if (trimmedSeoDesc.length < 10) {
        setError('A Meta Description de SEO deve conter pelo menos 10 caracteres.');
        return false;
      }
    }

    return true;
  };

  // Verificação assíncrona de disponibilidade da slug entre páginas existentes da conta
  const validateSlugAvailability = async (slugToCheck: string): Promise<boolean> => {
    const cleanSlug = slugToCheck.trim().toLowerCase().replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9-]/g, '');
    if (!tenant?.id) return true;

    setCheckingSlug(true);
    try {
      const existingPages = await api.getCapturePages(tenant.id);
      const duplicate = existingPages.find(
        (p) => (p.slug || '').toLowerCase() === cleanSlug || (p.slugDraft || '').toLowerCase() === cleanSlug
      );
      if (duplicate) {
        setError(`O endereço / slug '/${cleanSlug}' já está sendo utilizado pela página "${duplicate.title || 'existente'}". Escolha um caminho diferente para evitar sobreposição de páginas.`);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Erro ao verificar disponibilidade da slug:', err);
      return true;
    } finally {
      setCheckingSlug(false);
    }
  };

  // Fast validation check without side-effects (for disabling buttons in real-time)
  const isStepValid = useCallback((stepToCheck: number): boolean => {
    if (stepToCheck === 1) {
      const trimmedTitle = newTitle.trim();
      return Boolean(trimmedTitle && trimmedTitle.length >= 2);
    }

    if (stepToCheck === 2) {
      if (isCustomColor) {
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!customPrimaryStart || !hexRegex.test(customPrimaryStart)) return false;
        if (!customPrimaryEnd || !hexRegex.test(customPrimaryEnd)) return false;
        if (!customContrast || !hexRegex.test(customContrast)) return false;
      }
      return true;
    }

    if (stepToCheck === 3) {
      if (checkingSlug) return false;
      if (!hasAccountDomainConfigured) {
        if (domainMode === 'subdomain') {
          const sub = (subdomainInput || tenant?.slug || '').trim().toLowerCase();
          if (!sub || !/^[a-z0-9-]+$/.test(sub)) return false;
          if (checkingSubdomain || subdomainAvailable === false) return false;
        } else if (domainMode === 'custom') {
          const custom = customDomainInput.trim().toLowerCase();
          const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
          if (!custom || !domainRegex.test(custom)) return false;
        }
      }

      if (newSlug.trim()) {
        const cleanSlug = newSlug.trim().toLowerCase();
        if (!/^[a-z0-9-]+$/.test(cleanSlug)) return false;
      }

      return true;
    }

    if (stepToCheck === 4) {
      const trimmedSeoTitle = seoTitle.trim();
      const trimmedSeoDesc = seoDescription.trim();
      return Boolean(trimmedSeoTitle && trimmedSeoTitle.length >= 2 && trimmedSeoDesc && trimmedSeoDesc.length >= 10);
    }

    return true;
  }, [newTitle, isCustomColor, customPrimaryStart, customPrimaryEnd, customContrast, domainMode, subdomainInput, tenant?.slug, checkingSubdomain, subdomainAvailable, customDomainInput, newSlug, checkingSlug, hasAccountDomainConfigured, seoTitle, seoDescription]);

  const handleStepClick = async (targetStep: number) => {
    setError('');
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep);
      return;
    }
    for (let step = 1; step < targetStep; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        return;
      }
      if (step === 3) {
        const isSlugAvailable = await validateSlugAvailability(newSlug);
        if (!isSlugAvailable) {
          setCurrentStep(3);
          return;
        }
      }
    }
    setCurrentStep(targetStep);
  };

  const nextStep = async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep === 3) {
      const isSlugAvailable = await validateSlugAvailability(newSlug);
      if (!isSlugAvailable) return;

      if (!hasAccountDomainConfigured && domainMode === 'subdomain' && subdomainInput.trim()) {
        checkSubdomain(subdomainInput.trim());
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const prevStep = () => {
    setError('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="min-h-[85vh] space-y-6 animate-page-enter max-w-7xl mx-auto pb-12">
      {/* Top Bar / Breadcrumb Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl glass-md border border-[var(--surface-border)]">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/captacao" className="no-underline">
            <button
              type="button"
              className="h-9 w-9 rounded-xl glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Captação</span>
              <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-600" />
              <span className="text-[var(--brand-gradient-start)] font-bold">Nova Página</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Criar Nova Página de Captação</h1>
          </div>
        </div>

        {/* Step Progress Pill Nav & Draft Indicator */}
        <div className="flex items-center gap-3">
          {isDraftSaved && (
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-xl animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Salvo Automático</span>
            </div>
          )}

          <div className="flex items-center gap-2 glass-md p-1.5 rounded-xl border border-[var(--surface-border)] overflow-x-auto">
            {[
              { num: 1, title: 'Nome' },
              { num: 2, title: 'Identidade Visual' },
              { num: 3, title: 'Escolha de Endereço' },
              { num: 4, title: 'SEO & Redes Sociais' },
              { num: 5, title: 'Revisão' }
            ].map((s) => {
              const isActive = currentStep === s.num;
              const isDone = currentStep > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => handleStepClick(s.num)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-md'
                      : isDone
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-200 dark:bg-black/20 text-slate-700 dark:text-slate-200">
                    {isDone ? <Check className="h-3 w-3" /> : s.num}
                  </span>
                  <span className="hidden sm:inline">{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {hasDraftRestored && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
            <span>Rascunho restaurado automaticamente de onde você parou.</span>
          </div>
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="text-[11px] font-bold underline hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer shrink-0"
          >
            Descartar Rascunho
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Split View Container: Left Form Steps | Right Live Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Steps Card */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6 md:p-8 glass-md border border-[var(--surface-border)] rounded-2xl space-y-6 shadow-xl">
            {/* ETAPA 1: Nome da Psicóloga */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-1 border-b border-[var(--surface-border)] pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-gradient-start)] block">
                    Etapa 1 de 4
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nome da Psicóloga / Página</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Informe o nome de exibição principal para o seu site.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Nome da Página / Psicóloga <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="Ex: Dra. Geovanna Bastos - Psicologia Clínica"
                    value={newTitle}
                    onChange={handleTitleChange}
                    className={`brand-input text-sm h-11 transition-all ${
                      !newTitle.trim() || newTitle.trim().length < 2 ? '!border-red-500 focus:!border-red-500 focus:!ring-2 focus:!ring-red-500/20' : ''
                    }`}
                  />
                  {!newTitle.trim() ? (
                    <span className="text-[11px] font-semibold text-red-500 dark:text-red-400 flex items-center gap-1.5 pt-0.5 animate-in fade-in duration-200">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                      <span>O Nome da Psicóloga / Página é obrigatório para continuar.</span>
                    </span>
                  ) : newTitle.trim().length < 2 ? (
                    <span className="text-[11px] font-semibold text-red-500 dark:text-red-400 flex items-center gap-1.5 pt-0.5 animate-in fade-in duration-200">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                      <span>O nome deve conter pelo menos 2 caracteres.</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Este nome aparecerá em destaque no cabeçalho e títulos principais do site.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ETAPA 2: Identidade Visual & Estilo da Marca */}
            {currentStep === 2 && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="space-y-1 border-b border-[var(--surface-border)] pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-gradient-start)] block">
                    Etapa 2 de 4
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Identidade Visual & Estilo da Marca</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina o logotipo, as cores e as fontes para personalizar a identidade do seu site.
                  </p>
                </div>

                {/* 1. Selecionar Logotipo e Ícone do Site */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[var(--brand-gradient-start)]" />
                      1. Logotipo e Ícone do Site (Favicon)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Envie as imagens de marca da sua clínica (opcional).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Logotipo em Imagem (Opcional) */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Logotipo em Imagem</label>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Opcional</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Se não enviado, o sistema utilizará o Nome da Psicóloga em formato tipográfico.
                      </p>
                      {newLogoUrl ? (
                        <div className="flex items-center justify-between gap-3 p-3 glass-sm rounded-xl border border-[var(--surface-border)]">
                          <img src={newLogoUrl} alt="Logo" className="h-8 max-w-[140px] object-contain" />
                          <button
                            type="button"
                            onClick={() => setNewLogoUrl('')}
                            className="text-xs text-red-500 dark:text-red-400 hover:underline font-semibold cursor-pointer"
                          >
                            Remover
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setUploadTarget('logo');
                            setLibraryOpen(true);
                          }}
                          className="w-full py-3.5 px-3 rounded-xl glass-sm border border-dashed border-[var(--surface-border)] hover:border-[var(--brand-gradient-start)] text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                          <Upload className="h-4 w-4 text-[var(--brand-gradient-start)]" />
                          <span>Selecionar Logotipo</span>
                        </button>
                      )}
                    </div>

                    {/* Ícone do Site / Favicon (Opcional) */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Ícone do Site (Favicon)</label>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Opcional</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Ícone exibido na aba do navegador e no símbolo decorativo da marca.
                      </p>
                      {newFaviconUrl ? (
                        <div className="flex items-center justify-between gap-3 p-3 glass-sm rounded-xl border border-[var(--surface-border)]">
                          <div className="flex items-center gap-2">
                            <img src={newFaviconUrl} alt="Ícone" className="h-7 w-7 object-contain rounded-md border border-[var(--surface-border)] bg-white p-0.5" />
                            <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[100px]">Ícone ativo</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setNewFaviconUrl('')}
                            className="text-xs text-red-500 dark:text-red-400 hover:underline font-semibold cursor-pointer"
                          >
                            Remover
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setUploadTarget('favicon');
                            setLibraryOpen(true);
                          }}
                          className="w-full py-3.5 px-3 rounded-xl glass-sm border border-dashed border-[var(--surface-border)] hover:border-[var(--brand-gradient-start)] text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                          <Upload className="h-4 w-4 text-[var(--brand-gradient-start)]" />
                          <span>Selecionar Ícone do Site</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Selecionar Cores */}
                <div className="pt-4 border-t border-[var(--surface-border)] space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-[var(--brand-gradient-start)]" />
                      2. Paleta de Cores
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Escolha uma paleta de cores pronta ou defina suas cores personalizadas.
                    </p>
                  </div>

                  {!isCustomColor ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Paletas Prontas */}
                      {COLOR_PALETTES.map((palette) => {
                        const isSelected = selectedPalette.id === palette.id;
                        return (
                          <div
                            key={palette.id}
                            onClick={() => setSelectedPalette(palette)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                              isSelected
                                ? 'glass-md border-[var(--brand-gradient-start)] shadow-lg ring-1 ring-[var(--brand-gradient-start)]'
                                : 'glass-sm border-[var(--surface-border)] hover:border-slate-400 dark:hover:border-slate-700 hover:bg-[var(--surface-hover)]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{palette.name}</span>
                              {isSelected && (
                                <span className="text-[9px] font-bold text-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/15 px-2 py-0.5 rounded-full border border-[var(--brand-gradient-start)]/30">
                                  Selecionada
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <div
                                className="h-6 flex-1 rounded-lg shadow-inner border border-black/10 dark:border-white/10"
                                style={{ background: `linear-gradient(135deg, ${palette.primaryStart}, ${palette.primaryEnd})` }}
                              />
                              <div
                                className="h-6 w-6 rounded-lg border border-black/10 dark:border-white/20 shadow-sm"
                                style={{ background: palette.contrast }}
                              />
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{palette.tag}</span>
                          </div>
                        );
                      })}

                      {/* Card da Paleta Extraída do Logotipo/Ícone (Se houver cores extraídas) */}
                      {extractedBrandColors.length >= 1 && (
                        <div
                          onClick={() => {
                            setIsCustomColor(true);
                            if (extractedBrandColors[0]) {
                              setCustomPrimaryStart(extractedBrandColors[0]);
                              const contrastColor = getContrastColor(extractedBrandColors[0]);
                              setCustomContrast(contrastColor);
                            }
                            if (extractedBrandColors[1]) setCustomPrimaryEnd(extractedBrandColors[1]);
                          }}
                          className="p-4 rounded-xl border glass-sm border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/5 cursor-pointer transition-all flex flex-col justify-between space-y-3 shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                              Paleta da sua Marca
                            </span>
                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              {newLogoUrl && newFaviconUrl ? 'Extraída do Logo & Ícone' : newFaviconUrl ? 'Extraída do Ícone' : 'Extraída do Logo'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div
                              className="h-6 flex-1 rounded-lg shadow-inner border border-black/10 dark:border-white/10"
                              style={{
                                background: `linear-gradient(135deg, ${extractedBrandColors[0]}, ${extractedBrandColors[1] || extractedBrandColors[0]})`
                              }}
                            />
                            <div
                              className="h-6 w-6 rounded-lg border border-black/10 dark:border-white/20 shadow-sm"
                              style={{ background: getContrastColor(extractedBrandColors[0] || '#7808C8') }}
                            />
                          </div>
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                            Cores extraídas da sua imagem
                          </span>
                        </div>
                      )}

                      {/* Card de Personalização de Cores (Abre Seletores Inline - 100% Largura) */}
                      <div
                        onClick={() => setIsCustomColor(true)}
                        className="p-4 rounded-xl border glass-sm border-[var(--surface-border)] hover:border-[var(--brand-gradient-start)] hover:bg-[var(--surface-hover)] cursor-pointer transition-all flex flex-col justify-between space-y-3 sm:col-span-2 col-span-full shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Palette className="h-4 w-4 text-[var(--brand-gradient-start)]" />
                            <span className="text-xs font-bold text-slate-900 dark:text-white">Personalizar Cores</span>
                          </div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">
                            Hexadecimal
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div
                            className="h-6 flex-1 rounded-lg shadow-inner border border-black/10 dark:border-white/10"
                            style={{ background: `linear-gradient(135deg, ${customPrimaryStart}, ${customPrimaryEnd})` }}
                          />
                          <div
                            className="h-6 w-6 rounded-lg border border-black/10 dark:border-white/20 shadow-sm"
                            style={{ background: customContrast }}
                          />
                        </div>
                        <span className="text-[11px] text-[var(--brand-gradient-start)] font-semibold flex items-center gap-1">
                          + Definir cores personalizadas
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Painel Inline de Seleção de Cores Personalizadas */
                    <div className="p-5 glass-sm border border-[var(--surface-border)] rounded-xl space-y-5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-3">
                        <div className="flex items-center gap-2">
                          <Palette className="h-4 w-4 text-[var(--brand-gradient-start)]" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">Cores Personalizadas</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsCustomColor(false)}
                          className="text-xs text-[var(--brand-gradient-start)] hover:underline font-semibold cursor-pointer"
                        >
                          ← Voltar para Paletas Prontas
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {renderColorPickerWithPopover(
                          'Cor Primária',
                          customPrimaryStart,
                          setCustomPrimaryStart,
                          'primaryStart'
                        )}

                        {renderColorPickerWithPopover(
                          'Cor Secundária',
                          customPrimaryEnd,
                          setCustomPrimaryEnd,
                          'primaryEnd'
                        )}

                        {renderColorPickerWithPopover(
                          'Texto / Contraste',
                          customContrast,
                          setCustomContrast,
                          'contrast'
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Selecionar Fontes */}
                <div className="pt-4 border-t border-[var(--surface-border)] space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-[var(--brand-gradient-start)]" />
                      3. Tipografia & Fontes
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Escolha as fontes que definem a personalidade dos títulos e textos do seu site.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FontPicker
                      label="Fonte dos Títulos (Cabeçalhos)"
                      type="heading"
                      value={fontHeading}
                      onChange={setFontHeading}
                      onOpenCustomFontModal={() => setLibraryOpen(true)}
                    />

                    <FontPicker
                      label="Fonte do Texto Principal (Parágrafos)"
                      type="body"
                      value={fontBody}
                      onChange={setFontBody}
                      onOpenCustomFontModal={() => setLibraryOpen(true)}
                    />
                  </div>
                </div>

                {/* 4. Prévia em Tempo Real da Marca */}
                <div className="pt-4 border-t border-[var(--surface-border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[var(--brand-gradient-start)]" />
                      4. Prévia em Tempo Real da Marca
                    </h3>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {newLogoUrl ? 'Modo: Imagem Enviada' : 'Modo: Logotipo HTML Tipográfico'}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl glass-sm border border-[var(--surface-border)] space-y-4 shadow-sm">
                    {/* Simulação de Cabeçalho do Site */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">
                        Visualização no Cabeçalho do Site:
                      </span>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white flex items-center justify-between border border-slate-200 dark:border-zinc-800 shadow-sm">
                        {newLogoUrl ? (
                          <img src={newLogoUrl} alt="Logo Preview" className="h-8 max-w-[180px] object-contain" />
                        ) : (
                          <div className="flex items-center gap-2.5">
                            {newFaviconUrl ? (
                              <img src={newFaviconUrl} alt="Ícone Preview" className="h-8 w-8 object-contain rounded-lg border border-slate-200 dark:border-zinc-700 bg-white p-0.5" />
                            ) : (
                              <div
                                className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm"
                                style={{
                                  background: `linear-gradient(135deg, ${activePrimaryStart}, ${activePrimaryEnd})`,
                                  color: activeContrast
                                }}
                              >
                                Ψ
                              </div>
                            )}
                            <span
                              className="text-base font-bold text-slate-900 dark:text-white tracking-tight"
                              style={{ fontFamily: `'${fontHeading}', serif` }}
                            >
                              {newTitle.trim() || 'Nome da Psicóloga'}
                            </span>
                          </div>
                        )}
                        <div
                          className="h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center shadow-xs"
                          style={{
                            background: `linear-gradient(135deg, ${activePrimaryStart}, ${activePrimaryEnd})`,
                            color: activeContrast
                          }}
                        >
                          Agendar
                        </div>
                      </div>
                    </div>

                    {/* Simulação da Aba do Navegador (Favicon) */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">
                        Visualização na Aba do Navegador (Favicon):
                      </span>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-t-lg bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-xs text-slate-800 dark:text-zinc-200 max-w-xs truncate">
                        {newFaviconUrl ? (
                          <img src={newFaviconUrl} alt="Favicon" className="h-3.5 w-3.5 object-contain rounded-sm" />
                        ) : (
                          <div
                            className="h-3.5 w-3.5 rounded-sm flex items-center justify-center text-[9px] font-bold"
                            style={{
                              background: `linear-gradient(135deg, ${activePrimaryStart}, ${activePrimaryEnd})`,
                              color: activeContrast
                            }}
                          >
                            Ψ
                          </div>
                        )}
                        <span className="truncate text-[11px] font-medium" style={{ fontFamily: `'${fontBody}', sans-serif` }}>
                          {newTitle.trim() || 'Nome da Psicóloga'} | Psicologia Clínica
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 3: Escolha de Endereço (Domínio da Plataforma ou Próprio + Slug da Página) */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-1 border-b border-[var(--surface-border)] pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-gradient-start)] block">
                    Etapa 3 de 4
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Escolha do Endereço na Internet</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure o subdomínio gratuito do TheraOS ou conecte seu domínio próprio, e defina o endereço da página.
                  </p>
                </div>

                <DomainManager
                  tenantId={tenant?.id}
                  subdomain={subdomainInput || tenant?.slug || ''}
                  onSubdomainChange={(val) => {
                    setSubdomainInput(val);
                    setSubdomainAvailable(null);
                  }}
                  customDomain={customDomainInput}
                  onCustomDomainChange={setCustomDomainInput}
                  domainMode={domainMode}
                  onDomainModeChange={setDomainMode}
                  readOnlySubdomain={Boolean(tenant?.slug)}
                  readOnlyCustomDomain={Boolean(tenant?.domain)}
                  showSlugInput={true}
                  slug={newSlug}
                  onSlugChange={setNewSlug}
                  subdomainAvailable={subdomainAvailable}
                  checkingSubdomain={checkingSubdomain}
                  onCheckSubdomain={checkSubdomain}
                />
              </div>
            )}

            {/* ETAPA 4: Otimização SEO & Redes Sociais */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-1 border-b border-[var(--surface-border)] pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-gradient-start)] block">
                    Etapa 4 de 5
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Otimização SEO & Redes Sociais</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure como sua página aparecerá nos resultados do Google e ao ser compartilhada no WhatsApp, LinkedIn e redes sociais.
                  </p>
                </div>

                {/* Single Column Layout: Form Fields at Top, Live Preview at Bottom */}
                <div className="space-y-6 w-full">
                  {/* Formulário de Configurações de SEO */}
                  <div className="space-y-5 p-5 glass-sm rounded-2xl border border-[var(--surface-border)]">
                    {/* Meta Title */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Título de Busca (Meta Title)
                        </label>
                        <span className={`text-[10px] font-mono font-semibold ${
                          (seoTitle || '').length > 60 ? 'text-amber-500' : 'text-slate-400'
                        }`}>
                          {(seoTitle || '').length} / 60
                        </span>
                      </div>
                      <Input
                        type="text"
                        value={seoTitle}
                        onChange={(e) => setSeoTitle(e.target.value)}
                        placeholder={`ex: ${newTitle || 'Nome da Psicóloga'} | Psicologia Clínica`}
                        className={`brand-input text-xs h-10 ${
                          !seoTitle.trim() || seoTitle.trim().length < 2 ? '!border-red-500/80 focus:!border-red-500' : ''
                        }`}
                      />
                      {!seoTitle.trim() ? (
                        <span className="text-[10px] text-red-500 font-medium flex items-center gap-1 pt-0.5">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>O Meta Title de busca é obrigatório.</span>
                        </span>
                      ) : seoTitle.trim().length < 2 ? (
                        <span className="text-[10px] text-red-500 font-medium flex items-center gap-1 pt-0.5">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>O Meta Title deve ter pelo menos 2 caracteres.</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          Título exibido nos resultados do Google e no cabeçalho das redes sociais.
                        </span>
                      )}
                    </div>

                    {/* Meta Description */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Descrição de Busca (Meta Description) <span className="text-red-500">*</span>
                        </label>
                        <span className={`text-[10px] font-mono font-semibold ${
                          (seoDescription || '').length > 160 ? 'text-amber-500' : 'text-slate-400'
                        }`}>
                          {(seoDescription || '').length} / 160
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={seoDescription}
                        onChange={(e) => setSeoDescription(e.target.value)}
                        placeholder="ex: Atendimento psicológico acolhedor e especializado. Agende sua consulta presencial ou online com segurança."
                        className={`w-full p-2.5 rounded-xl border bg-slate-50/50 dark:bg-black/20 text-xs text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 ${
                          !seoDescription.trim() || seoDescription.trim().length < 10
                            ? 'border-red-500/80 focus:border-red-500'
                            : 'border-[var(--surface-border)] focus:border-[var(--brand-gradient-start)]'
                        }`}
                      />
                      {!seoDescription.trim() ? (
                        <span className="text-[10px] text-red-500 font-medium flex items-center gap-1 pt-0.5">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>A Meta Description de busca é obrigatória.</span>
                        </span>
                      ) : seoDescription.trim().length < 10 ? (
                        <span className="text-[10px] text-red-500 font-medium flex items-center gap-1 pt-0.5">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>A Meta Description deve ter pelo menos 10 caracteres.</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          Resumo explicativo exibido abaixo do título nos buscadores.
                        </span>
                      )}
                    </div>

                    {/* Social Image (1200 x 630px) - Live HTML Banner & Upload Fallback */}
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Capa de Compartilhamento Social (1200 × 630px)
                        </label>
                        <div className="flex items-center gap-2">
                          {seoSocialImage ? (
                            <button
                              type="button"
                              onClick={() => setSeoSocialImage('')}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer bg-transparent border-none p-0"
                            >
                              ↺ Voltar para Capa da Marca (HTML)
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSeoLibraryOpen(true)}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer bg-transparent border-none p-0 flex items-center gap-1"
                            >
                              <Upload className="w-3 h-3" />
                              <span>Enviar Imagem Própria</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Capa exibida no WhatsApp, LinkedIn e redes sociais. Herda automaticamente o logotipo, título e descrição de busca:
                      </p>

                      {seoSocialImage ? (
                        <div className="relative group rounded-2xl overflow-hidden border border-[var(--surface-border)] aspect-[1.91/1] max-h-48 bg-slate-950 flex items-center justify-center shadow-lg">
                          <img src={seoSocialImage} alt="Social Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSeoLibraryOpen(true)}
                              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-500 cursor-pointer"
                            >
                              Alterar Imagem
                            </button>
                            <button
                              type="button"
                              onClick={() => setSeoSocialImage('')}
                              className="px-3.5 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold shadow-md hover:bg-red-500 cursor-pointer"
                            >
                              Usar Capa da Marca
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Live HTML Social Banner Card matching exact Site Preview & Button Gradient */
                        <SocialCoverBanner
                          logoUrl={newLogoUrl || (tenant as any)?.siteConfig?.logoUrl || (tenant as any)?.logoUrl}
                          faviconUrl={newFaviconUrl || (tenant as any)?.siteConfig?.faviconUrl || (tenant as any)?.faviconUrl}
                          title={newTitle}
                          description={seoDescription || `Atendimento psicológico especializado com ${newTitle || 'a profissional'}. Agende sua consulta presencial ou online.`}
                          domainUrl={`https://${domainMode === 'custom' && customDomainInput.trim() ? customDomainInput.trim() : `${subdomainInput || tenant?.slug || 'sua-clinica'}.${baseDomain}`}${newSlug ? `/${newSlug}` : '/'}`}
                          bgLightColor={tenant?.bgLightColor || '#FFFFFF'}
                          activePrimaryStart={activePrimaryStart}
                          activePrimaryEnd={activePrimaryEnd}
                          fontHeading={fontHeading}
                          fontBody={fontBody}
                        />
                      )}
                    </div>

                    {/* Palavras-Chave de Busca (Tags) com Enter e Chips */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Palavras-Chave de Busca (Tags)
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Digite cada palavra-chave e pressione <strong>Enter</strong> ou selecione uma das sugestões abaixo:
                      </p>

                      {/* Display Keywords Chips */}
                      <div className="flex flex-wrap items-center gap-2 min-h-[38px] p-2 rounded-xl border border-[var(--surface-border)] bg-slate-50/50 dark:bg-black/20">
                        {seoKeywords.split(',').map(k => k.trim()).filter(Boolean).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const currentList = seoKeywords.split(',').map(k => k.trim()).filter(Boolean);
                                const updated = currentList.filter((_, i) => i !== idx);
                                setSeoKeywords(updated.join(', '));
                              }}
                              className="text-indigo-400 hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer border-none bg-transparent p-0 flex items-center"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}

                        <input
                          type="text"
                          value={seoKeywordsInput}
                          onChange={(e) => setSeoKeywordsInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              const val = seoKeywordsInput.trim().replace(/,/g, '');
                              if (val) {
                                const currentList = seoKeywords.split(',').map(k => k.trim()).filter(Boolean);
                                if (!currentList.includes(val)) {
                                  currentList.push(val);
                                  setSeoKeywords(currentList.join(', '));
                                }
                                setSeoKeywordsInput('');
                              }
                            }
                          }}
                          placeholder={seoKeywords ? 'Adicionar tag e dar Enter...' : 'ex: psicologia clínica (Enter)'}
                          className="flex-1 min-w-[160px] bg-transparent text-xs text-slate-900 dark:text-white outline-none border-none placeholder:text-slate-400 dark:placeholder:text-zinc-500 h-7"
                        />
                      </div>

                      {/* Sugestões Prontas de Palavras-Chave */}
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                          Sugestões Prontas (Clique para Adicionar):
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {[
                            'Psicologia Clínica',
                            'Terapia Online',
                            'Ansiedade & Depressão',
                            'Autoconhecimento',
                            'Agendamento de Consulta',
                            'Psicoterapia Individual',
                            'Atendimento Presencial'
                          ].map((sug, i) => {
                            const currentList = seoKeywords.split(',').map(k => k.trim()).filter(Boolean);
                            const isAdded = currentList.includes(sug);
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  if (!isAdded) {
                                    currentList.push(sug);
                                    setSeoKeywords(currentList.join(', '));
                                  }
                                }}
                                disabled={isAdded}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                                  isAdded
                                    ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border-transparent cursor-default'
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-zinc-700 shadow-xs'
                                }`}
                              >
                                {isAdded ? `✓ ${sug}` : `+ ${sug}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Toggle Switch para Indexação (Robots) */}
                    <div className="pt-3 border-t border-[var(--surface-border)] flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          Indexação em Motores de Busca
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          Permite que o Google e o Bing encontrem esta página.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSeoAllowIndexing((prev) => !prev)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer select-none ${
                          seoAllowIndexing
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {seoAllowIndexing ? '✓ Indexar (Google)' : '✕ Ocultar (NoIndex)'}
                      </button>
                    </div>
                  </div>

                  {/* Pré-Visualizações em Tempo Real (Live Previews) - AGORA ABAIXO DO FORMULÁRIO */}
                  <div className="space-y-3 p-5 glass-sm rounded-2xl border border-[var(--surface-border)]">
                    <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-[var(--brand-gradient-start)]" /> PRÉ-VISUALIZAÇÃO AO VIVO
                      </span>
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-[var(--surface-border)]">
                        <button
                          type="button"
                          onClick={() => setSeoPreviewTab('google')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border-none cursor-pointer ${
                            seoPreviewTab === 'google'
                              ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white bg-transparent'
                          }`}
                        >
                          <Search className="w-3.5 h-3.5" /> Google
                        </button>
                        <button
                          type="button"
                          onClick={() => setSeoPreviewTab('social')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border-none cursor-pointer ${
                            seoPreviewTab === 'social'
                              ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white bg-transparent'
                          }`}
                        >
                          <Share2 className="w-3.5 h-3.5" /> WhatsApp / Social
                        </button>
                      </div>
                    </div>

                    {/* Card Google Search */}
                    {seoPreviewTab === 'google' && (
                      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-2 font-sans shadow-md animate-in fade-in duration-200">
                        <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 truncate">
                          {newFaviconUrl ? (
                            <img src={newFaviconUrl} alt="Favicon" className="w-4 h-4 rounded-full object-contain" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] flex items-center justify-center font-bold">Ψ</div>
                          )}
                          <div className="truncate">
                            <span className="font-medium text-slate-900 dark:text-slate-200 block truncate">{newTitle || 'Nome da Psicóloga'}</span>
                            <span className="text-[10px] text-slate-400 block truncate">https://{domainMode === 'custom' && customDomainInput.trim() ? customDomainInput.trim() : `${subdomainInput || tenant?.slug || 'sua-clinica'}.${baseDomain}`}{newSlug ? `/${newSlug}` : '/'}</span>
                          </div>
                        </div>
                        <h4 className="text-base font-medium text-blue-700 dark:text-blue-400 truncate hover:underline cursor-pointer">
                          {newTitle.trim() || 'Nome da Psicóloga'}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                          {seoDescription || `Atendimento psicológico especializado com ${newTitle || 'a profissional'}. Agende sua consulta presencial ou online com segurança e sigilo.`}
                        </p>
                      </div>
                    )}

                    {/* Card WhatsApp / Social Share */}
                    {seoPreviewTab === 'social' && (
                      <div className="rounded-2xl overflow-hidden bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-lg space-y-0 font-sans animate-in fade-in duration-200">
                        {/* Top Social Cover Container with strict 1.91:1 Aspect Ratio */}
                        <div className="w-full relative overflow-hidden">
                          {seoSocialImage ? (
                            <div className="w-full aspect-[1.91/1] overflow-hidden">
                              <img src={seoSocialImage} alt="Social Share" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            /* Live HTML Social Cover Banner */
                            <SocialCoverBanner
                              logoUrl={newLogoUrl || (tenant as any)?.siteConfig?.logoUrl || (tenant as any)?.logoUrl}
                              faviconUrl={newFaviconUrl || (tenant as any)?.siteConfig?.faviconUrl || (tenant as any)?.faviconUrl}
                              title={newTitle}
                              description={seoDescription || `Atendimento psicológico especializado com ${newTitle || 'a profissional'}. Agende sua consulta presencial ou online.`}
                              domainUrl={`https://${domainMode === 'custom' && customDomainInput.trim() ? customDomainInput.trim() : `${subdomainInput || tenant?.slug || 'sua-clinica'}.${baseDomain}`}${newSlug ? `/${newSlug}` : '/'}`}
                              bgLightColor={tenant?.bgLightColor || '#FFFFFF'}
                              activePrimaryStart={activePrimaryStart}
                              activePrimaryEnd={activePrimaryEnd}
                              fontHeading={fontHeading}
                              fontBody={fontBody}
                            />
                          )}
                        </div>

                        {/* Bottom Link Metadata Preview (Theme-aware for Light/Dark UI) */}
                        <div className="p-3.5 space-y-1 bg-slate-100/90 dark:bg-zinc-900/90 border-t border-[var(--surface-border)] font-sans">
                          <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 block truncate">
                            {domainMode === 'custom' && customDomainInput.trim() ? customDomainInput.trim() : `${subdomainInput || tenant?.slug || 'sua-clinica'}.${baseDomain}`}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">
                            {newTitle.trim() || 'Nome da Psicóloga'}
                          </h4>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {seoDescription || `Atendimento psicológico especializado com ${newTitle || 'a profissional'}. Agende sua consulta de forma simples.`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 5: Revisão & Instanciação */}
            {currentStep === 5 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-1 border-b border-[var(--surface-border)] pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-gradient-start)] block">
                    Etapa 5 de 5
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Revisão & Instanciação</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Confira o resumo da sua nova página antes de entrar no editor visual.
                  </p>
                </div>

                {/* General Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl glass-sm border border-[var(--surface-border)] space-y-1">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Nome da Psicóloga / Página</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block truncate">
                      {newTitle || 'Sem nome'}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl glass-sm border border-[var(--surface-border)] space-y-1">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Endereço Final na Internet</span>
                    <span className="text-xs font-mono text-[var(--brand-gradient-start)] block truncate">
                      https://{domainMode === 'custom' && customDomainInput.trim() ? customDomainInput.trim() : `${subdomainInput || tenant?.slug || 'sua-clinica'}.${baseDomain}`}{newSlug ? `/${newSlug}` : '/'}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl glass-sm border border-[var(--surface-border)] space-y-1">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Tipo de Página</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block truncate">
                      {!newSlug ? 'Página Principal (Home / Raíz)' : `Subcaminho (/${newSlug})`}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl glass-sm border border-[var(--surface-border)] space-y-1">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Paleta de Cores</span>
                    <div className="flex items-center gap-2 pt-1">
                      <div
                        className="h-4 w-12 rounded shadow-inner"
                        style={{ background: `linear-gradient(135deg, ${activePrimaryStart}, ${activePrimaryEnd})` }}
                      />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {isCustomColor ? 'Customizada' : selectedPalette.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card do Resumo de SEO & Redes Sociais */}
                <div className="p-4 rounded-xl glass-sm border border-[var(--surface-border)] space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-indigo-500" /> SEO & Redes Sociais
                    </span>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      seoAllowIndexing
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {seoAllowIndexing ? 'Indexação Ativa' : 'Oculto (NoIndex)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Título SEO:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100 block truncate">{seoTitle || `${newTitle} | Psicologia Clínica`}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Capa Social (og:image):</span>
                      <span className="font-medium text-indigo-600 dark:text-indigo-400 block truncate">
                        {seoSocialImage ? '✓ Imagem 1200×630px enviada' : 'Usa logotipo padrão da marca'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Google SEO Card Preview */}
                <div className="space-y-2 pt-2 border-t border-[var(--surface-border)]">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Pré-visualização na Busca do Google (SEO)
                  </span>
                  <div className="p-4 rounded-xl glass-sm border border-[var(--surface-border)] space-y-1.5 font-sans">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      <Search className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>https://{domainMode === 'custom' && customDomainInput.trim() ? customDomainInput.trim() : `${subdomainInput || tenant?.slug || 'sua-clinica'}.${baseDomain}`}{newSlug ? `/${newSlug}` : '/'}</span>
                    </div>
                    <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 truncate hover:underline cursor-pointer">
                      {newTitle.trim() || 'Nome da Psicóloga'}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {seoDescription || `Atendimento psicológico especializado com ${newTitle}. Agende sua consulta de forma segura.`}
                    </p>
                  </div>
                </div>

                {/* Template Ready Box */}
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <span>Tudo pronto para a criação!</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-200/80">
                    Ao clicar no botão abaixo, sua página de captação será instanciada com seções completas e você será direcionado para o editor visual em tempo real.
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Actions Row */}
            <div className="flex flex-row items-center justify-between gap-4 sm:gap-6 pt-6 mt-8 border-t border-[var(--surface-border)]">
              {/* Left Action Buttons: Cancelar & Voltar */}
              <div className="flex items-center gap-3">
                <Link href="/dashboard/captacao" className="no-underline">
                  <Button
                    type="button"
                    variant="secondary"
                    className="!w-auto h-11 px-4 sm:px-5 glass-sm hover:bg-[var(--surface-hover)] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold rounded-xl cursor-pointer transition-all border border-[var(--surface-border)] shrink-0"
                  >
                    Cancelar
                  </Button>
                </Link>

                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={prevStep}
                    className="!w-auto h-11 px-5 sm:px-6 glass-sm hover:bg-[var(--surface-hover)] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition-all border border-[var(--surface-border)] shrink-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Voltar</span>
                  </Button>
                )}
              </div>

              {/* Right Action Button: Avançar / Criar Página */}
              <div className="flex items-center gap-3">
                {currentStep < 5 ? (
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!isStepValid(currentStep)}
                    onClick={nextStep}
                    className="!w-auto h-11 px-6 sm:px-8 brand-accent text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer border-none shadow-lg hover:brightness-110 active:scale-95 transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:brightness-100"
                  >
                    <span>Avançar</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    disabled={submitting || !isStepValid(1) || !isStepValid(2) || !isStepValid(3)}
                    onClick={() => handleCreatePage()}
                    className="!w-auto h-11 px-6 sm:px-8 brand-accent text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer border-none shadow-xl hover:brightness-110 active:scale-95 transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:brightness-100"
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
            </div>
          </Card>
        </div>

        {/* Right Column: Live Mockup Preview Widget */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 flex items-center gap-2">
              <Monitor className="h-4 w-4 text-[var(--brand-gradient-start)]" />
              Pré-Visualização ao Vivo
            </span>
            <div className="flex items-center gap-1 glass-sm p-1 rounded-lg border border-[var(--surface-border)]">
              <button
                type="button"
                onClick={() => setPreviewMode('desktop')}
                className={`p-1.5 rounded transition-all cursor-pointer ${
                  previewMode === 'desktop' ? 'bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
                title="Visão Desktop"
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('mobile')}
                className={`p-1.5 rounded transition-all cursor-pointer ${
                  previewMode === 'mobile' ? 'bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
                title="Visão Mobile"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Screen Container */}
          <div
            className={`transition-all duration-300 mx-auto rounded-2xl border border-[var(--surface-border)] bg-slate-950 shadow-2xl overflow-hidden ${
              previewMode === 'mobile' ? 'max-w-[340px] border-zinc-800' : 'w-full'
            }`}
          >
            {/* Mockup Browser/Phone Top bar */}
            <div className="bg-slate-200 dark:bg-zinc-900/90 border-b border-[var(--surface-border)] px-3 py-2 flex items-center justify-between select-none">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="bg-slate-100 dark:bg-zinc-950 px-3 py-0.5 rounded-md text-[10px] text-slate-600 dark:text-slate-400 font-mono border border-[var(--surface-border)] truncate max-w-[200px]">
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
                    {newFaviconUrl ? (
                      <img src={newFaviconUrl} alt="Ícone Preview" className="h-7 w-7 object-contain rounded-md border border-zinc-200 bg-white p-0.5" />
                    ) : (
                      <div
                        className="h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shadow"
                        style={{
                          background: `linear-gradient(135deg, ${activePrimaryStart}, ${activePrimaryEnd})`,
                          color: activeContrast
                        }}
                      >
                        Ψ
                      </div>
                    )}
                    <span
                      className="text-sm font-semibold text-zinc-900 truncate max-w-[180px]"
                      style={{ fontFamily: `'${fontHeading}', serif` }}
                    >
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

                <h3
                  className="text-lg font-bold text-zinc-900 leading-tight"
                  style={{ fontFamily: `'${fontHeading}', serif` }}
                >
                  Psicologia Clínica & Saúde Emocional
                </h3>

                <p
                  className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto"
                  style={{ fontFamily: `'${fontBody}', sans-serif` }}
                >
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
          resolution={uploadTarget === 'favicon' ? { width: 128, height: 128 } : { width: 400, height: 120 }}
          type="logotipo"
          onSelectImage={(asset: any) => {
            const url = typeof asset === 'string' ? asset : (asset?.url || asset);
            if (uploadTarget === 'favicon') {
              setNewFaviconUrl(url);
            } else {
              setNewLogoUrl(url);
            }
            setLibraryOpen(false);
          }}
          uploadType={uploadTarget === 'favicon' ? 'icon' : 'logo'}
        />
      )}

      {/* SEO Social Image (1200 x 630px) Library Modal */}
      {tenant && (
        <MediaLibraryModal
          isOpen={seoLibraryOpen}
          onClose={() => setSeoLibraryOpen(false)}
          tenantId={tenant.id}
          resolution={{ width: 1200, height: 630 }}
          type="imagem"
          onSelectImage={(asset: any) => {
            const url = typeof asset === 'string' ? asset : (asset?.url || asset);
            setSeoSocialImage(url);
            setSeoLibraryOpen(false);
          }}
          uploadType="asset"
        />
      )}



      {/* POPUP MODAL: Rascunhos Anteriores Encontrados */}
      <BrandModal isOpen={showDraftsModal} onClose={() => setShowDraftsModal(false)} maxWidth="max-w-xl">
        <div className="space-y-4 p-1">
          <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-3">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-indigo-500" />
                Rascunhos Anteriores Encontrados
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Você possui rascunhos em andamento. Escolha um rascunho para continuar de onde parou ou inicie um novo site.
              </p>
            </div>
            <button
              type="button"
              onClick={startFreshDraft}
              className="px-3.5 py-2 rounded-xl brand-accent text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:brightness-110 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Rascunho</span>
            </button>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {savedDraftsList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                <p>Nenhum rascunho salvo encontrado.</p>
                <button
                  type="button"
                  onClick={startFreshDraft}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
                >
                  Criar Novo Rascunho
                </button>
              </div>
            ) : (
              savedDraftsList.map((draft) => {
                const isCurrent = draft.id === currentDraftId;
                const formattedDate = draft.updatedAt
                  ? new Date(draft.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : '';
                const formattedTime = draft.updatedAt
                  ? new Date(draft.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <div
                    key={draft.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCurrent
                        ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm'
                        : 'glass-sm hover:bg-[var(--surface-hover)] border-[var(--surface-border)]'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                          {draft.newTitle?.trim() || 'Página Sem Nome'}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-500 border border-indigo-500/30">
                            Em uso
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                          Etapa {draft.currentStep || 1} de 5
                        </span>
                        <span>•</span>
                        <span className="truncate max-w-[200px]">
                          {draft.subdomainInput ? `${draft.subdomainInput}.${baseDomain}` : 'Sem endereço'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>Salvo em {formattedDate} às {formattedTime}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => loadDraftData(draft)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                      >
                        Continuar
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteDraft(draft.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer border-none bg-transparent"
                        title="Excluir este rascunho"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </BrandModal>

      {/* DNS SETUP POPUP MODAL */}
      <BrandModal isOpen={showDnsModal} onClose={() => setShowDnsModal(false)} maxWidth="max-w-xl">
        <DnsInstructions
          domain={customDomainInput}
          dnsRecords={dnsRecords}
          baseDomain={baseDomain}
          onVerifyDns={handleVerifyDomainDns}
          isVerifying={verifyingDns}
          onClose={() => setShowDnsModal(false)}
        />
      </BrandModal>

    </div>
  );
}
