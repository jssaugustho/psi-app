'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);
const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function TenantsPage() {
  const { user: currentUser, loading: authLoading, logout, setIsProfileOpen } = useAuth();
  const { tenant: brandTenant, theme, toggleTheme } = useBrand();
  const router = useRouter();

  // Estados dos tenants e busca
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Modal criação
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    domain: '',
    ownerId: '',
    isPrimary: false,
  });
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [createError, setCreateError] = useState('');

  // Carregar dados
  const loadData = useCallback(async () => {
    setLoadingTenants(true);
    setError('');
    try {
      const [tenantsRes, usersRes] = await Promise.all([
        api.getTenantsList(),
        api.getUsers(),
      ]);
      setTenants(tenantsRes);
      setUsers(usersRes);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar os dados de tenants.');
    } finally {
      setLoadingTenants(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push('/login');
      } else if (currentUser.role === 'admin') {
        loadData();
      }
    }
  }, [authLoading, currentUser, router, loadData]);

  // Abrir Modal de Criação
  const handleOpenCreate = () => {
    setCreateForm({
      name: '',
      slug: '',
      domain: '',
      ownerId: 'none',
      isPrimary: false,
    });
    setCreateError('');
    setIsCreateModalOpen(true);
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingTenant(true);
    setCreateError('');
    try {
      const resolvedOwnerId = createForm.ownerId === 'none' ? null : createForm.ownerId;
      await api.createTenant({
        name: createForm.name,
        slug: createForm.slug.toLowerCase().trim(),
        domain: createForm.domain || null,
        ownerId: resolvedOwnerId,
        isPrimary: createForm.isPrimary,
      });
      setIsCreateModalOpen(false);
      await loadData();
    } catch (err: any) {
      setCreateError(err.message || 'Erro ao cadastrar tenant.');
    } finally {
      setCreatingTenant(false);
    }
  };

  // Filtro de Busca
  const filteredTenants = tenants.filter(t => {
    const s = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(s) ||
      t.slug.toLowerCase().includes(s) ||
      (t.domain && t.domain.toLowerCase().includes(s))
    );
  });

  const getOwnerText = (ownerId: string | null | undefined) => {
    if (!ownerId) return 'Sem proprietário';
    const owner = users.find(u => u.id === ownerId);
    return owner ? `${owner.nome} ${owner.sobrenome} (${owner.email})` : 'Usuário não encontrado';
  };

  const menuItems = [
    { label: 'Painel Geral', href: '/dashboard', icon: <HomeIcon />, active: false },
    { label: 'Status do App', href: '/dashboard/status', icon: <StatusIcon />, active: false },
    { label: 'Tenants', href: '/dashboard/tenants', icon: <OfficeIcon />, active: true },
    { label: 'Usuários', href: '/dashboard/users', icon: <UsersIcon />, active: false },
    { label: 'E-mails', href: '/dashboard/emails', icon: <EnvelopeIcon />, active: false },
    { label: 'Configurações', href: '/dashboard/settings', icon: <SettingsIcon />, active: false },
  ];

  if (authLoading || (!currentUser && authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-indigo-500 animate-ping" />
          <span>Carregando painel de tenants...</span>
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
      <div className="max-w-6xl mx-auto space-y-6 animate-page-enter">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Tenants (Espaços de Trabalho)</h1>
            <p className="text-sm mt-1" style={{ opacity: 0.6 }}>
              Visualização, cadastro e configuração de todos os tenants do sistema. Clique em qualquer linha para gerenciar.
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="flex items-center gap-2">
            <PlusIcon />
            <span>Novo Tenant</span>
          </Button>
        </div>

        {error && (
          <div
            className="p-4 rounded-xl text-sm border"
            style={{
              background: 'var(--status-error-bg)',
              borderColor: 'var(--status-error-border)',
              color: 'var(--status-error-text)',
            }}
          >
            {error}
          </div>
        )}

        {/* Search */}
        <Card className="p-4">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Buscar por nome, slug ou domínio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-indigo-500 text-slate-200"
            />
          </div>
        </Card>

        {/* Tenants List */}
        <Card>
          {loadingTenants ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div
                className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                style={{
                  borderColor: 'color-mix(in srgb, var(--brand-gradient-start) 30%, transparent)',
                  borderTopColor: 'var(--brand-gradient-start)',
                }}
              />
              <p className="text-sm opacity-60">Carregando tenants...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 opacity-75">
                    <th className="py-3 px-3 font-semibold">Tenant</th>
                    <th className="py-3 px-3 font-semibold">Slug / Subdomínio</th>
                    <th className="py-3 px-3 font-semibold">Domínio Customizado</th>
                    <th className="py-3 px-3 font-semibold">Proprietário (Owner)</th>
                    <th className="py-3 px-3 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 opacity-60">
                        Nenhum tenant encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <tr
                        key={tenant.id}
                        className="hover:bg-slate-900/10 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/tenants/${tenant.id}`)}
                      >
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            {tenant.iconLightUrl ? (
                              <img src={tenant.iconLightUrl} className="w-6 h-6 object-contain rounded-md" alt="" />
                            ) : (
                              <div className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-[10px] border border-indigo-500/20">
                                {tenant.name[0]?.toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span className="font-semibold block text-slate-200">{tenant.name}</span>
                              <span className="text-[10px] opacity-40 font-mono block">{tenant.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-300">
                          {tenant.slug}
                        </td>
                        <td className="py-3.5 px-3 text-slate-400 font-mono">
                          {tenant.domain || <span className="opacity-40 italic">Nenhum</span>}
                        </td>
                        <td className="py-3.5 px-3 text-slate-300">
                          {getOwnerText(tenant.ownerId)}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {tenant.isPrimary ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
                              Principal (Pai)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                              Membro
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* ── MODAL: NOVO TENANT ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-lg w-full max-w-md rounded-2xl border border-slate-800 p-6 space-y-6 animate-scale-up">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Criar Espaço de Trabalho</h3>
                <p className="text-xs text-slate-400">Insira os dados iniciais do novo tenant.</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="opacity-55 hover:opacity-100 bg-transparent border-none text-slate-400 cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            {createError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg text-center">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <Input
                label="Nome do Espaço *"
                required
                value={createForm.name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Consultório Psi"
              />

              <Input
                label="Slug (Subdomínio único) *"
                required
                value={createForm.slug}
                onChange={(e) => setCreateForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                placeholder="ex-consultorio"
              />

              <Input
                label="Domínio customizado (Opcional)"
                value={createForm.domain}
                onChange={(e) => setCreateForm(prev => ({ ...prev, domain: e.target.value.toLowerCase().trim() }))}
                placeholder="exemplo.com"
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Proprietário (Owner)</label>
                <select
                  value={createForm.ownerId}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, ownerId: e.target.value }))}
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

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="create_is_primary"
                  checked={createForm.isPrimary}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, isPrimary: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="create_is_primary" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Definir como Tenant Principal (Pai) da plataforma
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-xs py-2"
                >
                  Cancelar
                </Button>
                <Button type="submit" submitting={creatingTenant} className="text-xs py-2">
                  Criar Tenant
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
