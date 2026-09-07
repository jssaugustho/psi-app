'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api } from '@/lib/api';
import { Card, Button, Input, LoadingSpinner, BrandModal, DnsInstructions, BrandLogo, PhoneInput } from '@psi/ui';
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
  EyeOff,
  FolderOpen,
  Trash2
} from 'lucide-react';
import { Link } from '@/components/Link';
import { ColorPaletteSelector, COLOR_PALETTES } from '@/components/ColorPaletteSelector';
import { BrandIdentityForm } from '@/components/BrandIdentityForm';
import { MediaLibraryModal } from '@/components/media-library-modal';
import { FontPicker } from '@/components/FontPicker';
import { DomainManager } from '@/components/domain-manager';

const SUGGESTED_NETWORKS = [
  'Instagram',
  'LinkedIn',
  'Doctoralia',
  'YouTube',
  'TikTok',
  'X (Twitter)',
  'Facebook',
  'Threads',
  'Pinterest',
  'Podcast',
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
      fontFamily: 'Playfair Display',
      colors: {
        primaryStart: '#7C3AED',
        primaryEnd: '#A855F7',
        contrast: '#FFFFFF',
        bgDark: '#09090B',
        textDark: '#F4F4F5',
      }
    }
  },
  dictionary: {
    nav: {
      about: 'Sobre',
      services: 'Especialidades',
      process: 'Como Funciona',
      space: 'Consultório',
      faq: 'Dúvidas',
      contact: 'Agendar'
    },
    hero: {
      badge: 'Atendimento Online & Presencial',
      title: 'Psicologia Clínica & Saúde Emocional',
      titlePart1: 'Terapia para recuperar o seu ',
      titlePart2: 'equilíbrio interior',
      description: 'Cuidado clínico ético e acolhedor para ajudar você a superar desafios emocionais, desenvolver o autoconhecimento e viver com mais leveza.',
      ctaPrimary: 'Iniciar Triagem',
      ctaSecondary: 'Saiba Mais',
      badgeCrp: 'CRP Ativo',
      badgeApproach: 'Abordagem TCC',
      badgeEthic: 'Sigilo Ético',
    },
    diagnostic: {
      badge: 'Especialidades',
      title: 'Como a terapia pode ajudar você',
      description: 'Encontre um espaço clínico especializado para trabalhar as demandas que impedem o seu bem-estar diário.',
      card1Title: 'Ansiedade e Cansaço Físico',
      card1Desc: 'Sente que está sempre no seu limite, com a mente acelerada e o corpo exausto? A terapia ajuda a identificar os gatilhos e encontrar formas saudáveis de lidar com o estresse.',
      card2Title: 'Dificuldade de Relacionamento',
      card2Desc: 'Conflitos frequentes no trabalho, na família ou no namoro? Compreender a sua forma de se relacionar é o primeiro passo para construir conexões mais saudáveis.',
      card3Title: 'Busca de Sentido e Propósito',
      card3Desc: 'Momento de transição de carreira, luto ou crises existenciais? O suporte terapêutico oferece um espaço de escuta sem julgamentos para você se reconectar consigo mesmo.'
    },
    about: {
      badge: 'Sua Psicóloga',
      title: 'Conheça mais sobre a sua terapeuta',
      bio: 'Sou graduada em Psicologia com foco em psicoterapia clínica. Meu compromisso é fornecer um espaço acolhedor e sigiloso para que possamos juntos trabalhar nas suas dores e metas de crescimento pessoal.',
      description1: 'Sou graduada em Psicologia com foco em psicoterapia clínica. Meu compromisso é fornecer um espaço acolhedor e sigiloso para que possamos juntos trabalhar nas suas dores e metas de crescimento pessoal.',
      description2: 'Acredito em uma psicologia acessível, ética e integrada, respeitando a subjetividade de cada paciente e oferecendo ferramentas práticas para o dia a dia.',
      badgeTitle: 'Psicologia Clínica',
      points: [
        'Especialista em Saúde Mental',
        'Experiência com ansiedade, relacionamentos e burnout',
        'Registro ativo no CRP e atendimento ético'
      ],
      cta: 'Fazer Triagem'
    },
    process: {
      badge: 'O Processo',
      title: 'Como funciona a jornada de terapia',
      description: 'Um passo a passo simples focado no seu acolhimento desde o primeiro contato.',
      step1: {
        title: 'Triagem Online',
        description: 'Você preenche o formulário online rápido para que eu possa avaliar suas demandas e agilizar o primeiro contato.',
        cta: 'Iniciar Triagem'
      },
      step2: {
        title: 'Primeiro Contato',
        description: 'Eu entrarei em contato pessoalmente via WhatsApp para alinharmos o formato do atendimento (online ou presencial), valores e horários.'
      },
      step3: {
        title: 'Primeira Sessão',
        description: 'Damos início às sessões clínicas, focando no seu desenvolvimento pessoal e no seu autoconhecimento.'
      }
    },
    faq: {
      badge: 'Dúvidas',
      title: 'Perguntas Frequentes',
      description: 'Esclareça suas principais dúvidas sobre o processo terapêutico.',
      items: [
        {
          question: 'Como funciona a primeira consulta?',
          answer: 'A primeira consulta é um momento de escuta e acolhimento para compreendermos suas necessidades e definirmos a frequência das sessões.'
        },
        {
          question: 'As sessões online possuem a mesma eficácia?',
          answer: 'Sim. A terapia online possui regulamentação pelo CFP e a mesma eficácia comprovada do atendimento presencial.'
        },
        {
          question: 'Qual é a duração de cada sessão?',
          answer: 'Cada sessão individual dura em média 50 minutos.'
        }
      ]
    },
    space: {
      badge: 'O Consultório',
      title: 'Nosso Espaço Físico',
      description: 'Um ambiente aconchegante, tranquilo e planejado para garantir o seu conforto e privacidade em cada sessão presencial.',
      addressLabel: 'Endereço Clínico'
    },
    footer: {
      description: 'Cuidado e ética para a sua saúde mental.',
      crpLabel: 'Conselho Regional de Psicologia',
      navHeader: 'Navegação',
      serviceHeader: 'Especialidades',
      servicePoints: ['Terapia TCC', 'Ansiedade & Burnout', 'Relacionamentos'],
      scheduleLabel: 'Horário de Atendimento',
      rights: 'Todos os direitos reservados.'
    }
  },
  formFlow: {
    nodes: [
      {
        id: 'start',
        type: 'start',
        position: { x: 80, y: 150 },
        data: {
          title: 'Triagem Clínica Inicial',
          subtitle: 'Preencha as informações abaixo para agendarmos sua primeira sessão.',
          isRequired: true,
          buttonText: 'Iniciar Triagem'
        }
      },
      {
        id: 'nome',
        type: 'nome',
        position: { x: 460, y: 150 },
        data: {
          title: 'Qual é o seu nome completo?',
          placeholder: 'Escreva seu nome completo...',
          isRequired: true,
          buttonText: 'Avançar'
        }
      },
      {
        id: 'maioridade',
        type: 'maioridade',
        position: { x: 840, y: 150 },
        data: {
          title: 'Você é maior de idade?',
          subtitle: 'Caso seja menor de 18 anos, solicitaremos os dados do responsável legal.',
          isRequired: true,
          options: [
            { label: 'Sim, sou maior de 18 anos', value: 'Sim' },
            { label: 'Não, sou menor de idade', value: 'Não' }
          ],
          buttonText: 'Avançar'
        }
      },
      {
        id: 'celular',
        type: 'celular',
        position: { x: 1220, y: 150 },
        data: {
          title: 'Qual é o seu WhatsApp para contato?',
          subtitle: 'Usaremos para confirmar o horário e enviar o link da sessão.',
          placeholder: '(11) 99999-9999',
          isRequired: true,
          buttonText: 'Avançar'
        }
      },
      {
        id: 'emergencia',
        type: 'emergencia',
        position: { x: 1600, y: 150 },
        data: {
          title: 'Contato de Emergência',
          subtitle: 'Informe nome, telefone e parentesco de uma pessoa de confiança para suporte em caso de necessidade.',
          isRequired: false,
          buttonText: 'Avançar'
        }
      },
      {
        id: 'contrato',
        type: 'contrato',
        position: { x: 1980, y: 150 },
        data: {
          title: 'Termo de Consentimento e Sigilo Profissional',
          subtitle: 'Leia e confirme para concluir sua solicitação de agendamento.',
          contractText: 'Ao prosseguir, você declara estar ciente de que os atendimentos psicológicos são realizados em conformidade com o Código de Ética Profissional do Psicólogo e as diretrizes do Conselho Federal de Psicologia (CFP). As informações fornecidas são confidenciais, protegidas por sigilo profissional e tratadas nos termos da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).',
          isRequired: true,
          buttonText: 'Concluir Triagem'
        }
      }
    ],
    edges: [
      { id: 'e-start-nome', source: 'start', target: 'nome' },
      { id: 'e-nome-maioridade', source: 'nome', target: 'maioridade' },
      { id: 'e-maioridade-celular', source: 'maioridade', target: 'celular', sourceHandle: 'source-maior' },
      { id: 'e-celular-emergencia', source: 'celular', target: 'emergencia' },
      { id: 'e-emergencia-contrato', source: 'emergencia', target: 'contrato' }
    ],
    settings: {
      successAction: 'whatsapp',
      whatsappMessageTemplate: 'Olá! Preenchi a triagem inicial pelo seu site e gostaria de agendar minha sessão. Meu nome é {{nome}}.'
    }
  }
};

interface SocialCoverBannerProps {
  logoUrl?: string;
  faviconUrl?: string;
  logoConfig?: any;
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
  logoConfig,
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
          <BrandLogo
            logoUrl={logoUrl}
            logoConfig={logoConfig}
            faviconUrl={faviconUrl}
            title={title}
            fallbackText="Psicologia"
            primaryStart={activePrimaryStart}
            primaryEnd={activePrimaryEnd}
            contrastColor="#FFFFFF"
            fontHeading={fontHeading}
            textColor="#18181B"
            size="social"
          />
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

interface StackedSocialInput {
  id: string;
  presetKey?: string;
  label: string;
  url: string;
  error?: string;
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
  const [workspaceVisualIdentity, setWorkspaceVisualIdentity] = useState<any>(null);
  const [brandIdentityMode, setBrandIdentityMode] = useState<'inherit' | 'custom'>('inherit');
  const [selectedPalette, setSelectedPalette] = useState(COLOR_PALETTES[0]);
  const [isCustomColor, setIsCustomColor] = useState(false);
  const [customPrimaryStart, setCustomPrimaryStart] = useState((tenant as any)?.gradientColorStart || '#7C3AED');
  const [customPrimaryEnd, setCustomPrimaryEnd] = useState((tenant as any)?.gradientColorEnd || '#A855F7');
  const [customContrast, setCustomContrast] = useState((tenant as any)?.contrastColor || '#FFFFFF');
  const [customBgColor, setCustomBgColor] = useState((tenant as any)?.bgDarkColor || '#09090B');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [newFaviconUrl, setNewFaviconUrl] = useState('');
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

  const [workspaceDomain, setWorkspaceDomain] = useState<any>(null);

  useEffect(() => {
    if (tenant?.id) {
      api.getWorkspaceDomain(tenant.id)
        .then(setWorkspaceDomain)
        .catch(err => console.warn('Erro ao carregar domínio do workspace:', err));

      api.getVisualIdentity(tenant.id)
        .then((vi) => {
          if (vi) {
            setWorkspaceVisualIdentity(vi);
            setCustomPrimaryStart(vi.primaryColor || (tenant as any)?.gradientColorStart || '#7C3AED');
            setCustomPrimaryEnd(vi.secondaryColor || (tenant as any)?.gradientColorEnd || '#A855F7');
            setCustomContrast(vi.contrastColor || (tenant as any)?.contrastColor || '#FFFFFF');
            setCustomBgColor(vi.bgColor || (tenant as any)?.bgDarkColor || '#09090B');
            if (vi.fontHeading) setFontHeading(vi.fontHeading);
            if (vi.fontBody) setFontBody(vi.fontBody);
            if (vi.logoUrl) setNewLogoUrl(vi.logoUrl);
            if (vi.faviconUrl) setNewFaviconUrl(vi.faviconUrl);
          }
        })
        .catch(err => console.warn('Erro ao carregar identidade visual do workspace:', err));
    }
  }, [tenant?.id]);

  // Verificação se a conta já possui subdomínio ou domínio próprio cadastrado
  const hasAccountDomainConfigured = Boolean(workspaceDomain?.subdomain || workspaceDomain?.customDomain);

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



  // SEO & Social Media Optimization states
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoSocialImage, setSeoSocialImage] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [seoKeywordsInput, setSeoKeywordsInput] = useState('');
  const [seoAllowIndexing, setSeoAllowIndexing] = useState(true);
  const [seoLibraryOpen, setSeoLibraryOpen] = useState(false);
  const [seoPreviewTab, setSeoPreviewTab] = useState<'google' | 'social'>('google');

  // Redes Sociais & Override states
  const [socialLinksMode, setSocialLinksMode] = useState<'inherit' | 'custom'>('inherit');
  const [siteWhatsappNumber, setSiteWhatsappNumber] = useState('');
  const [siteWhatsappMessage, setSiteWhatsappMessage] = useState('Olá! Vim pelo seu site e gostaria de agendar uma consulta.');
  const [siteShowWhatsapp, setSiteShowWhatsapp] = useState(true);
  const [siteInstagram, setSiteInstagram] = useState('');
  const [siteLinkedin, setSiteLinkedin] = useState('');
  const [siteOtherLinks, setSiteOtherLinks] = useState<Array<{ label: string; url: string }>>([]);
  const [stackedSiteOtherInputs, setStackedSiteOtherInputs] = useState<StackedSocialInput[]>([]);

  const handleSelectCustomSocialLinks = () => {
    setSocialLinksMode('custom');
    const wsSocial = (tenant as any)?.socialLinks || (tenant as any)?.social_links || (primaryTenant as any)?.socialLinks || {};
    if (!siteWhatsappNumber) {
      setSiteWhatsappNumber(wsSocial.whatsappNumber || wsSocial.whatsapp || (tenant as any)?.phone || '');
    }
    if (!siteWhatsappMessage && wsSocial.whatsappMessage) {
      setSiteWhatsappMessage(wsSocial.whatsappMessage);
    }
    const existingInsta = wsSocial.instagram || (tenant as any)?.instagram || '';
    const existingLinkedin = wsSocial.linkedin || '';
    setSiteOtherLinks((prev) => {
      let updated = [...prev];
      if (siteOtherLinks.length === 0 && wsSocial.other) {
        updated = [...wsSocial.other];
      }
      if (existingInsta && !updated.some((l) => l.label.toLowerCase() === 'instagram')) {
        updated.unshift({ label: 'Instagram', url: existingInsta });
      }
      if (existingLinkedin && !updated.some((l) => l.label.toLowerCase() === 'linkedin')) {
        updated.unshift({ label: 'LinkedIn', url: existingLinkedin });
      }
      return updated;
    });
  };

  const normalizeWebUrl = (rawUrl: string): string => {
    let trimmed = rawUrl.trim();
    if (!trimmed) return '';
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }
    return trimmed;
  };

  const isValidWebUrl = (rawUrl: string): boolean => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return false;
    const normalized = normalizeWebUrl(trimmed);
    try {
      const parsed = new URL(normalized);
      const parts = parsed.hostname.split('.');
      return parts.length >= 2 && parts.every((p) => p.length > 0);
    } catch {
      return false;
    }
  };

  const handleToggleSiteOtherChip = (chipName: string) => {
    if (chipName === 'outros') {
      const newCustomItem: StackedSocialInput = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        label: '',
        url: '',
      };
      setStackedSiteOtherInputs((prev) => [...prev, newCustomItem]);
    } else {
      setStackedSiteOtherInputs((prev) => {
        const exists = prev.some((item) => item.presetKey === chipName);
        if (exists) {
          return prev.filter((item) => item.presetKey !== chipName);
        }
        return [
          ...prev,
          {
            id: `preset-${chipName}`,
            presetKey: chipName,
            label: chipName,
            url: '',
          },
        ];
      });
    }
  };

  const handleUpdateStackedSiteOtherInput = (id: string, field: 'label' | 'url', value: string) => {
    setStackedSiteOtherInputs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value, error: undefined } : item))
    );
  };

  const handleRemoveStackedSiteOtherInput = (id: string) => {
    setStackedSiteOtherInputs((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddStackedSiteOtherLink = (id: string) => {
    const target = stackedSiteOtherInputs.find((item) => item.id === id);
    if (!target) return;

    const labelToSave = target.label.trim();
    if (!labelToSave) {
      setStackedSiteOtherInputs((prev) =>
        prev.map((item) => (item.id === id ? { ...item, error: 'Por favor, informe o nome da rede.' } : item))
      );
      return;
    }

    if (!isValidWebUrl(target.url)) {
      setStackedSiteOtherInputs((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, error: 'Insira uma URL válida (ex: https://doctoralia.com.br/perfil ou instagram.com/perfil).' }
            : item
        )
      );
      return;
    }

    const finalUrl = normalizeWebUrl(target.url);
    setSiteOtherLinks((prev) => [...prev, { label: labelToSave, url: finalUrl }]);
    setStackedSiteOtherInputs((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRemoveSiteOtherLink = (idx: number) => {
    setSiteOtherLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  // CTA Destination states
  const [ctaType, setCtaType] = useState<'form' | 'whatsapp' | 'external_url'>('form');
  const [ctaWhatsappMessage, setCtaWhatsappMessage] = useState('Olá! Vim pelo seu site e gostaria de agendar uma consulta.');
  const [ctaExternalUrl, setCtaExternalUrl] = useState('');
  const [formChoiceMode, setFormChoiceMode] = useState<'new' | 'existing'>('new');
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [existingScreeningForms, setExistingScreeningForms] = useState<any[]>([]);

  useEffect(() => {
    if (tenant?.id) {
      api.getScreeningForms(tenant.id)
        .then(setExistingScreeningForms)
        .catch(err => console.warn('Erro ao carregar formulários do workspace:', err));
    }
  }, [tenant?.id]);

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
    setNewTitle(draftToLoad.newTitle || '');
    setNewLogoUrl(draftToLoad.newLogoUrl || '');
    setNewFaviconUrl(draftToLoad.newFaviconUrl || '');
    setCustomPrimaryStart(draftToLoad.customPrimaryStart || '');
    setCustomPrimaryEnd(draftToLoad.customPrimaryEnd || '');
    setCustomContrast(draftToLoad.customContrast || '');
    setCustomBgColor(draftToLoad.customBgColor || '');
    setIsCustomColor(draftToLoad.isCustomColor || false);
    
    if (draftToLoad.selectedPaletteId) {
      const found = COLOR_PALETTES.find((p) => p.id === draftToLoad.selectedPaletteId);
      if (found) setSelectedPalette(found);
    } else {
      setSelectedPalette(COLOR_PALETTES[0]);
    }
    
    setFontHeading(draftToLoad.fontHeading || 'Playfair Display');
    setFontBody(draftToLoad.fontBody || 'Plus Jakarta Sans');
    setDomainMode(draftToLoad.domainMode || 'subdomain');
    setSubdomainInput(draftToLoad.subdomainInput || '');
    setCustomDomainInput(draftToLoad.customDomainInput || '');
    setNewSlug(draftToLoad.newSlug || '');
    setSeoTitle(draftToLoad.seoTitle || '');
    setSeoDescription(draftToLoad.seoDescription || '');
    setSeoSocialImage('');
    setSeoKeywords(draftToLoad.seoKeywords || '');
    setSeoAllowIndexing(draftToLoad.seoAllowIndexing !== undefined ? draftToLoad.seoAllowIndexing : true);
    setCtaType(draftToLoad.ctaType || 'form');
    setCtaWhatsappMessage(draftToLoad.ctaWhatsappMessage || 'Olá! Vim pelo seu site e gostaria de agendar uma consulta.');
    setCtaExternalUrl(draftToLoad.ctaExternalUrl || '');
    setFormChoiceMode(draftToLoad.formChoiceMode || 'new');
    setSelectedFormId(draftToLoad.selectedFormId || '');
    setSocialLinksMode(draftToLoad.socialLinksMode || 'inherit');
    setSiteWhatsappNumber(draftToLoad.siteWhatsappNumber || draftToLoad.siteWhatsapp || '');
    setSiteWhatsappMessage(draftToLoad.siteWhatsappMessage || 'Olá! Vim pelo seu site e gostaria de agendar uma consulta.');
    setSiteShowWhatsapp(draftToLoad.siteShowWhatsapp !== undefined ? draftToLoad.siteShowWhatsapp : true);
    setSiteInstagram(draftToLoad.siteInstagram || '');
    setSiteLinkedin(draftToLoad.siteLinkedin || '');
    setSiteOtherLinks(draftToLoad.siteOtherLinks || []);
    
    if (draftToLoad.currentStep && draftToLoad.currentStep >= 1 && draftToLoad.currentStep <= 7) {
      setCurrentStep(draftToLoad.currentStep);
    } else {
      setCurrentStep(1);
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

  const createInitialDbDraft = async () => {
    if (!tenant?.id) return;
    try {
      const freshSlug = 'rascunho-' + Math.random().toString(36).substring(2, 9);
      const res = await api.createCapturePage({
        title: 'Nova Página',
        slug: freshSlug,
        tenantId: tenant.id,
        seoConfig: { metaTitle: '', metaDescription: '' },
        siteConfig: {
          status: 'draft',
          isWizardDraft: true,
          currentStep: 1,
          theme: {
            colors: {
              primaryStart: '#458270',
              primaryEnd: '#A64E2B',
              contrast: '#FFFFFF',
            },
          },
          sections: [
            { id: 'hero', type: 'hero', isActive: true },
            { id: 'footer', type: 'footer', isActive: true }
          ]
        },
        dictionary: {},
        formFlow: JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_MODEL.formFlow)),
      });

      if (res && res.success && res.page?.id) {
        setCurrentDraftId(res.page.id);
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('draftId', res.page.id);
          window.history.replaceState({}, '', url.toString());
        }
        return res.page.id;
      }
    } catch (err) {
      console.error('Erro ao criar rascunho inicial no banco:', err);
    }
  };

  // Helper to start a fresh draft
  const startFreshDraft = async () => {
    // Find if there is an empty draft in the list to reuse
    const emptyDraft = savedDraftsList.find((d) => 
      d.currentStep === 1 && 
      (d.newTitle === 'Nova Página' || !d.newTitle || d.newTitle === 'Rascunho de Página') && 
      !d.newLogoUrl && 
      !d.newFaviconUrl
    );

    if (emptyDraft) {
      loadDraftData(emptyDraft);
      return;
    }

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

    await createInitialDbDraft();
  };

  // Helper to delete a specific draft from storage
  const deleteDraft = async (draftIdToDelete: string) => {
    try {
      await api.deleteCapturePage(draftIdToDelete).catch(() => {});
      const updated = savedDraftsList.filter((d) => d.id !== draftIdToDelete);
      setSavedDraftsList(updated);

      if (currentDraftId === draftIdToDelete) {
        if (updated.length > 0) {
          loadDraftData(updated[0]);
        } else {
          await startFreshDraft();
        }
      }
    } catch (err) {
      console.error('Erro ao excluir rascunho:', err);
    }
  };

  // Restore draft on initial mount
  useEffect(() => {
    if (typeof window === 'undefined' || isInitialDraftCheckDone.current || !tenant?.id) return;
    isInitialDraftCheckDone.current = true;

    const loadInitialDraft = async () => {
      const lockKey = `draft_init_lock_${tenant.id}`;
      if (sessionStorage.getItem(lockKey)) return;
      sessionStorage.setItem(lockKey, 'true');

      try {
        const urlParams = new URLSearchParams(window.location.search);
        const targetDraftId = urlParams.get('draftId');

        // Buscamos rascunhos existentes no banco
        const pagesInDb = await api.getCapturePages(tenant.id);
        const dbDrafts = pagesInDb
          .filter(p => {
            const sc = p.siteConfig || {};
            const scd = p.siteConfigDraft || {};
            const isWizardDraft = sc.isWizardDraft === true || scd.isWizardDraft === true;
            const isDraftStatus = sc.status === 'draft' || scd.status === 'draft';
            return isWizardDraft && isDraftStatus;
          })
          .map(p => {
            const d = p.siteConfigDraft || p.siteConfig || {};
            return {
              id: p.id,
              tenantId: p.tenantId,
              updatedAt: p.updatedAt,
              currentStep: d.currentStep || 1,
              newTitle: p.titleDraft || p.title || 'Rascunho de Página',
              newLogoUrl: d.logoUrl || '',
              newFaviconUrl: d.faviconUrl || '',
              isCustomColor: d.isCustomColor || false,
              selectedPaletteId: d.selectedPaletteId || '',
              customPrimaryStart: d.customPrimaryStart || '',
              customPrimaryEnd: d.customPrimaryEnd || '',
              customContrast: d.customContrast || '',
              customBgColor: d.customBgColor || '',
              fontHeading: d.fontHeading || 'Playfair Display',
              fontBody: d.fontBody || 'Plus Jakarta Sans',
              domainMode: d.domainMode || 'subdomain',
              subdomainInput: p.slugDraft || p.slug || '',
              customDomainInput: p.customDomainDraft || p.customDomain || '',
              newSlug: p.slugDraft || p.slug || '',
              seoTitle: p.seoConfigDraft?.metaTitle || p.seoConfig?.metaTitle || '',
              seoDescription: p.seoConfigDraft?.metaDescription || p.seoConfig?.metaDescription || '',
              seoKeywords: p.seoConfigDraft?.keywords || p.seoConfig?.keywords || '',
              seoAllowIndexing: p.seoConfigDraft?.allowIndexing !== undefined ? p.seoConfigDraft.allowIndexing : true,
            };
          });

        setSavedDraftsList(dbDrafts);

        if (targetDraftId) {
          const found = dbDrafts.find((d) => d.id === targetDraftId);
          if (found) {
            loadDraftData(found);
            return;
          }
          try {
            const pageData = await api.getCapturePage(targetDraftId);
            if (pageData && pageData.siteConfig?.isWizardDraft) {
              const d = pageData.siteConfigDraft || pageData.siteConfig || {};
              const mapped = {
                id: pageData.id,
                tenantId: pageData.tenantId,
                updatedAt: pageData.updatedAt,
                currentStep: d.currentStep || 1,
                newTitle: pageData.titleDraft || pageData.title || 'Rascunho de Página',
                newLogoUrl: d.logoUrl || '',
                newFaviconUrl: d.faviconUrl || '',
                isCustomColor: d.isCustomColor || false,
                selectedPaletteId: d.selectedPaletteId || '',
                customPrimaryStart: d.customPrimaryStart || '',
                customPrimaryEnd: d.customPrimaryEnd || '',
                customContrast: d.customContrast || '',
                customBgColor: d.customBgColor || '',
                fontHeading: d.fontHeading || 'Playfair Display',
                fontBody: d.fontBody || 'Plus Jakarta Sans',
                domainMode: d.domainMode || 'subdomain',
                subdomainInput: pageData.slugDraft || pageData.slug || '',
                customDomainInput: pageData.customDomainDraft || pageData.customDomain || '',
                newSlug: pageData.slugDraft || pageData.slug || '',
                seoTitle: pageData.seoConfigDraft?.metaTitle || pageData.seoConfig?.metaTitle || '',
                seoDescription: pageData.seoConfigDraft?.metaDescription || pageData.seoConfig?.metaDescription || '',
                seoKeywords: pageData.seoConfigDraft?.keywords || pageData.seoConfig?.keywords || '',
                seoAllowIndexing: pageData.seoConfigDraft?.allowIndexing !== undefined ? pageData.seoConfigDraft.allowIndexing : true,
              };
              loadDraftData(mapped);
              return;
            }
          } catch {}
        }

        if (dbDrafts.length > 0) {
          const latestDraft = dbDrafts[0];
          const isLatestEmpty = latestDraft.currentStep === 1 && 
                                (latestDraft.newTitle === 'Nova Página' || !latestDraft.newTitle || latestDraft.newTitle === 'Rascunho de Página') &&
                                !latestDraft.newLogoUrl &&
                                !latestDraft.newFaviconUrl;
          
          if (isLatestEmpty) {
            loadDraftData(latestDraft);
          } else {
            setShowDraftsModal(true);
            setCurrentDraftId(latestDraft.id);
          }
        } else {
          await createInitialDbDraft();
        }
      } catch (err) {
        console.error('Erro na inicialização de rascunhos:', err);
        startFreshDraft();
      } finally {
        sessionStorage.removeItem(`draft_init_lock_${tenant.id}`);
      }
    };

    loadInitialDraft();
  }, [tenant?.id]);

  // Auto-save draft on form state updates and sync URL
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialDraftCheckDone.current || !currentDraftId || currentDraftId.startsWith('draft_')) return;

    const timer = setTimeout(async () => {
      try {
        const draftData = {
          currentStep,
          logoUrl: newLogoUrl,
          faviconUrl: newFaviconUrl,
          isCustomColor,
          selectedPaletteId: selectedPalette.id,
          customPrimaryStart,
          customPrimaryEnd,
          customContrast,
          customBgColor,
          fontHeading,
          fontBody,
          domainMode,
          subdomainInput,
          customDomainInput,
          newSlug,
          seoTitle,
          seoDescription,
          seoKeywords,
          seoAllowIndexing,
          socialLinksMode,
          siteWhatsappNumber,
          siteWhatsappMessage,
          siteShowWhatsapp,
          siteInstagram,
          siteLinkedin,
          siteOtherLinks,
        };

        await api.updateCapturePage(currentDraftId, {
          title: newTitle || 'Nova Página',
          slug: newSlug || 'rascunho-temp',
          titleDraft: newTitle,
          slugDraft: newSlug,
          customDomainDraft: customDomainInput,
          seoConfigDraft: {
            metaTitle: seoTitle,
            metaDescription: seoDescription,
            keywords: seoKeywords,
            allowIndexing: seoAllowIndexing,
          },
          siteConfigDraft: {
            status: 'draft',
            isWizardDraft: true,
            ...draftData
          }
        });
        setIsDraftSaved(true);
      } catch (err) {
        console.error('Erro ao salvar rascunho automático no banco:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    currentDraftId,
    currentStep,
    newTitle,
    newLogoUrl,
    newFaviconUrl,
    isCustomColor,
    selectedPalette.id,
    customPrimaryStart,
    customPrimaryEnd,
    customContrast,
    customBgColor,
    fontHeading,
    fontBody,
    domainMode,
    subdomainInput,
    customDomainInput,
    newSlug,
    seoTitle,
    seoDescription,
    seoKeywords,
    seoAllowIndexing,
    socialLinksMode,
    siteWhatsappNumber,
    siteWhatsappMessage,
    siteInstagram,
    siteLinkedin,
    siteOtherLinks,
  ]);
  const handleDiscardDraft = async () => {
    if (currentDraftId && !currentDraftId.startsWith('draft_')) {
      await api.deleteCapturePage(currentDraftId).catch(() => {});
    }
    setHasDraftRestored(false);
    setIsDraftSaved(false);
    setNewTitle('');
    setNewLogoUrl('');
    setNewFaviconUrl('');
    setSubdomainInput('');
    setCustomDomainInput('');
    setNewSlug('');
    setCurrentStep(1);
    await createInitialDbDraft();
  };



  // Extract only the first two words from name string without adding any title prefixes
  const extractFirstTwoWords = (nameStr: string): string => {
    if (!nameStr) return '';
    const parts = nameStr.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 2) return parts.join(' ');
    return `${parts[0]} ${parts[1]}`;
  };

  // Inherit psychologist default site branding & user name automatically
  useEffect(() => {
    const targetTenantId = tenant?.id || primaryTenant?.id;
    if (!targetTenantId) return;

    api.getVisualIdentity(targetTenantId)
      .then((vi) => {
        if (!vi) return;

        // Armazena a identidade visual real do workspace (tabela visual_identities)
        setWorkspaceVisualIdentity(vi);

        // Preenche os valores base customizados se ainda não houver imagem/cor definida pelo usuário
        if (vi.primaryColor) setCustomPrimaryStart(vi.primaryColor);
        if (vi.secondaryColor) setCustomPrimaryEnd(vi.secondaryColor);
        if (vi.contrastColor) setCustomContrast(vi.contrastColor);
        if (vi.bgColor) setCustomBgColor(vi.bgColor);
        if (vi.logoUrl && !newLogoUrl) setNewLogoUrl(vi.logoUrl);
        if (vi.faviconUrl && !newFaviconUrl) setNewFaviconUrl(vi.faviconUrl);
        if (vi.fontHeading) setFontHeading(vi.fontHeading);
        if (vi.fontBody) setFontBody(vi.fontBody);

        const matchingPalette = COLOR_PALETTES.find(
          p => p.primaryStart.toLowerCase() === (vi.primaryColor || '').toLowerCase()
        );
        if (matchingPalette) {
          setSelectedPalette(matchingPalette);
          setIsCustomColor(false);
        } else {
          setIsCustomColor(true);
        }
      })
      .catch((err) => console.warn('Erro ao obter identidade visual para o wizard:', err));
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
    if (currentStep === 6) {
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

  // Compute active brand identity directly from workspaceVisualIdentity / tenant when in 'inherit' mode
  const activePrimaryStart = brandIdentityMode === 'inherit'
    ? (workspaceVisualIdentity?.primaryColor || tenant?.defaultSitePrimaryColor || tenant?.gradientColorStart || primaryTenant?.gradientColorStart || '#7C3AED')
    : (isCustomColor ? customPrimaryStart : selectedPalette.primaryStart);

  const activePrimaryEnd = brandIdentityMode === 'inherit'
    ? (workspaceVisualIdentity?.secondaryColor || tenant?.defaultSiteSecondaryColor || tenant?.gradientColorEnd || primaryTenant?.gradientColorEnd || '#A855F7')
    : (isCustomColor ? customPrimaryEnd : selectedPalette.primaryEnd);

  const activeContrast = brandIdentityMode === 'inherit'
    ? (workspaceVisualIdentity?.contrastColor || tenant?.contrastColor || primaryTenant?.contrastColor || '#FFFFFF')
    : (isCustomColor ? customContrast : selectedPalette.contrast);

  const activeBgColor = brandIdentityMode === 'inherit'
    ? (workspaceVisualIdentity?.bgColor || (tenant as any)?.bgDarkColor || '#09090B')
    : (isCustomColor ? customBgColor : '#09090B');

  const activeFontHeading = brandIdentityMode === 'inherit'
    ? (workspaceVisualIdentity?.fontHeading || (tenant as any)?.defaultSiteFontHeading || (primaryTenant as any)?.defaultSiteFontHeading || 'Playfair Display')
    : fontHeading;

  const activeFontBody = brandIdentityMode === 'inherit'
    ? (workspaceVisualIdentity?.fontBody || (tenant as any)?.defaultSiteFontBody || (primaryTenant as any)?.defaultSiteFontBody || 'Plus Jakarta Sans')
    : fontBody;

  const activeLogoUrl = brandIdentityMode === 'inherit'
    ? (workspaceVisualIdentity?.logoUrl || tenant?.defaultSiteLogoUrl || primaryTenant?.defaultSiteLogoUrl || '')
    : newLogoUrl;

  const activeFaviconUrl = brandIdentityMode === 'inherit'
    ? (workspaceVisualIdentity?.faviconUrl || tenant?.defaultSiteFaviconUrl || primaryTenant?.defaultSiteFaviconUrl || '')
    : newFaviconUrl;

  // Compute logo configuration dynamically
  const wizardLogoConfig = brandIdentityMode === 'inherit' && workspaceVisualIdentity?.logoConfig
    ? workspaceVisualIdentity.logoConfig
    : {
        ...(tenant?.defaultSiteLogoConfig || primaryTenant?.defaultSiteLogoConfig || { mode: 'html', iconType: 'psi' } as any),
        text: newTitle.trim() || tenant?.defaultSiteLogoConfig?.text || 'Psicologia'
      };

  // Form submit -> create page and redirect
  const handleCreatePage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    for (let step = 1; step <= 6; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      // Cadeia de Herança do Template Inicial:
      // 1ª Prioridade: Herdar do último site editado no mesmo consultório
      // 2ª Prioridade: Usar modelo global da plataforma
      let templateModel = DEFAULT_TEMPLATE_MODEL;

      if (tenant?.id) {
        try {
          const workspacePages = await api.getCapturePages(tenant.id);
          const previousPages = workspacePages.filter(
            (p) => p.id !== currentDraftId && (!p.siteConfig?.isWizardDraft && !p.siteConfigDraft?.isWizardDraft)
          );
          if (previousPages.length > 0) {
            previousPages.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
            const lastEditedPage = previousPages[0];
            const dictToInherit = lastEditedPage.dictionaryDraft || lastEditedPage.dictionary;
            const cfgToInherit = lastEditedPage.siteConfigDraft || lastEditedPage.siteConfig;
            const flowToInherit = lastEditedPage.formFlowDraft || lastEditedPage.formFlow;

            if (dictToInherit && Object.keys(dictToInherit).length > 0) {
              templateModel = {
                siteConfig: cfgToInherit || DEFAULT_TEMPLATE_MODEL.siteConfig,
                dictionary: {
                  ...DEFAULT_TEMPLATE_MODEL.dictionary,
                  ...dictToInherit,
                  nav: { ...DEFAULT_TEMPLATE_MODEL.dictionary.nav, ...(dictToInherit.nav || {}) },
                  hero: { ...DEFAULT_TEMPLATE_MODEL.dictionary.hero, ...(dictToInherit.hero || {}) },
                  diagnostic: { ...DEFAULT_TEMPLATE_MODEL.dictionary.diagnostic, ...(dictToInherit.diagnostic || {}) },
                  about: { ...DEFAULT_TEMPLATE_MODEL.dictionary.about, ...(dictToInherit.about || {}) },
                  process: { ...DEFAULT_TEMPLATE_MODEL.dictionary.process, ...(dictToInherit.process || {}) },
                  faq: { ...DEFAULT_TEMPLATE_MODEL.dictionary.faq, ...(dictToInherit.faq || {}) },
                  space: { ...DEFAULT_TEMPLATE_MODEL.dictionary.space, ...(dictToInherit.space || {}) },
                  footer: { ...DEFAULT_TEMPLATE_MODEL.dictionary.footer, ...(dictToInherit.footer || {}) },
                },
                formFlow: flowToInherit || DEFAULT_TEMPLATE_MODEL.formFlow,
              };
            }
          }
        } catch (errInherit) {
          console.warn('Aviso: Erro ao buscar último site do consultório para herança, usando modelo global:', errInherit);
        }
      }

      let baseSiteConfig = JSON.parse(JSON.stringify(templateModel.siteConfig));
      let baseDictionary = JSON.parse(JSON.stringify(templateModel.dictionary));
      let baseFormFlow = JSON.parse(JSON.stringify(templateModel.formFlow));

      const hasBrandOverride = brandIdentityMode === 'custom';
      const hasSocialOverride = socialLinksMode === 'custom';

      const buildWhatsappUrl = () => {
        const num = siteWhatsappNumber.trim();
        if (!num) return undefined;
        if (num.startsWith('http://') || num.startsWith('https://')) return num;
        let digits = num.replace(/\D/g, '');
        if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
        if (!digits) return undefined;
        const query = siteWhatsappMessage.trim() ? `?text=${encodeURIComponent(siteWhatsappMessage.trim())}` : '';
        return `https://wa.me/${digits}${query}`;
      };

      const instaItem = siteOtherLinks.find((l) => l.label.toLowerCase() === 'instagram');
      const linkedinItem = siteOtherLinks.find((l) => l.label.toLowerCase() === 'linkedin');
      const instagramUrl = instaItem ? instaItem.url : siteInstagram.trim() || undefined;
      const linkedinUrl = linkedinItem ? linkedinItem.url : siteLinkedin.trim() || undefined;

      const socialLinksToSave = socialLinksMode === 'custom' ? {
        whatsappNumber: siteWhatsappNumber.trim() || undefined,
        whatsappMessage: siteWhatsappMessage.trim() || undefined,
        whatsappShowOnSite: siteShowWhatsapp,
        whatsapp: buildWhatsappUrl(),
        instagram: instagramUrl,
        linkedin: linkedinUrl,
        other: siteOtherLinks.length > 0 ? siteOtherLinks : undefined,
      } : undefined;

      // Inject custom site defaults if provided
      baseSiteConfig = {
        ...baseSiteConfig,
        hasBrandIdentityOverride: hasBrandOverride,
        hasSocialLinksOverride: hasSocialOverride,
        hasProfileOverride: false,
        logoUrl: hasBrandOverride && newLogoUrl.trim() ? newLogoUrl.trim() : undefined,
        logoConfig: hasBrandOverride ? (tenant?.defaultSiteLogoConfig || primaryTenant?.defaultSiteLogoConfig || { mode: 'html', text: newTitle.trim(), iconType: 'psi' }) : undefined,
        faviconUrl: hasBrandOverride && newFaviconUrl.trim() ? newFaviconUrl.trim() : undefined,
        socialLinks: socialLinksToSave,
        images: {
          hero: '',
          portrait: '',
          officeSpace: '',
          gallery: [],
        },
        theme: hasBrandOverride ? {
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
            bgDark: activeBgColor,
            textDark: '#18181B',
          }
        } : undefined
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
      const effectiveSubdomain = (subdomainInput || workspaceDomain?.subdomain || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

      // Dupla checagem de segurança da disponibilidade da slug antes de salvar no banco
      const isSlugAvailable = await validateSlugAvailability(effectiveSlug);
      if (!isSlugAvailable) {
        setSubmitting(false);
        setCurrentStep(6);
        return;
      }

      // Cria ou atualiza o subdomínio na tabela de domínios
      if (effectiveSubdomain && tenant?.id) {
        if (!workspaceDomain?.subdomain) {
          await api.createWorkspaceDomain(tenant.id, effectiveSubdomain).catch(() => {});
        } else if (effectiveSubdomain !== workspaceDomain.subdomain) {
          await api.updateWorkspaceDomain(tenant.id, effectiveSubdomain).catch(() => {});
        }
      }

      const draftData = {
        currentStep: 6,
        logoUrl: newLogoUrl,
        faviconUrl: newFaviconUrl,
        isCustomColor,
        selectedPaletteId: selectedPalette.id,
        customPrimaryStart,
        customPrimaryEnd,
        customContrast,
        customBgColor,
        fontHeading,
        fontBody,
        domainMode,
        subdomainInput: effectiveSubdomain,
        customDomainInput,
        newSlug: effectiveSlug,
        seoTitle,
        seoDescription,
        seoKeywords,
        seoAllowIndexing,
        socialLinksMode,
        siteWhatsappNumber,
        siteWhatsappMessage,
        siteInstagram,
        siteLinkedin,
        siteOtherLinks,
      };

      const finalSiteConfig = {
        ...baseSiteConfig,
        status: 'draft',
        isWizardDraft: false,
        hasSocialLinksOverride: socialLinksMode === 'custom',
        socialLinks: socialLinksToSave,
        theme: {
          colors: {
            primaryStart: activePrimaryStart,
            primaryEnd: activePrimaryEnd,
            contrast: activeContrast,
            bgDark: activeBgColor,
          },
          fontHeading,
          fontBody,
          logoUrl: newLogoUrl || undefined,
          faviconUrl: newFaviconUrl || undefined,
        },
        ...draftData
      };

      // Lógica de Vínculo/Criação de Formulário de Triagem
      let targetFormId: string | null = null;
      if (ctaType === 'form' && tenant?.id) {
        if (formChoiceMode === 'existing' && selectedFormId && existingScreeningForms.length > 0) {
          targetFormId = selectedFormId;
        } else {
          try {
            const newFormTitle = `Formulário - ${newTitle.trim() || 'Triagem Inicial'}`;
            const newFormSlug = `triagem-${effectiveSlug || Math.random().toString(36).substring(2, 8)}`;
            const createdForm = await api.createScreeningForm({
              workspaceId: tenant.id,
              title: newFormTitle,
              slug: newFormSlug,
              formFlow: baseFormFlow,
            });
            if (createdForm?.id) {
              targetFormId = createdForm.id;
            }
          } catch (formErr) {
            console.warn('Aviso: Erro ao criar formulário autônomo no banco, mantendo fluxo da página:', formErr);
          }
        }
      }

      await api.updateCapturePage(currentDraftId, {
        title: newTitle.trim(),
        slug: effectiveSlug,
        customDomain: customDomainInput || null,
        ctaType,
        ctaWhatsappMessage: ctaType === 'whatsapp' ? ctaWhatsappMessage : null,
        ctaExternalUrl: ctaType === 'external_url' ? ctaExternalUrl : null,
        formId: targetFormId,
        seoConfig,
        siteConfig: finalSiteConfig,
        dictionary: baseDictionary,
        formFlow: baseFormFlow,
        titleDraft: newTitle.trim(),
        slugDraft: effectiveSlug,
        customDomainDraft: customDomainInput || null,
        ctaTypeDraft: ctaType,
        ctaWhatsappMessageDraft: ctaType === 'whatsapp' ? ctaWhatsappMessage : null,
        ctaExternalUrlDraft: ctaType === 'external_url' ? ctaExternalUrl : null,
        formIdDraft: targetFormId,
        seoConfigDraft: seoConfig,
        siteConfigDraft: finalSiteConfig,
        dictionaryDraft: baseDictionary,
        formFlowDraft: baseFormFlow,
      });

      router.push(`/dashboard/captacao/${currentDraftId}`);
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
          ctx.font = `normal 44px '${fontHeading || 'serif'}', serif`;
          ctx.fillText(newTitle || 'Psicologia', 80, 115);
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
          ctx.font = `normal 44px '${fontHeading || 'serif'}', serif`;
          ctx.fillText(newTitle || 'Psicologia', 180, 112);
        } catch {
          const iconGradient = ctx.createLinearGradient(80, 135, 160, 55);
          iconGradient.addColorStop(0, startColor);
          iconGradient.addColorStop(1, endColor);
          ctx.fillStyle = iconGradient;
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(80, 55, 80, 80, 16);
          } else {
            ctx.rect(80, 55, 80, 80);
          }
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 44px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Ψ', 120, 95);
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';

          ctx.fillStyle = textDarkColor;
          ctx.font = `normal 44px '${fontHeading || 'serif'}', serif`;
          ctx.fillText(newTitle || 'Psicologia', 180, 112);
        }
      } else {
        // CASO 3: Nada enviado (Fallback padrão: Caixa Psi com gradiente + Nome da Psicóloga da 1ª etapa)
        const iconGradient = ctx.createLinearGradient(80, 135, 160, 55);
        iconGradient.addColorStop(0, startColor);
        iconGradient.addColorStop(1, endColor);
        ctx.fillStyle = iconGradient;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(80, 55, 80, 80, 16);
        } else {
          ctx.rect(80, 55, 80, 80);
        }
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Ψ', 120, 95);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        ctx.fillStyle = textDarkColor;
        ctx.font = `normal 44px '${fontHeading || 'serif'}', serif`;
        ctx.fillText(newTitle || 'Psicologia', 180, 112);
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
      const domainText = `https://${domainMode === 'custom' && customDomainInput.trim() ? customDomainInput.trim() : `${subdomainInput || workspaceDomain?.subdomain || 'sua-clinica'}.${baseDomain}`}${newSlug ? `/${newSlug}` : '/'}`;
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

  // Step validation logic for mandatory configurations
  const validateStep = (stepToValidate: number): boolean => {
    setError('');

    // Etapa 1: Nome da Psicóloga
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

    // Etapa 3: Links & Redes Sociais
    if (stepToValidate === 3) {
      if (socialLinksMode === 'custom') {
        const num = siteWhatsappNumber.trim();
        if (!num) {
          setError('O número do WhatsApp é obrigatório ao personalizar os links e redes sociais do site.');
          return false;
        }
      }
      return true;
    }

    // Etapa 4: Destino CTA
    if (stepToValidate === 4) {
      if (ctaType === 'external_url') {
        const url = ctaExternalUrl.trim();
        if (!url) {
          setError('A URL do link externo é obrigatória para continuar.');
          return false;
        }
        if (!isValidWebUrl(url)) {
          setError('Informe uma URL válida de link externo (ex: https://calendly.com/seu-perfil ou instagram.com/perfil).');
          return false;
        }
      } else if (ctaType === 'whatsapp') {
        const num = (siteWhatsappNumber.trim() || (tenant as any)?.socialLinks?.whatsappNumber || (tenant as any)?.social_links?.whatsappNumber || (tenant as any)?.phone || (primaryTenant as any)?.phone || '').trim();
        if (!num) {
          setError('Informe o número do WhatsApp de atendimento para continuar.');
          return false;
        }
      } else if (ctaType === 'form') {
        if (existingScreeningForms.length > 0 && formChoiceMode === 'existing' && !selectedFormId) {
          setError('Selecione qual formulário do consultório você deseja reutilizar.');
          return false;
        }
      }
      return true;
    }

    // Etapa 5: SEO & Compartilhamento
    if (stepToValidate === 5) {
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

    // Etapa 6: Escolha do Endereço na Internet (Domínio & Slug)
    if (stepToValidate === 6) {
      if (!hasAccountDomainConfigured) {
        if (domainMode === 'subdomain') {
          const sub = (subdomainInput || workspaceDomain?.subdomain || '').trim().toLowerCase();
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
        (p) => p.id !== currentDraftId && ((p.slug || '').toLowerCase() === cleanSlug || (p.slugDraft || '').toLowerCase() === cleanSlug)
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
      if (socialLinksMode === 'custom') {
        const num = siteWhatsappNumber.trim();
        if (!num) return false;
      }
      return true;
    }

    if (stepToCheck === 4) {
      if (ctaType === 'external_url') {
        const url = ctaExternalUrl.trim();
        if (!url || !isValidWebUrl(url)) return false;
      } else if (ctaType === 'whatsapp') {
        const num = (siteWhatsappNumber.trim() || (tenant as any)?.socialLinks?.whatsappNumber || (tenant as any)?.social_links?.whatsappNumber || (tenant as any)?.phone || (primaryTenant as any)?.phone || '').trim();
        if (!num) return false;
      } else if (ctaType === 'form') {
        if (existingScreeningForms.length > 0 && formChoiceMode === 'existing' && !selectedFormId) return false;
      }
      return true;
    }

    if (stepToCheck === 5) {
      const trimmedSeoTitle = seoTitle.trim();
      const trimmedSeoDesc = seoDescription.trim();
      return Boolean(trimmedSeoTitle && trimmedSeoTitle.length >= 2 && trimmedSeoDesc && trimmedSeoDesc.length >= 10);
    }

    if (stepToCheck === 6) {
      if (checkingSlug) return false;
      if (!hasAccountDomainConfigured) {
        if (domainMode === 'subdomain') {
          const sub = (subdomainInput || workspaceDomain?.subdomain || '').trim().toLowerCase();
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

    return true;
  }, [
    newTitle,
    isCustomColor,
    customPrimaryStart,
    customPrimaryEnd,
    customContrast,
    socialLinksMode,
    siteWhatsappNumber,
    ctaType,
    ctaExternalUrl,
    formChoiceMode,
    selectedFormId,
    existingScreeningForms.length,
    tenant,
    primaryTenant,
    domainMode,
    subdomainInput,
    workspaceDomain?.subdomain,
    checkingSubdomain,
    subdomainAvailable,
    customDomainInput,
    newSlug,
    checkingSlug,
    hasAccountDomainConfigured,
    seoTitle,
    seoDescription
  ]);

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
      if (step === 6) {
        const isSlugAvailable = await validateSlugAvailability(newSlug);
        if (!isSlugAvailable) {
          setCurrentStep(6);
          return;
        }
      }
    }
    setCurrentStep(targetStep);
  };

  const nextStep = async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep === 6) {
      const isSlugAvailable = await validateSlugAvailability(newSlug);
      if (!isSlugAvailable) return;

      if (!hasAccountDomainConfigured && domainMode === 'subdomain' && subdomainInput.trim()) {
        checkSubdomain(subdomainInput.trim());
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, 7));
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

          <div className="flex items-center gap-1.5 glass-md p-1.5 rounded-xl border border-[var(--surface-border)] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {[
              { num: 1, title: 'Nome' },
              { num: 2, title: 'Identidade' },
              { num: 3, title: 'Redes' },
              { num: 4, title: 'Destino CTA' },
              { num: 5, title: 'SEO' },
              { num: 6, title: 'Endereço' },
              { num: 7, title: 'Revisão' }
            ].map((s) => {
              const isActive = currentStep === s.num;
              const isDone = currentStep > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => handleStepClick(s.num)}
                  title={`Etapa ${s.num}: ${s.title}`}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-md ring-1 ring-white/20'
                      : isDone
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : isDone
                      ? 'bg-emerald-500/20 text-emerald-500'
                      : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {isDone ? <Check className="h-3 w-3" /> : s.num}
                  </span>
                  <span className={isActive ? 'inline font-bold' : 'hidden xl:inline opacity-75'}>
                    {s.title}
                  </span>
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
                    Etapa 1 de 7
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
                    className="brand-input text-xs h-10"
                  />
                  {!newTitle.trim() && (
                    <span className="text-[10px] text-red-500 font-medium flex items-center gap-1 pt-0.5">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>O nome da página é obrigatório.</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ETAPA 2: Identidade Visual */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-1 border-b border-[var(--surface-border)] pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-gradient-start)] block">
                    Etapa 2 de 7
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Identidade Visual da Página</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina se este site usará a identidade visual do consultório ou se terá cores, logotipo e tipografia próprios.
                  </p>
                </div>

                {/* Card de Opção: Herança vs Personalização */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setBrandIdentityMode('inherit');
                    }}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      brandIdentityMode === 'inherit'
                        ? 'border-[var(--brand-gradient-start)] bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm'
                        : 'border-[var(--surface-border)] bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-slate-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Usar Marca do Consultório</span>
                      {brandIdentityMode === 'inherit' && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Herança Ativa
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Herda automaticamente as cores, logotipo e fontes definidos no seu Consultório.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBrandIdentityMode('custom');
                    }}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      brandIdentityMode === 'custom'
                        ? 'border-[var(--brand-gradient-start)] bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm'
                        : 'border-[var(--surface-border)] bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-slate-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Personalizar para Este Site</span>
                      {brandIdentityMode === 'custom' && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          Personalizado
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Cria uma identidade exclusiva (cores, fontes e logotipo) apenas para esta página.
                    </p>
                  </button>
                </div>

                {brandIdentityMode === 'custom' ? (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Identidade Visual Personalizada</span>
                      <button
                        type="button"
                        onClick={() => setBrandIdentityMode('inherit')}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold bg-transparent border-none cursor-pointer"
                      >
                        ↺ Restaurar padrão do consultório
                      </button>
                    </div>

                    <BrandIdentityForm
                      previewTitle={newTitle}
                      tenantId={tenant?.id || ''}
                      logoUrl={newLogoUrl}
                      setLogoUrl={setNewLogoUrl}
                      faviconUrl={newFaviconUrl}
                      setFaviconUrl={setNewFaviconUrl}
                      primaryColor={activePrimaryStart}
                      setPrimaryColor={setCustomPrimaryStart}
                      secondaryColor={activePrimaryEnd}
                      setSecondaryColor={setCustomPrimaryEnd}
                      contrastColor={activeContrast}
                      setContrastColor={setCustomContrast}
                      bgColor={customBgColor}
                      setBgColor={setCustomBgColor}
                      fontHeading={fontHeading}
                      setFontHeading={setFontHeading}
                      fontBody={fontBody}
                      setFontBody={setFontBody}
                      isCustomColor={isCustomColor}
                      setIsCustomColor={setIsCustomColor}
                      selectedPalette={selectedPalette}
                      setSelectedPalette={setSelectedPalette}
                      themeColorClass="text-[var(--brand-gradient-start)]"
                    />
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl glass-sm border border-[var(--surface-border)] space-y-5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-3">
                      <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Identidade Herdada do Consultório
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Ativa por Padrão
                      </span>
                    </div>

                    {/* Grid de Cores do Workspace (4 Cores) */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
                        Cores do Consultório
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-2.5 rounded-xl border border-[var(--surface-border)] bg-white/40 dark:bg-black/20 space-y-1.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block truncate">Cor Primária</span>
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-lg border border-black/10 shadow-xs shrink-0" style={{ backgroundColor: activePrimaryStart }} />
                            <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">{activePrimaryStart}</span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl border border-[var(--surface-border)] bg-white/40 dark:bg-black/20 space-y-1.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block truncate">Cor Secundária</span>
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-lg border border-black/10 shadow-xs shrink-0" style={{ backgroundColor: activePrimaryEnd }} />
                            <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">{activePrimaryEnd}</span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl border border-[var(--surface-border)] bg-white/40 dark:bg-black/20 space-y-1.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block truncate">Fundo do Site</span>
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-lg border border-black/10 shadow-xs shrink-0" style={{ backgroundColor: activeBgColor }} />
                            <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">{activeBgColor}</span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl border border-[var(--surface-border)] bg-white/40 dark:bg-black/20 space-y-1.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block truncate">Contraste / Texto</span>
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-lg border border-black/10 shadow-xs shrink-0" style={{ backgroundColor: activeContrast }} />
                            <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">{activeContrast}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Preview de Logotipo e Ícone (Favicon) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
                          Logotipo do Consultório
                        </span>
                        <div className="p-3 rounded-xl border border-[var(--surface-border)] bg-white/40 dark:bg-black/20 flex items-center gap-3 min-h-[52px]">
                          {activeLogoUrl ? (
                            <img src={activeLogoUrl} alt="Logo" className="h-8 max-w-[140px] object-contain" />
                          ) : (
                            <BrandLogo
                              logoConfig={wizardLogoConfig}
                              title={newTitle || 'Psicologia'}
                              primaryStart={activePrimaryStart}
                              primaryEnd={activePrimaryEnd}
                              contrastColor={activeContrast}
                              fontHeading={activeFontHeading}
                              textColor="currentColor"
                              size="md"
                            />
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
                          Ícone / Favicon
                        </span>
                        <div className="p-3 rounded-xl border border-[var(--surface-border)] bg-white/40 dark:bg-black/20 flex items-center gap-3 min-h-[52px]">
                          {activeFaviconUrl ? (
                            <img src={activeFaviconUrl} alt="Favicon" className="h-7 w-7 rounded-lg object-contain" />
                          ) : (
                            <div
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-xs"
                              style={{ background: `linear-gradient(135deg, ${activePrimaryStart}, ${activePrimaryEnd})` }}
                            >
                              Ψ
                            </div>
                          )}
                          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
                            {activeFaviconUrl ? 'Ícone personalizado' : 'Ícone monograma padrão'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Preview de Tipografia (Heading + Body) */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
                        Tipografia Herdada
                      </span>
                      <div className="p-4 rounded-xl border border-[var(--surface-border)] bg-white/40 dark:bg-black/20 space-y-2">
                        <div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">Título ({activeFontHeading}):</span>
                          <p className="text-sm font-bold text-slate-900 dark:text-white" style={{ fontFamily: `'${activeFontHeading}', serif` }}>
                            {newTitle || 'Psicologia Clínica & Saúde Emocional'}
                          </p>
                        </div>
                        <div className="pt-1 border-t border-slate-100 dark:border-zinc-800">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">Corpo ({activeFontBody}):</span>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-light" style={{ fontFamily: `'${activeFontBody}', sans-serif` }}>
                            Acolhimento ético e especializado para o seu desenvolvimento pessoal.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 3: Links & Redes Sociais */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-1 border-b border-[var(--surface-border)] pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-gradient-start)] block">
                    Etapa 3 de 7
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Links & Redes Sociais</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina se este site usará os links das redes sociais do consultório ou se terá links personalizados.
                  </p>
                </div>

                {/* Card de Opção: Herança vs Personalização */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSocialLinksMode('inherit');
                    }}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      socialLinksMode === 'inherit'
                        ? 'border-[var(--brand-gradient-start)] bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm'
                        : 'border-[var(--surface-border)] bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-slate-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Usar Redes do Consultório</span>
                      {socialLinksMode === 'inherit' && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Herança Ativa
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Sempre reflete os dados definidos nas Configurações do Consultório.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={handleSelectCustomSocialLinks}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      socialLinksMode === 'custom'
                        ? 'border-[var(--brand-gradient-start)] bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm'
                        : 'border-[var(--surface-border)] bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-slate-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Personalizar para Este Site</span>
                      {socialLinksMode === 'custom' && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          Personalizado
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Cria uma versão própria exclusiva para esta página de captação.
                    </p>
                  </button>
                </div>

                {socialLinksMode === 'custom' ? (
                  <div className="space-y-5 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Links Personalizados do Site</span>
                      <button
                        type="button"
                        onClick={() => setSocialLinksMode('inherit')}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold bg-transparent border-none cursor-pointer"
                      >
                        ↺ Restaurar padrão do consultório
                      </button>
                    </div>

                    {/* WhatsApp: Número + Visibilidade + Mensagem Padrão */}
                    <div className="p-4 rounded-xl glass-sm border border-[var(--surface-border)] space-y-3">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        💬 WhatsApp
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Coluna 1: Número do WhatsApp */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                            Número do WhatsApp <span className="text-rose-500">*</span>
                          </label>
                          <PhoneInput
                            value={siteWhatsappNumber}
                            onChange={(e164) => setSiteWhatsappNumber(e164)}
                            defaultCountry="BR"
                            error={!siteWhatsappNumber.trim()}
                          />
                        </div>

                        {/* Coluna 2: Interruptor de Contato Direto via WhatsApp */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                            Contato Direto no Site
                          </label>
                          <div className="h-9 px-3 rounded-xl border border-[var(--surface-border)] bg-slate-50/50 dark:bg-black/20 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate mr-2">
                              {siteShowWhatsapp ? (
                                <>
                                  <Eye className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  <span className="truncate">Permitir contato direto</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  <span className="truncate">Oculto (Exige triagem)</span>
                                </>
                              )}
                            </span>

                            {/* Interruptor (Toggle Switch) */}
                            <button
                              type="button"
                              role="switch"
                              aria-checked={siteShowWhatsapp}
                              onClick={() => setSiteShowWhatsapp(!siteShowWhatsapp)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                                siteShowWhatsapp ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-700'
                              }`}
                              title={siteShowWhatsapp ? 'Permitir que visitantes entrem em contato direto pelo WhatsApp' : 'Ocultar WhatsApp para exigir preenchimento de formulário de triagem'}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  siteShowWhatsapp ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Mensagem Padrão (Full Width) */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                            Mensagem Padrão (ao Clicar)
                          </label>
                          <textarea
                            rows={3}
                            placeholder="ex: Olá! Vim pelo seu site e gostaria de agendar uma consulta."
                            value={siteWhatsappMessage}
                            onChange={(e) => setSiteWhatsappMessage(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-[var(--surface-border)] bg-slate-50/50 dark:bg-black/20 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors resize-y min-h-[68px]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Outras Redes / Links Personalizados */}
                    <div className="space-y-3 pt-3 border-t border-[var(--surface-border)]">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Outras Redes Sociais & Links Personalizados
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Clique nas redes para abrir o campo de link correspondente. Você pode selecionar várias opções ao mesmo tempo:
                        </p>
                      </div>

                      {/* Chips de Sugestão de Redes Prontas + Outros */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {SUGGESTED_NETWORKS.map((net) => {
                          const isInputActive = stackedSiteOtherInputs.some((item) => item.presetKey === net);
                          const isAlreadyAdded = siteOtherLinks.some((item) => item.label.toLowerCase() === net.toLowerCase());
                          return (
                            <button
                              key={net}
                              type="button"
                              onClick={() => handleToggleSiteOtherChip(net)}
                              className={`text-[11px] px-3 py-1.5 rounded-xl transition-all border cursor-pointer flex items-center gap-1 ${
                                isInputActive
                                  ? 'bg-indigo-600 text-white border-indigo-500 font-semibold shadow-xs ring-2 ring-indigo-500/30'
                                  : isAlreadyAdded
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium'
                                  : 'bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700/60'
                              }`}
                            >
                              <span>+ {net}</span>
                              {isAlreadyAdded && <Check className="w-3 h-3 text-emerald-500 ml-0.5" />}
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => handleToggleSiteOtherChip('outros')}
                          className="text-[11px] px-3 py-1.5 rounded-xl transition-all border cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 font-medium"
                        >
                          ✨ + Outros (Personalizado)
                        </button>
                      </div>

                      {/* Pilha de Caixas de Entrada Ativas (Stacked Inputs) */}
                      {stackedSiteOtherInputs.length > 0 && (
                        <div className="space-y-2.5 pt-1">
                          {stackedSiteOtherInputs.map((item) => (
                            <div
                              key={item.id}
                              className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 space-y-2.5 animate-in fade-in duration-200 shadow-xs"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {item.presetKey ? (
                                    <>
                                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Link para:</span>
                                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-xs">
                                        {item.presetKey}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                      ✏️ Link Personalizado
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStackedSiteOtherInput(item.id)}
                                  className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 bg-transparent border-none cursor-pointer"
                                  title="Remover campo"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Remover</span>
                                </button>
                              </div>

                              <div className="flex flex-col sm:flex-row items-center gap-2">
                                {!item.presetKey && (
                                  <div className="w-full sm:w-64 shrink-0">
                                    <Input
                                      type="text"
                                      value={item.label}
                                      onChange={(e) => handleUpdateStackedSiteOtherInput(item.id, 'label', e.target.value)}
                                      placeholder="Nome da rede (ex: Substack)"
                                      className="brand-input text-xs h-9"
                                    />
                                  </div>
                                )}
                                <div className="w-full sm:flex-1">
                                  <Input
                                    type="text"
                                    value={item.url}
                                    onChange={(e) => handleUpdateStackedSiteOtherInput(item.id, 'url', e.target.value)}
                                    placeholder={
                                      item.presetKey
                                        ? `URL do perfil no ${item.presetKey} (ex: https://...)`
                                        : 'URL (ex: https://...)'
                                    }
                                    className="brand-input text-xs h-9"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddStackedSiteOtherLink(item.id);
                                      }
                                    }}
                                  />
                                </div>
                                <Button
                                  type="button"
                                  onClick={() => handleAddStackedSiteOtherLink(item.id)}
                                  className="brand-accent text-white text-xs font-bold h-9 px-4 rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer w-full sm:w-auto"
                                >
                                  <Plus className="w-4 h-4" />
                                  <span>Adicionar {item.presetKey ? item.presetKey : ''}</span>
                                </Button>
                              </div>

                              {item.error && (
                                <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium pt-0.5 animate-in fade-in">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>{item.error}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {siteOtherLinks.length > 0 && (
                        <div className="space-y-2 pt-2">
                          {siteOtherLinks.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl glass-sm border border-[var(--surface-border)] text-xs">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {item.label}: <span className="font-normal text-slate-500 dark:text-slate-400">{item.url}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSiteOtherLink(idx)}
                                className="text-red-500 hover:text-red-400 bg-transparent border-none cursor-pointer p-1"
                                title="Remover link"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl glass-sm border border-[var(--surface-border)] space-y-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Redes Herdadas do Consultório:
                    </span>
                    {(() => {
                      const wsSocial = (tenant as any)?.socialLinks || (tenant as any)?.social_links || (primaryTenant as any)?.socialLinks || {};
                      const items: Array<{ label: string; value: string }> = [];
                      const num = wsSocial.whatsappNumber || wsSocial.whatsapp || (tenant as any)?.phone;
                      if (num) items.push({ label: 'WhatsApp', value: wsSocial.whatsappMessage ? `${num} ("${wsSocial.whatsappMessage}")` : num });
                      if (wsSocial.instagram || (tenant as any)?.instagram) items.push({ label: 'Instagram', value: wsSocial.instagram || (tenant as any)?.instagram });
                      if (wsSocial.linkedin) items.push({ label: 'LinkedIn', value: wsSocial.linkedin });
                      if (wsSocial.doctoralia) items.push({ label: 'Doctoralia', value: wsSocial.doctoralia });
                      if (wsSocial.other && Array.isArray(wsSocial.other)) {
                        wsSocial.other.forEach((o: any) => { if (o.label && o.url) items.push({ label: o.label, value: o.url }); });
                      }
                      if (items.length === 0) {
                        return <span className="text-xs text-slate-400 italic block">Nenhuma rede social configurada no consultório.</span>;
                      }
                      return (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {items.map((item, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
                              <strong>{item.label}:</strong> {item.value}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 4: Destino do CTA da Página */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-1 border-b border-[var(--surface-border)] pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-gradient-start)] block">
                    Etapa 4 de 7
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Destino do Botão Principal (CTA)</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina o que acontece quando o visitante clica nos botões de agendamento e chamada do seu site.
                  </p>
                </div>

                {/* 3 Radio Cards para Tipo de CTA */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setCtaType('form')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      ctaType === 'form'
                        ? 'border-[var(--brand-gradient-start)] bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm'
                        : 'border-[var(--surface-border)] bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-slate-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Formulário Interno</span>
                        {ctaType === 'form' && (
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            Ativo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Abre um modal de triagem e captura os dados diretamente no seu CRM.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCtaType('whatsapp')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      ctaType === 'whatsapp'
                        ? 'border-[var(--brand-gradient-start)] bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm'
                        : 'border-[var(--surface-border)] bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-slate-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">WhatsApp Direto</span>
                        {ctaType === 'whatsapp' && (
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            Ativo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Abre a conversa do WhatsApp com uma mensagem inicial pré-formatada.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCtaType('external_url')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      ctaType === 'external_url'
                        ? 'border-[var(--brand-gradient-start)] bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm'
                        : 'border-[var(--surface-border)] bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-slate-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Link / URL Externa</span>
                        {ctaType === 'external_url' && (
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            Ativo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Redireciona para um link externo (Calendly, Google Forms, Doctoralia).
                      </p>
                    </div>
                  </button>
                </div>

                {/* Opções Específicas baseadas no ctaType */}
                {ctaType === 'form' && (
                  <div className="space-y-4 pt-2 border-t border-[var(--surface-border)]">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Opções do Formulário de Triagem
                    </span>
                    {existingScreeningForms.length > 0 ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setFormChoiceMode('new')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              formChoiceMode === 'new'
                                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold'
                                : 'border-[var(--surface-border)] bg-slate-50/50 dark:bg-zinc-900/50 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <span className="text-xs block font-bold">✨ Criar Novo Formulário Padrão</span>
                            <span className="text-[10px] opacity-80 block pt-0.5">Instancia um modelo completo com perguntas essenciais.</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setFormChoiceMode('existing')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              formChoiceMode === 'existing'
                                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold'
                                : 'border-[var(--surface-border)] bg-slate-50/50 dark:bg-zinc-900/50 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <span className="text-xs block font-bold">📋 Reutilizar Formulário Existente</span>
                            <span className="text-[10px] opacity-80 block pt-0.5">Vincule um formulário já criado em outro site do consultório.</span>
                          </button>
                        </div>

                        {formChoiceMode === 'existing' && (
                          <div className="space-y-2 pt-2">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                              Selecione o Formulário do Consultório
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                              {existingScreeningForms.map((f) => (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => setSelectedFormId(f.id)}
                                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                                    selectedFormId === f.id
                                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-100 font-medium'
                                      : 'border-[var(--surface-border)] bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <div className="space-y-0.5">
                                    <span className="text-xs font-semibold block">{f.title}</span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">/{f.slug}</span>
                                  </div>
                                  {selectedFormId === f.id && (
                                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/30 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span>Um novo formulário de triagem será criado e vinculado a esta página automaticamente.</span>
                      </div>
                    )}
                  </div>
                )}

                {ctaType === 'whatsapp' && (
                  <div className="space-y-4 pt-2 border-t border-[var(--surface-border)]">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Número do WhatsApp para Atendimento
                        </label>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          (Preenchido na Etapa 3 ou Consultório)
                        </span>
                      </div>
                      <PhoneInput
                        value={siteWhatsappNumber || (tenant as any)?.socialLinks?.whatsappNumber || (tenant as any)?.social_links?.whatsappNumber || (tenant as any)?.phone || (primaryTenant as any)?.phone || ''}
                        onChange={(val) => setSiteWhatsappNumber(val)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Mensagem Inicial do WhatsApp
                      </label>
                      <textarea
                        rows={3}
                        value={ctaWhatsappMessage}
                        onChange={(e) => setCtaWhatsappMessage(e.target.value)}
                        placeholder="ex: Olá! Vim pelo seu site e gostaria de agendar uma consulta."
                        className="w-full p-3 rounded-xl border border-[var(--surface-border)] bg-slate-50/50 dark:bg-black/20 text-xs text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Sugestões Rápida de Mensagem (Clique para Aplicar):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          `Olá! Gostaria de agendar uma consulta com ${newTitle || 'a profissional'}.`,
                          `Olá! Vi seu site e quero tirar dúvidas sobre o atendimento online.`,
                          `Olá! Gostaria de saber mais informações sobre horários e valores.`
                        ].map((sug, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setCtaWhatsappMessage(sug)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-zinc-700 transition-all cursor-pointer"
                          >
                            + "{sug.substring(0, 35)}..."
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {ctaType === 'external_url' && (
                  <div className="space-y-3 pt-2 border-t border-[var(--surface-border)]">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        URL do Link Externo <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="url"
                        placeholder="https://calendly.com/seu-perfil"
                        value={ctaExternalUrl}
                        onChange={(e) => setCtaExternalUrl(e.target.value)}
                        className={`brand-input text-xs h-10 ${
                          !ctaExternalUrl.trim() || !isValidWebUrl(ctaExternalUrl)
                            ? '!border-red-500/80 focus:!border-red-500'
                            : ''
                        }`}
                      />
                      {!ctaExternalUrl.trim() ? (
                        <span className="text-[10px] text-red-500 font-medium flex items-center gap-1 pt-0.5">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>A URL do link externo é obrigatória para continuar.</span>
                        </span>
                      ) : !isValidWebUrl(ctaExternalUrl) ? (
                        <span className="text-[10px] text-red-500 font-medium flex items-center gap-1 pt-0.5">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>Informe um formato de URL válido (ex: https://calendly.com/seu-perfil).</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          Endereço externo completo para onde o visitante será redirecionado ao clicar no botão principal.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 5: Otimização SEO & Redes Sociais */}
            {currentStep === 5 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-1 border-b border-[var(--surface-border)] pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-gradient-start)] block">
                    Etapa 5 de 7
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
                          logoConfig={wizardLogoConfig}
                          title={newTitle}
                          description={seoDescription || `Atendimento psicológico especializado com ${newTitle || 'a profissional'}. Agende sua consulta presencial ou online.`}
                          domainUrl={`https://${domainMode === 'custom' && customDomainInput.trim() ? customDomainInput.trim() : `${subdomainInput || workspaceDomain?.subdomain || 'sua-clinica'}.${baseDomain}`}${newSlug ? `/${newSlug}` : '/'}`}
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
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-bold uppercase select-none text-slate-500 dark:text-slate-400">
                          {seoAllowIndexing ? '✓ Indexar (Google)' : '✕ Ocultar (NoIndex)'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSeoAllowIndexing((prev) => !prev)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                            seoAllowIndexing ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-zinc-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              seoAllowIndexing ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
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
                            <span className="text-[10px] text-slate-400 block truncate">https://{domainMode === 'custom' && customDomainInput.trim() ? customDomainInput.trim() : `${subdomainInput || workspaceDomain?.subdomain || 'sua-clinica'}.${baseDomain}`}{newSlug ? `/${newSlug}` : '/'}</span>
                          </div>
                        </div>
                        <h4 className="text-base font-medium text-blue-700 dark:text-blue-400 truncate hover:underline cursor-pointer">
                          {seoTitle.trim() || `${newTitle.trim()} | Psicologia Clínica`}
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
                              logoConfig={wizardLogoConfig}
                              title={newTitle}
                              description={seoDescription || `Atendimento psicológico especializado com ${newTitle || 'a profissional'}. Agende sua consulta presencial ou online.`}
                              domainUrl={`https://${domainMode === 'custom' && customDomainInput.trim() ? customDomainInput.trim() : `${subdomainInput || workspaceDomain?.subdomain || 'sua-clinica'}.${baseDomain}`}${newSlug ? `/${newSlug}` : '/'}`}
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
                            {domainMode === 'custom' && customDomainInput.trim() ? customDomainInput.trim() : `${subdomainInput || workspaceDomain?.subdomain || 'sua-clinica'}.${baseDomain}`}
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

            {/* ETAPA 6: Escolha de Endereço */}
            {currentStep === 6 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-1 border-b border-[var(--surface-border)] pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-gradient-start)] block">
                    Etapa 6 de 7
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Escolha do Endereço na Internet</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure o subdomínio gratuito do TheraOS ou conecte seu domínio próprio, e defina o endereço da página.
                  </p>
                </div>

                <DomainManager
                  tenantId={tenant?.id}
                  subdomain={subdomainInput || workspaceDomain?.subdomain || ''}
                  onSubdomainChange={(val) => {
                    setSubdomainInput(val);
                  }}
                  customDomain={customDomainInput}
                  onCustomDomainChange={setCustomDomainInput}
                  domainMode={domainMode}
                  onDomainModeChange={setDomainMode}
                  readOnlySubdomain={Boolean(workspaceDomain?.subdomain)}
                  readOnlyCustomDomain={Boolean(workspaceDomain?.customDomain)}
                  showSlugInput={true}
                  slug={newSlug}
                  onSlugChange={setNewSlug}
                />
              </div>
            )}

            {/* ETAPA 7: Revisão & Instanciação */}
            {currentStep === 7 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-1 border-b border-[var(--surface-border)] pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-gradient-start)] block">
                    Etapa 7 de 7
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
                      https://{domainMode === 'custom' && customDomainInput.trim() ? customDomainInput.trim() : `${subdomainInput || workspaceDomain?.subdomain || 'sua-clinica'}.${baseDomain}`}{newSlug ? `/${newSlug}` : '/'}
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
                      <span>https://{domainMode === 'custom' && customDomainInput.trim() ? customDomainInput.trim() : `${subdomainInput || workspaceDomain?.subdomain || 'sua-clinica'}.${baseDomain}`}{newSlug ? `/${newSlug}` : '/'}</span>
                    </div>
                    <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 truncate hover:underline cursor-pointer">
                      {seoTitle.trim() || `${newTitle.trim()} | Psicologia Clínica`}
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
                {currentStep < 7 ? (
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
                        <Loader2 className="animate-spin h-4 w-4 shrink-0" />
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
                /p/{workspaceDomain?.subdomain || 'clinica'}/{newSlug || 'sua-pagina'}
              </div>
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {/* Mockup Page Content Area */}
            <div 
              className="p-5 space-y-6 min-h-[360px] select-none transition-colors duration-300"
              style={{ backgroundColor: activeBgColor, color: getContrastColor(activeBgColor) }}
            >
              {/* Header inside Mockup */}
              <div 
                className="flex items-center justify-between pb-3 border-b"
                style={{ borderColor: getContrastColor(activeBgColor) === '#FFFFFF' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
              >
                {newLogoUrl ? (
                  <img src={newLogoUrl} alt="Logo Preview" className="h-7 max-w-[140px] object-contain" />
                ) : (
                  <div className="flex items-center gap-2 font-serif">
                    {newFaviconUrl ? (
                      <img src={newFaviconUrl} alt="Ícone Preview" className="h-7 w-7 object-contain rounded-md" />
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
                      className="text-sm font-semibold truncate max-w-[180px]"
                      style={{ fontFamily: `'${fontHeading}', serif`, color: getContrastColor(activeBgColor) }}
                    >
                      {newTitle.trim() || 'Nome da Psicóloga'}
                    </span>
                  </div>
                )}
                <div 
                  className="h-6 px-2.5 rounded text-[9px] font-bold uppercase flex items-center border"
                  style={{
                    backgroundColor: getContrastColor(activeBgColor) === '#FFFFFF' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    borderColor: getContrastColor(activeBgColor) === '#FFFFFF' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                    color: getContrastColor(activeBgColor) === '#FFFFFF' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)'
                  }}
                >
                  Contato
                </div>
              </div>

              {/* Hero Banner Mockup */}
              <div className="space-y-3 text-center py-4 px-2">
                <div 
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-medium"
                  style={{
                    backgroundColor: getContrastColor(activeBgColor) === '#FFFFFF' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    borderColor: getContrastColor(activeBgColor) === '#FFFFFF' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                    color: getContrastColor(activeBgColor) === '#FFFFFF' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)'
                  }}
                >
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  <span>Atendimento Online & Presencial</span>
                </div>

                <h3
                  className="text-lg font-bold leading-tight"
                  style={{ fontFamily: `'${fontHeading}', serif`, color: getContrastColor(activeBgColor) }}
                >
                  Psicologia Clínica & Saúde Emocional
                </h3>

                <p
                  className="text-xs leading-relaxed max-w-xs mx-auto"
                  style={{ fontFamily: `'${fontBody}', sans-serif`, color: getContrastColor(activeBgColor), opacity: 0.7 }}
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
                  <div 
                    className="w-full sm:w-auto h-9 px-4 rounded-xl font-medium text-xs flex items-center justify-center cursor-default border"
                    style={{
                      backgroundColor: getContrastColor(activeBgColor) === '#FFFFFF' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                      borderColor: getContrastColor(activeBgColor) === '#FFFFFF' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                      color: getContrastColor(activeBgColor) === '#FFFFFF' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)'
                    }}
                  >
                    Saiba Mais
                  </div>
                </div>
              </div>

              {/* Specialities cards mockup */}
              <div 
                className="grid grid-cols-2 gap-2 pt-2 border-t"
                style={{ borderColor: getContrastColor(activeBgColor) === '#FFFFFF' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
              >
                <div 
                  className="p-2.5 rounded-lg border text-left space-y-1"
                  style={{
                    backgroundColor: getContrastColor(activeBgColor) === '#FFFFFF' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderColor: getContrastColor(activeBgColor) === '#FFFFFF' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
                  }}
                >
                  <div className="h-2 w-12 rounded" style={{ backgroundColor: getContrastColor(activeBgColor) === '#FFFFFF' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
                  <div className="h-1.5 w-16 rounded" style={{ backgroundColor: getContrastColor(activeBgColor) === '#FFFFFF' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
                </div>
                <div 
                  className="p-2.5 rounded-lg border text-left space-y-1"
                  style={{
                    backgroundColor: getContrastColor(activeBgColor) === '#FFFFFF' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderColor: getContrastColor(activeBgColor) === '#FFFFFF' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
                  }}
                >
                  <div className="h-2 w-14 rounded" style={{ backgroundColor: getContrastColor(activeBgColor) === '#FFFFFF' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
                  <div className="h-1.5 w-12 rounded" style={{ backgroundColor: getContrastColor(activeBgColor) === '#FFFFFF' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
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
      <BrandModal isOpen={showDraftsModal} onClose={() => { setShowDraftsModal(false); startFreshDraft(); }} maxWidth="max-w-xl">
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
