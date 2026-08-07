'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api, User } from '@/lib/api';
import { Card, Button, Input, LoadingSpinner, Select } from '@psi/ui';
import { Link } from '@/components/Link';

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
const BackIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);
const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const EnvelopeIcon = () => (
  <svg className="w-5 h-5 mx-auto opacity-70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

// Helper para formatar data
function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
  } catch {
    return iso;
  }
}

// Modal de Preview de Email (similar ao do emails/page.tsx)
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

  const handleResend = async () => {
    setResending(true);
    setResendError('');
    setResendMessage('');
    try {
      const res = await api.resendEmailLog(log.id);
      setResendMessage(res.message || 'E-mail reenfileirado para envio com sucesso!');
      if (onResendSuccess) {
        onResendSuccess({ ...log, status: 'sent', error: null, sent_at: new Date().toISOString() });
      }
    } catch (err: any) {
      setResendError(err.message || 'Erro ao reenviar e-mail.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
      
      {/* Content Container */}
      <div
        className="relative glass-lg w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-scale-up"
        style={{
          color: 'var(--brand-text-color)',
        }}
      >
        {/* Top Header */}
        <div className="p-4 md:p-6 flex items-center justify-between border-b" style={{ borderColor: 'var(--surface-border)' }}>
          <div>
            <h3 className="text-base font-bold truncate max-w-md">{log.subject}</h3>
            <p className="text-xs opacity-60 mt-0.5">Destinatário: {log.to_email}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800/40 opacity-70 hover:opacity-100 transition-all cursor-pointer bg-transparent border-none"
            style={{ color: 'var(--brand-text-color)' }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-black/10">
          {/* Left panel: Iframe body preview */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden min-h-[300px]">
            <iframe
              ref={iframeRef}
              title="Email HTML Preview"
              className="w-full flex-1 border-none"
              srcDoc={log.html_body}
            />
          </div>

          {/* Right panel: Details & Actions */}
          <div
            className="w-full md:w-80 p-5 shrink-0 flex flex-col justify-between overflow-y-auto border-t md:border-t-0 md:border-l"
            style={{ borderColor: 'var(--surface-border)' }}
          >
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-45">ID do Log</span>
                <p className="font-mono text-xs opacity-75 truncate">{log.id}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-45">Template</span>
                <p className="font-medium">{log.template}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-45">Enviado em</span>
                <p className="text-xs opacity-75">{formatDateTime(log.created_at)}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-45">Status</span>
                <div className="mt-1">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border"
                    style={
                      log.status === 'sent'
                        ? {
                            background: 'var(--status-success-bg)',
                            color: 'var(--status-success-text)',
                            borderColor: 'var(--status-success-border)',
                          }
                      : {
                            background: 'var(--status-error-bg)',
                            color: 'var(--status-error-text)',
                            borderColor: 'var(--status-error-border)',
                          }
                    }
                  >
                    {log.status === 'sent' ? 'Sucesso' : 'Falha'}
                  </span>
                </div>
              </div>

              {log.error && (
                <div
                  className="p-3 rounded-xl border text-xs"
                  style={{
                    background: 'var(--status-error-bg)',
                    color: 'var(--status-error-text)',
                    borderColor: 'var(--status-error-border)',
                  }}
                >
                  <p className="font-bold">Erro reportado:</p>
                  <p className="mt-1 font-mono opacity-80 break-words">{log.error}</p>
                </div>
              )}

              {log.metadata && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-45">Metadados</span>
                  <div
                    className="p-3 rounded-xl border font-mono text-[10px] space-y-1 mt-1.5"
                    style={{
                      borderColor: 'var(--surface-border)',
                      background: 'rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    {log.metadata.device && <p><strong>Device:</strong> {log.metadata.device}</p>}
                    {log.metadata.ip && <p><strong>IP:</strong> {log.metadata.ip}</p>}
                    {log.metadata.loginAt && <p><strong>Data:</strong> {formatDateTime(log.metadata.loginAt)}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t space-y-2 mt-6" style={{ borderColor: 'var(--surface-border)' }}>
              {resendError && (
                <p className="text-xs text-center" style={{ color: 'var(--status-error-text)' }}>
                  {resendError}
                </p>
              )}
              {resendMessage && (
                <p className="text-xs text-center" style={{ color: 'var(--status-success-text)' }}>
                  {resendMessage}
                </p>
              )}
              
              <Button
                onClick={handleResend}
                disabled={resending}
                className="w-full flex items-center justify-center gap-2"
              >
                {resending ? 'Reenviando...' : 'Reenviar E-mail'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UserDetailPage({ params }: PageProps) {
  const { id } = React.use(params);
  const { user: currentUser } = useAuth();

  // Estados locais
  const [profile, setProfile] = useState<User | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [errorProfile, setErrorProfile] = useState('');
  
  // Edição
  const [editForm, setEditForm] = useState({
    nome: '',
    sobrenome: '',
    telefone: '',
    role: 'user',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [editError, setEditError] = useState('');

  // Modal email preview
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

  // Carregar perfil e logs do usuário
  const loadUserDetails = useCallback(async () => {
    setLoadingProfile(true);
    setErrorProfile('');
    try {
      const userRes = await api.getUser(id);
      setProfile(userRes);
      
      setEditForm({
        nome: userRes.nome || '',
        sobrenome: userRes.sobrenome || '',
        telefone: userRes.telefone || '',
        role: userRes.role || 'user',
      });

      // Busca logs de email baseados no email do perfil do usuário
      if (userRes.email) {
        const logs = await api.getUserEmailLogs(userRes.email);
        setEmailLogs(logs);
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados do usuário:', err);
      setErrorProfile(err.message || 'Erro ao obter informações do perfil.');
    } finally {
      setLoadingProfile(false);
    }
  }, [id]);

  useEffect(() => {
    if (currentUser) {
      loadUserDetails();
    }
  }, [currentUser, loadUserDetails]);

  // Salvar edições do perfil
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setSuccessMsg('');
    setEditError('');
    try {
      const updated = await api.updateUserProfile(id, editForm);
      setProfile(updated);
      setSuccessMsg('Dados do perfil salvos com sucesso!');
      
      // Limpa mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setEditError(err.message || 'Erro ao salvar alterações.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResendSuccessInPreview = (updatedLog: EmailLog) => {
    setEmailLogs((prev) => prev.map((log) => (log.id === updatedLog.id ? updatedLog : log)));
  };



  if (loadingProfile) {
    return <LoadingSpinner message="Carregando dados do usuário..." className="min-h-[50vh]" />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-page-enter">
        {/* Back and Page Header */}
        <div className="space-y-4">
          <Link
            href="/dashboard/users"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-70 hover:opacity-100 transition-all cursor-pointer"
            style={{ color: 'var(--brand-text-color)' }}
          >
            <BackIcon />
            <span>Voltar para Listagem</span>
          </Link>

          <div>
            <h1 className="text-2xl font-bold">Perfil do Usuário</h1>
            <p className="text-sm mt-1" style={{ opacity: 0.6 }}>
              Visualização detalhada e gerenciamento de permissões do usuário
            </p>
          </div>
        </div>

        {loadingProfile ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div
              className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
              style={{
                borderColor: 'color-mix(in srgb, var(--brand-gradient-start) 30%, transparent)',
                borderTopColor: 'var(--brand-gradient-start)',
              }}
            />
            <p className="text-sm" style={{ opacity: 0.6 }}>Buscando informações do usuário...</p>
          </div>
        ) : errorProfile ? (
          <div
            className="p-6 rounded-2xl text-center"
            style={{
              background: 'var(--status-error-bg)',
              border: '1px solid var(--status-error-border)',
              color: 'var(--status-error-text)',
            }}
          >
            <p className="font-bold">Usuário não encontrado</p>
            <p className="text-sm mt-1">{errorProfile}</p>
            <Link
              href="/dashboard/users"
              className="inline-block mt-4 px-4 py-2 rounded-xl text-xs font-bold uppercase bg-slate-800 text-white"
            >
              Voltar
            </Link>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Overview Card */}
            <div
              className="glass-md p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-center justify-between"
              style={{
                color: 'var(--brand-text-color)',
              }}
            >
              <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left min-w-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={`${profile.nome} Avatar`}
                    className="w-20 h-20 rounded-2xl object-cover shadow-lg shrink-0"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-extrabold shadow-lg shrink-0"
                    style={{
                      background: 'var(--brand-gradient)',
                      color: 'var(--brand-contrast-color)',
                    }}
                  >
                    {profile.nome?.[0]?.toUpperCase()}
                    {profile.sobrenome?.[0]?.toUpperCase()}
                  </div>
                )}

                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                    <h2 className="text-xl font-bold truncate">
                      {profile.nome} {profile.sobrenome}
                    </h2>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border shrink-0"
                      style={
                        profile.role === 'admin'
                          ? {
                              background: 'var(--status-success-bg)',
                              color: 'var(--status-success-text)',
                              borderColor: 'var(--status-success-border)',
                            }
                          : {
                              background: 'rgba(255,255,255,0.06)',
                              color: 'var(--brand-text-color)',
                              borderColor: 'rgba(255,255,255,0.1)',
                              opacity: 0.85,
                            }
                      }
                    >
                      {profile.role}
                    </span>
                  </div>

                  <p className="text-sm opacity-70 truncate">{profile.email}</p>
                  
                  {profile.telefone && (
                    <p className="text-xs opacity-55 font-mono leading-none">
                      {profile.telefone}
                    </p>
                  )}
                </div>
              </div>

              {/* Datas de Controle */}
              <div className="flex flex-col gap-2.5 text-xs opacity-60 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 md:pl-6 border-slate-700/50 shrink-0 font-medium">
                <p>
                  <strong>Criado em:</strong> {profile.created_at ? formatDateTime(profile.created_at) : '—'}
                </p>
                {profile.updated_at && (
                  <p>
                    <strong>Atualizado em:</strong> {formatDateTime(profile.updated_at)}
                  </p>
                )}
                <p>
                  <strong>ID:</strong> <span className="font-mono text-[10px]">{profile.id}</span>
                </p>
              </div>
            </div>

            {/* Content Split: Left Form, Right Logs */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Form de Edição */}
              <div className="md:col-span-5 space-y-6">
                <Card title="Gerenciamento de Cadastro">
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    {successMsg && (
                      <div
                        className="p-3 rounded-xl text-xs font-semibold"
                        style={{
                          background: 'var(--status-success-bg)',
                          color: 'var(--status-success-text)',
                          border: '1px solid var(--status-success-border)',
                        }}
                      >
                        {successMsg}
                      </div>
                    )}

                    {editError && (
                      <div
                        className="p-3 rounded-xl text-xs font-semibold"
                        style={{
                          background: 'var(--status-error-bg)',
                          color: 'var(--status-error-text)',
                          border: '1px solid var(--status-error-border)',
                        }}
                      >
                        {editError}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Nome"
                        value={editForm.nome}
                        onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                        required
                      />
                      <Input
                        label="Sobrenome"
                        value={editForm.sobrenome}
                        onChange={(e) => setEditForm({ ...editForm, sobrenome: e.target.value })}
                        required
                      />
                    </div>

                    <Input
                      label="Telefone"
                      value={editForm.telefone}
                      onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />

                    <div className="space-y-1.5 text-left">
                      <label className="block text-xs font-semibold uppercase tracking-wide opacity-65">
                        Role (Cargo de Acesso)
                      </label>
                      <Select
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        options={[
                          { value: 'user', label: 'User (Usuário Padrão)' },
                          { value: 'admin', label: 'Admin (Administrador Global)' },
                        ]}
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button type="submit" disabled={savingProfile} className="w-full">
                        {savingProfile ? 'Salvando...' : 'Salvar Detalhes'}
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>

              {/* Logs de E-mail */}
              <div className="md:col-span-7 space-y-6">
                <Card
                  title="Histórico de E-mails Transacionais"
                  subtitle="Últimas notificações enviadas a este usuário"
                >
                  {emailLogs.length === 0 ? (
                    <div className="text-center py-10 opacity-55 space-y-1">
                      <EnvelopeIcon />
                      <p className="text-sm font-semibold">Nenhum e-mail enviado</p>
                      <p className="text-xs">Não constam registros de e-mail transacional para {profile.email}.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                      {emailLogs.map((log) => (
                        <div
                          key={log.id}
                          className="glass-sm p-3.5 rounded-xl border flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between transition-colors hover:bg-slate-800/10"
                          style={{ borderColor: 'var(--surface-border)' }}
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate leading-tight">
                              {log.subject}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap text-xs opacity-60">
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-black/25">
                                {log.template}
                              </span>
                              <span>•</span>
                              <span>{formatDateTime(log.created_at)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-none border-slate-800">
                            {/* Badge */}
                            <span
                              className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border"
                              style={
                                log.status === 'sent'
                                  ? {
                                      background: 'var(--status-success-bg)',
                                      color: 'var(--status-success-text)',
                                      borderColor: 'var(--status-success-border)',
                                    }
                                  : {
                                      background: 'var(--status-error-bg)',
                                      color: 'var(--status-error-text)',
                                      borderColor: 'var(--status-error-border)',
                                    }
                              }
                            >
                              {log.status === 'sent' ? 'Enviado' : 'Falhou'}
                            </span>

                            <button
                              onClick={() => setSelectedLog(log)}
                              className="px-3 py-1.5 rounded-lg border border-slate-700/60 hover:bg-slate-800/40 text-xs font-semibold cursor-pointer bg-transparent transition-all"
                              style={{ color: 'var(--brand-text-color)' }}
                            >
                              Visualizar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        ) : null}

      {/* Preview modal de Email */}
      {selectedLog && (
        <EmailPreviewModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          onResendSuccess={handleResendSuccessInPreview}
        />
      )}
    </div>
  );
}
