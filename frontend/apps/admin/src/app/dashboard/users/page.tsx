'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, User } from '@/lib/api';
import { Card, Button, Input, LoadingSpinner, Select, BrandModal } from '@psi/ui';
import { Link } from '@/components/Link';
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

const UsersIcon = () => (
  <svg className="w-8 h-8 mx-auto opacity-70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

export default function UsersListPage() {
  const { user: currentUser } = useAuth();
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
    if (currentUser) {
      fetchUsersList();
    }
  }, [currentUser, fetchUsersList]);

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



  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-page-enter">
      {loadingUsers ? (
        <LoadingSpinner message="Carregando listagem de usuários..." className="min-h-[50vh]" />
      ) : (
        <>
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
        <BrandModal
          isOpen={isEditModalOpen && selectedUser !== null}
          onClose={() => setIsEditModalOpen(false)}
          maxWidth="max-w-md"
        >
          <div className="space-y-1 pb-3 border-b border-[var(--surface-border)]">
            <h3 className="text-lg font-bold">Editar Usuário</h3>
            <p className="text-xs text-slate-400">Modifique os dados cadastrais ou permissões.</p>
          </div>

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
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wide opacity-75">
                Permissão / Cargo
              </label>
              <Select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                options={[
                  { value: 'user', label: 'User (Usuário Padrão)' },
                  { value: 'admin', label: 'Admin (Administrador Global)' },
                ]}
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--surface-border)]">
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
        </BrandModal>

        {/* ── MODAL: CRIACAO DE USUARIO ── */}
        <BrandModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          maxWidth="max-w-md"
        >
          <div className="space-y-1 pb-3 border-b border-[var(--surface-border)]">
            <h3 className="text-lg font-bold">Adicionar Usuário</h3>
            <p className="text-xs text-slate-400">Preencha os dados do novo usuário administrador.</p>
          </div>

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
            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--surface-border)]">
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
        </BrandModal>
        </>
      )}
    </div>
  );
}
