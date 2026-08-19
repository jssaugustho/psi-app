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
  ExternalLink
} from 'lucide-react';
import { Link } from '@/components/Link';
import { MediaLibraryModal } from '@/components/media-library-modal';
import { FontPicker } from '@/components/FontPicker';

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

  // Draft Storage & Auto-save Logic (Multi-draft support)
  const draftsStorageKey = tenant?.id ? `psi_page_drafts_${tenant.id}` : 'psi_page_drafts_global';

  const [currentDraftId, setCurrentDraftId] = useState<string>('');
  const [hasDraftRestored, setHasDraftRestored] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const isInitialDraftCheckDone = useRef(false);

  // Restore draft on initial mount
  useEffect(() => {
    if (typeof window === 'undefined' || isInitialDraftCheckDone.current) return;
    isInitialDraftCheckDone.current = true;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const targetDraftId = urlParams.get('draftId');
      const isFresh = urlParams.get('fresh') === 'true';

      const raw = localStorage.getItem(draftsStorageKey);
      const drafts: any[] = raw ? JSON.parse(raw) : [];

      let draftToLoad = null;

      if (targetDraftId && Array.isArray(drafts)) {
        draftToLoad = drafts.find((d) => d.id === targetDraftId);
      } else if (!isFresh && Array.isArray(drafts) && drafts.length > 0) {
        draftToLoad = drafts[0]; // Carrega o rascunho mais recente por padrão
      }

      // Fallback para rascunhos salvos na chave legada anterior
      if (!draftToLoad && !isFresh) {
        const legacyKey = tenant?.id ? `psi_page_creation_draft_${tenant.id}` : 'psi_page_creation_draft_global';
        const legacyRaw = localStorage.getItem(legacyKey) || localStorage.getItem('psi_page_creation_draft_global');
        if (legacyRaw) {
          try {
            const legacyParsed = JSON.parse(legacyRaw);
            if (legacyParsed && typeof legacyParsed === 'object') {
              draftToLoad = {
                id: legacyParsed.id || `draft_legacy_${Date.now()}`,
                ...legacyParsed,
              };
            }
          } catch {}
        }
      }

      if (draftToLoad) {
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
        if (draftToLoad.currentStep && draftToLoad.currentStep >= 1 && draftToLoad.currentStep <= 4) {
          setCurrentStep(draftToLoad.currentStep);
        }
        setHasDraftRestored(true);
      } else {
        // Gera novo ID para novo rascunho
        setCurrentDraftId(`draft_${Date.now()}`);
      }
    } catch {
      setCurrentDraftId(`draft_${Date.now()}`);
    }
  }, [draftsStorageKey]);

  // Auto-save draft on form state updates
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialDraftCheckDone.current || !currentDraftId) return;

    const hasDataToSave = Boolean(
      newTitle.trim() ||
      newLogoUrl ||
      newFaviconUrl ||
      currentStep > 1 ||
      subdomainInput ||
      customDomainInput ||
      newSlug
    );

    if (!hasDataToSave) return;

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

      setExtractedBrandColors(deduplicated.slice(0, 8));
      setIsExtractingColors(false);
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
      setMetaTitle(`${defaultName} | Psicologia Clínica`);
      setMetaDescription(`Atendimento psicológico especializado com ${defaultName}. Agende sua consulta de forma segura.`);
    }
  }, [user, tenant]);

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

      const seoConfig = {
        metaTitle: metaTitle.trim() || `${newTitle.trim()} | Psicologia Clínica`,
        metaDescription: metaDescription.trim() || `Atendimento psicológico especializado com ${newTitle.trim()}. Agende sua consulta.`,
        keywords: 'psicologia, terapia, consulta psicologica, atendimento online'
      };

      const effectiveSlug = newSlug.trim().toLowerCase().replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9-]/g, '');
      const effectiveSubdomain = (subdomainInput || tenant?.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

      const tenantUpdates: Record<string, any> = {};
      if (effectiveSubdomain && tenant?.id && effectiveSubdomain !== tenant.slug) {
        tenantUpdates.slug = effectiveSubdomain;
      }
      if (domainMode === 'custom' && customDomainInput.trim() && tenant?.id) {
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

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

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
            className="brand-input text-xs font-mono h-10"
          />
        </div>

        {/* POPOVER OVERLAY DROPDOWN (Apenas se tiver logotipo ou ícone) */}
        {isOpen && hasImageUploaded && (
          <>
            {/* Backdrop click to close */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setActiveColorPopover(null)}
            />

            <div className="absolute top-full left-0 mt-2 z-50 p-3.5 rounded-2xl glass-md border border-[var(--surface-border)] shadow-2xl space-y-3 min-w-[220px] animate-in fade-in zoom-in-95 duration-150 bg-slate-900/95 text-white backdrop-blur-md">
              
              {/* Seção Única: CORES DO LOGOTIPO */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> CORES DA SUA MARCA
                </span>

                {isExtractingColors ? (
                  <div className="flex items-center gap-2 py-1 text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
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
                        className={`h-7 w-7 rounded-lg border border-white/20 transition-all hover:scale-110 cursor-pointer shadow-xs ${
                          value.toUpperCase() === hex.toUpperCase() ? 'ring-2 ring-amber-400 scale-105' : ''
                        }`}
                        style={{ backgroundColor: hex }}
                        title={`Cor ${hex}`}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-1 text-slate-400">
                    <span className="text-[11px] italic">Nenhuma cor adicional identificada.</span>
                  </div>
                )}
              </div>

              {/* Opção Seletor Livre Hex (+) */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">Outra Cor:</span>
                <label className="h-7 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Escolher +</span>
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => {
                      onChange(e.target.value);
                      setActiveColorPopover(null);
                    }}
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

      if (newSlug.trim()) {
        const cleanSlug = newSlug.trim().toLowerCase();
        if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
          setError('O endereço da página (slug) deve conter apenas letras minúsculas, números e hífens.');
          return false;
        }
      }
    }

    return true;
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
      if (domainMode === 'subdomain') {
        const sub = (subdomainInput || tenant?.slug || '').trim().toLowerCase();
        if (!sub || !/^[a-z0-9-]+$/.test(sub)) return false;
        if (checkingSubdomain || subdomainAvailable === false) return false;
      } else if (domainMode === 'custom') {
        const custom = customDomainInput.trim().toLowerCase();
        const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
        if (!custom || !domainRegex.test(custom)) return false;
      }

      if (newSlug.trim()) {
        const cleanSlug = newSlug.trim().toLowerCase();
        if (!/^[a-z0-9-]+$/.test(cleanSlug)) return false;
      }

      return true;
    }

    return true;
  }, [newTitle, isCustomColor, customPrimaryStart, customPrimaryEnd, customContrast, domainMode, subdomainInput, tenant?.slug, checkingSubdomain, subdomainAvailable, customDomainInput, newSlug]);

  const handleStepClick = (targetStep: number) => {
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
    }
    setCurrentStep(targetStep);
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;

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
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Rascunho Salvo</span>
            </div>
          )}

          <div className="flex items-center gap-2 glass-md p-1.5 rounded-xl border border-[var(--surface-border)] overflow-x-auto">
            {[
              { num: 1, title: 'Nome' },
              { num: 2, title: 'Identidade Visual' },
              { num: 3, title: 'Escolha de Endereço' },
              { num: 4, title: 'Revisão' }
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
                      !newTitle.trim() ? '!border-red-500 focus:!border-red-500 focus:!ring-2 focus:!ring-red-500/20' : ''
                    }`}
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Este nome aparecerá em destaque no cabeçalho e títulos principais do site.
                  </span>
                  {!newTitle.trim() && (
                    <span className="text-[11px] font-semibold text-red-500 dark:text-red-400 flex items-center gap-1.5 pt-0.5 animate-in fade-in duration-200">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                      O campo não pode ser vazio.
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
                            if (extractedBrandColors[0]) setCustomPrimaryStart(extractedBrandColors[0]);
                            if (extractedBrandColors[1]) setCustomPrimaryEnd(extractedBrandColors[1]);
                            if (extractedBrandColors[2]) setCustomContrast(extractedBrandColors[2]);
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
                              style={{ background: extractedBrandColors[2] || '#FFFFFF' }}
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

                {/* Seleção do Tipo de Domínio */}
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider">
                    1. Domínio Principal do Site
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setDomainMode('subdomain')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                        domainMode === 'subdomain'
                          ? 'glass-md border-[var(--brand-gradient-start)] ring-1 ring-[var(--brand-gradient-start)]'
                          : 'glass-sm border-[var(--surface-border)] hover:border-slate-400 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Globe className="h-4 w-4 text-[var(--brand-gradient-start)]" />
                          Subdomínio TheraOS
                        </span>
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Gratuito
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Seu site rodará no subdomínio gratuito <code>.{baseDomain}</code>.
                      </p>
                    </div>

                    <div
                      onClick={() => setDomainMode('custom')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                        domainMode === 'custom'
                          ? 'glass-md border-[var(--brand-gradient-start)] ring-1 ring-[var(--brand-gradient-start)]'
                          : 'glass-sm border-[var(--surface-border)] hover:border-slate-400 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-[var(--brand-gradient-start)]" />
                          Domínio Próprio
                        </span>
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          Opcional
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Use seu próprio domínio comprado (ex: <code>www.suaclinica.com.br</code>).
                      </p>
                    </div>
                  </div>

                  {/* Configuração do Subdomínio TheraOS */}
                  {domainMode === 'subdomain' && (
                    <div className="p-4 rounded-xl glass-sm border border-[var(--surface-border)] space-y-3">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Nome do Subdomínio TheraOS
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                        <div className="flex items-center flex-1 min-w-0 rounded-xl overflow-hidden border border-[var(--surface-border)] bg-slate-100/60 dark:bg-black/30 shadow-sm focus-within:border-[var(--brand-gradient-start)] transition-all">
                          <span className="h-10 px-3 flex items-center shrink-0 border-r border-[var(--surface-border)] text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-zinc-800/80 select-none whitespace-nowrap">
                            https://
                          </span>
                          <input
                            type="text"
                            value={subdomainInput || tenant?.slug || ''}
                            onChange={(e) => {
                              const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                              setSubdomainInput(val);
                              setSubdomainAvailable(null);
                            }}
                            placeholder="minha-clinica"
                            className="h-10 px-3 flex-1 min-w-[120px] bg-transparent text-xs font-mono text-slate-900 dark:text-white outline-none border-none placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                          />
                          <span className="h-10 px-3 flex items-center shrink-0 border-l border-[var(--surface-border)] text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-zinc-800/80 select-none whitespace-nowrap">
                            .{baseDomain}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => checkSubdomain(subdomainInput || tenant?.slug || '')}
                          disabled={checkingSubdomain}
                          className="h-10 px-4 rounded-xl border border-[var(--surface-border)] bg-slate-200/80 hover:bg-slate-300/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shrink-0 cursor-pointer transition-colors whitespace-nowrap disabled:opacity-50"
                        >
                          {checkingSubdomain ? 'Verificando...' : 'Verificar'}
                        </button>
                      </div>

                      {subdomainAvailable === true && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Subdomínio disponível!
                        </p>
                      )}
                      {subdomainAvailable === false && (
                        <p className="text-xs text-red-500 dark:text-red-400 font-bold flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" /> Subdomínio já em uso. Escolha outro nome.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Configuração do Domínio Próprio */}
                  {domainMode === 'custom' && (
                    <div className="p-5 rounded-xl glass-sm border border-[var(--surface-border)] space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Seu Domínio Comprado (Ex: www.suaclinica.com.br)
                        </label>

                        {/* Status Badge */}
                        {verifyingDns ? (
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                            <LoadingSpinner /> Verificando DNS...
                          </span>
                        ) : domainVerified === true || domainStatus === 'active' || domainStatus === 'verified' ? (
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Domínio Verificado e Ativo!
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5" /> Apontamento DNS Pendente
                          </span>
                        )}
                      </div>

                      <Input
                        type="text"
                        value={customDomainInput}
                        onChange={(e) => {
                          setCustomDomainInput(e.target.value.toLowerCase());
                          setDomainVerified(null);
                        }}
                        placeholder="Ex: www.geovannabastos.com.br"
                        className="brand-input text-xs font-mono"
                      />

                      {/* Botões de Ação do Domínio Próprio */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <button
                          type="button"
                          onClick={handleOpenSetupModal}
                          disabled={!customDomainInput.trim() || registeringCustom}
                          className="h-9 px-4 rounded-xl bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>{registeringCustom ? 'Gerando Registros...' : '⚡ Configurar Registros DNS (Setup)'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleVerifyDomainDns}
                          disabled={!customDomainInput.trim() || verifyingDns}
                          className="h-9 px-4 rounded-xl border border-[var(--surface-border)] bg-slate-200/80 hover:bg-slate-300/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Checar Apontamento Agora</span>
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                        💡 Clique em <strong>Configurar Registros DNS</strong> para ver a tabela com as instruções de apontamento para o seu provedor (Registro.br, GoDaddy, Cloudflare, etc.).
                      </p>
                    </div>
                  )}

                  {/* Configuração da Slug / Endereço da Página */}
                  <div className="space-y-3 pt-3 border-t border-[var(--surface-border)]">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider">
                      2. Endereço da Página no seu site (Caminho / Slug)
                    </label>

                    <div className="flex items-center flex-1 min-w-0 rounded-xl overflow-hidden border border-[var(--surface-border)] bg-slate-100/60 dark:bg-black/30 shadow-sm focus-within:border-[var(--brand-gradient-start)] transition-all">
                      <span className="h-10 px-3 flex items-center shrink-0 border-r border-[var(--surface-border)] text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-zinc-800/80 select-none whitespace-nowrap">
                        https://{domainMode === 'custom' && customDomainInput.trim() ? customDomainInput.trim() : `${subdomainInput || tenant?.slug || 'sua-clinica'}.${baseDomain}`}/
                      </span>
                      <input
                        type="text"
                        value={newSlug}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                          setNewSlug(val);
                        }}
                        placeholder="ex: terapia (ou deixe em branco)"
                        className="h-10 px-3 flex-1 min-w-[120px] bg-transparent text-xs font-mono text-slate-900 dark:text-white outline-none border-none placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                      />
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      💡 <strong>Deixe em branco</strong> para que esta seja a <strong>Página Principal (Home)</strong> do seu site, ou digite o nome que deseja usar no endereço (ex: terapia, consultas).
                    </p>

                    {/* Exibição Visual do Link Final Resolvido */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-[var(--surface-border)] text-xs font-mono text-indigo-600 dark:text-indigo-300">
                      <div className="flex items-center gap-2 truncate">
                        <Globe className="h-4 w-4 text-[var(--brand-gradient-start)] shrink-0" />
                        <span className="truncate">
                          https://{domainMode === 'custom' && customDomainInput.trim() ? customDomainInput.trim() : `${subdomainInput || tenant?.slug || 'sua-clinica'}.${baseDomain}`}{newSlug ? `/${newSlug}` : '/'}
                        </span>
                      </div>
                      <span className="text-[10px] font-sans font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                        {!newSlug ? 'Página Principal (Home)' : `/${newSlug}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 4: Revisão & Instanciação */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-1 border-b border-[var(--surface-border)] pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-gradient-start)] block">
                    Etapa 4 de 4
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
                      {metaTitle || `${newTitle} | Psicologia Clínica`}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {metaDescription || `Atendimento psicológico especializado com ${newTitle}. Agende sua consulta de forma segura.`}
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
                {currentStep < 4 ? (
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
