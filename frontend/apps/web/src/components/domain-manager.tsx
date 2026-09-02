'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, Input, DnsInstructions } from '@psi/ui';


import {
  Globe,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { useRealtime } from '@/context/RealtimeContext';

export interface DomainManagerProps {
  tenantId?: string;
  subdomain: string;
  onSubdomainChange: (value: string) => void;
  customDomain: string;
  onCustomDomainChange: (value: string) => void;
  /** Modo de seleção ativo (subdomínio ou próprio) */
  domainMode?: 'subdomain' | 'custom' | 'path';
  onDomainModeChange?: (mode: 'subdomain' | 'custom' | 'path') => void;
  /** Se true, trava subdomínio e domínio próprio em leitura */
  readOnly?: boolean;
  /** Se true, trava apenas o subdomínio */
  readOnlySubdomain?: boolean;
  /** Se true, trava apenas o domínio próprio */
  readOnlyCustomDomain?: boolean;
  /** Se true, exibe o campo de Slug da página (utilizado no Wizard) */
  showSlugInput?: boolean;
  slug?: string;
  onSlugChange?: (value: string) => void;
  /** Status externo de disponibilidade de subdomínio */
  subdomainAvailable?: boolean | null;
  checkingSubdomain?: boolean;
  onCheckSubdomain?: (subdomain: string) => void;
  /** Se true, otimiza o layout para painéis laterais/sidebars de largura reduzida */
  compactMode?: boolean;
  className?: string;
}

export function DomainManager({
  tenantId,
  subdomain,
  onSubdomainChange,
  customDomain,
  onCustomDomainChange,
  domainMode = 'subdomain',
  onDomainModeChange,
  readOnly = false,
  readOnlySubdomain: propReadOnlySubdomain,
  readOnlyCustomDomain: propReadOnlyCustomDomain,
  showSlugInput = false,
  slug = '',
  onSlugChange,
  subdomainAvailable: externalSubdomainAvailable,
  checkingSubdomain: externalCheckingSubdomain,
  onCheckSubdomain,
  compactMode = false,
  className = '',
}: DomainManagerProps) {
  // DNS Modal, Accordion & Status States
  const [savedCustomDomain, setSavedCustomDomain] = useState<string>('');
  const [showDnsModal, setShowDnsModal] = useState(false);
  const [isDnsAccordionOpen, setIsDnsAccordionOpen] = useState(true);
  const [verifyingDns, setVerifyingDns] = useState(false);
  const [registeringCustom, setRegisteringCustom] = useState(false);
  const [domainVerified, setDomainVerified] = useState<boolean | null>(null);
  const [domainStatus, setDomainStatus] = useState<string>('pending');
  const [dnsRecords, setDnsRecords] = useState<Array<{ type: string; name: string; value: string; description: string; status?: string }>>([]);
  const [error, setError] = useState('');
  const [rateLimitMsg, setRateLimitMsg] = useState('');

  const [baseDomain, setBaseDomain] = useState(process.env.NEXT_PUBLIC_BASE_DOMAIN || 'theraos.app');

  // Inline edit toggle states
  const [forceEditSubdomain, setForceEditSubdomain] = useState(false);
  const [forceEditCustomDomain, setForceEditCustomDomain] = useState(false);

  // Internal Subdomain states if external handlers not provided
  const [internalCheckingSubdomain, setInternalCheckingSubdomain] = useState(false);
  const [internalSubdomainAvailable, setInternalSubdomainAvailable] = useState<boolean | null>(null);

  const isCheckingSubdomain = externalCheckingSubdomain !== undefined ? externalCheckingSubdomain : internalCheckingSubdomain;
  const isSubdomainAvailable = externalSubdomainAvailable !== undefined ? externalSubdomainAvailable : internalSubdomainAvailable;

  const isSubdomainLocked = (propReadOnlySubdomain !== undefined ? propReadOnlySubdomain : readOnly) && !forceEditSubdomain;
  const isCustomDomainLocked = (domainVerified === true || domainStatus === 'active' || domainStatus === 'verified') && Boolean(customDomain) && !forceEditCustomDomain;

  // Realtime — ouvir evento de domínio verificado automaticamente pela fila
  const { subscribe } = useRealtime();
  useEffect(() => {
    const unsubscribe = subscribe('domain', (event: any) => {
      if (event.action === 'verified' && event.data?.domain === customDomain) {
        setDomainVerified(true);
        setDomainStatus('active');
        setIsDnsAccordionOpen(false); // Recolhe acordeon se verificado
        if (event.data?.dnsRecords?.length > 0) {
          setDnsRecords(event.data.dnsRecords);
        }
      }
    });
    return unsubscribe;
  }, [subscribe, customDomain]);

  // Carregar estado DNS persistido no banco ao montar E consultar Cloudflare em background
  useEffect(() => {
    if (!tenantId) return;
    api.getWorkspaceDomain(tenantId)
      .then((record: any) => {
        if (!record || !record.customDomain) return;
        setSavedCustomDomain(record.customDomain);

        if (!customDomain) {
          onCustomDomainChange(record.customDomain);
        }
        if (record.dnsRecords && record.dnsRecords.length > 0) {
          setDnsRecords(record.dnsRecords as any);
        }
        if (record.dnsStatus) {
          setDomainStatus(record.dnsStatus);
          if (record.dnsStatus === 'active' || record.dnsStatus === 'verified') {
            setDomainVerified(true);
            setIsDnsAccordionOpen(false);
          } else {
            setIsDnsAccordionOpen(true);
          }
        }

        // Consulta de atualização na Cloudflare em background ao abrir a tela (rate-limited a 15s)
        api.verifyCustomHostname(record.customDomain, undefined, tenantId)
          .then((res) => {
            if (res.dnsRecords && res.dnsRecords.length > 0) {
              setDnsRecords(res.dnsRecords as any);
            }
            if (res.sslActive || res.status === 'active' || res.status === 'verified') {
              setDomainVerified(true);
              setDomainStatus('active');
              setIsDnsAccordionOpen(false);
            } else if (res.status && !res.rateLimited) {
              setDomainStatus(res.status);
            }
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, [tenantId]);




  useEffect(() => {
    api.getPlatformSetupStatus()
      .then((res) => {
        if (res.base_domain) setBaseDomain(res.base_domain);
      })
      .catch(() => {});
  }, []);

  // Internal subdomain availability checker
  const handleCheckSubdomain = useCallback(async (subToCheck: string) => {
    if (onCheckSubdomain) {
      onCheckSubdomain(subToCheck);
      return;
    }

    if (!subToCheck.trim()) {
      setInternalSubdomainAvailable(null);
      return;
    }
    setInternalCheckingSubdomain(true);
    try {
      const res = await api.checkSubdomainAvailability(subToCheck, tenantId);
      setInternalSubdomainAvailable(res.available);
    } catch {
      setInternalSubdomainAvailable(null);
    } finally {
      setInternalCheckingSubdomain(false);
    }
  }, [tenantId, onCheckSubdomain]);

  // Salvar Domínio & Registrar no Cloudflare
  const handleSaveCustomDomain = async () => {
    if (!customDomain.trim()) {
      setError('Digite o seu domínio próprio antes de salvar.');
      return;
    }
    setRegisteringCustom(true);
    setError('');
    setRateLimitMsg('');

    try {
      const res = await api.registerCustomHostname(null, customDomain.trim(), tenantId);
      const registeredDomain = res.hostname || customDomain.trim();
      setSavedCustomDomain(registeredDomain);

      if (res.dnsRecords && res.dnsRecords.length > 0) {
        setDnsRecords(res.dnsRecords as any);
      } else {
        setDnsRecords([]);
      }

      if (res.status === 'active' || res.status === 'verified') {
        setDomainVerified(true);
        setDomainStatus('active');
        setIsDnsAccordionOpen(false);
      } else {
        setDomainVerified(false);
        setDomainStatus(res.status || 'pending');
        setIsDnsAccordionOpen(true);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar domínio no Cloudflare.');
    } finally {
      setRegisteringCustom(false);
    }
  };



  // Verify Custom Domain DNS propagation (manual)
  const handleVerifyDomainDns = async () => {
    if (!customDomain.trim()) return;
    setVerifyingDns(true);
    setError('');
    setRateLimitMsg('');
    try {
      const res = await api.verifyCustomHostname(customDomain.trim(), undefined, tenantId);

      // Atualizar dnsRecords com status por registro (se retornado)
      if (res.dnsRecords && res.dnsRecords.length > 0) {
        setDnsRecords(res.dnsRecords as any);
      }

      if (res.rateLimited) {
        setRateLimitMsg(res.message || 'Aguarde antes de verificar novamente.');
      } else if (res.sslActive || res.status === 'active' || res.status === 'verified') {
        setDomainVerified(true);
        setDomainStatus('active');
        setIsDnsAccordionOpen(false);
      } else {
        setDomainVerified(false);
        setDomainStatus(res.status || 'pending');
        setIsDnsAccordionOpen(true);
      }
    } catch {
      setDomainVerified(false);
    } finally {
      setVerifyingDns(false);
    }
  };


  const activeDomainPrefix = customDomain.trim()
    ? customDomain.trim()
    : subdomain.trim()
    ? `${subdomain.trim()}.${baseDomain}`
    : `sua-clinica.${baseDomain}`;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Domínio Principal do Site */}
      <div className="space-y-4">
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider">
          1. Domínio Principal do Site
        </label>

        {/* MODO READ-ONLY SUBDOMÍNIO (SE A CONTA JÁ POSSUI SUBDOMÍNIO) */}
        {isSubdomainLocked && subdomain ? (
          <div className="p-5 rounded-2xl glass-sm border border-[var(--surface-border)] space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Subdomínio da Conta Configurado
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Endereço Global Cadastrado
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForceEditSubdomain(true)}
                  className="px-3 py-1 rounded-xl text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 border border-violet-500/20 transition-all cursor-pointer"
                >
                  Editar Subdomínio
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              O subdomínio pertence às configurações globais da sua conta e aplica-se a todas as suas páginas.
            </p>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/80 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Subdomínio TheraOS
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white block">
                  https://{subdomain}.{baseDomain}
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Ativo
              </span>
            </div>
          </div>
        ) : (
          /* MODO EDITÁVEL SUBDOMÍNIO */
          <div className="p-5 rounded-2xl glass-sm border border-[var(--surface-border)] space-y-4 shadow-sm">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Escolher Subdomínio Gratuito (Ex: minha-clinica.{baseDomain})
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
              <div className="flex items-center flex-1 min-w-0 rounded-xl overflow-hidden border border-[var(--surface-border)] bg-slate-100/60 dark:bg-black/30 shadow-sm focus-within:border-[var(--brand-gradient-start)] transition-all">
                <span className="h-10 px-3 flex items-center shrink-0 border-r border-[var(--surface-border)] text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-zinc-800/80 select-none whitespace-nowrap">
                  https://
                </span>
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    onSubdomainChange(val);
                  }}
                  placeholder="minha-clinica"
                  className="h-10 px-3 flex-1 min-w-[120px] bg-transparent text-xs font-mono text-slate-900 dark:text-white outline-none border-none placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                />
                <span className="h-10 px-3 flex items-center shrink-0 border-l border-[var(--surface-border)] text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-zinc-800/80 select-none whitespace-nowrap">
                  .{baseDomain}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCheckSubdomain(subdomain)}
                disabled={isCheckingSubdomain}
                className="h-10 px-4 rounded-xl border border-[var(--surface-border)] bg-slate-200/80 hover:bg-slate-300/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shrink-0 cursor-pointer transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {isCheckingSubdomain ? 'Verificando...' : 'Verificar'}
              </button>
            </div>

            {isSubdomainAvailable === true && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Subdomínio disponível!
              </p>
            )}
            {isSubdomainAvailable === false && (
              <p className="text-xs text-red-500 dark:text-red-400 font-bold flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> Subdomínio já em uso. Escolha outro nome.
              </p>
            )}
          </div>
        )}

        {/* DOMÍNIO PRÓPRIO (SE A CONTA JÁ POSSUI OU SE DESEJA CONECTAR) */}
        {isCustomDomainLocked && customDomain ? (
          /* MODO READ-ONLY DOMÍNIO PRÓPRIO */
          <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Domínio Próprio Customizado
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Verificado & Ativo
                </span>
                <button
                  type="button"
                  onClick={() => setForceEditCustomDomain(true)}
                  className="px-2 py-0.5 rounded text-[9px] font-bold text-violet-600 hover:text-white bg-violet-600/10 hover:bg-violet-600 border border-violet-600/20 transition-all cursor-pointer whitespace-nowrap"
                >
                  Editar Domínio
                </button>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white block truncate">
              https://{customDomain}
            </span>

            {/* Acordeon Inline no Modo Read-Only */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsDnsAccordionOpen(!isDnsAccordionOpen)}
                className="w-full px-3 py-2 rounded-xl flex items-center justify-between bg-slate-200/60 dark:bg-zinc-800/60 hover:bg-slate-200 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer border-none"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Ver Registros DNS de Apontamento
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  <span>{isDnsAccordionOpen ? 'Recolher' : 'Ver Registros'}</span>
                  {isDnsAccordionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isDnsAccordionOpen && (
                <div className="mt-3 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                  <DnsInstructions
                    domain={customDomain}
                    dnsRecords={dnsRecords}
                    baseDomain={baseDomain}
                    onVerifyDns={handleVerifyDomainDns}
                    isVerifying={verifyingDns}
                    showActions={false}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* EDITÁVEL DOMÍNIO PRÓPRIO */
          <div className="p-5 rounded-2xl glass-sm border border-[var(--surface-border)] space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Conectar Seu Domínio Próprio (Opcional - Ex: www.suaclinica.com.br)
              </label>

              {/* Status Badge */}
              {verifyingDns ? (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Verificando DNS...
                </span>
              ) : domainVerified === true || domainStatus === 'active' || domainStatus === 'verified' ? (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Domínio Verificado e Ativo!
                </span>
              ) : customDomain.trim() ? (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> Apontamento DNS Pendente
                </span>
              ) : null}
            </div>


            <Input
              type="text"
              value={customDomain}
              onChange={(e) => {
                onCustomDomainChange(e.target.value.toLowerCase());
                setDomainVerified(null);
              }}
              placeholder="Ex: www.geovannabastos.com.br"
              className="brand-input text-xs font-mono"
            />

            {/* Botões de Ação do Domínio Próprio */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={handleSaveCustomDomain}
                disabled={!customDomain.trim() || registeringCustom}
                className="h-9 px-4 rounded-xl bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {registeringCustom ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                <span>{registeringCustom ? 'Registrando no Cloudflare...' : 'Salvar Domínio'}</span>
              </button>

              <button
                type="button"
                onClick={handleVerifyDomainDns}
                disabled={!customDomain.trim() || verifyingDns}
                className="h-9 px-4 rounded-xl border border-[var(--surface-border)] bg-slate-200/80 hover:bg-slate-300/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${verifyingDns ? 'animate-spin' : ''}`} />
                <span>{verifyingDns ? 'Verificando...' : 'Checar Apontamento Agora'}</span>
              </button>
            </div>


            {error && (
              <p className="text-[11px] text-rose-500 dark:text-rose-400 font-bold flex items-center gap-1 pt-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
              </p>
            )}

            {rateLimitMsg && (
              <p className="text-[11px] text-amber-500 dark:text-amber-400 flex items-center gap-1 pt-1">
                <AlertCircle className="h-3 w-3 shrink-0" /> {rateLimitMsg}
              </p>
            )}

            {/* Acordeon Inline de Registros DNS — Exibe SOMENTE se o domínio estiver salvo e retornado da Cloudflare */}
            {Boolean(savedCustomDomain) && customDomain.trim().toLowerCase() === savedCustomDomain.toLowerCase() && dnsRecords.length > 0 && (

              <div className="mt-4 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden bg-slate-50/50 dark:bg-zinc-950/40 transition-all shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsDnsAccordionOpen(!isDnsAccordionOpen)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-slate-100/80 hover:bg-slate-200/80 dark:bg-zinc-900/80 dark:hover:bg-zinc-900 text-left transition-colors cursor-pointer border-none"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-violet-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Tabela de Instruções & Registros DNS (CNAME & TXT)
                    </span>
                    {domainVerified === true || domainStatus === 'active' || domainStatus === 'verified' ? (
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        ✓ Ativo
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        Apontamento Pendente
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    <span>{isDnsAccordionOpen ? 'Recolher Tabela' : 'Expandir Tabela'}</span>
                    {isDnsAccordionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isDnsAccordionOpen && (
                  <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                    <DnsInstructions
                      domain={customDomain.trim()}
                      dnsRecords={dnsRecords}
                      baseDomain={baseDomain}
                      onVerifyDns={handleVerifyDomainDns}
                      isVerifying={verifyingDns}
                      showActions={false}
                    />
                  </div>
                )}
              </div>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
              💡 Clique em <strong>Salvar Domínio</strong> para registrar o seu domínio e extrair os registros de apontamento diretamente da Cloudflare.
            </p>
          </div>
        )}
      </div>

      {/* 2. Endereço da Página no seu site (Caminho - Opcional para o Wizard) */}
      {showSlugInput && onSlugChange && (
        <div className="space-y-2.5 pt-3 border-t border-[var(--surface-border)]">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider">
            2. Endereço da Página no seu site (Caminho)
          </label>

          {compactMode ? (
            /* 2-Row Stack Layout for Narrow Sidebars */
            <div className="space-y-1.5">
              <div
                title={`https://${activeDomainPrefix}/`}
                className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800/80 px-2.5 py-1.5 rounded-xl border border-[var(--surface-border)] truncate select-all flex items-center gap-1.5 shadow-xs"
              >
                <Globe className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                <span className="truncate">https://{activeDomainPrefix}/</span>
              </div>

              <div className="flex items-center rounded-xl overflow-hidden border border-[var(--surface-border)] bg-slate-100/60 dark:bg-black/30 shadow-xs focus-within:border-[var(--brand-gradient-start)] transition-all">
                <span className="h-9 px-3 flex items-center shrink-0 border-r border-[var(--surface-border)] text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-200/80 dark:bg-zinc-800/50 select-none">
                  /
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    onSlugChange(val);
                  }}
                  placeholder="ex: terapia (ou deixe em branco)"
                  className="h-9 px-2.5 flex-1 w-full bg-transparent text-xs font-mono text-slate-900 dark:text-white outline-none border-none placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                />
              </div>

              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate pt-0.5">
                🔗 Link final: <span className="font-bold text-indigo-600 dark:text-indigo-400 select-all">https://{activeDomainPrefix}/{slug}</span>
              </p>
            </div>
          ) : (
            /* Single Row Layout for Wide Wizards */
            <>
              <div className="flex items-center flex-1 min-w-0 rounded-xl overflow-hidden border border-[var(--surface-border)] bg-slate-100/60 dark:bg-black/30 shadow-sm focus-within:border-[var(--brand-gradient-start)] transition-all">
                <span
                  title={`https://${activeDomainPrefix}/`}
                  className="h-10 px-2.5 flex items-center shrink min-w-0 max-w-[62%] border-r border-[var(--surface-border)] text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-zinc-800/80 select-none truncate"
                >
                  https://{activeDomainPrefix}/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    onSlugChange(val);
                  }}
                  placeholder="ex: terapia (ou deixe em branco)"
                  className="h-10 px-2.5 flex-1 min-w-[70px] bg-transparent text-xs font-mono text-slate-900 dark:text-white outline-none border-none placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                />
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                🔗 Link final: <span className="font-bold text-indigo-600 dark:text-indigo-400 select-all">https://{activeDomainPrefix}/{slug}</span>
              </p>
            </>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            💡 <strong>Deixe em branco</strong> para que esta seja a <strong>Página Principal (Home)</strong> do seu site, ou digite o nome que deseja usar no endereço (ex: terapia, consultas).
          </p>
        </div>
      )}
    </div>
  );
}

