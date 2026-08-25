'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api, PlatformSettings, TenantSubscription, User } from '@/lib/api';
import { Card, Button, Input } from '@psi/ui';

export function BillingSettings() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [subscriptions, setSubscriptions] = useState<TenantSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPrices, setSavingPrices] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states for prices in decimal string (e.g., "150.00")
  const [basePrice, setBasePrice] = useState('0.00');
  const [additionalPrice, setAdditionalPrice] = useState('0.00');

  // Loading lists
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const [settingsRes, subsRes, usersRes] = await Promise.all([
        api.getPlatformSettings(),
        api.getTenantSubscriptions(),
        api.getUsers(),
      ]);

      setSettings(settingsRes);
      if (settingsRes) {
        setBasePrice((settingsRes.base_tenant_price / 100).toFixed(2));
        setAdditionalPrice((settingsRes.additional_member_price / 100).toFixed(2));
      }

      // Map owner emails from the users list for display
      const mappedSubs = subsRes.map(sub => {
        const owner = usersRes.find(u => u.id === sub.owner_id);
        return {
          ...sub,
          owner_email: owner ? `${owner.nome} ${owner.sobrenome} (${owner.email})` : 'Sem proprietário',
        };
      });

      setSubscriptions(mappedSubs);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar configurações de assinaturas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle saving prices
  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSavingPrices(true);
    setError('');
    setSuccess('');

    try {
      // Parse prices to cents (integer)
      const baseCents = Math.round(parseFloat(basePrice) * 100);
      const additionalCents = Math.round(parseFloat(additionalPrice) * 100);

      if (isNaN(baseCents) || isNaN(additionalCents) || baseCents < 0 || additionalCents < 0) {
        throw new Error('Por favor, insira valores válidos.');
      }

      await api.updatePlatformSettings(settings.id, {
        base_tenant_price: baseCents,
        additional_member_price: additionalCents,
      });

      setSuccess('Valores das assinaturas atualizados com sucesso!');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar os preços.');
    } finally {
      setSavingPrices(false);
    }
  };

  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div
          className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{
            borderColor: 'color-mix(in srgb, var(--brand-gradient-start) 30%, transparent)',
            borderTopColor: 'var(--brand-gradient-start)',
          }}
        />
        <p className="text-sm opacity-60">Carregando painel financeiro...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-page-enter">
      {/* Mensagens de Status */}
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
      {success && (
        <div
          className="p-4 rounded-xl text-sm border"
          style={{
            background: 'var(--status-success-bg)',
            borderColor: 'var(--status-success-border)',
            color: 'var(--status-success-text)',
          }}
        >
          {success}
        </div>
      )}

      {/* 1. Configurações de Preço */}
      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold">Configuração de Cobranças</h2>
            <p className="text-xs opacity-60">
              Defina os valores bases para faturamento dos tenants na plataforma.
            </p>
          </div>

          <form onSubmit={handleSavePrices} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Input
              label="Preço Base do Tenant (R$)*"
              type="number"
              step="0.01"
              min="0"
              required
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="100.00"
            />
            <Input
              label="Preço por Membro Adicional (R$)*"
              type="number"
              step="0.01"
              min="0"
              required
              value={additionalPrice}
              onChange={(e) => setAdditionalPrice(e.target.value)}
              placeholder="20.00"
            />
            <Button type="submit" className="w-full" submitting={savingPrices}>
              Salvar Preços
            </Button>
          </form>
        </div>
      </Card>

      {/* 2. Lista de Tenants e Faturamento */}
      <Card>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold">Assinaturas Ativas</h2>
              <p className="text-xs opacity-60">
                Lista de todos os tenants na plataforma e custos mensais calculados.
              </p>
            </div>
            <Button variant="outline" className="text-xs py-1 px-3" onClick={loadData}>
              Atualizar Tabela
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 opacity-75">
                  <th className="py-3 px-2 font-semibold">Tenant</th>
                  <th className="py-3 px-2 font-semibold">Dono (Owner)</th>
                  <th className="py-3 px-2 text-center font-semibold">Membros Adicionais</th>
                  <th className="py-3 px-2 text-right font-semibold">Custo Base</th>
                  <th className="py-3 px-2 text-right font-semibold">Custo Membros</th>
                  <th className="py-3 px-2 text-right font-semibold">Preço Total Mensal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 opacity-60">
                      Nenhum tenant cadastrado no sistema.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => {
                    return (
                      <tr key={sub.workspace_id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="py-3 px-2 font-medium">
                          <span className="block font-semibold">{sub.workspace_name}</span>
                          <span className="block text-[10px] opacity-50 font-mono">{sub.workspace_id}</span>
                        </td>
                        <td className="py-3 px-2 text-slate-300 font-semibold">
                          {sub.owner_email}
                        </td>
                        <td className="py-3 px-2 text-center font-semibold text-slate-300">
                          {sub.members_count}
                        </td>
                        <td className="py-3 px-2 text-right text-slate-400 font-mono">
                          {formatMoney(sub.base_price)}
                        </td>
                        <td className="py-3 px-2 text-right text-slate-400 font-mono">
                          {formatMoney(sub.members_count * sub.additional_member_price)}
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-indigo-400 font-mono text-sm">
                          {formatMoney(sub.total_price)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
