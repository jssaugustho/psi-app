'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api, User } from '@/lib/api';
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
const EditIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
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

export default function UsersListPage() {
  const { user: currentUser, loading: authLoading, logout, setIsProfileOpen } = useAuth();
  const { tenant: brandTenant, theme, toggleTheme } = useBrand();
  const router = useRouter();

  // Estados dos usuários
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modais
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    nome: '',
    sobrenome: '',
    telefone: '',
    role: 'user',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    nome: '',
    sobrenome: '',
    email: '',
    password: '',
    telefone: '',
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState('');

  // Carregar dados de usuários
  const fetchUsersList = useCallback(async () => {
    setLoadingUsers(true);
    setError('');
    try {
      const data = await api.getUsers(search, roleFilter);
      setUsers(data);
    } catch (err: any) {
      console.error('Erro ao buscar usuários:', err);
      setError(err.message || 'Erro ao buscar listagem de usuários do sistema.');
    } finally {
      setLoadingUsers(false);
    }
  }, [search, roleFilter]);

  // Efeito para sincronizar autenticação e dados
  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push('/login');
      } else if (currentUser.role === 'admin') {
        fetchUsersList();
      }
    }
  }, [authLoading, currentUser, router, fetchUsersList]);

  // Handler de edição de usuário
  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      nome: user.nome || '',
      sobrenome: user.sobrenome || '',
      telefone: user.telefone || '',
      role: user.role || 'user',
    });
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSavingEdit(true);
    setEditError('');
    try {
      const updated = await api.updateUserProfile(selectedUser.id, editForm);
      // Atualiza estado local
      setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? { ...u, ...updated } : u)));
      setIsEditModalOpen(false);
    } catch (err: any) {
      setEditError(err.message || 'Erro ao atualizar dados do usuário.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handler de criação de usuário
  const handleOpenCreate = () => {
    setCreateForm({
      nome: '',
      sobrenome: '',
      email: '',
      password: '',
      telefone: '',
    });
    setCreateError('');
    setIsCreateModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    setCreateError('');
    try {
      await api.register({
        nome: createForm.nome,
        sobrenome: createForm.sobrenome,
        email: createForm.email,
        password: createForm.password,
        telefone: createForm.telefone || undefined,
      });
      // Recarrega listagem
      await fetchUsersList();
      setIsCreateModalOpen(false);
    } catch (err: any) {
      setCreateError(err.message || 'Erro ao cadastrar novo usuário.');
    } finally {
      setCreatingUser(false);
    }
  };

  const menuItems = [
    { label: 'Painel Geral', href: '/dashboard', icon: <HomeIcon />, active: false },
    { label: 'Status do App', href: '/dashboard/status', icon: <StatusIcon />, active: false },
    { label: 'Tenants', href: '/dashboard/tenants', icon: <OfficeIcon />, active: false },
    { label: 'Usuários', href: '/dashboard/users', icon: <UsersIcon />, active: true },
    { label: 'E-mails', href: '/dashboard/emails', icon: <EnvelopeIcon />, active: false },
    { label: 'Configurações', href: '/dashboard/settings', icon: <SettingsIcon />, active: false },
  ];

  if (authLoading || (!currentUser && authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--brand-text-color)' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: 'color-mix(in srgb, var(--brand-gradient-start) 30%, transparent)',
              borderTopColor: 'var(--brand-gradient-start)',
            }}
          />
          <p className="text-sm" style={{ opacity: 0.6 }}>Carregando dados da sessão...</p>
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
      <div className="max-w-5xl mx-auto space-y-6 animate-page-enter">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Controle de Usuários</h1>
            <p className="text-sm mt-1" style={{ opacity: 0.6 }}>
              Gerencie privilégios, edite perfis e visualize dados dos usuários do sistema
            </p>
          </div>

          <Button onClick={handleOpenCreate} className="flex items-center gap-2">
            <PlusIcon />
            <span>Adicionar Usuário</span>
          </Button>
        </div>

        {/* Filtros e Busca */}
        <div
          className="glass-md p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between"
        >
          {/* Campo de Busca */}
          <div className="relative w-full md:max-w-md">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border bg-transparent transition-all focus:outline-none"
              style={{
                borderColor: 'var(--surface-border)',
                color: 'var(--brand-text-color)',
                background: 'var(--surface-input, rgba(0, 0, 0, 0.15))',
              }}
            />
          </div>

          {/* Filtro por Role */}
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-60">Filtrar:</span>
            <div className="flex p-0.5 rounded-xl glass-sm">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'user', label: 'Usuários' },
                { id: 'admin', label: 'Admins' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setRoleFilter(filter.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none"
                  style={
                    roleFilter === filter.id
                      ? {
                          background: 'var(--brand-gradient)',
                          color: 'var(--brand-contrast-color)',
                        }
                      : {
                          background: 'transparent',
                          color: 'var(--brand-text-color)',
                          opacity: 0.65,
                        }
                  }
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Conteúdo Principal */}
        {loadingUsers && users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div
              className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
              style={{
                borderColor: 'color-mix(in srgb, var(--brand-gradient-start) 30%, transparent)',
                borderTopColor: 'var(--brand-gradient-start)',
              }}
            />
            <p className="text-sm" style={{ opacity: 0.6 }}>Buscando usuários...</p>
          </div>
        ) : error ? (
          <div
            className="p-6 rounded-2xl flex items-center justify-center text-center"
            style={{
              background: 'var(--status-error-bg)',
              border: '1px solid var(--status-error-border)',
              color: 'var(--status-error-text)',
            }}
          >
            <div>
              <p className="font-bold">Ocorreu um erro</p>
              <p className="text-sm mt-1">{error}</p>
              <Button variant="danger" onClick={fetchUsersList} className="mt-4">
                Tentar Novamente
              </Button>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div
            className="glass-md p-16 rounded-2xl text-center space-y-2"
            style={{ border: '1px solid var(--surface-border)' }}
          >
            <UsersIcon />
            <p className="text-lg font-bold mt-2">Nenhum usuário encontrado</p>
            <p className="text-sm opacity-60">Tente ajustar seus critérios de busca ou filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="glass-md p-5 rounded-2xl flex flex-col justify-between hover:scale-[1.01] transition-all duration-300"
                style={{
                  color: 'var(--brand-text-color)',
                }}
              >
                {/* Cabeçalho do Card */}
                <div className="flex items-start gap-4">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={`${user.nome} Avatar`}
                      className="w-12 h-12 rounded-xl object-cover shadow-md shrink-0"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold shadow-md shrink-0"
                      style={{
                        background: 'var(--brand-gradient)',
                        color: 'var(--brand-contrast-color)',
                      }}
                    >
                      {user.nome?.[0]?.toUpperCase()}
                      {user.sobrenome?.[0]?.toUpperCase()}
                    </div>
                  )}

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold truncate text-base leading-tight">
                        {user.nome} {user.sobrenome}
                      </p>
                      {/* Badge de Role */}
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border"
                        style={
                          user.role === 'admin'
                            ? {
                                background: 'var(--status-success-bg)',
                                color: 'var(--status-success-text)',
                                borderColor: 'var(--status-success-border)',
                              }
                            : {
                                background: 'rgba(255,255,255,0.06)',
                                color: 'var(--brand-text-color)',
                                borderColor: 'rgba(255,255,255,0.1)',
                                opacity: 0.8,
                              }
                        }
                      >
                        {user.role}
                      </span>
                    </div>

                    <p className="text-xs truncate opacity-70" style={{ color: 'var(--brand-text-color)' }}>
                      {user.email}
                    </p>

                    {user.telefone && (
                      <p className="text-[11px] opacity-55 font-mono">
                        {user.telefone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer do Card */}
                <div
                  className="mt-5 pt-4 flex items-center justify-between"
                  style={{ borderTop: '1px solid var(--surface-border)' }}
                >
                  <span className="text-[10px] opacity-45 uppercase font-medium">
                    Cadastro: {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(user)}
                      className="p-2 rounded-lg border border-slate-700/60 hover:bg-slate-800/40 text-xs cursor-pointer bg-transparent transition-all flex items-center justify-center"
                      title="Editar Usuário"
                      style={{ color: 'var(--brand-text-color)' }}
                    >
                      <EditIcon />
                    </button>
                    <Link
                      href={`/dashboard/users/${user.id}`}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-1.5 text-center cursor-pointer"
                      style={{
                        background: 'var(--brand-gradient)',
                        color: 'var(--brand-contrast-color)',
                      }}
                    >
                      Ver Perfil
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── MODAL: EDICAO DE USUARIO ── */}
        {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
              onClick={() => setIsEditModalOpen(false)}
            />
            <div
              className="relative glass-lg w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4 animate-scale-up text-left"
              style={{
                color: 'var(--brand-text-color)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <h3 className="text-lg font-bold">Editar Usuário</h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-all cursor-pointer bg-transparent border-none"
                  style={{ color: 'var(--brand-text-color)' }}
                >
                  <CloseIcon />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveEdit} className="space-y-4">
                {editError && (
                  <div
                    className="p-3 rounded-lg text-xs"
                    style={{
                      background: 'var(--status-error-bg)',
                      color: 'var(--status-error-text)',
                      border: '1px solid var(--status-error-border)',
                    }}
                  >
                    {editError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Nome"
                    value={editForm.nome}
                    onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                    required
                  />
                  <Input
                    label="Sobrenome"
                    value={editForm.sobrenome}
                    onChange={(e) => setEditForm({ ...editForm, sobrenome: e.target.value })}
                    required
                  />
                </div>

                <Input
                  label="Telefone"
                  value={editForm.telefone}
                  onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />

                {/* Role Switcher */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wide opacity-75">
                    Permissão / Cargo
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none"
                    style={{
                      background: 'var(--surface-input, rgba(0,0,0,0.30))',
                      border: '1px solid var(--surface-border)',
                      color: 'var(--brand-text-color)',
                    }}
                  >
                    <option value="user">User (Usuário Padrão)</option>
                    <option value="admin">Admin (Administrador Global)</option>
                  </select>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2 pt-4" style={{ borderTop: '1px solid var(--surface-border)' }}>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={savingEdit}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={savingEdit}>
                    {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: CRIACAO DE USUARIO ── */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
              onClick={() => setIsCreateModalOpen(false)}
            />
            <div
              className="relative glass-lg w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4 animate-scale-up text-left"
              style={{
                color: 'var(--brand-text-color)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <h3 className="text-lg font-bold">Adicionar Usuário</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-all cursor-pointer bg-transparent border-none"
                  style={{ color: 'var(--brand-text-color)' }}
                >
                  <CloseIcon />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateUser} className="space-y-4">
                {createError && (
                  <div
                    className="p-3 rounded-lg text-xs"
                    style={{
                      background: 'var(--status-error-bg)',
                      color: 'var(--status-error-text)',
                      border: '1px solid var(--status-error-border)',
                    }}
                  >
                    {createError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Nome"
                    value={createForm.nome}
                    onChange={(e) => setCreateForm({ ...createForm, nome: e.target.value })}
                    required
                  />
                  <Input
                    label="Sobrenome"
                    value={createForm.sobrenome}
                    onChange={(e) => setCreateForm({ ...createForm, sobrenome: e.target.value })}
                    required
                  />
                </div>

                <Input
                  label="E-mail"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required
                  placeholder="exemplo@email.com"
                />

                <Input
                  label="Senha"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                  placeholder="Mínimo 6 caracteres"
                />

                <Input
                  label="Telefone"
                  value={createForm.telefone}
                  onChange={(e) => setCreateForm({ ...createForm, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2 pt-4" style={{ borderTop: '1px solid var(--surface-border)' }}>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={creatingUser}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={creatingUser}>
                    {creatingUser ? 'Adicionando...' : 'Adicionar Usuário'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
