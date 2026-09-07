'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api, Workspace, User, WorkspaceDomain } from '@/lib/api';
import { Card, Button, Input, Textarea, PhoneInput } from '@psi/ui';
import { useBrand } from '@/context/BrandContext';
import { DomainManager } from '@/components/domain-manager';
import { getWorkspaceVisualIdentity } from '@/lib/visual-identity';
import { BrandIdentityForm } from '@/components/BrandIdentityForm';
import { COLOR_PALETTES } from '@/components/ColorPaletteSelector';
import { MediaLibraryModal } from '@/components/media-library-modal';
import {
  User as UserIcon,
  Palette,
  Globe,
  Image as ImageIcon,
  Share2,
  Check,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Sparkles,
  Upload,
  AlertCircle,
  Camera,
  RefreshCw,
  Type,
  Smartphone,
  X,
  Eye,
  EyeOff
} from 'lucide-react';

interface WorkspaceSettingsFormProps {
  tenant: Workspace;
  workspace?: Workspace;
  initialUser: User;
}

interface StackedSocialInput {
  id: string;
  presetKey?: string;
  label: string;
  url: string;
  error?: string;
}

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

const DEFAULT_SPECIALTIES_PRESETS = [
  'Terapia Cognitivo-Comportamental (TCC)',
  'Psicanálise',
  'Ansiedade e Síndrome do Pânico',
  'Depressão e Transtornos do Humor',
  'Autoconhecimento e Autoestima',
  'Terapia de Casal e Relacionamentos',
  'Gestalt-Terapia',
  'Psicologia Positiva',
];

export function WorkspaceSettingsForm({ tenant, workspace, initialUser }: WorkspaceSettingsFormProps) {
  const currentWorkspace = workspace || tenant;
  const { reloadBrand } = useBrand();
  const visualIdentity = getWorkspaceVisualIdentity(currentWorkspace);

  const [activeTab, setActiveTab] = useState<'perfil' | 'redes' | 'marca' | 'dominio' | 'midias'>('perfil');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados dos Campos
  const [name, setName] = useState(currentWorkspace.name || '');
  const [crp, setCrp] = useState(currentWorkspace.crp || '');
  const [bio, setBio] = useState(currentWorkspace.bio || '');
  const [cityState, setCityState] = useState(currentWorkspace.cityState || '');
  const [instagram, setInstagram] = useState(currentWorkspace.socialLinks?.instagram || currentWorkspace.instagram || '');
  const [whatsappNumber, setWhatsappNumber] = useState(currentWorkspace.socialLinks?.whatsappNumber || currentWorkspace.socialLinks?.whatsapp || (currentWorkspace as any).phone || '');
  const [whatsappMessage, setWhatsappMessage] = useState(currentWorkspace.socialLinks?.whatsappMessage || 'Olá! Gostaria de agendar uma consulta.');
  const [showWhatsappOnSite, setShowWhatsappOnSite] = useState((currentWorkspace.socialLinks as any)?.whatsappShowOnSite ?? true);
  const [linkedin, setLinkedin] = useState(currentWorkspace.socialLinks?.linkedin || '');
  const [otherLinks, setOtherLinks] = useState<Array<{ label: string; url: string }>>(() => {
    const initial = [...(currentWorkspace.socialLinks?.other || [])];
    const existingInsta = currentWorkspace.socialLinks?.instagram || currentWorkspace.instagram;
    if (existingInsta && !initial.some(l => l.label.toLowerCase() === 'instagram')) {
      initial.unshift({ label: 'Instagram', url: existingInsta });
    }
    const existingLinkedin = currentWorkspace.socialLinks?.linkedin;
    if (existingLinkedin && !initial.some(l => l.label.toLowerCase() === 'linkedin')) {
      initial.unshift({ label: 'LinkedIn', url: existingLinkedin });
    }
    return initial;
  });
  const [stackedOtherInputs, setStackedOtherInputs] = useState<StackedSocialInput[]>([]);
  const [isOnlineService, setIsOnlineService] = useState(currentWorkspace.isOnlineService ?? true);
  const [specialties, setSpecialties] = useState<string[]>(currentWorkspace.specialties || []);
  const [newSpecialty, setNewSpecialty] = useState('');

  // Identidade Visual
  const [primaryColor, setPrimaryColor] = useState(visualIdentity.primaryColor || currentWorkspace.gradientColorStart || '#7C3AED');
  const [secondaryColor, setSecondaryColor] = useState(visualIdentity.secondaryColor || currentWorkspace.gradientColorEnd || '#A855F7');
  const [contrastColor, setContrastColor] = useState(visualIdentity.contrastColor || currentWorkspace.contrastColor || '#FFFFFF');
  const [bgColor, setBgColor] = useState(visualIdentity.bgColor || currentWorkspace.bgDarkColor || '#09090B');
  const [logoUrl, setLogoUrl] = useState(visualIdentity.logoUrl || '');
  const [faviconUrl, setFaviconUrl] = useState(visualIdentity.faviconUrl || '');
  const [fontHeading, setFontHeading] = useState(visualIdentity.fontHeading || 'Playfair Display');
  const [fontBody, setFontBody] = useState(visualIdentity.fontBody || 'Plus Jakarta Sans');

  const [selectedPalette, setSelectedPalette] = useState(COLOR_PALETTES[0]);
  const [isCustomColor, setIsCustomColor] = useState(false);


  // Modais
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<'logo' | 'favicon' | 'avatar' | null>(null);

  // Mídias Inline da Aba Biblioteca de Mídias
  const [tabMediaAssets, setTabMediaAssets] = useState<any[]>([]);
  const [loadingTabMedia, setLoadingTabMedia] = useState(false);
  const [copiedAssetId, setCopiedAssetId] = useState<string | null>(null);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  const fetchTabMedia = React.useCallback(async () => {
    if (!currentWorkspace?.id) return;
    setLoadingTabMedia(true);
    try {
      const data = await api.getMediaAssets(currentWorkspace.id);
      setTabMediaAssets(data || []);
    } catch (err) {
      console.error('Erro ao carregar mídias da aba:', err);
    } finally {
      setLoadingTabMedia(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (activeTab === 'midias') {
      fetchTabMedia();
    }
  }, [activeTab, fetchTabMedia]);

  const handleDeleteTabAsset = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta imagem da biblioteca?')) return;
    try {
      setDeletingAssetId(id);
      await api.deleteMediaAsset(id);
      setTabMediaAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(err.message || 'Falha ao excluir imagem.');
    } finally {
      setDeletingAssetId(null);
    }
  };

  const handleCopyAssetUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedAssetId(id);
    setTimeout(() => setCopiedAssetId(null), 2000);
  };

  // Carrega Identidade Visual da tabela
  useEffect(() => {
    if (currentWorkspace.id) {
      api.getVisualIdentity(currentWorkspace.id)
        .then((vi) => {
          if (vi) {
            setPrimaryColor(vi.primaryColor || currentWorkspace.gradientColorStart || '#7C3AED');
            setSecondaryColor(vi.secondaryColor || currentWorkspace.gradientColorEnd || '#A855F7');
            setContrastColor(vi.contrastColor || currentWorkspace.contrastColor || '#FFFFFF');
            setBgColor(vi.bgColor || currentWorkspace.bgDarkColor || '#09090B');
            setLogoUrl(vi.logoUrl || '');
            setFaviconUrl(vi.faviconUrl || '');
            setFontHeading(vi.fontHeading || 'Playfair Display');
            setFontBody(vi.fontBody || 'Plus Jakarta Sans');

            // Determina se a paleta é customizada ou bate com algum preset
            const matchingPalette = COLOR_PALETTES.find(
              p => p.primaryStart.toLowerCase() === (vi.primaryColor || '').toLowerCase()
            );
            if (matchingPalette) {
              setSelectedPalette(matchingPalette);
              setIsCustomColor(false);
            } else {
              setIsCustomColor(true);
            }
          }
        })
        .catch(() => {});
    }
  }, [currentWorkspace.id]);

  // Domínio do workspace
  const [workspaceDomain, setWorkspaceDomain] = useState<WorkspaceDomain | null>(null);
  const [subdomainInput, setSubdomainInput] = useState('');
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);

  useEffect(() => {
    if (currentWorkspace.id) {
      api.getWorkspaceDomain(currentWorkspace.id)
        .then((d) => {
          setWorkspaceDomain(d);
          if (d) {
            setSubdomainInput(d.subdomain || '');
            setCustomDomainInput(d.customDomain || '');
          }
        })
        .catch(() => {});
    }
  }, [currentWorkspace.id]);



  const handleAddSpecialty = (item: string) => {
    const trimmed = item.trim();
    if (trimmed && !specialties.includes(trimmed)) {
      setSpecialties([...specialties, trimmed]);
      setNewSpecialty('');
    }
  };

  const handleRemoveSpecialty = (index: number) => {
    setSpecialties(specialties.filter((_, i) => i !== index));
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

  const handleToggleOtherChip = (chipName: string) => {
    if (chipName === 'outros') {
      const newCustomItem: StackedSocialInput = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        label: '',
        url: '',
      };
      setStackedOtherInputs((prev) => [...prev, newCustomItem]);
    } else {
      setStackedOtherInputs((prev) => {
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

  const handleUpdateStackedOtherInput = (id: string, field: 'label' | 'url', value: string) => {
    setStackedOtherInputs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value, error: undefined } : item))
    );
  };

  const handleRemoveStackedOtherInput = (id: string) => {
    setStackedOtherInputs((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddStackedOtherLink = (id: string) => {
    const target = stackedOtherInputs.find((item) => item.id === id);
    if (!target) return;

    const labelToSave = target.label.trim();
    if (!labelToSave) {
      setStackedOtherInputs((prev) =>
        prev.map((item) => (item.id === id ? { ...item, error: 'Por favor, informe o nome da rede.' } : item))
      );
      return;
    }

    if (!isValidWebUrl(target.url)) {
      setStackedOtherInputs((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, error: 'Insira uma URL válida (ex: https://doctoralia.com.br/perfil ou instagram.com/perfil).' }
            : item
        )
      );
      return;
    }

    const finalUrl = normalizeWebUrl(target.url);
    setOtherLinks((prev) => [...prev, { label: labelToSave, url: finalUrl }]);
    setStackedOtherInputs((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRemoveOtherLink = (index: number) => {
    setOtherLinks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const buildWhatsappUrl = () => {
        const num = whatsappNumber.trim();
        if (!num) return undefined;
        if (num.startsWith('http://') || num.startsWith('https://')) return num;
        let digits = num.replace(/\D/g, '');
        if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
        if (!digits) return undefined;
        const query = whatsappMessage.trim() ? `?text=${encodeURIComponent(whatsappMessage.trim())}` : '';
        return `https://wa.me/${digits}${query}`;
      };

      const instaItem = otherLinks.find((l) => l.label.toLowerCase() === 'instagram');
      const linkedinItem = otherLinks.find((l) => l.label.toLowerCase() === 'linkedin');
      const instagramUrl = instaItem ? instaItem.url : instagram.trim() || undefined;
      const linkedinUrl = linkedinItem ? linkedinItem.url : linkedin.trim() || undefined;

      const socialLinksData = {
        whatsappNumber: whatsappNumber.trim() || undefined,
        whatsappMessage: whatsappMessage.trim() || undefined,
        whatsappShowOnSite: showWhatsappOnSite,
        whatsapp: buildWhatsappUrl(),
        instagram: instagramUrl,
        linkedin: linkedinUrl,
        other: otherLinks.length > 0 ? otherLinks : undefined,
      };

      await api.updateTenantBranding(currentWorkspace.id, {
        name,
        bio,
        specialties,
        cityState,
        instagram: instagramUrl || null,
        socialLinks: socialLinksData,
        isOnlineService,
        defaultSiteAvatarUrl: logoUrl || null,
      });

      await api.saveVisualIdentity(currentWorkspace.id, {
        primaryColor,
        secondaryColor,
        contrastColor,
        bgColor,
        logoUrl: logoUrl || null,
        faviconUrl: faviconUrl || null,
        fontHeading,
        fontBody,
      });

      await reloadBrand();
      setMessage({ type: 'success', text: 'Configurações do workspace salvas com sucesso!' });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Falha ao salvar configurações do workspace.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const cleanSub = subdomainInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      const cleanCustom = customDomainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

      if (!cleanSub || cleanSub.length < 3) {
        throw new Error('O subdomínio deve ter ao menos 3 caracteres.');
      }

      if (cleanSub !== workspaceDomain?.subdomain && subdomainAvailable === false) {
        throw new Error('Por favor, escolha um subdomínio disponível.');
      }

      // 1. Salvar ou atualizar subdomínio e domínio customizado no banco
      if (!workspaceDomain?.subdomain) {
        await api.createWorkspaceDomain(currentWorkspace.id, cleanSub, cleanCustom || null);
      } else {
        await api.updateWorkspaceDomain(currentWorkspace.id, cleanSub, cleanCustom || null);
      }

      // 2. Se um domínio customizado foi informado, registrar o hostname na Cloudflare / DB
      if (cleanCustom) {
        await api.registerCustomHostname(null, cleanCustom, currentWorkspace.id);
      }

      const updatedDomain = await api.getWorkspaceDomain(currentWorkspace.id);
      setWorkspaceDomain(updatedDomain as any);
      if (updatedDomain) {
        setSubdomainInput(updatedDomain.subdomain || '');
        setCustomDomainInput(updatedDomain.customDomain || '');
      }

      await reloadBrand();
      setMessage({ type: 'success', text: 'Configurações de domínio salvas com sucesso!' });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Falha ao salvar domínio.' });
    } finally {
      setSaving(false);
    }
  };




  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Mensagem Feedback */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between shadow-lg transition-all ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer bg-transparent border-none"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Navegação por Abas */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('perfil')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none ${
            activeTab === 'perfil'
              ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-md'
              : 'text-zinc-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Perfil do Profissional</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('redes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none ${
            activeTab === 'redes'
              ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-md'
              : 'text-zinc-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>Redes Sociais & Links</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('marca')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none ${
            activeTab === 'marca'
              ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-md'
              : 'text-zinc-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Identidade Visual</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dominio')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none ${
            activeTab === 'dominio'
              ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-md'
              : 'text-zinc-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Domínios & Subdomínio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('midias')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none ${
            activeTab === 'midias'
              ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-md'
              : 'text-zinc-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Biblioteca de Mídias</span>
        </button>
      </div>

      {/* Conteúdo Aba Perfil */}
      {activeTab === 'perfil' && (
        <form onSubmit={handleSave} className="space-y-6">
          <Card className="p-6 space-y-6 bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800/80">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-violet-400" />
              Informações Gerais do Atendimento
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Nome de Exibição / Clínica</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: Dra. Juliana Silva" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Cidade / Estado</label>
                <Input value={cityState} onChange={(e) => setCityState(e.target.value)} placeholder="Ex: São Paulo / SP" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Instagram Profissional</label>
                <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@seu.perfil" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Biografia Resumida</label>
              <Textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Conte sobre sua trajetória, abordagem clínica e compromisso com os pacientes..."
              />
            </div>

            {/* Especialidades */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">Especialidades & Áreas de Atuação</label>
              <div className="flex gap-2">
                <Input
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  placeholder="Adicionar especialidade..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSpecialty(newSpecialty);
                    }
                  }}
                />
                <Button type="button" onClick={() => handleAddSpecialty(newSpecialty)} className="shrink-0 bg-violet-600 hover:bg-violet-500">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Tags Sugeridas */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {DEFAULT_SPECIALTIES_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddSpecialty(preset)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-all border border-slate-200 dark:border-zinc-700/50 cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              {/* Tags Ativas */}
              <div className="flex flex-wrap gap-2 pt-2">
                {specialties.map((item, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-semibold">
                    {item}
                    <button type="button" onClick={() => handleRemoveSpecialty(idx)} className="hover:text-rose-400 cursor-pointer bg-transparent border-none">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={saving} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold">
                {saving ? 'Salvando...' : 'Salvar Perfil'}
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* Conteúdo Aba Redes Sociais */}
      {activeTab === 'redes' && (
        <form onSubmit={handleSave} className="space-y-6">
          <Card className="p-6 space-y-6 bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800/80">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Share2 className="w-4 h-4 text-violet-400" />
              Links & Redes Sociais Padrão do Consultório
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Esses links serão usados por padrão nos seus sites de captação. Nenhuma rede é obrigatória.
            </p>

            {/* WhatsApp: Número + Visibilidade + Mensagem Padrão */}
            <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">
                💬 WhatsApp Profissional
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Coluna 1: Número do WhatsApp */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Número do WhatsApp</label>
                  <PhoneInput value={whatsappNumber} onChange={(e164) => setWhatsappNumber(e164)} defaultCountry="BR" />
                </div>

                {/* Coluna 2: Interruptor de Contato Direto via WhatsApp */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Contato Direto no Site</label>
                  <div className="h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 truncate mr-2">
                      {showWhatsappOnSite ? (
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
                      aria-checked={showWhatsappOnSite}
                      onClick={() => setShowWhatsappOnSite(!showWhatsappOnSite)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                        showWhatsappOnSite ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-700'
                      }`}
                      title={showWhatsappOnSite ? 'Permitir que visitantes entrem em contato direto pelo WhatsApp' : 'Ocultar WhatsApp para exigir preenchimento de formulário de triagem'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          showWhatsappOnSite ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Mensagem Padrão (Full Width) */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Mensagem Padrão (ao Clicar)</label>
                  <textarea
                    rows={3}
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    placeholder="ex: Olá! Gostaria de agendar uma consulta."
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-violet-500 transition-colors resize-y min-h-[68px]"
                  />
                </div>
              </div>
            </div>

            {/* Outros Links Customizados */}
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">Outras Redes Sociais ou Links Personalizados</label>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Clique nas redes para abrir o campo de link correspondente. Você pode selecionar várias opções ao mesmo tempo:
                </p>
              </div>

              {/* Chips de Sugestão de Redes Prontas + Outros */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {SUGGESTED_NETWORKS.map((net) => {
                  const isInputActive = stackedOtherInputs.some((item) => item.presetKey === net);
                  const isAlreadyAdded = otherLinks.some((item) => item.label.toLowerCase() === net.toLowerCase());
                  return (
                    <button
                      key={net}
                      type="button"
                      onClick={() => handleToggleOtherChip(net)}
                      className={`text-[11px] px-3 py-1.5 rounded-xl transition-all border cursor-pointer flex items-center gap-1 ${
                        isInputActive
                          ? 'bg-violet-600 text-white border-violet-500 font-semibold shadow-xs ring-2 ring-violet-500/30'
                          : isAlreadyAdded
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium'
                          : 'bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700/60'
                      }`}
                    >
                      <span>+ {net}</span>
                      {isAlreadyAdded && <Check className="w-3 h-3 text-emerald-500 ml-0.5" />}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => handleToggleOtherChip('outros')}
                  className="text-[11px] px-3 py-1.5 rounded-xl transition-all border cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 font-medium"
                >
                  ✨ + Outros (Personalizado)
                </button>
              </div>

              {/* Pilha de Caixas de Entrada Ativas (Stacked Inputs) */}
              {stackedOtherInputs.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  {stackedOtherInputs.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 space-y-2.5 animate-in fade-in duration-200 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {item.presetKey ? (
                            <>
                              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Link para:</span>
                              <span className="px-2.5 py-0.5 rounded-lg bg-violet-600 text-white text-xs font-bold shadow-xs">
                                {item.presetKey}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                              ✏️ Link Personalizado
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveStackedOtherInput(item.id)}
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
                              onChange={(e) => handleUpdateStackedOtherInput(item.id, 'label', e.target.value)}
                              placeholder="Nome da rede (ex: Substack)"
                              className="text-xs h-9"
                            />
                          </div>
                        )}
                        <div className="w-full sm:flex-1">
                          <Input
                            type="text"
                            value={item.url}
                            onChange={(e) => handleUpdateStackedOtherInput(item.id, 'url', e.target.value)}
                            placeholder={
                              item.presetKey
                                ? `URL do perfil no ${item.presetKey} (ex: https://...)`
                                : 'URL (ex: https://...)'
                            }
                            className="text-xs h-9"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddStackedOtherLink(item.id);
                              }
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleAddStackedOtherLink(item.id)}
                          className="shrink-0 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold h-9 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer w-full sm:w-auto"
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

              {otherLinks.length > 0 && (
                <div className="space-y-2 pt-2">
                  {otherLinks.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 text-xs">
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">{item.label}: <span className="font-normal text-slate-500 dark:text-zinc-400">{item.url}</span></span>
                      <button type="button" onClick={() => handleRemoveOtherLink(idx)} className="text-rose-500 hover:text-rose-400 bg-transparent border-none cursor-pointer p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={saving} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold">
                {saving ? 'Salvando...' : 'Salvar Redes Sociais'}
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* Conteúdo Aba Marca */}
      {activeTab === 'marca' && (
        <form onSubmit={handleSave} className="space-y-6">
          <Card className="p-6 space-y-6 bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800/80">
            <BrandIdentityForm
              previewTitle={name}
              tenantId={currentWorkspace.id}
              logoUrl={logoUrl}
              setLogoUrl={setLogoUrl}
              faviconUrl={faviconUrl}
              setFaviconUrl={setFaviconUrl}
              primaryColor={primaryColor}
              setPrimaryColor={setPrimaryColor}
              secondaryColor={secondaryColor}
              setSecondaryColor={setSecondaryColor}
              contrastColor={contrastColor}
              setContrastColor={setContrastColor}
              bgColor={bgColor}
              setBgColor={setBgColor}
              fontHeading={fontHeading}
              setFontHeading={setFontHeading}
              fontBody={fontBody}
              setFontBody={setFontBody}
              isCustomColor={isCustomColor}
              setIsCustomColor={setIsCustomColor}
              selectedPalette={selectedPalette}
              setSelectedPalette={setSelectedPalette}
            />

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={saving} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold">
                {saving ? 'Salvando...' : 'Salvar Identidade Visual'}
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* Conteúdo Aba Domínio */}
      {activeTab === 'dominio' && (
        <div className="space-y-6">
          <Card className="p-6 bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800/80 space-y-4">
            <DomainManager
              tenantId={currentWorkspace.id}
              subdomain={subdomainInput}
              onSubdomainChange={(val) => setSubdomainInput(val)}
              customDomain={customDomainInput}
              onCustomDomainChange={(val) => setCustomDomainInput(val)}
              readOnlySubdomain={Boolean(workspaceDomain?.subdomain)}
              readOnlyCustomDomain={Boolean(workspaceDomain?.customDomain)}
            />
          </Card>
        </div>
      )}

      {/* Conteúdo Aba Mídias */}
      {activeTab === 'midias' && (
        <Card className="p-6 bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-violet-400" />
              Biblioteca de Fotos & Logotipos
            </h3>
            <Button
              type="button"
              onClick={() => {
                setMediaTarget(null);
                setMediaModalOpen(true);
              }}
              className="bg-violet-600 hover:bg-violet-500 text-xs"
            >
              Abrir Gerenciador de Arquivos
            </Button>
          </div>
        </Card>
      )}

      {/* Modais Compartilhados */}
      {mediaModalOpen && (
        <MediaLibraryModal
          tenantId={currentWorkspace.id}
          isOpen={mediaModalOpen}
          onClose={() => setMediaModalOpen(false)}
          resolution={mediaTarget === 'favicon' ? { width: 128, height: 128 } : { width: 400, height: 120 }}
          type={mediaTarget === 'logo' || mediaTarget === 'favicon' ? 'logotipo' : 'imagem'}
          onSelectImage={(asset: any) => {
            const url = typeof asset === 'string' ? asset : (asset?.url || asset || '');
            if (mediaTarget === 'logo') {
              setLogoUrl(url);
            }
            if (mediaTarget === 'favicon') {
              setFaviconUrl(url);
            }
            setMediaModalOpen(false);
          }}
          uploadType={mediaTarget === 'favicon' ? 'icon' : mediaTarget === 'logo' ? 'logo' : 'asset'}
        />
      )}
    </div>
  );
}

// Alias de Compatibilidade
export const TenantSettingsForm = WorkspaceSettingsForm;
