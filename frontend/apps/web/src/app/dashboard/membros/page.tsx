'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, Tenant, TenantMember } from '@/lib/api';
import { AppShell, Card, Button, Input } from '@psi/ui';
import Link from 'next/link';

export default function MembrosPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [tenants, setTenants] = useState<(Tenant & { memberRole?: string })[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<(Tenant & { memberRole?: string }) | null>(null);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'agent'>('agent');
  const [addingMember, setAddingMember] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Load tenants for user
  const loadTenants = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const myTenants = await api.getMyTenants(user.id);
      setTenants(myTenants);
      if (myTenants.length > 0) {
        setSelectedTenant(myTenants[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar seus tenants.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadTenants();
    }
  }, [user, loadTenants]);

  // Load members for selected tenant
  const loadMembers = useCallback(async () => {
    if (!selectedTenant) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.getTenantMembers(selectedTenant.id);
      setMembers(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar membros do tenant.');
    } finally {
      setLoading(false);
    }
  }, [selectedTenant]);

  useEffect(() => {
    if (selectedTenant) {
      loadMembers();
    }
  }, [selectedTenant, loadMembers]);

  // Check if current user is admin/owner of selected tenant
  const isTenantAdmin = selectedTenant
    ? selectedTenant.ownerId === user?.id || selectedTenant.memberRole === 'admin'
    : false;

  // Add new member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setAddingMember(true);
    setError('');
    setSuccess('');

    try {
      await api.addTenantMemberByEmail(selectedTenant.id, email.trim(), role);
      setSuccess(`Membro ${email} adicionado com sucesso!`);
      setEmail('');
      setRole('agent');
      await loadMembers();
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar membro à equipe.');
    } finally {
      setAddingMember(false);
    }
  };

  // Change member role
  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'agent') => {
    setError('');
    setSuccess('');
    try {
      await api.updateTenantMemberRole(memberId, newRole);
      setSuccess('Papel do membro atualizado com sucesso!');
      await loadMembers();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar papel do membro.');
    }
  };

  // Remove member
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Deseja realmente remover este membro do tenant?')) return;
    setError('');
    setSuccess('');
    try {
      await api.removeTenantMember(memberId);
      setSuccess('Membro removido com sucesso!');
      await loadMembers();
    } catch (err: any) {
      setError(err.message || 'Erro ao remover membro da equipe.');
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-indigo-500 animate-ping" />
          <span>Carregando equipe...</span>
        </div>
      </div>
    );
  }

  const menuItems = [
    { label: 'Perfil', href: '/dashboard', active: false },
    { label: 'Equipe', href: '/dashboard/membros', active: true },
    { label: 'Faturamento', href: '/dashboard/faturamento', active: false },
  ];

  return (
    <AppShell appName="Psi App" menuItems={menuItems} user={user} onLogout={logout} LinkComponent={Link}>
      <div className="space-y-6 max-w-4xl mx-auto animate-page-enter">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Equipe e Permissões</h1>
            <p className="text-sm text-slate-400 mt-1">
              Gerencie os colaboradores vinculados ao seu espaço de trabalho.
            </p>
          </div>

          {/* Selector de Tenant */}
          {tenants.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-1.5">
              <span className="text-xs text-slate-400">Espaço:</span>
              <select
                value={selectedTenant?.id || ''}
                onChange={(e) => setSelectedTenant(tenants.find(t => t.id === e.target.value) || null)}
                className="bg-transparent border-none text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-950 text-slate-200">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Mensagens de status */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-4 rounded-xl text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm p-4 rounded-xl text-center">
            {success}
          </div>
        )}

        {selectedTenant ? (
          <>
            {/* 1. Formulário de Convite (Apenas Admins/Owners) */}
            {isTenantAdmin ? (
              <Card>
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">Adicionar Colaborador</h2>
                    <p className="text-xs text-slate-400">
                      O usuário deve estar previamente registrado na plataforma para ser adicionado ao tenant.
                    </p>
                  </div>

                  <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <Input
                      label="E-mail do Colaborador *"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="colaborador@exemplo.com"
                    />
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-slate-300">Papel (Role) *</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as 'admin' | 'agent')}
                        className="bg-slate-950 border border-slate-800 text-sm rounded-xl px-3 h-[42px] outline-none text-slate-200 focus:border-indigo-500 transition-colors"
                      >
                        <option value="agent">Agente (Apenas usa recursos)</option>
                        <option value="admin">Administrador (Configura e gerencia)</option>
                      </select>
                    </div>
                    <Button type="submit" className="w-full h-[42px]" submitting={addingMember}>
                      Adicionar à Equipe
                    </Button>
                  </form>
                </div>
              </Card>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs p-4 rounded-xl">
                ⚠️ <strong>Apenas Leitura:</strong> Você está visualizando a equipe como Agente. Para adicionar colaboradores ou alterar permissões, solicite acesso de administrador ou contate o proprietário ({selectedTenant.ownerId ? 'dono cadastrado' : 'sistema'}).
              </div>
            )}

            {/* 2. Tabela de Membros */}
            <Card>
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-100">Integrantes da Equipe</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 opacity-75">
                        <th className="py-3 px-2 font-semibold text-slate-400">Nome</th>
                        <th className="py-3 px-2 font-semibold text-slate-400">E-mail</th>
                        <th className="py-3 px-2 font-semibold text-slate-400">Papel (Role)</th>
                        {isTenantAdmin && <th className="py-3 px-2 text-right font-semibold text-slate-400">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {members.length === 0 ? (
                        <tr>
                          <td colSpan={isTenantAdmin ? 4 : 3} className="text-center py-6 text-slate-500">
                            Nenhum membro vinculado a este espaço de trabalho além do proprietário.
                          </td>
                        </tr>
                      ) : (
                        members.map((member) => (
                          <tr key={member.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="py-3 px-2 text-slate-200">
                              {member.profile ? `${member.profile.nome} ${member.profile.sobrenome}` : 'Usuário Externo'}
                            </td>
                            <td className="py-3 px-2 text-slate-400 font-mono">
                              {member.profile?.email || 'N/A'}
                            </td>
                            <td className="py-3 px-2">
                              {isTenantAdmin && member.user_id !== user.id ? (
                                <select
                                  value={member.role}
                                  onChange={(e) => handleRoleChange(member.id, e.target.value as 'admin' | 'agent')}
                                  className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-2 py-1 outline-none text-slate-300 focus:border-indigo-500 transition-colors"
                                >
                                  <option value="agent">Agente</option>
                                  <option value="admin">Administrador</option>
                                </select>
                              ) : (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium font-mono uppercase ${
                                  member.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                }`}>
                                  {member.role}
                                </span>
                              )}
                            </td>
                            {isTenantAdmin && (
                              <td className="py-3 px-2 text-right">
                                {member.user_id !== user.id ? (
                                  <button
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold px-3 py-1 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer"
                                  >
                                    Remover
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-500 italic">Você</span>
                                )}
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </>
        ) : (
          <div className="text-center py-20 bg-slate-900/20 border border-slate-800/40 rounded-2xl">
            <p className="text-slate-400 text-sm">Você ainda não está associado a nenhum tenant.</p>
            <p className="text-xs text-slate-500 mt-1">Peça para um administrador te convidar.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
