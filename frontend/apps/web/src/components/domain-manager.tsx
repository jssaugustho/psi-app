'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, Input, LoadingSpinner, BrandModal, DnsInstructions } from '@psi/ui';
import {
  Globe,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  HelpCircle
} from 'lucide-react';

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
  // DNS Modal & Status States
  const [showDnsModal, setShowDnsModal] = useState(false);
  const [verifyingDns, setVerifyingDns] = useState(false);
  const [registeringCustom, setRegisteringCustom] = useState(false);
  const [domainVerified, setDomainVerified] = useState<boolean | null>(null);
  const [domainStatus, setDomainStatus] = useState<string>('pending');
  const [dnsRecords, setDnsRecords] = useState<Array<{ type: string; name: string; value: string; description: string }>>([]);
  const [error, setError] = useState('');

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

  // Fetch platform base domain on mount
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

  // Open DNS Setup Modal
  const handleOpenSetupModal = async () => {
    if (!customDomain.trim()) {
      setError('Digite o seu domínio próprio antes de abrir o setup.');
      return;
    }
    setRegisteringCustom(true);
    setError('');


    try {
      const res = await api.registerCustomHostname(null, customDomain.trim());
      if (res.dnsRecords && res.dnsRecords.length > 0) {
        setDnsRecords(res.dnsRecords);
      } else {
        const fallbackTarget = baseDomain && !baseDomain.includes('localhost') ? `custom.${baseDomain}` : 'custom.ajstrategy.digital';
        setDnsRecords([
          { type: 'CNAME', name: customDomain.trim().includes('.') ? customDomain.trim().split('.')[0] : '@', value: fallbackTarget, description: 'Apontamento CNAME do seu subdomínio para o servidor da plataforma' },
          { type: 'A', name: '@ (ou em branco)', value: '185.199.108.153', description: 'Endereço IP do servidor do site' }
        ]);
      }
      if (res.status === 'active' || res.status === 'verified') {
        setDomainVerified(true);
        setDomainStatus('active');
      }
      setShowDnsModal(true);
    } catch {
      const fallbackTarget = baseDomain && !baseDomain.includes('localhost') ? `custom.${baseDomain}` : 'custom.ajstrategy.digital';
      setDnsRecords([
        { type: 'CNAME', name: customDomain.trim().includes('.') ? customDomain.trim().split('.')[0] : '@', value: fallbackTarget, description: 'Apontamento CNAME do seu subdomínio para o servidor da plataforma' },
        { type: 'A', name: '@ (ou em branco)', value: '185.199.108.153', description: 'Endereço IP do servidor do site' }
      ]);
      setShowDnsModal(true);
    } finally {
      setRegisteringCustom(false);
    }
  };

  // Verify Custom Domain DNS propagation
  const handleVerifyDomainDns = async () => {
    if (!customDomain.trim()) return;
    setVerifyingDns(true);
    setError('');
    try {
      const res = await api.verifyCustomHostname(customDomain.trim());
      if (res.sslActive || res.status === 'active' || res.status === 'verified') {
        setDomainVerified(true);
        setDomainStatus('active');
      } else {
        setDomainVerified(false);
        setDomainStatus(res.status || 'pending');
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> Subdomínio da Conta Configurado
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Endereço Global Cadastrado
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setForceEditSubdomain(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-violet-600 hover:text-white bg-violet-600/10 hover:bg-violet-600 border border-violet-600/20 transition-all shadow-xs shrink-0 cursor-pointer"
                >
                  Editar Subdomínio
                </button>

                <a
                  href="/dashboard/configuracoes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-[var(--brand-gradient-start)] hover:text-white bg-[var(--brand-gradient-start)]/10 hover:bg-[var(--brand-gradient-start)] border border-[var(--brand-gradient-start)]/20 transition-all shadow-xs shrink-0"
                >
                  <span>Gerenciar nas Configurações</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              O subdomínio pertence às configurações globais da sua conta e aplica-se a todas as suas páginas. Para alterá-lo, acesse as configurações.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 space-y-1 max-w-md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Subdomínio TheraOS
                </span>
                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Ativo
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white block truncate">
                https://{subdomain}.{baseDomain}
              </span>
            </div>
          </div>
        ) : (
          /* EDITÁVEL SUBDOMÍNIO */
          <div className="p-4 rounded-xl glass-sm border border-[var(--surface-border)] space-y-3">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Nome do Subdomínio TheraOS
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
              <a
                href={`https://${subdomain || 'site'}.${baseDomain}`}
                target="_blank"
                rel="noreferrer"
                className="h-10 px-4 rounded-xl border border-[var(--surface-border)] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-semibold shrink-0 flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
              >
                <span>Abrir Seu Site Agora</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
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
          /* MODO READ-ONLY DOMÍNIO PRÓPRIO (SE A CONTA JÁ POSSUI DOMÍNIO REGISTRADO) */
          <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 space-y-1 max-w-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Domínio Próprio Customizado
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Conectado
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
          </div>
        ) : (
          /* EDITÁVEL DOMÍNIO PRÓPRIO (DISPONÍVEL MESMO QUE A CONTA TENHA SUBDOMÍNIO) */
          <div className="p-5 rounded-xl glass-sm border border-[var(--surface-border)] space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Conectar Seu Domínio Próprio (Opcional - Ex: www.suaclinica.com.br)
              </label>

              {/* Status Badge */}
              {verifyingDns ? (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                  <LoadingSpinner /> Verificando DNS...
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
                onClick={handleOpenSetupModal}
                disabled={!customDomain.trim() || registeringCustom}
                className="h-9 px-4 rounded-xl bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{registeringCustom ? 'Gerando Registros...' : '⚡ Configurar Registros DNS (Setup)'}</span>
              </button>

              <button
                type="button"
                onClick={handleVerifyDomainDns}
                disabled={!customDomain.trim() || verifyingDns}
                className="h-9 px-4 rounded-xl border border-[var(--surface-border)] bg-slate-200/80 hover:bg-slate-300/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Checar Apontamento Agora</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
              💡 Clique em <strong>Configurar Registros DNS</strong> para ver a tabela com as instruções de apontamento atualizadas e personalizadas para o seu provedor (Registro.br, GoDaddy, Cloudflare, etc.).
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

      {/* Modal de Instalação e Apontamento DNS */}
      <BrandModal
        isOpen={showDnsModal}
        onClose={() => setShowDnsModal(false)}
        maxWidth="max-w-xl"
      >
        <DnsInstructions
          domain={customDomain}
          dnsRecords={dnsRecords}
          baseDomain={baseDomain}
          onVerifyDns={handleVerifyDomainDns}
          isVerifying={verifyingDns}
          onClose={() => setShowDnsModal(false)}
        />
      </BrandModal>
    </div>
  );
}
