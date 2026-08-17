'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api, DnsRecord, DnsVerifierResponse } from '@/lib/api';
import { Input, Card, Button } from '@psi/ui';
import { DnsVerifier } from '@/components/dns-verifier';

interface ResendSettingsProps {
  currentFromDomain: string | null;
  hasResend: boolean;
  onSaved: () => void;
}

export function ResendSettings({ currentFromDomain, hasResend, onSaved }: ResendSettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [fromDomain, setFromDomain] = useState(currentFromDomain ?? '');
  
  // Estados de submissão separados
  const [savingKey, setSavingKey] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [keySuccess, setKeySuccess] = useState('');

  const [savingDomain, setSavingDomain] = useState(false);
  const [domainError, setDomainError] = useState('');
  const [domainSuccess, setDomainSuccess] = useState('');

  // Estado do verificador DNS
  const [dnsData, setDnsData] = useState<DnsVerifierResponse | null>(null);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [dnsError, setDnsError] = useState('');
  const [showDns, setShowDns] = useState(false);

  const loadDns = useCallback(async () => {
    setDnsLoading(true);
    setDnsError('');
    try {
      const res = await api.getResendDns();
      setDnsData(res);
    } catch (err: any) {
      setDnsError(err.message || 'Não foi possível carregar os registros DNS.');
    } finally {
      setDnsLoading(false);
    }
  }, []);

  const handleVerify = useCallback(async () => {
    try {
      await api.triggerResendVerify();
    } catch (err: any) {
      setDnsError(err.message || 'Erro ao disparar verificação.');
    }
  }, []);

  // Carrega os registros DNS automaticamente se o Resend já estiver configurado
  useEffect(() => {
    if (hasResend && currentFromDomain) {
      loadDns();
      setShowDns(true);
    }
  }, [hasResend, currentFromDomain, loadDns]);

  useEffect(() => {
    if (currentFromDomain) {
      setFromDomain(currentFromDomain);
    }
  }, [currentFromDomain]);

  // Salvar apenas a API Key
  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setKeyError('Preencha a API Key para salvar.');
      return;
    }
    setSavingKey(true);
    setKeyError('');
    setKeySuccess('');

    try {
      const res = await api.updateResend({ resend_api_key: apiKey.trim() });
      setKeySuccess(res.message);
      setApiKey('');
      onSaved(); // Notifica parent para atualizar hasResend
    } catch (err: any) {
      setKeyError(err.message || 'Erro ao salvar a API Key.');
    } finally {
      setSavingKey(false);
    }
  };

  // Cadastrar/Salvar apenas o Domínio
  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDomain.trim()) {
      setDomainError('Preencha o domínio para cadastrar.');
      return;
    }
    setSavingDomain(true);
    setDomainError('');
    setDomainSuccess('');

    try {
      const res = await api.updateResend({ resend_from_domain: fromDomain.trim() });
      setDomainSuccess(res.message);
      onSaved(); // Notifica parent para atualizar domain
      setShowDns(true);
      // Recarrega os registros DNS após cadastrar
      setTimeout(() => loadDns(), 800);
    } catch (err: any) {
      setDomainError(err.message || 'Erro ao cadastrar domínio.');
    } finally {
      setSavingDomain(false);
    }
  };

  return (
    <div className="space-y-8">

      {/* ── Status Atual ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ opacity: 0.5 }}>
          Status Atual
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{
              background: hasResend ? 'var(--status-success-bg)' : 'var(--surface-hover)',
              border: `1px solid ${hasResend ? 'var(--status-success-border)' : 'var(--surface-border)'}`,
            }}
          >
            <span className="flex-shrink-0">
              {hasResend ? (
                <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ opacity: 0.6 }}>
                Integração Resend (API Key)
              </p>
              <p
                className="text-sm font-semibold"
                style={{ color: hasResend ? 'var(--status-success-text)' : 'var(--brand-text-color)' }}
              >
                {hasResend ? 'Chave salva de forma segura' : 'Não configurada'}
              </p>
            </div>
          </div>

          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--surface-border)' }}
          >
            <span className="flex-shrink-0">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ opacity: 0.6 }}>
                Domínio de Envio
              </p>
              <p className="text-sm font-semibold font-mono">
                {currentFromDomain ?? <span style={{ opacity: 0.45 }}>Não definido</span>}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CARD 1: Configurar API Key ────────────────────────────────── */}
      <Card className="p-5 md:p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ opacity: 0.7 }}>
          Passo 1: API Key do Resend
        </h3>
        <p className="text-xs" style={{ opacity: 0.65 }}>
          Insira sua API Key obtida no painel do Resend. A chave será guardada de forma segura e não será exibida novamente após salva.
        </p>

        <form onSubmit={handleSaveApiKey} className="space-y-4">
          <Input
            label="API Key do Resend"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasResend ? '••••••••••••••••••••••••••••••••' : 're_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
          />

          {keyError && (
            <div className="px-4 py-2.5 rounded-xl text-xs flex items-center gap-2" style={{ background: 'var(--status-error-bg)', border: '1px solid var(--status-error-border)', color: 'var(--status-error-text)' }}>
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{keyError}</span>
            </div>
          )}
          {keySuccess && (
            <div className="px-4 py-2.5 rounded-xl text-xs" style={{ background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', color: 'var(--status-success-text)' }}>
              {keySuccess}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingKey}
              className="px-6 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md disabled:opacity-50 border-none cursor-pointer"
              style={{ background: 'var(--brand-gradient)', color: 'var(--brand-contrast-color)' }}
            >
              {savingKey ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin text-current mr-1.5 inline" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Salvando Key...
                </>
              ) : 'Salvar API Key'}
            </button>
          </div>
        </form>
      </Card>

      {/* ── CARD 2: Configurar Domínio ────────────────────────────────── */}
      <Card className="p-5 md:p-6 space-y-4" style={{ opacity: hasResend ? 1 : 0.5, pointerEvents: hasResend ? 'auto' : 'none' }}>
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ opacity: 0.7 }}>
          Passo 2: Domínio de Envio
        </h3>
        <p className="text-xs" style={{ opacity: 0.65 }}>
          {!hasResend 
            ? 'Salve a API Key acima primeiro para liberar o cadastro de domínios.'
            : 'Digite o domínio que você deseja utilizar para envio. Nós faremos o cadastro dele automaticamente no seu painel Resend.'
          }
        </p>

        {hasResend && (
          <form onSubmit={handleSaveDomain} className="space-y-4">
            <Input
              label="Domínio de Envio"
              type="text"
              value={fromDomain}
              onChange={(e) => setFromDomain(e.target.value)}
              placeholder="exemplo.com.br"
              required
            />
            <p className="text-xs" style={{ opacity: 0.5, marginTop: -8 }}>
              E-mails serão enviados como <em>noreply@{fromDomain || 'exemplo.com.br'}</em>.
            </p>

            {domainError && (
              <div className="px-4 py-2.5 rounded-xl text-xs flex items-center gap-2" style={{ background: 'var(--status-error-bg)', border: '1px solid var(--status-error-border)', color: 'var(--status-error-text)' }}>
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{domainError}</span>
              </div>
            )}
            {domainSuccess && (
              <div className="px-4 py-2.5 rounded-xl text-xs" style={{ background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', color: 'var(--status-success-text)' }}>
                {domainSuccess}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingDomain}
                className="px-6 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md disabled:opacity-50 border-none cursor-pointer"
                style={{ background: 'var(--brand-gradient)', color: 'var(--brand-contrast-color)' }}
              >
                {savingDomain ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin text-current mr-1.5 inline" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Cadastrando...
                  </>
                ) : 'Cadastrar Domínio'}
              </button>
            </div>
          </form>
        )}
      </Card>

      {/* ── Verificação DNS (expansível) ──────────────────────────────── */}
      {hasResend && currentFromDomain && (
        <section className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setShowDns((v) => {
                if (!v && !dnsData) loadDns();
                return !v;
              });
            }}
            className="w-full flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all text-left bg-transparent border-none"
            style={{
              background: 'var(--surface-hover)',
              border: '1px solid var(--surface-border)',
              color: 'var(--brand-text-color)',
            }}
          >
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 text-indigo-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-bold">Registros DNS de Verificação</p>
                <p className="text-xs" style={{ opacity: 0.6 }}>
                  {dnsData
                    ? `${dnsData.records.filter((r) => r.status === 'verified').length}/${dnsData.records.length} registros verificados — domínio: ${dnsData.status}`
                    : 'Clique para ver os registros DNS de configuração'}
                </p>
              </div>
            </div>
            <span
              className="text-lg transition-transform duration-200"
              style={{ transform: showDns ? 'rotate(180deg)' : 'none' }}
            >
              ⌄
            </span>
          </button>

          {showDns && (
            <div
              className="p-4 md:p-6 rounded-xl"
              style={{
                background: 'var(--brand-card-bg-color)',
                border: '1px solid var(--surface-border)',
              }}
            >
              {dnsError ? (
                <div className="text-sm p-4 rounded-xl flex items-center gap-2" style={{ background: 'var(--status-error-bg)', border: '1px solid var(--status-error-border)', color: 'var(--status-error-text)' }}>
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{dnsError}</span>
                  <button onClick={loadDns} className="ml-3 underline text-xs hover:no-underline bg-transparent border-none cursor-pointer" style={{ color: 'inherit' }}>
                    Tentar novamente
                  </button>
                </div>
              ) : (
                <DnsVerifier
                  records={dnsData?.records ?? []}
                  domain={dnsData?.domain ?? currentFromDomain}
                  status={dnsData?.status ?? 'pending'}
                  loading={dnsLoading}
                  onRefresh={loadDns}
                  onVerify={handleVerify}
                />
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Guia Rápido ────────────────────────────────────────────────── */}
      <section className="p-4 rounded-xl space-y-2" style={{ background: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)' }}>
        <p className="text-sm font-bold" style={{ color: 'var(--brand-gradient-start)' }}>
          Como funciona a verificação
        </p>
        <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: 'var(--brand-text-color)', opacity: 0.75 }}>
          <li>
            Salve a API Key do Resend no <strong>Passo 1</strong>.
          </li>
          <li>
            Cadastre seu domínio de envio no <strong>Passo 2</strong> (ex: <code>ajstrategy.digital</code>). Ele será cadastrado automaticamente no Resend.
          </li>
          <li>
            Adicione os registros DNS gerados no seu provedor de domínio (ex: Cloudflare, GoDaddy).
          </li>
          <li>
            Clique em <strong>Verificar Agora</strong> para confirmar a ativação do domínio.
          </li>
        </ol>
      </section>
    </div>
  );
}
