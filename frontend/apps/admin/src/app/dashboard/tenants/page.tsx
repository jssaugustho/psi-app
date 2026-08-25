'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, Tenant, User } from '@/lib/api';
import { Card, Button, Input, LoadingSpinner, Select } from '@psi/ui';

// ── Ícones SVG ────────────────────────────────────────────────────────────

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
  const { user: currentUser } = useAuth();
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
    ownerId: '',
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
      setError(err.message || 'Erro ao carregar os dados de workspaces.');
    } finally {
      setLoadingTenants(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, loadData]);

  // Abrir Modal de Criação
  const handleOpenCreate = () => {
    setCreateForm({
      name: '',
      ownerId: 'none',
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
        ownerId: resolvedOwnerId,
      });
      setIsCreateModalOpen(false);
      await loadData();
    } catch (err: any) {
      setCreateError(err.message || 'Erro ao cadastrar workspace.');
    } finally {
      setCreatingTenant(false);
    }
  };

  const filteredTenants = tenants.filter(t => {
    const s = search.toLowerCase();
    const owner = users.find(u => u.id === t.ownerId);
    const ownerName = owner ? `${owner.nome} ${owner.sobrenome} ${owner.email}`.toLowerCase() : '';
    return (
      (t.name && t.name.toLowerCase().includes(s)) ||
      ownerName.includes(s)
    );
  });

  const getOwnerText = (ownerId: string | null | undefined) => {
    if (!ownerId) return 'Sem proprietário';
    const owner = users.find(u => u.id === ownerId);
    return owner ? `${owner.nome} ${owner.sobrenome} (${owner.email})` : 'Usuário não encontrado';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-page-enter">
      {loadingTenants ? (
        <LoadingSpinner message="Carregando workspaces..." className="min-h-[50vh]" />
      ) : (
        <>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Workspaces (Espaços de Trabalho)</h1>
            <p className="text-sm mt-1" style={{ opacity: 0.6 }}>
              Visualização, cadastro e configuração de todos os workspaces do sistema. Clique em qualquer linha para gerenciar.
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="flex items-center gap-2">
            <PlusIcon />
            <span>Novo Workspace</span>
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
              placeholder="Buscar por nome do workspace ou proprietário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-colors brand-input"
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
              <p className="text-sm opacity-60">Carregando workspaces...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 opacity-75">
                    <th className="py-3 px-3 font-semibold">Workspace</th>
                    <th className="py-3 px-3 font-semibold">Proprietário (Owner)</th>
                    <th className="py-3 px-3 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-8 opacity-60">
                        Nenhum workspace encontrado.
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
                            <div className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs border" style={{ background: 'color-mix(in srgb, var(--brand-gradient-start) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--brand-gradient-start) 20%, transparent)', color: 'var(--brand-gradient-start)' }}>
                              {tenant.name[0]?.toUpperCase() || 'W'}
                            </div>
                            <div>
                              <span className="font-semibold block text-slate-200">{tenant.name}</span>
                              <span className="text-[10px] opacity-40 font-mono block">{tenant.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-300">
                          {getOwnerText(tenant.ownerId)}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Ativo
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      {/* ── MODAL: NOVO WORKSPACE ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="glass-lg w-full max-w-md rounded-2xl border border-slate-800 p-6 space-y-6 animate-scale-up">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Criar Espaço de Trabalho</h3>
                <p className="text-xs text-slate-400">Insira o nome e proprietário do novo workspace.</p>
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

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Proprietário (Owner)</label>
                <Select
                  value={createForm.ownerId}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, ownerId: e.target.value }))}
                  options={[
                    { value: 'none', label: 'Selecione o proprietário...' },
                    ...users.map((u) => ({
                      value: u.id,
                      label: `${u.nome} ${u.sobrenome} (${u.email})`,
                    })),
                  ]}
                />
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
                  Criar Workspace
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
