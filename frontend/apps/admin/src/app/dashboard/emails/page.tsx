'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { env } from '@/env';
import { LoadingSpinner, Select, BrandModal } from '@psi/ui';

// ── Tipos ─────────────────────────────────────────────────────────────────
interface EmailLog {
  id: string;
  to_email: string;
  subject: string;
  template: string;
  html_body: string;
  status: 'sent' | 'failed';
  error: string | null;
  metadata: {
    device?: string;
    ip?: string;
    loginAt?: string;
  } | null;
  sent_at: string;
  created_at: string;
}

// ── Ícones SVG ────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const StatusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const EnvelopeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);
const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const OfficeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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
const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);
const ChevronLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);
const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
  } catch { return iso; }
}

function templateLabel(template: string): string {
  const map: Record<string, string> = {
    login_notification: 'Notif. de Login',
  };
  return map[template] ?? template;
}

const PAGE_SIZE = 20;
// O PostgREST é exposto via Nginx conforme env.NEXT_PUBLIC_POSTGREST_URL
const POSTGREST_BASE = env.NEXT_PUBLIC_POSTGREST_URL;

async function fetchEmailLogs(
  token: string,
  opts: { page: number; status: string; template: string; search: string }
): Promise<{ logs: EmailLog[]; total: number }> {
  const offset = opts.page * PAGE_SIZE;
  const params = new URLSearchParams({
    select: '*',
    order: 'created_at.desc',
    limit: String(PAGE_SIZE),
    offset: String(offset),
  });
  if (opts.status) params.set('status', `eq.${opts.status}`);
  if (opts.template) params.set('template', `eq.${opts.template}`);
  if (opts.search) params.set('to_email', `ilike.*${opts.search}*`);

  const res = await fetch(`${POSTGREST_BASE}/email_logs?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'count=exact',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`PostgREST ${res.status}: ${body || res.statusText}`);
  }

  const logs = await res.json() as EmailLog[];
  // Content-Range: 0-19/42 — fallback para array.length se header ausente
  const contentRange = res.headers.get('Content-Range') ?? res.headers.get('content-range');
  const total = contentRange
    ? parseInt(contentRange.split('/')[1] ?? '0', 10) || logs.length
    : logs.length;
  return { logs, total };
}

// ── Modal de Preview ──────────────────────────────────────────────────────
function EmailPreviewModal({
  log,
  onClose,
  onResendSuccess,
}: {
  log: EmailLog;
  onClose: () => void;
  onResendSuccess?: (updatedLog: EmailLog) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState('');
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleResend = async () => {
    setResending(true);
    setResendError('');
    setResendMessage('');
    try {
      await api.resendEmailLog(log.id);
      setResendMessage('Reenviado com sucesso!');
      if (onResendSuccess) {
        onResendSuccess({
          ...log,
          status: 'sent',
          error: null,
          sent_at: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setResendError(err.message || 'Erro ao reenviar e-mail.');
    } finally {
      setResending(false);
    }
  };

  return (
    <BrandModal
      isOpen={true}
      onClose={onClose}
      maxWidth="max-w-5xl"
      className="overflow-hidden flex flex-col max-h-[90vh]"
    >
      {/* Modal Header */}
      <div
        className="flex items-center justify-between pb-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--surface-border)' }}
      >
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold" style={{ color: 'var(--brand-text-color)' }}>
            {log.subject}
          </h2>
          <p className="text-xs" style={{ color: 'var(--brand-text-color)', opacity: 0.5 }}>
            Para: {log.to_email} &nbsp;·&nbsp; {formatDate(log.sent_at)}
          </p>
        </div>
      </div>


        {/* Body: Split — iframe + metadata */}
        <div className="flex flex-1 overflow-hidden">
          {/* iframe preview */}
          <div className="flex-1 bg-white">
            <iframe
              ref={iframeRef}
              sandbox="allow-same-origin"
              srcDoc={log.html_body}
              className="w-full h-full border-0"
              style={{ minHeight: '500px' }}
              title="Email preview"
            />
          </div>

          {/* Metadata panel */}
          <div
            className="w-64 flex-shrink-0 p-5 space-y-4 overflow-y-auto flex flex-col justify-between"
            style={{
              borderLeft: '1px solid var(--surface-border)',
              color: 'var(--brand-text-color)',
            }}
          >
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ opacity: 0.5 }}>
                Detalhes
              </h3>

              <div className="space-y-3">
                {[
                  { label: 'Template', value: templateLabel(log.template) },
                  { label: 'Status', value: log.status === 'sent' ? 'Enviado' : 'Falhou' },
                  { label: 'Data de envio', value: formatDate(log.sent_at) },
                  ...(log.metadata?.device ? [{ label: 'Dispositivo', value: log.metadata.device }] : []),
                  ...(log.metadata?.ip ? [{ label: 'IP', value: log.metadata.ip }] : []),
                  ...(log.error ? [{ label: 'Erro', value: log.error }] : []),
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs font-medium mb-0.5" style={{ opacity: 0.5 }}>{label}</p>
                    <p className="text-xs break-words" style={{ lineHeight: '1.5' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Resend Action */}
            <div className="pt-4 border-t border-dashed mt-4" style={{ borderColor: 'var(--surface-border)' }}>
              <button
                onClick={handleResend}
                disabled={resending}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer border-none transition-all"
                style={{
                  background: 'var(--brand-gradient)',
                  color: 'var(--brand-contrast-color)',
                  opacity: resending ? 0.7 : 1,
                }}
              >
                {resending ? (
                  <>
                    <span className="w-3 h-3 rounded-full border border-t-transparent animate-spin inline-block" style={{ borderColor: 'var(--brand-contrast-color)', borderTopColor: 'transparent' }} />
                    Reenviando...
                  </>
                ) : (
                  <>
                    <RefreshIcon />
                    Reenviar E-mail
                  </>
                )}
              </button>
              {resendMessage && (
                <p className="text-xs mt-2 text-center text-emerald-400 font-medium">{resendMessage}</p>
              )}
              {resendError && (
                <p className="text-xs mt-2 text-center text-red-400 font-medium break-words">{resendError}</p>
              )}
            </div>
          </div>
        </div>
      </BrandModal>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────
export default function EmailsPage() {
  const { user } = useAuth();

  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [error, setError] = useState('');

  // Filtros
  const [statusFilter, setStatusFilter] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Preview modal
  const [previewLog, setPreviewLog] = useState<EmailLog | null>(null);

  const loadLogs = useCallback(async () => {
    if (!user) return;
    setLoadingLogs(true);
    setError('');
    try {
      const token = localStorage.getItem('token') ?? '';
      const { logs: data, total: count } = await fetchEmailLogs(token, {
        page, status: statusFilter, template: templateFilter, search,
      });
      setLogs(data);
      setTotal(count);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar e-mails.');
    } finally {
      setLoadingLogs(false);
    }
  }, [user, page, statusFilter, templateFilter, search]);

  useEffect(() => {
    if (user) loadLogs();
  }, [user, loadLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(0);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filterSelectStyle: React.CSSProperties = {
    color: 'var(--brand-text-color)',
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6 animate-page-enter">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">E-mails Transacionais</h1>
            <p className="text-sm mt-1" style={{ opacity: 0.6 }}>
              Acompanhe todos os e-mails enviados pela plataforma
            </p>
          </div>
          <button
            onClick={() => { setPage(0); loadLogs(); }}
            disabled={loadingLogs}
            className="glass-sm flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border-none"
            style={{
              color: 'var(--brand-text-color)',
            }}
          >
            <span className={loadingLogs ? 'animate-spin' : ''}><RefreshIcon /></span>
            Atualizar
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total de E-mails', value: total, color: 'var(--brand-gradient-start)' },
            { label: 'Enviados', value: logs.filter(l => l.status === 'sent').length, color: '#10B981' },
            { label: 'Com falha', value: logs.filter(l => l.status === 'failed').length, color: '#EF4444' },
          ].map(stat => (
            <div
              key={stat.label}
              className="glass-md rounded-2xl p-5"
            >
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs mt-1" style={{ opacity: 0.55 }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div
          className="glass-md rounded-2xl p-4"
        >
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-48">
              <div
                className="glass-sm flex items-center gap-2 flex-1 rounded-xl px-3 py-2"
              >
                <span style={{ opacity: 0.4, color: 'var(--brand-text-color)' }}><SearchIcon /></span>
                <input
                  type="text"
                  placeholder="Buscar por e-mail destinatário…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm"
                  style={{ color: 'var(--brand-text-color)' }}
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer border-none transition-all"
                style={{
                  background: 'var(--brand-gradient)',
                  color: 'var(--brand-contrast-color)',
                }}
              >
                Buscar
              </button>
            </form>

            {/* Status filter */}
            {/* Status filter */}
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              options={[
                { value: '', label: 'Todos os status' },
                { value: 'sent', label: 'Enviados' },
                { value: 'failed', label: 'Com falha' },
              ]}
              variant="glass"
              className="min-w-[150px]"
            />

            {/* Template filter */}
            <Select
              value={templateFilter}
              onChange={(e) => { setTemplateFilter(e.target.value); setPage(0); }}
              options={[
                { value: '', label: 'Todos os templates' },
                { value: 'login_notification', label: 'Notif. de Login' },
              ]}
              variant="glass"
              className="min-w-[170px]"
            />

            {(search || statusFilter || templateFilter) && (
              <button
                onClick={() => {
                  setSearch(''); setSearchInput('');
                  setStatusFilter(''); setTemplateFilter(''); setPage(0);
                }}
                className="text-xs px-3 py-2 rounded-lg cursor-pointer border-none transition-all"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  color: '#F87171',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div
          className="glass-md rounded-2xl overflow-hidden"
        >
          {error && (
            <div className="p-6 text-center" style={{ color: '#F87171' }}>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!error && (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    {['Para', 'Assunto', 'Template', 'Status', 'Data de envio'].map((col) => (
                      <th
                        key={col}
                        className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                        style={{ opacity: 0.5, color: 'var(--brand-text-color)' }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingLogs && (
                    <tr>
                      <td colSpan={5}>
                        <LoadingSpinner message="Buscando e-mails..." className="py-12" />
                      </td>
                    </tr>
                  )}

                  {!loadingLogs && logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3" style={{ opacity: 0.4, color: 'var(--brand-text-color)' }}>
                          <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                          </svg>
                          <p className="text-sm">Nenhum e-mail encontrado</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!loadingLogs && logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setPreviewLog(log)}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid var(--surface-border)' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface-glass)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                      }}
                    >
                      <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--brand-text-color)' }}>
                        {log.to_email}
                      </td>
                      <td className="px-5 py-3.5 text-sm max-w-xs truncate" style={{ color: 'var(--brand-text-color)', opacity: 0.8 }}>
                        {log.subject}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="text-xs px-2.5 py-1 rounded-full font-medium"
                          style={{
                            background: 'var(--surface-glass)',
                            border: '1px solid var(--surface-border)',
                            color: 'var(--brand-text-color)',
                          }}
                        >
                          {templateLabel(log.template)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="text-xs px-2.5 py-1 rounded-full font-semibold"
                          style={
                            log.status === 'sent'
                              ? { background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }
                              : { background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }
                          }
                        >
                          {log.status === 'sent' ? 'Enviado' : 'Falhou'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--brand-text-color)', opacity: 0.6 }}>
                        {formatDate(log.sent_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loadingLogs && totalPages > 1 && (
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderTop: '1px solid var(--surface-border)', color: 'var(--brand-text-color)' }}
            >
              <p className="text-xs" style={{ opacity: 0.5 }}>
                Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="glass-sm p-1.5 rounded-lg cursor-pointer border-none transition-all disabled:opacity-30"
                  style={{ color: 'var(--brand-text-color)' }}
                >
                  <ChevronLeftIcon />
                </button>
                <span className="text-xs px-2">{page + 1} / {totalPages}</span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="glass-sm p-1.5 rounded-lg cursor-pointer border-none transition-all disabled:opacity-30"
                  style={{ color: 'var(--brand-text-color)' }}
                >
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewLog && (
        <EmailPreviewModal
          log={previewLog}
          onClose={() => setPreviewLog(null)}
          onResendSuccess={(updated) => {
            setPreviewLog(updated);
            loadLogs();
          }}
        />
      )}
    </>
  );
}
