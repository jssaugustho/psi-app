'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, Tenant, TenantMember } from '@/lib/api';
import { Card, Button, Input, LoadingSpinner, Select, SelectWithHelper } from '@psi/ui';
import { Mail, Shield, User, X, Clock, AlertCircle, RefreshCw } from 'lucide-react';

export default function MembrosPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [tenants, setTenants] = useState<(Tenant & { memberRole?: string })[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<(Tenant & { memberRole?: string }) | null>(null);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'secretaria' | 'psicologo' | 'agent'>('secretaria');
  const [addingMember, setAddingMember] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states for managing single collaborator details
  const [selectedMember, setSelectedMember] = useState<TenantMember | null>(null);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [resending, setResending] = useState(false);

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
      setRole('secretaria');
      await loadMembers();
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar membro à equipe.');
    } finally {
      setAddingMember(false);
    }
  };

  // Change member role
  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'secretaria' | 'psicologo' | 'agent') => {
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

  const handleOpenMemberModal = async (member: TenantMember) => {
    if (member.user_id === user?.id) return;
    
    setSelectedMember(member);
    setError('');
    setSuccess('');
    setEmailLogs([]);
    
    if (member.profile?.email) {
      setLoadingLogs(true);
      try {
        const logs = await api.getEmailLogsByEmail(member.profile.email);
        setEmailLogs(logs);
      } catch (err: any) {
        console.error('Erro ao carregar logs de e-mail:', err);
      } finally {
        setLoadingLogs(false);
      }
    }
  };

  const handleModalResend = async () => {
    if (!selectedMember || !selectedTenant) return;
    setResending(true);
    setError('');
    setSuccess('');
    try {
      await api.resendInvite(selectedTenant.id, selectedMember.profile!.email);
      setSuccess('Convite reenviado com sucesso!');
      const logs = await api.getEmailLogsByEmail(selectedMember.profile!.email);
      setEmailLogs(logs);
    } catch (err: any) {
      setError(err.message || 'Erro ao reenviar convite.');
    } finally {
      setResending(false);
    }
  };

  if (loading || !user) {
    return <LoadingSpinner message="Carregando dados da equipe..." className="min-h-[50vh]" />;
  }

  return (
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
              <Select
                value={selectedTenant?.id || ''}
                onChange={(e) => setSelectedTenant(tenants.find(t => t.id === e.target.value) || null)}
                options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                variant="transparent"
                className="text-xs"
              />
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
                      <SelectWithHelper
                        value={role}
                        onChange={(e) => setRole(e.target.value as 'admin' | 'secretaria' | 'psicologo' | 'agent')}
                        options={[
                          { 
                            value: 'secretaria', 
                            label: 'Secretária(o)', 
                            helper: 'Gerencia leads, formulários de anamnese, agendamentos e registros financeiros.' 
                          },
                          { 
                            value: 'psicologo', 
                            label: 'Psicólogo', 
                            helper: 'Acesso completo ao prontuário clínico dos pacientes, sessões, evolução e agenda pessoal.' 
                          },
                          { 
                            value: 'admin', 
                            label: 'Administrador', 
                            helper: 'Acesso total às configurações do consultório, dados de faturamento, membros da equipe e integrações.' 
                          },
                        ]}
                      />
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
                          <tr 
                            key={member.id} 
                            onClick={() => handleOpenMemberModal(member)}
                            className={`transition-colors ${member.user_id !== user?.id ? 'cursor-pointer hover:bg-white/5' : 'opacity-85'}`}
                          >
                            <td className="py-3 px-2 text-slate-200">
                              {member.profile ? `${member.profile.nome} ${member.profile.sobrenome}` : 'Usuário Externo'}
                            </td>
                            <td className="py-3 px-2 text-slate-400 font-mono">
                              {member.profile?.email || 'N/A'}
                            </td>
                            <td className="py-3 px-2">
                              {isTenantAdmin && member.user_id !== user.id ? (
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Select
                                    value={member.role}
                                    onChange={(e) => handleRoleChange(member.id, e.target.value as 'admin' | 'secretaria' | 'psicologo' | 'agent')}
                                    options={[
                                      { value: 'secretaria', label: 'Secretária(o)' },
                                      { value: 'psicologo', label: 'Psicólogo' },
                                      { value: 'admin', label: 'Administrador' },
                                      { value: 'agent', label: 'Agente' },
                                    ]}
                                    className="text-xs max-w-[140px]"
                                  />
                                </div>
                              ) : (
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium font-mono uppercase border"
                                  style={
                                    member.role === 'admin'
                                      ? {
                                          background: 'color-mix(in srgb, var(--brand-gradient-start) 10%, transparent)',
                                          color: 'var(--brand-gradient-start)',
                                          borderColor: 'color-mix(in srgb, var(--brand-gradient-start) 20%, transparent)',
                                        }
                                      : {
                                          background: 'rgba(255, 255, 255, 0.05)',
                                          color: '#94A3B8',
                                          borderColor: 'rgba(255, 255, 255, 0.08)',
                                        }
                                  }
                                >
                                  {member.role}
                                </span>
                              )}
                            </td>
                            {isTenantAdmin && (
                              <td className="py-3 px-2 text-right">
                                {member.user_id !== user.id ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveMember(member.id);
                                    }}
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

      {/* Modal de Gestão de Colaborador e Logs de Envio */}
      {selectedMember && (
        <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-4 z-[1000] animate-fade-in">
          <Card className="w-full max-w-lg p-6 space-y-6 relative border border-slate-800 shadow-2xl glass-lg text-left">
            {/* Botão de Fechar */}
            <button 
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors bg-transparent border-none cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header do Modal */}
            <div className="space-y-1.5 text-left pr-8">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100 truncate">
                  {selectedMember.profile?.nome === 'Colaborador' && !selectedMember.profile?.sobrenome 
                    ? 'Convite Enviado' 
                    : `${selectedMember.profile?.nome} ${selectedMember.profile?.sobrenome}`}
                </h3>
                {selectedMember.profile?.nome === 'Colaborador' && !selectedMember.profile?.sobrenome ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                    Pendente
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Membro Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 opacity-60" />
                {selectedMember.profile?.email}
              </p>
            </div>

            {/* Configurações de Papel */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Função na Equipe
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Select
                    value={selectedMember.role}
                    onChange={async (e) => {
                      const newRole = e.target.value as any;
                      await handleRoleChange(selectedMember.id, newRole);
                      setSelectedMember(prev => prev ? { ...prev, role: newRole } : null);
                    }}
                    options={[
                      { value: 'secretaria', label: 'Secretária(o)' },
                      { value: 'psicologo', label: 'Psicólogo' },
                      { value: 'admin', label: 'Administrador' },
                      { value: 'agent', label: 'Agente' },
                    ]}
                    className="text-xs"
                  />
                </div>
                
                {selectedMember.profile?.nome === 'Colaborador' && !selectedMember.profile?.sobrenome ? (
                  <Button
                    onClick={handleModalResend}
                    disabled={resending}
                    variant="outline"
                    className="text-xs h-10 px-4 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                    {resending ? 'Reenviando...' : 'Reenviar'}
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Histórico de E-mails / Envios */}
            <div className="space-y-3 text-left">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                Histórico de Envios
              </h4>

              <div className="bg-slate-950/40 border border-slate-900 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                {loadingLogs ? (
                  <div className="p-4 text-center text-xs text-slate-500 animate-pulse">
                    Buscando logs de e-mail...
                  </div>
                ) : emailLogs.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 italic">
                    Nenhum e-mail registrado para este endereço.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-900/60">
                    {emailLogs.map((log) => {
                      const sentDate = new Date(log.created_at || log.createdAt);
                      return (
                        <div key={log.id} className="p-3 text-xs flex justify-between items-start hover:bg-slate-950/20 transition-all">
                          <div className="space-y-1 pr-4">
                            <p className="font-semibold text-slate-300 truncate max-w-[260px]" title={log.subject}>
                              {log.subject}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {sentDate.toLocaleDateString('pt-BR')} às {sentDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          
                          {log.status === 'sent' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                              Enviado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-500/10 text-red-400 border border-red-500/10" title={log.error || 'Falha de entrega'}>
                              Falhou
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Ações de exclusão */}
            <div className="pt-2 border-t border-slate-800 flex gap-3">
              <Button
                onClick={() => setSelectedMember(null)}
                variant="outline"
                className="flex-1 text-xs"
              >
                Fechar
              </Button>
              
              <button
                onClick={async () => {
                  const isPending = selectedMember.profile?.nome === 'Colaborador' && !selectedMember.profile?.sobrenome;
                  const confirmText = isPending
                    ? 'Deseja realmente cancelar este convite? O acesso do colaborador será revogado.'
                    : 'Deseja realmente remover o acesso deste colaborador?';
                  if (!confirm(confirmText)) return;
                  
                  try {
                    await api.removeTenantMember(selectedMember.id);
                    setSuccess(isPending ? 'Convite cancelado com sucesso!' : 'Membro removido da equipe!');
                    setSelectedMember(null);
                    await loadMembers();
                  } catch (err: any) {
                    setError(err.message || 'Erro ao remover colaborador da equipe.');
                  }
                }}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold h-10 px-4 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer flex items-center justify-center font-sans"
              >
                {selectedMember.profile?.nome === 'Colaborador' && !selectedMember.profile?.sobrenome 
                  ? 'Cancelar Convite' 
                  : 'Remover Acesso'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
