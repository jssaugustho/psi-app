'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api, Tenant, User } from '@/lib/api';
import { Card, Button, Input, LoadingSpinner, BrandModal } from '@psi/ui';
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

  // Modal de exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Formulário — só campos que existem em workspaces
  const [form, setForm] = useState({
    name: '',
    ownerId: 'none',
    // Informações clínicas
    crp: '',
    bio: '',
    instagram: '',
    cityState: '',
    isOnlineService: true,
  });

  // Carregar dados do workspace
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
        setError('Workspace não encontrado.');
        return;
      }
      setTenant(data);
      setUsers(usersList);
      setForm({
        name: data.name || '',
        ownerId: data.ownerId || 'none',
        crp: data.crp || '',
        bio: data.bio || '',
        instagram: data.instagram || '',
        cityState: data.cityState || '',
        isOnlineService: data.isOnlineService ?? true,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao obter dados do workspace.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (currentUser) {
      loadTenant();
    }
  }, [currentUser, loadTenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const resolvedOwnerId = form.ownerId === 'none' ? null : form.ownerId;
      await api.updateTenant(tenantId, {
        name: form.name,
        ownerId: resolvedOwnerId,
        crp: form.crp || null,
        bio: form.bio || null,
        instagram: form.instagram || null,
        cityState: form.cityState || null,
        isOnlineService: form.isOnlineService,
      });
      setSuccess('Configurações do workspace salvas com sucesso!');
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
      alert('O nome digitado não corresponde ao nome do workspace.');
      return;
    }

    setDeleting(true);
    setError('');
    try {
      await api.deleteTenant(tenant.id);
      setIsDeleteModalOpen(false);
      router.push('/dashboard/tenants');
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir o workspace.');
      setIsDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-page-enter">
      {loading ? (
        <LoadingSpinner message="Carregando dados do workspace..." className="min-h-[50vh]" />
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
            <p className="text-sm opacity-60">Configuração geral e dados clínicos do workspace.</p>
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
          {/* SEÇÃO 1: Informações Gerais */}
          <Card>
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-200 pb-2 border-b border-slate-800/60">Informações Gerais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome do Workspace *"
                  required
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                />
                <div className="md:col-span-1">
                  <SearchableUserSelect
                    users={users}
                    selectedValue={form.ownerId}
                    onChange={(val) => setForm(prev => ({ ...prev, ownerId: val }))}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* SEÇÃO 2: Informações Clínicas */}
          <Card>
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-200 pb-2 border-b border-slate-800/60">Dados Clínicos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="CRP"
                  value={form.crp}
                  onChange={(e) => setForm(prev => ({ ...prev, crp: e.target.value }))}
                  placeholder="Ex: 06/123456"
                />
                <Input
                  label="Instagram"
                  value={form.instagram}
                  onChange={(e) => setForm(prev => ({ ...prev, instagram: e.target.value }))}
                  placeholder="@usuario"
                />
                <Input
                  label="Cidade / Estado"
                  value={form.cityState}
                  onChange={(e) => setForm(prev => ({ ...prev, cityState: e.target.value }))}
                  placeholder="Ex: São Paulo, SP"
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ opacity: 0.7 }}>Atendimento Online?</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isOnlineService}
                      onChange={(e) => setForm(prev => ({ ...prev, isOnlineService: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Sim, oferece atendimento online</span>
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold block mb-1.5" style={{ opacity: 0.7 }}>Bio / Descrição</label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    placeholder="Descrição do profissional ou consultório..."
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none brand-input"
                  />
                </div>
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
                A exclusão deste workspace removerá de forma permanente e irreversível todos os dados, configurações, equipe e registros vinculados.
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
                Excluir Workspace
              </Button>
            </div>
          </div>
        </Card>

      {/* ── MODAL: CONFIRMAR EXCLUSÃO DEFINITIVA ── */}
      {tenant && (
        <BrandModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          maxWidth="max-w-md"
        >
        <div className="space-y-1 pb-3 border-b border-[var(--surface-border)]">
          <h3 className="text-lg font-bold text-red-400">Confirmar Exclusão</h3>
          <p className="text-xs text-slate-400">Esta ação é estritamente irreversível.</p>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg leading-relaxed">
          ⚠️ **Atenção**: Todos os dados do espaço de trabalho serão excluídos para sempre. Não é possível recuperar os agendamentos, equipe ou dados clínicos deste workspace após esta operação.
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-300 leading-normal">
            Para confirmar a exclusão definitiva, digite o nome exato do workspace <strong className="text-slate-100">{tenant.name}</strong> no campo abaixo:
          </p>
          <input
            type="text"
            placeholder={tenant.name}
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            className="w-full rounded-xl py-2.5 px-4 text-sm outline-none transition-colors brand-input focus:border-red-500/50 font-medium"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--surface-border)]">
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
      </BrandModal>
      )}
      </>
      )}
    </div>
  );
}
