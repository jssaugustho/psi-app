'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api, Tenant, User } from '@/lib/api';
import { AppShell, Card, Button, Input } from '@psi/ui';
import { Link } from '@/components/Link';

// ── Ícones SVG ────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const StatusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const EnvelopeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);
const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const OfficeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);
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

export default function TenantBrandingPage() {
  const params = useParams();
  const tenantId = params.id as string;

  const { user: currentUser, loading: authLoading, logout, setIsProfileOpen } = useAuth();
  const { tenant: brandTenant, theme, toggleTheme, reloadBrand } = useBrand();
  const router = useRouter();

  // Estados
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Exclusão modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Formulário
  const [form, setForm] = useState({
    name: '',
    slug: '',
    domain: '',
    ownerId: 'none',
    isPrimary: false,
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
        isPrimary: data.isPrimary || false,
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
    if (!authLoading) {
      if (!currentUser) {
        router.push('/login');
      } else if (currentUser.role === 'admin') {
        loadTenant();
      }
    }
  }, [authLoading, currentUser, router, loadTenant]);

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
        isPrimary: form.isPrimary,
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
      alert('O nome digitado não corresponde ao nome do tenant.');
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

  const menuItems = [
    { label: 'Painel Geral', href: '/dashboard', icon: <HomeIcon />, active: false },
    { label: 'Status do App', href: '/dashboard/status', icon: <StatusIcon />, active: false },
    { label: 'Tenants', href: '/dashboard/tenants', icon: <OfficeIcon />, active: true },
    { label: 'Usuários', href: '/dashboard/users', icon: <UsersIcon />, active: false },
    { label: 'E-mails', href: '/dashboard/emails', icon: <EnvelopeIcon />, active: false },
    { label: 'Configurações', href: '/dashboard/settings', icon: <SettingsIcon />, active: false },
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-indigo-500 animate-ping" />
          <span>Carregando dados do tenant...</span>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      appName={brandTenant?.name || 'Admin'}
      logoUrl={theme === 'dark' ? brandTenant?.logoDarkUrl : brandTenant?.logoLightUrl}
      iconUrl={theme === 'dark' ? brandTenant?.iconDarkUrl : brandTenant?.iconLightUrl}
      menuItems={menuItems}
      user={currentUser}
      theme={theme}
      onToggleTheme={toggleTheme}
      onLogout={logout}
      onEditProfile={() => setIsProfileOpen(true)}
      LinkComponent={Link}
    >
      <div className="max-w-4xl mx-auto space-y-6 animate-page-enter">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/tenants"
            className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
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

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Proprietário (Owner)</label>
                  <select
                    value={form.ownerId}
                    onChange={(e) => setForm(prev => ({ ...prev, ownerId: e.target.value }))}
                    className="bg-slate-950 border border-slate-800 text-sm rounded-xl px-3 h-[42px] outline-none text-slate-200 focus:border-indigo-500 transition-colors"
                  >
                    <option value="none">Selecione o proprietário...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome} {u.sobrenome} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2 md:col-span-2">
                  <input
                    type="checkbox"
                    id="edit_is_primary"
                    checked={form.isPrimary}
                    onChange={(e) => setForm(prev => ({ ...prev, isPrimary: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="edit_is_primary" className="text-xs text-slate-300 font-semibold cursor-pointer">
                    Definir como Tenant Principal (Pai) da plataforma
                  </label>
                </div>
              </div>
            </div>
          </Card>

          {/* SEÇÃO 2: White-Label (Logos, Ícones e Tema) */}
          <Card>
            <div className="space-y-6">
              <h3 className="text-base font-bold text-slate-200 pb-2 border-b border-slate-800/60">Identidade Visual (White-Label)</h3>
              
              {/* URLs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Logo (Tema Claro) - URL"
                  value={form.logoLightUrl}
                  onChange={(e) => setForm(prev => ({ ...prev, logoLightUrl: e.target.value }))}
                  placeholder="https://..."
                />
                <Input
                  label="Logo (Tema Escuro) - URL"
                  value={form.logoDarkUrl}
                  onChange={(e) => setForm(prev => ({ ...prev, logoDarkUrl: e.target.value }))}
                  placeholder="https://..."
                />
                <Input
                  label="Ícone / Favicon (Tema Claro) - URL"
                  value={form.iconLightUrl}
                  onChange={(e) => setForm(prev => ({ ...prev, iconLightUrl: e.target.value }))}
                  placeholder="https://..."
                />
                <Input
                  label="Ícone / Favicon (Tema Escuro) - URL"
                  value={form.iconDarkUrl}
                  onChange={(e) => setForm(prev => ({ ...prev, iconDarkUrl: e.target.value }))}
                  placeholder="https://..."
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
                        className="w-10 h-10 border border-slate-800 bg-transparent rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={form.gradientColorStart}
                        onChange={(e) => setForm(prev => ({ ...prev, gradientColorStart: e.target.value }))}
                        className="flex-1 bg-slate-950 border border-slate-800 text-xs rounded-xl px-2 h-9 outline-none text-slate-300 font-mono"
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
                        className="w-10 h-10 border border-slate-800 bg-transparent rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={form.gradientColorEnd}
                        onChange={(e) => setForm(prev => ({ ...prev, gradientColorEnd: e.target.value }))}
                        className="flex-1 bg-slate-950 border border-slate-800 text-xs rounded-xl px-2 h-9 outline-none text-slate-300 font-mono"
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
                        className="w-10 h-10 border border-slate-800 bg-transparent rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={form.contrastColor}
                        onChange={(e) => setForm(prev => ({ ...prev, contrastColor: e.target.value }))}
                        className="flex-1 bg-slate-950 border border-slate-800 text-xs rounded-xl px-2 h-9 outline-none text-slate-300 font-mono"
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
                        className="w-10 h-10 border border-slate-800 bg-transparent rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={form.bgLightColor}
                        onChange={(e) => setForm(prev => ({ ...prev, bgLightColor: e.target.value }))}
                        className="flex-1 bg-slate-950 border border-slate-800 text-xs rounded-xl px-2 h-9 outline-none text-slate-300 font-mono"
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
                        className="w-10 h-10 border border-slate-800 bg-transparent rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={form.bgDarkColor}
                        onChange={(e) => setForm(prev => ({ ...prev, bgDarkColor: e.target.value }))}
                        className="flex-1 bg-slate-950 border border-slate-800 text-xs rounded-xl px-2 h-9 outline-none text-slate-300 font-mono"
                      />
                    </div>
                  </div>

                  {/* Cartão Claro */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">Cartão Claro</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={form.cardLightColor}
                        onChange={(e) => setForm(prev => ({ ...prev, cardLightColor: e.target.value }))}
                        className="w-10 h-10 border border-slate-800 bg-transparent rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={form.cardLightColor}
                        onChange={(e) => setForm(prev => ({ ...prev, cardLightColor: e.target.value }))}
                        className="flex-1 bg-slate-950 border border-slate-800 text-xs rounded-xl px-2 h-9 outline-none text-slate-300 font-mono"
                      />
                    </div>
                  </div>

                  {/* Cartão Escuro */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">Cartão Escuro</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={form.cardDarkColor}
                        onChange={(e) => setForm(prev => ({ ...prev, cardDarkColor: e.target.value }))}
                        className="w-10 h-10 border border-slate-800 bg-transparent rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={form.cardDarkColor}
                        onChange={(e) => setForm(prev => ({ ...prev, cardDarkColor: e.target.value }))}
                        className="flex-1 bg-slate-950 border border-slate-800 text-xs rounded-xl px-2 h-9 outline-none text-slate-300 font-mono"
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
                        className="w-10 h-10 border border-slate-800 bg-transparent rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={form.textLightColor}
                        onChange={(e) => setForm(prev => ({ ...prev, textLightColor: e.target.value }))}
                        className="flex-1 bg-slate-950 border border-slate-800 text-xs rounded-xl px-2 h-9 outline-none text-slate-300 font-mono"
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
                        className="w-10 h-10 border border-slate-800 bg-transparent rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={form.textDarkColor}
                        onChange={(e) => setForm(prev => ({ ...prev, textDarkColor: e.target.value }))}
                        className="flex-1 bg-slate-950 border border-slate-800 text-xs rounded-xl px-2 h-9 outline-none text-slate-300 font-mono"
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

        {/* ⛔ ZONA DE PERIGO: Exclusão */}
        <Card className="border border-red-500/30 bg-red-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-red-400">Zona de Perigo</h3>
              <p className="text-xs text-slate-400">
                A exclusão deste tenant removerá de forma permanente e irreversível todos os dados, configurações, equipe e registros vinculados.
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
      </div>

      {/* ── MODAL: CONFIRMAR EXCLUSÃO DEFINITIVA ── */}
      {isDeleteModalOpen && tenant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-lg w-full max-w-md rounded-2xl border border-red-500/20 p-6 space-y-6 animate-scale-up">
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm outline-none transition-colors focus:border-red-500 text-slate-200 font-medium"
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
        </div>
      )}
    </AppShell>
  );
}
