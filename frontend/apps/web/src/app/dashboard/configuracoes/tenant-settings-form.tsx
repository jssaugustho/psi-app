'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api, Tenant, User } from '@/lib/api';
import { Card, Button, Input, LoadingSpinner, BrandModal, DnsInstructions } from '@psi/ui';
import { useBrand } from '@/context/BrandContext';
import { useAuth } from '@/context/AuthContext';
import { MediaLibraryModal } from '@/components/media-library-modal';
import { LogoOptionModal } from '@/components/logo-option-modal';
import { LogoBuilderModal } from '@/components/logo-builder-modal';
import { DomainManager } from '@/components/domain-manager';
import {
  User as UserIcon,
  Palette,
  Globe,
  Image as ImageIcon,
  Check,
  CheckCircle2,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Upload,
  AlertCircle,
  HelpCircle,
  Camera,
  Lock,
  Mail,
  Edit3,
  RefreshCw
} from 'lucide-react';

interface TenantSettingsFormProps {
  tenant: Tenant;
  initialUser: User;
}

const COLOR_PRESETS = [
  { name: 'Terracota Nude', primary: '#CC8667', secondary: '#E6A88A', bg: '#FAFAFA', contrast: '#FFFFFF' },
  { name: 'Azul Sereno', primary: '#4F46E5', secondary: '#06B6D4', bg: '#F8FAFC', contrast: '#FFFFFF' },
  { name: 'Verde Botânico', primary: '#059669', secondary: '#34D399', bg: '#F0FDF4', contrast: '#FFFFFF' },
  { name: 'Rosa Fúcsia', primary: '#E11D48', secondary: '#FB7185', bg: '#FFF1F2', contrast: '#FFFFFF' },
  { name: 'Violeta Calmo', primary: '#7C3AED', secondary: '#A78BFA', bg: '#F5F3FF', contrast: '#FFFFFF' },
  { name: 'Âmbar Quente', primary: '#D97706', secondary: '#FBBF24', bg: '#FFFBEB', contrast: '#FFFFFF' },
  { name: 'Escuro Elegante', primary: '#CC8667', secondary: '#E6A88A', bg: '#09090B', contrast: '#FFFFFF' },
];

const DEFAULT_SPECIALTIES_PRESETS = [
  'Terapia Cognitivo-Comportamental (TCC)',
  'Psicanálise',
  'Ansiedade e Síndrome do Pânico',
  'Depressão e Transtornos do Humor',
  'Autoconhecimento e Autoestima',
  'Terapia de Casal e Relacionamentos',
  'Gestalt-Terapia',
  'Terapia de Aceitação e Compromisso (ACT)',
  'Terapia Comportamental Dialética (DBT)',
  'Burnout e Estresse Profissional',
  'Luto, Perdas e Transições de Vida',
  'Transtorno do Espectro Autista (TEA) & TDAH',
  'Trauma e TEPT',
  'Transtornos Alimentares',
  'Psicologia Perinatal e Maternidade',
  'Orientação Profissional e Carreira',
  'Neuropsicologia & Avaliação',
  'Psicologia Humanista & Fenomenológica',
];

const ColorPickerField = ({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex items-center gap-4 p-4 rounded-2xl border border-[var(--surface-border)] bg-white/[0.01]">
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-10 h-10 rounded-xl border-0 cursor-pointer p-0 overflow-hidden bg-transparent shrink-0"
    />
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold text-slate-200">{label}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-28 bg-white/5 border border-[var(--surface-border)] rounded-lg px-2 py-0.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-[var(--brand-gradient-start)]"
      />
    </div>
  </div>
);

const UploadBox = ({
  label,
  description,
  url,
  bgColor,
  tenantId,
  onChange,
  onClear,
}: {
  label: string;
  description: string;
  url: string;
  bgColor?: string;
  tenantId?: string;
  onChange: (url: string) => void;
  onClear: () => void;
}) => {
  const [libraryOpen, setLibraryOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div>
        <h4 className="text-xs font-bold text-slate-200">{label}</h4>
        <p className="text-[11px] text-slate-400 leading-tight">{description}</p>
      </div>

      <div
        onClick={() => setLibraryOpen(true)}
        style={{ backgroundColor: bgColor || 'var(--brand-bg-color, transparent)' }}
        className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--surface-border)] overflow-hidden cursor-pointer hover:border-[var(--brand-gradient-start)] transition-all group p-4 min-h-[130px]"
      >
        {url ? (
          <>
            <img src={url} alt={label} className="max-h-24 max-w-full object-contain p-1 transition-transform duration-300 group-hover:scale-105" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="absolute top-2 right-2 w-6 h-6 bg-red-500/90 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors shadow z-10 border-none cursor-pointer"
              title="Remover imagem"
            >
              ✕
            </button>
            <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/80 border border-white/10 text-[10px] font-bold text-white uppercase tracking-wider pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
              Trocar Imagem
            </div>
          </>
        ) : (
          <div className="text-center space-y-2 py-3">
            <Upload className="w-6 h-6 text-slate-500 mx-auto group-hover:text-[var(--brand-gradient-start)] transition-colors" />
            <span className="text-xs text-slate-300 font-semibold block">Escolher da Galeria de Fotos</span>
            <span className="text-[10px] text-slate-500 block">Formato recomendado: PNG transparente ou JPG</span>
          </div>
        )}
      </div>

      <MediaLibraryModal
        isOpen={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        tenantId={tenantId || ''}
        resolution={{ width: 800, height: 400 }}
        type="logotipo"
        onSelectImage={(asset: any) => {
          const url = typeof asset === 'string' ? asset : (asset?.url || asset);
          onChange(url);
        }}
      />
    </div>
  );
};

/* Componente Dedicado de Logotipo Padrão dos Sites (HTML ou Imagem) */
const SiteLogoField = ({
  logoConfig,
  logoUrl,
  bgColor,
  primaryColor,
  secondaryColor,
  contrastColor,
  onOpenOptions,
  onOpenBuilder,
  onOpenLibrary,
  onRemoveLogo,
}: {
  logoConfig: { mode: 'html' | 'image'; text?: string; iconType?: 'psi' | 'custom'; customIconUrl?: string };
  logoUrl: string;
  bgColor: string;
  primaryColor: string;
  secondaryColor: string;
  contrastColor: string;
  onOpenOptions: () => void;
  onOpenBuilder: () => void;
  onOpenLibrary: () => void;
  onRemoveLogo: () => void;
}) => {
  const isHtmlMode = logoConfig?.mode === 'html';
  const hasLogo = isHtmlMode ? Boolean(logoConfig?.text) : Boolean(logoUrl);

  return (
    <div className="space-y-2">
      <div>
        <h4 className="text-xs font-bold text-slate-200">Logotipo Padrão dos Seus Sites</h4>
        <p className="text-[11px] text-slate-400 leading-tight">
          Exibido no topo (cabeçalho) e rodapé dos novos sites que você criar. Você pode usar uma imagem pronta ou criar um logotipo em HTML.
        </p>
      </div>

      <div
        style={{ backgroundColor: bgColor || '#09090B' }}
        className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--surface-border)] overflow-hidden p-6 min-h-[140px] group transition-all"
      >
        {hasLogo ? (
          <div className="flex flex-col items-center justify-center space-y-3 w-full">
            {/* Preview do Logotipo */}
            {isHtmlMode ? (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 shadow-sm">
                <div
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    color: contrastColor,
                  }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow shrink-0"
                >
                  {logoConfig.iconType === 'custom' && logoConfig.customIconUrl ? (
                    <img src={logoConfig.customIconUrl} alt="Ícone" className="h-5 w-5 object-contain" />
                  ) : (
                    'Ψ'
                  )}
                </div>
                <span className="text-sm font-bold text-slate-100 tracking-wide font-serif">
                  {logoConfig.text || 'Psicologia'}
                </span>
              </div>
            ) : (
              <img src={logoUrl} alt="Logotipo Padrão" className="max-h-20 max-w-full object-contain p-1" />
            )}

            {/* Badges e Ações */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-slate-300 border border-white/10">
                {isHtmlMode ? '✨ Logotipo em HTML' : '🖼️ Imagem Enviada'}
              </span>

              {isHtmlMode ? (
                <button
                  type="button"
                  onClick={onOpenBuilder}
                  className="text-xs font-semibold px-3 py-1 bg-[var(--brand-gradient-start)] text-white rounded-lg hover:brightness-110 transition-all border-none cursor-pointer flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" /> Editar Texto & Ícone
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenLibrary}
                  className="text-xs font-semibold px-3 py-1 bg-white/10 text-slate-200 rounded-lg hover:bg-white/20 transition-all border-none cursor-pointer"
                >
                  Trocar Imagem
                </button>
              )}

              <button
                type="button"
                onClick={onOpenOptions}
                className="text-xs font-semibold px-3 py-1 bg-white/10 text-slate-300 rounded-lg hover:bg-white/20 transition-all border-none cursor-pointer"
              >
                Alterar Estilo
              </button>

              <button
                type="button"
                onClick={onRemoveLogo}
                className="text-xs font-semibold px-2 py-1 text-red-400 hover:text-red-300 transition-colors bg-transparent border-none cursor-pointer"
                title="Remover logotipo"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3 py-2">
            <Sparkles className="w-7 h-7 text-slate-500 mx-auto" />
            <div>
              <span className="text-xs text-slate-300 font-bold block mb-1">Nenhum logotipo padrão definido</span>
              <span className="text-[11px] text-slate-500 block">Crie um logotipo visual em HTML ou suba uma imagem pronta.</span>
            </div>
            <button
              type="button"
              onClick={onOpenOptions}
              className="px-4 py-2 text-xs font-bold text-white rounded-xl bg-[var(--brand-gradient-start)] hover:brightness-110 transition-all border-none cursor-pointer shadow"
            >
              Definir Logotipo Padrão
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* Componente Dedicado de Foto de Perfil */
const ProfileAvatarField = ({
  avatarUrl,
  userInitials,
  tenantId,
  onChange,
  onRemove,
}: {
  avatarUrl: string;
  userInitials: string;
  tenantId?: string;
  onChange: (url: string) => void;
  onRemove: () => void;
}) => {
  const [libraryOpen, setLibraryOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-5 rounded-2xl border border-[var(--surface-border)] bg-white/[0.01]">
      <div className="relative group shrink-0">
        <div
          onClick={() => setLibraryOpen(true)}
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-[var(--brand-gradient-start)]/40 shadow-xl cursor-pointer relative bg-slate-900 flex items-center justify-center group-hover:border-[var(--brand-gradient-start)] transition-all"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Foto de Perfil" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold" style={{ background: 'var(--brand-gradient)' }}>
              {userInitials || 'P'}
            </div>
          )}

          {/* Overlay de Câmera no Hover */}
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
            <Camera className="w-6 h-6 mb-1 text-[var(--brand-gradient-start)]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Alterar</span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2 text-center sm:text-left">
        <div>
          <h4 className="text-sm font-bold text-slate-100">Sua Foto de Perfil Profissional</h4>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            Essa foto de rosto será exibida no seu perfil do app e nos cartões 'Sobre a Profissional' nas suas landing pages.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
          <Button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="text-xs font-semibold px-4 py-2 cursor-pointer flex items-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5" /> Escolher Foto
          </Button>

          {avatarUrl && (
            <button
              type="button"
              onClick={onRemove}
              className="text-xs font-semibold px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors bg-transparent border-none cursor-pointer"
            >
              Remover Foto
            </button>
          )}
        </div>
      </div>

      <MediaLibraryModal
        isOpen={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        tenantId={tenantId || ''}
        resolution={{ width: 400, height: 400 }}
        type="imagem"
        onSelectImage={(asset: any) => {
          const url = typeof asset === 'string' ? asset : (asset?.url || asset);
          onChange(url);
        }}
      />
    </div>
  );
};

export default function TenantSettingsForm({ tenant, initialUser }: TenantSettingsFormProps) {
  const { reloadBrand } = useBrand();
  const { setUser: setGlobalAuthUser } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState<'perfil' | 'sites-branding' | 'dominios' | 'midia'>('perfil');

  // 1. Perfil Profissional State
  const [user, setUser] = useState<User>(initialUser);
  const [nome, setNome] = useState(initialUser?.nome || '');
  const [sobrenome, setSobrenome] = useState(initialUser?.sobrenome || '');
  const [telefone, setTelefone] = useState(initialUser?.telefone || '');
  const [crp, setCrp] = useState(initialUser?.crp || '');
  const [cityState, setCityState] = useState(initialUser?.city_state || '');
  const [instagram, setInstagram] = useState(initialUser?.instagram || '');
  const [bio, setBio] = useState(initialUser?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(initialUser?.avatar_url || '');
  const [specialties, setSpecialties] = useState<string[]>(initialUser?.specialties || []);
  const [newSpecialtyInput, setNewSpecialtyInput] = useState('');

  // Seguranca e Senha
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 2. Marca Padrão dos Sites State (Independente do White-Label do SaaS)
  const [logoUrl, setLogoUrl] = useState<string>(tenant.defaultSiteLogoUrl || '');
  const [faviconUrl, setFaviconUrl] = useState<string>(tenant.defaultSiteFaviconUrl || tenant.iconLightUrl || tenant.iconDarkUrl || '');
  const [logoConfig, setLogoConfig] = useState<{
    mode: 'html' | 'image';
    text?: string;
    iconType?: 'psi' | 'custom';
    customIconUrl?: string;
  }>(
    tenant.defaultSiteLogoConfig || {
      mode: logoUrl ? 'image' : 'html',
      text: `${initialUser?.nome || 'Psicóloga'} ${initialUser?.sobrenome || ''}`.trim(),
      iconType: 'psi',
    }
  );

  // Modais do Criador de Logo dos Sites
  const [logoOptionModalOpen, setLogoOptionModalOpen] = useState(false);
  const [logoBuilderModalOpen, setLogoBuilderModalOpen] = useState(false);
  const [siteLogoLibraryOpen, setSiteLogoLibraryOpen] = useState(false);

  // Cores dos Sites
  const [primaryColor, setPrimaryColor] = useState(tenant.defaultSitePrimaryColor || '#CC8667');
  const [secondaryColor, setSecondaryColor] = useState(tenant.defaultSiteSecondaryColor || '#E6A88A');
  const [bgColor, setBgColor] = useState(tenant.bgLightColor || '#FAFAFA');
  const [contrastColor, setContrastColor] = useState(tenant.contrastColor || '#FFFFFF');

  // 3. Domínio dos Sites State
  const [slug, setSlug] = useState(tenant.slug || '');
  const [domain, setDomain] = useState(tenant.domain || '');

  // 4. Biblioteca de Mídia State
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  // UI Status States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Carregar Mídia na aba de galeria
  const fetchMedia = useCallback(async () => {
    setMediaLoading(true);
    try {
      const list = await api.getMediaAssets(tenant.id);
      setMediaAssets(list || []);
    } catch (err) {
      console.error('Erro ao carregar mídia:', err);
    } finally {
      setMediaLoading(false);
    }
  }, [tenant.id]);

  useEffect(() => {
    if (activeTab === 'midia') {
      fetchMedia();
    }
  }, [activeTab, fetchMedia]);

  // Handler para Especialidades
  const handleAddSpecialty = (item: string) => {
    const trimmed = item.trim();
    if (trimmed && !specialties.includes(trimmed)) {
      setSpecialties([...specialties, trimmed]);
      setNewSpecialtyInput('');
    }
  };

  const handleRemoveSpecialty = (item: string) => {
    setSpecialties(specialties.filter((s) => s !== item));
  };

  // Upload direto na galeria de fotos
  const handleDirectMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    try {
      const { url, key } = await api.uploadImage(file, 'asset');
      await api.registerMediaAsset({
        tenantId: tenant.id,
        name: file.name,
        key,
        url,
        mimeType: file.type || 'image/png',
        fileSize: file.size,
        isCropped: false
      });
      setSuccess('Imagem adicionada com sucesso à sua biblioteca!');
      await fetchMedia();
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar foto.');
    } finally {
      setLoading(false);
      if (mediaFileInputRef.current) mediaFileInputRef.current.value = '';
    }
  };

  // Copiar link da imagem
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Excluir foto
  const handleDeleteMedia = async (id: string) => {
    if (!confirm('Deseja excluir esta foto da sua galeria?')) return;
    try {
      await api.deleteMediaAsset(id);
      setMediaAssets((prev) => prev.filter((a) => a.id !== id));
      setSuccess('Foto removida!');
    } catch (err) {
      alert('Erro ao remover imagem.');
    }
  };

  // Salvar Formulário
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validação de Senha se preenchida
    if (newPassword) {
      if (newPassword.length < 6) {
        setError('A nova senha deve ter no mínimo 6 caracteres.');
        setLoading(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('A confirmação da nova senha não confere.');
        setLoading(false);
        return;
      }
    }

    try {
      // 1. Atualizar Credenciais e Foto no Auth Me se houver alteração
      let meUpdatedUser = null;
      try {
        const updateMeRes = await api.updateMe({
          nome: nome.trim(),
          sobrenome: sobrenome.trim(),
          telefone: telefone.trim() || null,
          avatarUrl: avatarUrl || null,
          password: newPassword.trim() || null,
        });
        if (updateMeRes && updateMeRes.user) {
          meUpdatedUser = updateMeRes.user;
        }
      } catch (errMe) {
        console.warn('Atualização /auth/me parcial:', errMe);
      }

      // 2. Salvar Campos Estendidos do Perfil Profissional
      const updatedUser = await api.updateProfile(user.id, {
        nome: nome.trim(),
        sobrenome: sobrenome.trim(),
        telefone: telefone.trim() || null,
        crp: crp.trim() || null,
        bio: bio.trim() || null,
        specialties,
        city_state: cityState.trim() || null,
        instagram: instagram.trim() || null,
        avatar_url: avatarUrl || null,
      });

      const finalUser = updatedUser || meUpdatedUser || user;
      setUser(finalUser);
      setGlobalAuthUser(finalUser);

      // Limpar campos de senha
      setNewPassword('');
      setConfirmPassword('');

      // 3. Salvar Marca Padrão dos Sites (NÃO altera o nome do Tenant ou marca da Plataforma)
      await api.updateTenantBranding(tenant.id, {
        slug: slug.trim().toLowerCase(),
        domain: domain.trim() || null,
        defaultSiteLogoUrl: logoUrl || null,
        defaultSiteFaviconUrl: faviconUrl || null,
        defaultSiteLogoConfig: logoConfig,
        defaultSitePrimaryColor: primaryColor,
        defaultSiteSecondaryColor: secondaryColor,
        bgLightColor: bgColor,
        bgDarkColor: bgColor,
        contrastColor: contrastColor,
      });

      setSuccess('Suas configurações foram salvas com sucesso!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Não foi possível salvar as configurações.');
    } finally {
      setLoading(false);
    }
  };

  const userInitials = `${nome?.[0] || ''}${sobrenome?.[0] || ''}`.toUpperCase();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Menu de Abas Simplificado */}
      <div className="flex items-center gap-2 border-b border-[var(--surface-border)] pb-2 overflow-x-auto custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('perfil')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer ${
            activeTab === 'perfil'
              ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>1. Seu Perfil Profissional</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sites-branding')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer ${
            activeTab === 'sites-branding'
              ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>2. Visual dos Seus Sites</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dominios')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer ${
            activeTab === 'dominios'
              ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>3. Endereço na Internet (Domínio)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('midia')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer ${
            activeTab === 'midia'
              ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>4. Sua Galeria de Fotos</span>
        </button>
      </div>

      {/* Alertas de Status */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-4 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-4 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* ABA 1: PERFIL PROFISSIONAL */}
        {activeTab === 'perfil' && (
          <div className="space-y-6 animate-page-enter">
            {/* Foto de Perfil UI Dedicada */}
            <Card>
              <ProfileAvatarField
                avatarUrl={avatarUrl}
                userInitials={userInitials}
                tenantId={tenant.id}
                onChange={(u) => setAvatarUrl(u)}
                onRemove={() => setAvatarUrl('')}
              />
            </Card>

            {/* Informações Pessoais e Profissionais */}
            <Card>
              <h3 className="text-base font-bold text-slate-100 mb-1 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-[var(--brand-gradient-start)]" />
                Informações Pessoais e Profissionais
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                Esses dados são usados na sua identificação profissional e na criação automatizada das suas páginas de atendimento.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Como você se apresenta? (Nome Profissional)</label>
                  <p className="text-[11px] text-slate-400 mb-1.5">Exemplo: Dra. Geovanna ou Psicóloga Geovanna</p>
                  <Input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Dra. Geovanna"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Sobrenome</label>
                  <p className="text-[11px] text-slate-400 mb-1.5">Seu sobrenome profissional completo</p>
                  <Input
                    type="text"
                    value={sobrenome}
                    onChange={(e) => setSobrenome(e.target.value)}
                    placeholder="Ex: Bastos"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Número do CRP / Registro de Classe</label>
                  <p className="text-[11px] text-slate-400 mb-1.5">Exigido para exibição no rodapé dos seus sites (Ex: CRP 06/123456)</p>
                  <Input
                    type="text"
                    value={crp}
                    onChange={(e) => setCrp(e.target.value)}
                    placeholder="Ex: CRP 06/123456"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">WhatsApp de Atendimento aos Pacientes</label>
                  <p className="text-[11px] text-slate-400 mb-1.5">Número para onde os botões 'Agendar Consulta' vão direcionar</p>
                  <Input
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="Ex: (11) 99999-9999"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Cidade e Estado de Atendimento</label>
                  <p className="text-[11px] text-slate-400 mb-1.5">Importante para pacientes da sua região (Ex: São Paulo - SP)</p>
                  <Input
                    type="text"
                    value={cityState}
                    onChange={(e) => setCityState(e.target.value)}
                    placeholder="Ex: São Paulo - SP"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Instagram Profissional</label>
                  <p className="text-[11px] text-slate-400 mb-1.5">Sua conta do Instagram (Ex: @geovannabastos.psi)</p>
                  <Input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="Ex: @geovannabastos.psi"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-300 block mb-1">Sobre Você e Sua Prática Clínica (Biografia)</label>
                  <p className="text-[11px] text-slate-400 mb-1.5">
                    Escreva uma mensagem acolhedora sobre quem você é, sua experiência e como funciona o seu atendimento. Esse texto é usado automaticamente na seção 'Sobre Mim' dos seus sites.
                  </p>
                  <textarea
                    rows={5}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full glass-sm border border-[var(--surface-border)] rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[var(--brand-gradient-start)] resize-none"
                    placeholder="Ex: Sou psicóloga clínica especialista em Terapia Cognitivo-Comportamental. Auxilio adultos e adolescentes no manejo da ansiedade..."
                  />
                </div>
              </div>
            </Card>

            {/* Especialidades */}
            <Card>
              <h3 className="text-base font-bold text-slate-100 mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--brand-gradient-start)]" />
                Suas Especialidades e Áreas de Atuação
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Quais são as principais demandas e queixas que você atende em consultório?
              </p>

              {/* Lista de tags selecionadas */}
              <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl bg-white/[0.01] border border-[var(--surface-border)] min-h-[50px] items-center">
                {specialties.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--brand-gradient-start)]/20 border border-[var(--brand-gradient-start)]/40 text-xs font-semibold text-slate-100"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => handleRemoveSpecialty(item)}
                      className="hover:text-red-400 bg-transparent border-none cursor-pointer text-slate-400 p-0 ml-1"
                      title="Remover especialidade"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {specialties.length === 0 && (
                  <span className="text-xs text-slate-500 italic">Nenhuma especialidade selecionada. Clique nas sugestões abaixo para adicionar.</span>
                )}
              </div>

              {/* Adicionar especialidade customizada */}
              <div className="flex items-center gap-2 mb-6">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newSpecialtyInput}
                    onChange={(e) => setNewSpecialtyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSpecialty(newSpecialtyInput);
                      }
                    }}
                    placeholder="Escreva outra especialidade e pressione Enter (Ex: Transição de Carreira)..."
                    className="w-full h-10 px-3.5 rounded-xl bg-white/5 border border-[var(--surface-border)] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[var(--brand-gradient-start)] transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAddSpecialty(newSpecialtyInput)}
                  className="h-10 px-5 text-xs font-bold text-white rounded-xl bg-[var(--brand-gradient-start)] hover:brightness-110 active:scale-95 transition-all shrink-0 cursor-pointer border-none flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>

              {/* Sugestões de Especialidades */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Clique para adicionar sugestões:</span>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_SPECIALTIES_PRESETS.map((preset) => {
                    const isSelected = specialties.includes(preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => (isSelected ? handleRemoveSpecialty(preset) : handleAddSpecialty(preset))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border-none ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{preset}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Segurança e Credenciais da Conta */}
            <Card>
              <h3 className="text-base font-bold text-slate-100 mb-1 flex items-center gap-2">
                <Lock className="w-4 h-4 text-[var(--brand-gradient-start)]" />
                Segurança & Senha de Acesso
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Gerencie as credenciais para entrar na plataforma.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-300 block mb-1">Seu E-mail de Login</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={initialUser.email}
                      disabled
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-[var(--surface-border)] text-xs text-slate-400 cursor-not-allowed outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">O e-mail de acesso não pode ser alterado por segurança.</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Nova Senha</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres (ou deixe em branco)"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Confirmar Nova Senha</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ABA 2: MARCA DOS SITES */}
        {activeTab === 'sites-branding' && (
          <div className="space-y-6 animate-page-enter">
            <Card>
              <h3 className="text-base font-bold text-slate-100 mb-1 flex items-center gap-2">
                <Palette className="w-4 h-4 text-[var(--brand-gradient-start)]" />
                Visual e Marca do Seu Site
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Escolha a sua logomarca e as cores que serão usadas no fundo, botões e textos das suas páginas de atendimento.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Campo de Logotipo Padrão dos Sites */}
                <SiteLogoField
                  logoConfig={logoConfig}
                  logoUrl={logoUrl}
                  bgColor={bgColor}
                  primaryColor={primaryColor}
                  secondaryColor={secondaryColor}
                  contrastColor={contrastColor}
                  onOpenOptions={() => setLogoOptionModalOpen(true)}
                  onOpenBuilder={() => setLogoBuilderModalOpen(true)}
                  onOpenLibrary={() => setSiteLogoLibraryOpen(true)}
                  onRemoveLogo={() => {
                    setLogoUrl('');
                    setLogoConfig({ mode: 'html', text: '', iconType: 'psi' });
                  }}
                />

                {/* Favicon da Aba do Navegador */}
                <UploadBox
                  label="Ícone da Aba do Navegador (Favicon)"
                  description="Pequeno ícone exibido no topo da aba do navegador dos seus clientes ao acessar seu site."
                  url={faviconUrl}
                  bgColor={bgColor}
                  tenantId={tenant.id}
                  onChange={(u) => setFaviconUrl(u)}
                  onClear={() => setFaviconUrl('')}
                />
              </div>

              {/* Cores Gerais dos Sites */}
              <div className="space-y-4 pt-6 border-t border-[var(--surface-border)]">
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Cores Gerais e Destaques do Site</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Defina as cores principais que darão vida às suas landing pages de atendimento.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ColorPickerField
                    label="Cor Principal dos Botões"
                    description="Usada nos botões principais de agendamento no WhatsApp."
                    value={primaryColor}
                    onChange={(v) => setPrimaryColor(v)}
                  />
                  <ColorPickerField
                    label="Cor Secundária de Destaque"
                    description="Usada em ícones, bordas e detalhes visuais das suas páginas."
                    value={secondaryColor}
                    onChange={(v) => setSecondaryColor(v)}
                  />
                  <ColorPickerField
                    label="Cor do Fundo do Site"
                    description="Cor de fundo geral das suas páginas (Ex: #FAFAFA para claro ou #09090B para escuro)."
                    value={bgColor}
                    onChange={(v) => setBgColor(v)}
                  />
                  <ColorPickerField
                    label="Cor de Contraste (Texto dos Botões)"
                    description="Cor do texto e ícones sobre os botões e áreas com fundo destacado."
                    value={contrastColor}
                    onChange={(v) => setContrastColor(v)}
                  />
                </div>

                {/* Paletas Prontas */}
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Escolha uma combinação pronta:</span>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => {
                          setPrimaryColor(p.primary);
                          setSecondaryColor(p.secondary);
                          setBgColor(p.bg);
                          setContrastColor(p.contrast);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-[var(--surface-border)] cursor-pointer text-xs font-semibold text-slate-200 transition-all"
                      >
                        <div className="flex items-center -space-x-1">
                          <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: p.bg }} title="Fundo" />
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: p.primary }} title="Primária" />
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: p.secondary }} title="Secundária" />
                        </div>
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Modais de Escolha e Criação de Logo dos Sites */}
            <LogoOptionModal
              isOpen={logoOptionModalOpen}
              onClose={() => setLogoOptionModalOpen(false)}
              onSelectOption={(mode) => {
                if (mode === 'html') {
                  setLogoConfig({
                    mode: 'html',
                    text: logoConfig?.text || `${nome || 'Psicóloga'} ${sobrenome || ''}`.trim(),
                    iconType: logoConfig?.iconType || 'psi',
                  });
                  setLogoBuilderModalOpen(true);
                } else {
                  setSiteLogoLibraryOpen(true);
                }
              }}
            />

            <LogoBuilderModal
              isOpen={logoBuilderModalOpen}
              onClose={() => setLogoBuilderModalOpen(false)}
              tenantId={tenant.id}
              initialText={logoConfig?.text || `${nome || 'Psicóloga'} ${sobrenome || ''}`.trim()}
              initialIconType={logoConfig?.iconType || 'psi'}
              initialCustomIconUrl={logoConfig?.customIconUrl || ''}
              gradientStart={primaryColor}
              gradientEnd={secondaryColor}
              contrastColor={contrastColor}
              onSave={(cfg) => {
                setLogoConfig(cfg);
                setLogoUrl('');
              }}
            />

            <MediaLibraryModal
              isOpen={siteLogoLibraryOpen}
              onClose={() => setSiteLogoLibraryOpen(false)}
              tenantId={tenant.id}
              resolution={{ width: 600, height: 200 }}
              type="logotipo"
              uploadType="logo"
              onSelectImage={(asset: any) => {
                const url = typeof asset === 'string' ? asset : (asset?.url || asset);
                setLogoUrl(url);
                setLogoConfig({ mode: 'image' });
              }}
            />
          </div>
        )}

        {/* ABA 3: DOMÍNIOS */}
        {activeTab === 'dominios' && (
          <div className="space-y-6 animate-page-enter">
            <Card className="p-6">
              <DomainManager
                tenantId={tenant.id}
                subdomain={slug}
                onSubdomainChange={setSlug}
                customDomain={domain}
                onCustomDomainChange={setDomain}
              />
            </Card>
          </div>
        )}

        {/* ABA 4: BIBLIOTECA DE MÍDIA */}
        {activeTab === 'midia' && (
          <div className="space-y-6 animate-page-enter">
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[var(--brand-gradient-start)]" />
                    Sua Galeria de Fotos e Imagens
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Todas as fotos de perfil, fotos de consultório e logomarcas que você enviou ficam salvas aqui:
                  </p>
                </div>

                <div>
                  <input
                    ref={mediaFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleDirectMediaUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => mediaFileInputRef.current?.click()}
                    className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Adicionar Nova Foto
                  </Button>
                </div>
              </div>

              {mediaLoading ? (
                <div className="text-center py-12 text-xs text-slate-500 animate-pulse">
                  Buscando suas imagens...
                </div>
              ) : mediaAssets.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-[var(--surface-border)] rounded-2xl space-y-2">
                  <ImageIcon className="w-8 h-8 text-slate-600 mx-auto" />
                  <span className="text-xs text-slate-300 font-bold block">Sua galeria está vazia no momento</span>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Clique no botão 'Adicionar Nova Foto' para subir imagens do seu consultório ou fotos profissionais para usar nas suas páginas.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {mediaAssets.map((asset) => (
                    <div
                      key={asset.id}
                      style={{ backgroundColor: bgColor || 'var(--brand-bg-color, transparent)' }}
                      className="group relative rounded-2xl border border-[var(--surface-border)] overflow-hidden hover:border-[var(--brand-gradient-start)] transition-all flex flex-col shadow-sm"
                    >
                      <div className="h-32 w-full flex items-center justify-center p-2">
                        <img
                          src={asset.url}
                          alt={asset.name}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      <div className="p-2 border-t border-[var(--surface-border)] bg-black/40 flex items-center justify-between text-[11px]">
                        <span className="truncate text-slate-300 font-medium max-w-[90px]" title={asset.name}>
                          {asset.name}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyUrl(asset.url)}
                            className="p-1 text-slate-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                            title="Copiar link da foto"
                          >
                            {copiedUrl === asset.url ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMedia(asset.id)}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer"
                            title="Excluir foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Botão de Salvar Global */}
        {activeTab !== 'midia' && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--surface-border)]">
            <Button
              type="submit"
              disabled={loading}
              className="px-6 py-3 text-xs font-bold text-white rounded-xl shadow-lg bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] hover:brightness-110 active:scale-95 transition-all border-none cursor-pointer uppercase tracking-wider"
            >
              {loading ? 'Salvando...' : 'Salvar Minhas Configurações'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
