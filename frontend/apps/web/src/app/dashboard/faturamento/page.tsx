'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, Tenant, TenantSubscription } from '@/lib/api';
import { Card, Button, LoadingSpinner, Select } from '@psi/ui';

export default function FaturamentoPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [tenants, setTenants] = useState<(Tenant & { memberRole?: string })[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<(Tenant & { memberRole?: string }) | null>(null);
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');



  // Load tenants
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

  // Load subscription details
  const loadSubscription = useCallback(async () => {
    if (!selectedTenant) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.getTenantSubscription(selectedTenant.id);
      setSubscription(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar detalhes do faturamento.');
    } finally {
      setLoading(false);
    }
  }, [selectedTenant]);

  useEffect(() => {
    if (selectedTenant) {
      loadSubscription();
    }
  }, [selectedTenant, loadSubscription]);

  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  if (loading || !user) {
    return <LoadingSpinner message="Carregando faturamento..." className="min-h-[50vh]" />;
  }

  const isOwner = selectedTenant?.ownerId === user.id;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-page-enter">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Faturamento da Assinatura</h1>
            <p className="text-sm text-slate-400 mt-1">
              Visualize os detalhes do plano contratado e cobranças mensais.
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

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-4 rounded-xl text-center">
            {error}
          </div>
        )}

        {selectedTenant && subscription ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Esquerda/Centro - Detalhamento da Cobrança */}
            <div className="md:col-span-2 space-y-6">
              <Card>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">Resumo da Assinatura</h2>
                    <p className="text-xs text-slate-400">Detalhamento dos custos vigentes para o mês corrente.</p>
                  </div>

                  {/* Tabela Simplificada */}
                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center text-sm border-b border-slate-800/60 pb-3">
                      <div>
                        <span className="font-semibold text-slate-200 block">Licença Base (Tenant)</span>
                        <span className="text-xs text-slate-500">Inclui o criador e a infraestrutura básica</span>
                      </div>
                      <span className="font-mono text-slate-300">{formatMoney(subscription.base_price)}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm border-b border-slate-800/60 pb-3">
                      <div>
                        <span className="font-semibold text-slate-200 block">Membros Adicionais ({subscription.members_count})</span>
                        <span className="text-xs text-slate-500">
                          {subscription.members_count} membros x {formatMoney(subscription.additional_member_price)} cada
                        </span>
                      </div>
                      <span className="font-mono text-slate-300">
                        {formatMoney(subscription.members_count * subscription.additional_member_price)}
                      </span>
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center pt-3 text-base font-bold">
                      <span className="text-slate-100">Total Mensal</span>
                      <span className="font-mono text-lg" style={{ color: 'var(--brand-gradient-start)' }}>
                        {formatMoney(subscription.total_price)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Histórico/Nota Fiscal Fictício */}
              <Card>
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-slate-200">Ciclos de Faturamento</h3>
                  <p className="text-xs text-slate-500">
                    O pagamento é realizado mensalmente via cartão de crédito. As cobranças ocorrem a cada 30 dias a partir da data de criação do espaço.
                  </p>
                  <div className="flex items-center gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/40 text-xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-300">Assinatura ativa e em dia</p>
                      <p className="text-[10px] text-slate-500">Próximo faturamento automático em breve</p>
                    </div>
                    <span className="text-slate-400 font-mono">Espaço criado: {new Date(subscription.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Direita - Cartão do Dono e Status */}
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-slate-950 via-slate-900 to-[color-mix(in_srgb,var(--brand-gradient-start)_4%,transparent)] border" style={{ borderColor: 'color-mix(in srgb, var(--brand-gradient-start) 20%, transparent)' }}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border" style={{ color: 'var(--brand-gradient-start)', background: 'color-mix(in srgb, var(--brand-gradient-start) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--brand-gradient-start) 20%, transparent)' }}>
                      Plano Ativo
                    </span>
                    <span className="text-xs text-slate-500 font-mono">BRL</span>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs text-slate-500">Custo Atual</p>
                    <p className="text-3xl font-extrabold text-slate-100 font-mono tracking-tight">
                      {formatMoney(subscription.total_price)}
                      <span className="text-sm font-normal text-slate-500">/mês</span>
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800/60 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Proprietário:</span>
                      <span className="text-slate-300 font-medium">{isOwner ? 'Você (Dono)' : 'Outro usuário'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Seu papel no espaço:</span>
                      <span className="text-slate-300 font-mono capitalize">{selectedTenant.memberRole || 'admin'}</span>
                    </div>
                  </div>

                  {isOwner ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] p-3 rounded-lg mt-4 leading-relaxed">
                      ✓ Você é o **Dono** deste espaço. O faturamento mensal é lançado no seu perfil e faturado na forma de pagamento cadastrada no backoffice.
                    </div>
                  ) : (
                    <div className="bg-slate-950/60 border border-slate-800 text-slate-400 text-[11px] p-3 rounded-lg mt-4 leading-relaxed">
                      ℹ Você é **colaborador** deste espaço. A responsabilidade do pagamento mensal recai sobre o dono/criador do espaço.
                    </div>
                  )}
                </div>
              </Card>

              {/* Botão de Contato */}
              <Card className="text-center">
                <p className="text-xs text-slate-400 mb-3">Dúvidas sobre faturamento ou quer alterar o plano?</p>
                <Button variant="outline" className="w-full text-xs" onClick={() => alert('Suporte financeiro notificado!')}>
                  Falar com Suporte
                </Button>
              </Card>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-900/20 border border-slate-800/40 rounded-2xl">
            <p className="text-slate-400 text-sm">Você ainda não está associado a nenhum tenant com assinatura ativa.</p>
            <p className="text-xs text-slate-500 mt-1">Inscreva-se em um espaço de trabalho ou crie seu próprio tenant no backoffice.</p>
          </div>
        )}
    </div>
  );
}
