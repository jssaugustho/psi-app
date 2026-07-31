'use client';

/**
 * DnsVerifier — Componente reutilizável de verificação de registros DNS
 *
 * Pode ser usado em qualquer contexto onde registros DNS precisam ser
 * exibidos com status de verificação e botão de cópia:
 *
 *   import { DnsVerifier } from '@/components/dns-verifier';
 *
 * Props:
 *   - records:    DnsRecord[] — lista de registros a exibir (da API)
 *   - domain:     string — domínio que está sendo verificado
 *   - status:     string — status geral do domínio ('verified', 'pending', etc.)
 *   - onRefresh:  () => void | Promise<void> — chamado ao clicar em "Recarregar"
 *   - onVerify?:  () => void | Promise<void> — chamado ao clicar em "Verificar Agora"
 *   - loading?:   boolean — exibe skeleton enquanto carrega
 */

import React, { useState, useCallback } from 'react';
import { DnsRecord } from '@/lib/api';

// ── Mapeamento de tipo DNS → ícone ────────────────────────────────────────
const DNS_TYPE_ICON: Record<string, string> = {
  TXT: '📄',
  MX: '📬',
  CNAME: '🔗',
  A: '📍',
  AAAA: '📍',
};

// ── Status badges ─────────────────────────────────────────────────────────
type RecordStatus = 'verified' | 'failed' | 'not_started' | 'pending' | string;

interface StatusStyle {
  bg: string;
  border: string;
  color: string;
  label: string;
  icon: string;
}

function getStatusStyle(status: RecordStatus): StatusStyle {
  switch (status) {
    case 'verified':
      return {
        bg: 'var(--status-success-bg)',
        border: 'var(--status-success-border)',
        color: 'var(--status-success-text)',
        label: 'Verificado',
        icon: '✅',
      };
    case 'failed':
    case 'failure':
      return {
        bg: 'var(--status-error-bg)',
        border: 'var(--status-error-border)',
        color: 'var(--status-error-text)',
        label: 'Falhou',
        icon: '❌',
      };
    case 'pending':
      return {
        bg: 'var(--status-warning-bg)',
        border: 'var(--status-warning-border)',
        color: 'var(--status-warning-text)',
        label: 'Pendente',
        icon: '⏳',
      };
    default: // not_started
      return {
        bg: 'var(--surface-hover)',
        border: 'var(--surface-border)',
        color: 'var(--brand-text-color)',
        label: 'Aguardando',
        icon: '⬜',
      };
  }
}

// ── Botão de cópia ────────────────────────────────────────────────────────
function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback para browsers sem API de clipboard
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copiar ${label ?? 'valor'}`}
      className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none"
      style={
        copied
          ? {
              background: 'var(--status-success-bg)',
              color: 'var(--status-success-text)',
              border: '1px solid var(--status-success-border)',
            }
          : {
              background: 'var(--surface-active)',
              color: 'var(--brand-text-color)',
              border: '1px solid var(--surface-border)',
              opacity: 0.8,
            }
      }
    >
      {copied ? '✓ Copiado' : '⎘ Copiar'}
    </button>
  );
}

// ── Skeleton de carregamento ──────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-20 rounded-xl"
          style={{ background: 'var(--surface-hover)' }}
        />
      ))}
    </div>
  );
}

// ── Linha de registro DNS ─────────────────────────────────────────────────
function DnsRecordRow({ record }: { record: DnsRecord }) {
  const statusStyle = getStatusStyle(record.status);
  const typeIcon = DNS_TYPE_ICON[record.type] ?? '🌐';

  // Apenas o valor para cópia (a prioridade já é exibida e inserida em campo separado no provedor DNS)
  const copyValue = record.value;

  return (
    <div
      className="rounded-xl p-4 space-y-3 transition-all"
      style={{
        background: 'var(--surface-hover)',
        border: '1px solid var(--surface-border)',
      }}
    >
      {/* Linha 1: tipo + badge de status */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-base">{typeIcon}</span>
          <span
            className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase font-mono"
            style={{
              background: 'var(--surface-active)',
              border: '1px solid var(--surface-border)',
              color: 'var(--brand-text-color)',
            }}
          >
            {record.type}
          </span>
          <span className="text-xs font-semibold" style={{ color: 'var(--brand-text-color)', opacity: 0.75 }}>
            {record.record}
          </span>
          {record.priority != null && (
            <span className="text-xs" style={{ opacity: 0.45 }}>
              prioridade: {record.priority}
            </span>
          )}
        </div>

        {/* Badge de status */}
        <span
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{
            background: statusStyle.bg,
            border: `1px solid ${statusStyle.border}`,
            color: statusStyle.color,
          }}
        >
          {statusStyle.icon} {statusStyle.label}
        </span>
      </div>

      {/* Linha 2: Host */}
      <div className="space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ opacity: 0.45 }}>
          Host / Nome
        </span>
        <div className="flex items-center gap-2">
          <code
            className="flex-1 text-xs font-mono px-3 py-1.5 rounded-lg truncate"
            style={{
              background: 'var(--surface-input)',
              border: '1px solid var(--surface-border)',
              color: 'var(--brand-text-color)',
            }}
          >
            {record.name}
          </code>
          <CopyButton value={record.name} label="host" />
        </div>
      </div>

      {/* Linha 3: Valor */}
      <div className="space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ opacity: 0.45 }}>
          Valor {record.type === 'MX' ? `(prioridade ${record.priority})` : ''}
        </span>
        <div className="flex items-center gap-2">
          <code
            className="flex-1 text-xs font-mono px-3 py-1.5 rounded-lg break-all"
            style={{
              background: 'var(--surface-input)',
              border: '1px solid var(--surface-border)',
              color: 'var(--brand-text-color)',
            }}
          >
            {copyValue}
          </code>
          <CopyButton value={copyValue} label="valor" />
        </div>
      </div>

      {/* TTL */}
      <div className="text-[10px]" style={{ opacity: 0.4 }}>
        TTL: {record.ttl}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────
export interface DnsVerifierProps {
  records: DnsRecord[];
  domain: string;
  /** Status geral do domínio: 'verified' | 'pending' | 'not_started' | 'failure' */
  status: string;
  loading?: boolean;
  onRefresh: () => void | Promise<void>;
  onVerify?: () => void | Promise<void>;
}

export function DnsVerifier({
  records,
  domain,
  status,
  loading = false,
  onRefresh,
  onVerify,
}: DnsVerifierProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const domainStatus = getStatusStyle(status);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleVerify = async () => {
    if (!onVerify) return;
    setVerifying(true);
    try {
      await onVerify();
      // Após verificar, recarrega os registros para refletir novos status
      await onRefresh();
    } finally {
      setVerifying(false);
    }
  };

  const verifiedCount = records.filter((r) => r.status === 'verified').length;
  const totalCount = records.length;

  return (
    <div className="space-y-6">
      {/* ── Status Header ─────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-xl"
        style={{
          background: domainStatus.bg,
          border: `1px solid ${domainStatus.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{domainStatus.icon}</span>
          <div>
            <p className="text-sm font-bold" style={{ color: domainStatus.color }}>
              {domain}
            </p>
            <p className="text-xs" style={{ color: domainStatus.color, opacity: 0.8 }}>
              {domainStatus.label}
              {totalCount > 0 && ` — ${verifiedCount}/${totalCount} registros verificados`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botão Verificar Agora */}
          {onVerify && status !== 'verified' && (
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying || refreshing}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none disabled:opacity-50"
              style={{
                background: 'var(--brand-gradient)',
                color: 'var(--brand-contrast-color)',
              }}
            >
              {verifying ? '⏳ Verificando...' : '🔄 Verificar Agora'}
            </button>
          )}

          {/* Botão Recarregar */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || verifying}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            style={{
              background: 'var(--surface-active)',
              border: '1px solid var(--surface-border)',
              color: 'var(--brand-text-color)',
            }}
          >
            {refreshing ? '⏳ Recarregando...' : '↻ Recarregar'}
          </button>
        </div>
      </div>

      {/* ── Instrução ─────────────────────────────────────────────────── */}
      {status !== 'verified' && !loading && records.length > 0 && (
        <div
          className="p-4 rounded-xl text-xs space-y-1"
          style={{
            background: 'var(--status-info-bg)',
            border: '1px solid var(--status-info-border)',
            color: 'var(--brand-text-color)',
            opacity: 0.9,
          }}
        >
          <p className="font-bold">ℹ️ Como verificar seu domínio</p>
          <ol className="list-decimal list-inside space-y-0.5" style={{ opacity: 0.8 }}>
            <li>Acesse o painel de DNS do seu provedor (Cloudflare, Route53, Namecheap, etc.)</li>
            <li>Adicione cada registro abaixo exatamente como mostrado — use os botões <strong>Copiar</strong></li>
            <li>Aguarde a propagação do DNS (pode levar até 72h, mas geralmente minutos)</li>
            <li>Clique em <strong>Verificar Agora</strong> ou <strong>Recarregar</strong> para checar o status</li>
          </ol>
        </div>
      )}

      {/* ── Lista de Registros ─────────────────────────────────────────── */}
      {loading ? (
        <Skeleton />
      ) : records.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ opacity: 0.45 }}>
          Nenhum registro DNS disponível. Configure a API Key e o domínio do Resend primeiro.
        </p>
      ) : (
        <div className="space-y-3">
          {records.map((record, i) => (
            <DnsRecordRow key={`${record.type}-${record.record}-${i}`} record={record} />
          ))}
        </div>
      )}

      {/* Domínio verificado — mensagem de sucesso */}
      {status === 'verified' && !loading && (
        <div
          className="text-center py-6 space-y-2"
          style={{ color: 'var(--status-success-text)' }}
        >
          <div className="text-4xl">🎉</div>
          <p className="font-bold text-sm">Domínio verificado com sucesso!</p>
          <p className="text-xs" style={{ opacity: 0.7 }}>
            O Resend está autorizado a enviar e-mails pelo domínio <strong>{domain}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
