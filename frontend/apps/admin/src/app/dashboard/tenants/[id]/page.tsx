'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api, Tenant, User } from '@/lib/api';
import { Card, Button, Input, LoadingSpinner } from '@psi/ui';
import { Link } from '@/components/Link';

const BackIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);
const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

// ── COMPONENTE: SELETOR DE USUÁRIO PESQUISÁVEL ──────────────────────────────
interface SearchableUserSelectProps {
  users: User[];
  selectedValue: string;
  onChange: (value: string) => void;
}

const SearchableUserSelect = ({ users, selectedValue, onChange }: SearchableUserSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedUser = users.find(u => u.id === selectedValue);

  const filteredUsers = users.filter(u => {
    const s = search.toLowerCase();
    return (
      (u.nome && u.nome.toLowerCase().includes(s)) ||
      (u.sobrenome && u.sobrenome.toLowerCase().includes(s)) ||
      (u.email && u.email.toLowerCase().includes(s))
    );
  });

  return (
    <div className="flex flex-col gap-1.5 relative w-full" ref={containerRef}>
      <label className="text-xs font-semibold text-slate-300">Proprietário (Owner)</label>
      
      {/* Trigger Button */}
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className="w-full text-sm rounded-xl px-3 h-[42px] flex items-center justify-between outline-none cursor-pointer transition-colors brand-input hover:opacity-90"
      >
        <span className={selectedUser ? 'text-slate-200' : 'text-slate-500'}>
          {selectedUser ? `${selectedUser.nome} ${selectedUser.sobrenome} (${selectedUser.email})` : 'Selecione o proprietário...'}
        </span>
        <svg className={`w-4 h-4 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      {/* Dropdown Options List */}
      {isOpen && (
        <div className="absolute top-[72px] left-0 right-0 rounded-xl shadow-2xl z-30 p-2 space-y-2 max-w-full border" style={{ background: "var(--surface-input, rgba(0,0,0,0.45))", backdropFilter: "blur(16px)", borderColor: "var(--surface-border)" }}>
          {/* Search Input */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Pesquisar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg py-1.5 pl-8 pr-3 text-xs outline-none brand-input"
              autoFocus
            />
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto space-y-0.5 scrollbar-thin">
            <div
              onClick={() => {
                onChange('none');
                setIsOpen(false);
              }}
              className={`text-xs px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${selectedValue === 'none' ? 'font-semibold' : 'hover:bg-[var(--surface-hover)] text-slate-400'}`} style={selectedValue === 'none' ? { background: 'color-mix(in srgb, var(--brand-gradient-start) 10%, transparent)', color: 'var(--brand-gradient-start)' } : {}}
            >
              Sem proprietário
            </div>
            {filteredUsers.length === 0 ? (
              <div className="text-xs text-center py-3 text-slate-500 italic">
                Nenhum usuário encontrado
              </div>
            ) : (
              filteredUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => {
                    onChange(u.id);
                    setIsOpen(false);
                  }}
                  className={`text-xs px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${selectedValue === u.id ? 'font-semibold' : 'hover:bg-[var(--surface-hover)] text-slate-300'}`} style={selectedValue === u.id ? { background: 'color-mix(in srgb, var(--brand-gradient-start) 10%, transparent)', color: 'var(--brand-gradient-start)' } : {}}
                >
                  <span className="block font-medium">{u.nome} {u.sobrenome}</span>
                  <span className="block text-[10px] opacity-50">{u.email}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── COMPONENTE: UPLOAD BOX (CLOUD FLARE R2) ───────────────────────────────
type LogoField = 'logoLightUrl' | 'logoDarkUrl' | 'iconLightUrl' | 'iconDarkUrl';

const UploadBox = ({
  label,
  url,
  onUpload,
  onClear,
  uploading,
  previewBg,
}: {
  label: string;
  url: string;
  onUpload: (file: File) => void;
  onClear: () => void;
  uploading: boolean;
  previewBg: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (uploading) return;
    inputRef.current?.click();
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold opacity-70 uppercase tracking-wide">{label}</p>
      <div
        onClick={handleClick}
        className="relative flex items-center justify-center rounded-xl border-2 border-dashed border-slate-800 overflow-hidden cursor-pointer hover:border-slate-600 transition-all group"
        style={{ minHeight: 90, backgroundColor: previewBg }}
      >
        {url ? (
          <>
            <img src={url} alt={label} className="max-h-16 max-w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-600 transition-colors shadow z-10 border-none cursor-pointer"
              title="Remover"
            >
              笨�
            </button>
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 border border-white/10 text-[9px] font-bold text-white uppercase tracking-wider pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
              Mudar
            </div>
          </>
        ) : (
          <div className="text-xs opacity-50 hover:opacity-100 transition-opacity py-4 px-6 flex flex-col items-center gap-1">
            <span>{uploading ? '竢ｳ Enviando窶ｦ' : '+ Adicionar'}</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
      />
    </div>
  );
};

export default function TenantBrandingPage() {
  const params = useParams();
  const tenantId = params.id as string;

  const { user: currentUser } = useAuth();
  const { reloadBrand } = useBrand();
  const router = useRouter();

  // Estados
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Exclusãoo modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Uploading logo state
  const [uploadingLogo, setUploadingLogo] = useState<Partial<Record<LogoField, boolean>>>({});

  // Formulário
  const [form, setForm] = useState({
    name: '',
    slug: '',
    domain: '',
    ownerId: 'none',
    // E-mail
    emailDomain: '',
    resendApiKey: '',
    // White Label - Logos/Ícones
    logoLightUrl: '',
    logoDarkUrl: '',
    iconLightUrl: '',
    iconDarkUrl: '',
    // White Label - Cores
    gradientColorStart: '#4F46E5',
    gradientColorEnd: '#06B6D4',
    contrastColor: '#FFFFFF',
    bgLightColor: '#F8FAFC',
    bgDarkColor: '#020617',
    cardLightColor: '#FFFFFF',
    cardDarkColor: '#0F172A',
    textLightColor: '#0F172A',
    textDarkColor: '#F8FAFC',
  });

  // Carregar dados do tenant
  const loadTenant = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const [data, usersList] = await Promise.all([
        api.getTenantById(tenantId),
        api.getUsers(),
      ]);
      if (!data) {
        setError('Tenant não encontrado.');
        return;
      }
      setTenant(data);
      setUsers(usersList);
      setForm({
        name: data.name || '',
        slug: data.slug || '',
        domain: data.domain || '',
        ownerId: data.ownerId || 'none',
        emailDomain: data.emailDomain || '',
        resendApiKey: data.resendApiKey || '',
        logoLightUrl: data.logoLightUrl || '',
        logoDarkUrl: data.logoDarkUrl || '',
        iconLightUrl: data.iconLightUrl || '',
        iconDarkUrl: data.iconDarkUrl || '',
        gradientColorStart: data.gradientColorStart || '#4F46E5',
        gradientColorEnd: data.gradientColorEnd || '#06B6D4',
        contrastColor: data.contrastColor || '#FFFFFF',
        bgLightColor: data.bgLightColor || '#F8FAFC',
        bgDarkColor: data.bgDarkColor || '#020617',
        cardLightColor: data.cardLightColor || '#FFFFFF',
        cardDarkColor: data.cardDarkColor || '#0F172A',
        textLightColor: data.textLightColor || '#0F172A',
        textDarkColor: data.textDarkColor || '#F8FAFC',
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao obter dados do tenant.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (currentUser) {
      loadTenant();
    }
  }, [currentUser, loadTenant]);

  const handleUploadLogo = async (field: LogoField, file: File) => {
    setUploadingLogo((u) => ({ ...u, [field]: true }));
    setError('');
    setSuccess('');
    try {
      const uploadType = field.toLowerCase().includes('icon') ? 'icon' : 'logo';
      const { url } = await api.uploadImage(file, uploadType);
      setForm((f) => ({ ...f, [field]: url }));
    } catch (err: any) {
      setError(`Erro ao enviar ${field.replace(/([A-Z])/g, ' $1')}: ${err.message}`);
    } finally {
      setUploadingLogo((u) => ({ ...u, [field]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const resolvedOwnerId = form.ownerId === 'none' ? null : form.ownerId;
      await api.updateTenant(tenantId, {
        name: form.name,
        slug: form.slug.toLowerCase().trim(),
        domain: form.domain || null,
        ownerId: resolvedOwnerId,
        emailDomain: form.emailDomain || null,
        resendApiKey: form.resendApiKey || null,
        logoLightUrl: form.logoLightUrl || null,
        logoDarkUrl: form.logoDarkUrl || null,
        iconLightUrl: form.iconLightUrl || null,
        iconDarkUrl: form.iconDarkUrl || null,
        gradientColorStart: form.gradientColorStart,
        gradientColorEnd: form.gradientColorEnd,
        contrastColor: form.contrastColor,
        bgLightColor: form.bgLightColor,
        bgDarkColor: form.bgDarkColor,
        cardLightColor: form.cardLightColor,
        cardDarkColor: form.cardDarkColor,
        textLightColor: form.textLightColor,
        textDarkColor: form.textDarkColor,
      });
      setSuccess('Configurações do tenant salvas com sucesso!');
      await reloadBrand();
      await loadTenant();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!tenant) return;
    if (deleteConfirmationText !== tenant.name) {
      alert('O nome digitado nãoo corresponde ao nome do tenant.');
      return;
    }

    setDeleting(true);
    setError('');
    try {
      await api.deleteTenant(tenant.id);
      setIsDeleteModalOpen(false);
      router.push('/dashboard/tenants');
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir o tenant.');
      setIsDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };



  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-page-enter">
      {loading ? (
        <LoadingSpinner message="Carregando dados do tenant..." className="min-h-[50vh]" />
      ) : (
        <>
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/tenants"
            className="p-2 rounded-xl border text-slate-400 hover:text-slate-200 transition-colors" style={{ background: "var(--surface-input, rgba(0,0,0,0.30))", borderColor: "var(--surface-border)" }}
          >
            <BackIcon />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Personalizar: {tenant?.name}</h1>
            <p className="text-sm opacity-60">Configuração de white-label, domínio customizado e servidores de e-mail.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl text-sm border bg-red-500/10 border-red-500/30 text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl text-sm border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SEÇÃO 1: Identidade Geral e Domínio */}
          <Card>
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-200 pb-2 border-b border-slate-800/60">Geral e Domínio</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome da Instância *"
                  required
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  label="Slug (Subdomínio único) *"
                  required
                  value={form.slug}
                  onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                />
                <div className="md:col-span-2">
                  <Input
                    label="Domínio Customizado"
                    value={form.domain}
                    onChange={(e) => setForm(prev => ({ ...prev, domain: e.target.value.toLowerCase().trim() }))}
                    placeholder="exemplo.com"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Insira o domínio configurado. Lembre-se de criar o apontamento CNAME/A correspondente no DNS de acordo com a infraestrutura Cloudflare da plataforma.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <SearchableUserSelect
                    users={users}
                    selectedValue={form.ownerId}
                    onChange={(val) => setForm(prev => ({ ...prev, ownerId: val }))}
                  />
                </div>

              </div>
            </div>
          </Card>

          {/* SEÇÃO 2: White-Label (Logos, Ícones e Tema) */}
          <Card>
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 flex-wrap gap-2">
                <h3 className="text-base font-bold text-slate-200">Identidade Visual & Branding do Site</h3>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                  🌐 Personalização dos Sites de Captação
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Logotipos e paleta padrão para os sites e páginas de captação gerados por este consultório.
              </p>
              
              {/* Uploads (R2) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <UploadBox
                  label="Logo (Tema Claro)"
                  url={form.logoLightUrl}
                  onUpload={(f) => handleUploadLogo('logoLightUrl', f)}
                  onClear={() => setForm(prev => ({ ...prev, logoLightUrl: '' }))}
                  uploading={!!uploadingLogo.logoLightUrl}
                  previewBg={form.bgLightColor}
                />
                <UploadBox
                  label="Logo (Tema Escuro)"
                  url={form.logoDarkUrl}
                  onUpload={(f) => handleUploadLogo('logoDarkUrl', f)}
                  onClear={() => setForm(prev => ({ ...prev, logoDarkUrl: '' }))}
                  uploading={!!uploadingLogo.logoDarkUrl}
                  previewBg={form.bgDarkColor}
                />
                <UploadBox
                  label="Ícone (Tema Claro)"
                  url={form.iconLightUrl}
                  onUpload={(f) => handleUploadLogo('iconLightUrl', f)}
                  onClear={() => setForm(prev => ({ ...prev, iconLightUrl: '' }))}
                  uploading={!!uploadingLogo.iconLightUrl}
                  previewBg={form.bgLightColor}
                />
                <UploadBox
                  label="Ícone (Tema Escuro)"
                  url={form.iconDarkUrl}
                  onUpload={(f) => handleUploadLogo('iconDarkUrl', f)}
                  onClear={() => setForm(prev => ({ ...prev, iconDarkUrl: '' }))}
                  uploading={!!uploadingLogo.iconDarkUrl}
                  previewBg={form.bgDarkColor}
                />
              </div>

              {/* Cores */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-slate-400">Paleta de Cores e Gradientes</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Gradiente Start */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">Gradiente Início</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={form.gradientColorStart}
                        onChange={(e) => setForm(prev => ({ ...prev, gradientColorStart: e.target.value }))}
                        className="w-10 h-10 bg-transparent rounded cursor-pointer border" style={{ borderColor: "var(--surface-border)" }}
                      />
                      <input
                        type="text"
                        value={form.gradientColorStart}
                        onChange={(e) => setForm(prev => ({ ...prev, gradientColorStart: e.target.value }))}
                        className="flex-1 text-xs rounded-xl px-2 h-9 outline-none brand-input font-mono"
                      />
                    </div>
                  </div>

                  {/* Gradiente End */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">Gradiente Fim</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={form.gradientColorEnd}
                        onChange={(e) => setForm(prev => ({ ...prev, gradientColorEnd: e.target.value }))}
                        className="w-10 h-10 bg-transparent rounded cursor-pointer border" style={{ borderColor: "var(--surface-border)" }}
                      />
                      <input
                        type="text"
                        value={form.gradientColorEnd}
                        onChange={(e) => setForm(prev => ({ ...prev, gradientColorEnd: e.target.value }))}
                        className="flex-1 text-xs rounded-xl px-2 h-9 outline-none brand-input font-mono"
                      />
                    </div>
                  </div>

                  {/* Contrast */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">Cor de Contraste</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={form.contrastColor}
                        onChange={(e) => setForm(prev => ({ ...prev, contrastColor: e.target.value }))}
                        className="w-10 h-10 bg-transparent rounded cursor-pointer border" style={{ borderColor: "var(--surface-border)" }}
                      />
                      <input
                        type="text"
                        value={form.contrastColor}
                        onChange={(e) => setForm(prev => ({ ...prev, contrastColor: e.target.value }))}
                        className="flex-1 text-xs rounded-xl px-2 h-9 outline-none brand-input font-mono"
                      />
                    </div>
                  </div>

                  {/* Fundo Claro */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">Fundo Claro</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={form.bgLightColor}
                        onChange={(e) => setForm(prev => ({ ...prev, bgLightColor: e.target.value }))}
                        className="w-10 h-10 bg-transparent rounded cursor-pointer border" style={{ borderColor: "var(--surface-border)" }}
                      />
                      <input
                        type="text"
                        value={form.bgLightColor}
                        onChange={(e) => setForm(prev => ({ ...prev, bgLightColor: e.target.value }))}
                        className="flex-1 text-xs rounded-xl px-2 h-9 outline-none brand-input font-mono"
                      />
                    </div>
                  </div>

                  {/* Fundo Escuro */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">Fundo Escuro</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={form.bgDarkColor}
                        onChange={(e) => setForm(prev => ({ ...prev, bgDarkColor: e.target.value }))}
                        className="w-10 h-10 bg-transparent rounded cursor-pointer border" style={{ borderColor: "var(--surface-border)" }}
                      />
                      <input
                        type="text"
                        value={form.bgDarkColor}
                        onChange={(e) => setForm(prev => ({ ...prev, bgDarkColor: e.target.value }))}
                        className="flex-1 text-xs rounded-xl px-2 h-9 outline-none brand-input font-mono"
                      />
                    </div>
                  </div>

                  {/* Cartãoo Claro */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">Cartãoo Claro</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={form.cardLightColor}
                        onChange={(e) => setForm(prev => ({ ...prev, cardLightColor: e.target.value }))}
                        className="w-10 h-10 bg-transparent rounded cursor-pointer border" style={{ borderColor: "var(--surface-border)" }}
                      />
                      <input
                        type="text"
                        value={form.cardLightColor}
                        onChange={(e) => setForm(prev => ({ ...prev, cardLightColor: e.target.value }))}
                        className="flex-1 text-xs rounded-xl px-2 h-9 outline-none brand-input font-mono"
                      />
                    </div>
                  </div>

                  {/* Cartãoo Escuro */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">Cartãoo Escuro</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={form.cardDarkColor}
                        onChange={(e) => setForm(prev => ({ ...prev, cardDarkColor: e.target.value }))}
                        className="w-10 h-10 bg-transparent rounded cursor-pointer border" style={{ borderColor: "var(--surface-border)" }}
                      />
                      <input
                        type="text"
                        value={form.cardDarkColor}
                        onChange={(e) => setForm(prev => ({ ...prev, cardDarkColor: e.target.value }))}
                        className="flex-1 text-xs rounded-xl px-2 h-9 outline-none brand-input font-mono"
                      />
                    </div>
                  </div>

                  {/* Texto Claro */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">Texto Claro</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={form.textLightColor}
                        onChange={(e) => setForm(prev => ({ ...prev, textLightColor: e.target.value }))}
                        className="w-10 h-10 bg-transparent rounded cursor-pointer border" style={{ borderColor: "var(--surface-border)" }}
                      />
                      <input
                        type="text"
                        value={form.textLightColor}
                        onChange={(e) => setForm(prev => ({ ...prev, textLightColor: e.target.value }))}
                        className="flex-1 text-xs rounded-xl px-2 h-9 outline-none brand-input font-mono"
                      />
                    </div>
                  </div>

                  {/* Texto Escuro */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">Texto Escuro</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={form.textDarkColor}
                        onChange={(e) => setForm(prev => ({ ...prev, textDarkColor: e.target.value }))}
                        className="w-10 h-10 bg-transparent rounded cursor-pointer border" style={{ borderColor: "var(--surface-border)" }}
                      />
                      <input
                        type="text"
                        value={form.textDarkColor}
                        onChange={(e) => setForm(prev => ({ ...prev, textDarkColor: e.target.value }))}
                        className="flex-1 text-xs rounded-xl px-2 h-9 outline-none brand-input font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* SEÇÃO 3: Domínio de E-mail por Tenant */}
          <Card>
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-200 pb-2 border-b border-slate-800/60">Configuração de E-mail (Servidor Customizado)</h3>
              <p className="text-xs text-slate-400">
                Configure um domínio próprio de envio de e-mails para este tenant. Se deixado em branco, o tenant utilizará o servidor de e-mails padrão da plataforma.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Domínio de Envio de E-mail"
                  value={form.emailDomain}
                  onChange={(e) => setForm(prev => ({ ...prev, emailDomain: e.target.value.toLowerCase().trim() }))}
                  placeholder="ex: mail.meuconsultorio.com"
                />
                <Input
                  label="Chave API Resend do Tenant"
                  type="password"
                  value={form.resendApiKey}
                  onChange={(e) => setForm(prev => ({ ...prev, resendApiKey: e.target.value }))}
                  placeholder="re_..."
                />
              </div>
            </div>
          </Card>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/tenants')}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button type="submit" submitting={saving} className="text-xs">
              Salvar Configurações
            </Button>
          </div>
        </form>

        {/* ⛔� ZONA DE PERIGO: Exclusãoo */}
        <Card className="border border-red-500/30 bg-red-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-red-400">Zona de Perigo</h3>
              <p className="text-xs text-slate-400">
                A exclusãoo deste tenant removerá de forma permanente e irreversível todos os dados, configurações, equipe e registros vinculados.
              </p>
            </div>
            <div className="w-full sm:w-auto shrink-0">
              <Button
                variant="danger"
                className="text-xs"
                onClick={() => {
                  setDeleteConfirmationText('');
                  setIsDeleteModalOpen(true);
                }}
              >
                Excluir Tenant
              </Button>
            </div>
          </div>
        </Card>

      {/* ── MODAL: CONFIRMAR EXCLUSÃO DEFINITIVA ── */}
      {isDeleteModalOpen && tenant && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="glass-lg w-full max-w-md rounded-2xl border border-red-500/20 p-6 space-y-6 animate-scale-up shadow-2xl">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-red-400">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-400">Esta ação é estritamente irreversível.</p>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="opacity-55 hover:opacity-100 bg-transparent border-none text-slate-400 cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg leading-relaxed">
              ⚠️ **Atenção**: Todos os dados do espaço de trabalho serão excluídos para sempre. Não é possível recuperar os agendamentos, equipe ou dados clínicos deste tenant após esta operação.
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-normal">
                Para confirmar a exclusão definitiva, digite o nome exato do tenant <strong className="text-slate-100">{tenant.name}</strong> no campo abaixo:
              </p>
              <input
                type="text"
                placeholder={tenant.name}
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                className="w-full rounded-xl py-2.5 px-4 text-sm outline-none transition-colors brand-input focus:border-red-500/50 font-medium"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-xs py-2"
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                type="button"
                onClick={handleDeleteTenant}
                submitting={deleting}
                disabled={deleteConfirmationText !== tenant.name}
                className="text-xs py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Excluir Definitivamente
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
      </>
      )}
    </div>
  );
}
