'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBrand } from '@/context/BrandContext';
import { api, EmailCampaign } from '@/lib/api';
import { Card } from '@psi/ui';
import {
  Send,
  Plus,
  Trash2,
  Mail,
  Settings,
  ChevronRight,
  X,
  CheckCircle2,
  Globe,
  Key,
  Info,
  Edit2
} from 'lucide-react';

export default function EmailPage() {
  const { tenant, reloadBrand } = useBrand();
  const tenantId = tenant?.id;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const renderPortal = (content: React.ReactNode) => {
    if (!mounted || typeof document === 'undefined') return null;
    return createPortal(content, document.body);
  };

  // Estados locais
  const [activeTab, setActiveTab] = useState<'campaigns' | 'dns'>('campaigns');
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);

  // Formulário de Nova Campanha
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    subject: '',
    body: '',
  });

  // Formulário de DNS
  const [dnsForm, setDnsForm] = useState({
    emailDomain: '',
    resendApiKey: '',
  });
  const [dnsSaving, setDnsSaving] = useState(false);

  // Carregar dados de campanhas
  const loadCampaigns = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await api.getEmailCampaigns(tenantId);
      setCampaigns(res);
    } catch (err) {
      console.error('Erro ao buscar campanhas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [tenantId]);

  // Carregar valores de DNS do tenant na primeira exibição
  useEffect(() => {
    if (tenant) {
      setDnsForm({
        emailDomain: tenant.emailDomain || '',
        resendApiKey: tenant.resendApiKey || '',
      });
    }
  }, [tenant]);

  // Salvar configurações de e-mail/DNS do tenant
  const handleSaveDns = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setDnsSaving(true);
    try {
      await api.updateTenantBranding(tenantId, {
        emailDomain: dnsForm.emailDomain.trim() || null,
        resendApiKey: dnsForm.resendApiKey.trim() || null,
      });
      await reloadBrand();
      alert('Configurações de e-mail salvas com sucesso!');
    } catch (err) {
      alert('Erro ao salvar configurações de e-mail.');
    } finally {
      setDnsSaving(false);
    }
  };

  // Criar campanha
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    try {
      const res = await api.createEmailCampaign({
        tenant_id: tenantId,
        title: newCampaign.title.trim(),
        subject: newCampaign.subject.trim(),
        body: newCampaign.body.trim(),
        status: 'draft',
      });
      setCampaigns((prev) => [res, ...prev]);
      setIsCreateOpen(false);
      setNewCampaign({ title: '', subject: '', body: '' });
    } catch (err) {
      alert('Falha ao criar campanha');
    }
  };

  // Enviar campanha
  const handleSendCampaign = async (campaign: EmailCampaign) => {
    if (!confirm('Deseja enviar esta campanha agora para todos os contatos do CRM?')) return;

    try {
      // 1. Atualiza localmente
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, status: 'sent', sent_at: new Date().toISOString() } : c))
      );
      if (selectedCampaign?.id === campaign.id) {
        setSelectedCampaign({ ...selectedCampaign, status: 'sent', sent_at: new Date().toISOString() });
      }

      // 2. Salva status de envio no banco
      await api.updateEmailCampaign(campaign.id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

      alert('Campanha enviada com sucesso para a fila de e-mails!');
    } catch (err) {
      alert('Erro ao enviar campanha.');
      loadCampaigns(); // recarrega em caso de erro
    }
  };

  // Deletar campanha
  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Deseja excluir esta campanha permanentemente?')) return;

    try {
      await api.deleteEmailCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      setSelectedCampaign(null);
    } catch (err) {
      alert('Erro ao deletar campanha.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-page-enter">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Mail className="text-indigo-400" /> Campanhas de E-mail
          </h1>
          <p className="text-sm text-slate-400">
            Envie comunicados em massa e newsletters informativas com seu domínio próprio.
          </p>
        </div>

        {/* Alternador de Abas */}
        <div className="flex gap-1 p-1 rounded-2xl w-fit glass-sm self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('campaigns')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all border-none cursor-pointer hover:opacity-100"
            style={
              activeTab === 'campaigns'
                ? {
                    background: 'var(--brand-gradient)',
                    color: 'var(--brand-contrast-color)',
                    boxShadow: '0 2px 12px color-mix(in srgb, var(--brand-gradient-start) 25%, transparent)',
                  }
                : {
                    background: 'transparent',
                    color: 'var(--brand-text-color)',
                    opacity: 0.65,
                  }
            }
          >
            <Send className="w-3.5 h-3.5" /> Campanhas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dns')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all border-none cursor-pointer hover:opacity-100"
            style={
              activeTab === 'dns'
                ? {
                    background: 'var(--brand-gradient)',
                    color: 'var(--brand-contrast-color)',
                    boxShadow: '0 2px 12px color-mix(in srgb, var(--brand-gradient-start) 25%, transparent)',
                  }
                : {
                    background: 'transparent',
                    color: 'var(--brand-text-color)',
                    opacity: 0.65,
                  }
            }
          >
            <Settings className="w-3.5 h-3.5" /> Configurações DNS
          </button>
        </div>
      </div>

      {/* ABA DE CAMPANHAS */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-200">Suas Campanhas</h2>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-lg bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Nova Campanha
            </button>
          </div>

          {loading && campaigns.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
              Buscando suas campanhas...
            </div>
          ) : campaigns.length === 0 ? (
            <Card className="glass-md p-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto text-xl">
                ✉️
              </div>
              <h3 className="text-lg font-semibold text-slate-200">Nenhuma campanha criada</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                Crie comunicados, boletins de psicologia ou newsletters de acompanhamento clínico para estreitar laços com seus pacientes.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  onClick={() => setSelectedCampaign(campaign)}
                  className="glass-md p-5 rounded-2xl border-[var(--surface-border)] hover:bg-[var(--surface-hover)] cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          campaign.status === 'sent'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {campaign.status === 'sent' ? 'Enviado' : 'Rascunho'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-200 text-base leading-snug">{campaign.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      Assunto: <span className="text-slate-300 font-medium">{campaign.subject}</span>
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--surface-border)] text-xs text-indigo-400 group">
                    <span>Ver detalhes</span>
                    <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA DE DNS / DOMÍNIO WHITE-LABEL */}
      {activeTab === 'dns' && (
        <div className="space-y-6">
          {/* Formulário */}
          <form onSubmit={handleSaveDns} className="glass-md p-6 rounded-2xl space-y-5">
            <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-400" /> Identidade de Remetente Personalizada
            </h3>
            
            <p className="text-sm text-slate-400 leading-relaxed">
              Configure seu próprio domínio para que as mensagens psicoeducativas e lembretes sejam enviados a partir do seu e-mail profissional (ex: <code className="text-slate-300">contato@seuconsultorio.com</code>) em vez do endereço padrão da plataforma.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 flex items-center gap-1">
                  Domínio de Envio
                </label>
                <input
                  type="text"
                  value={dnsForm.emailDomain}
                  onChange={(e) => setDnsForm({ ...dnsForm, emailDomain: e.target.value })}
                  placeholder="mail.seuconsultorio.com.br"
                  className="glass-sm w-full px-4 py-2 text-sm rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 flex items-center gap-1">
                  Chave API Personalizada (Resend)
                  <span className="text-[10px] text-slate-500">(Opcional)</span>
                </label>
                <input
                  type="password"
                  value={dnsForm.resendApiKey}
                  onChange={(e) => setDnsForm({ ...dnsForm, resendApiKey: e.target.value })}
                  placeholder="re_xxxxxxxxxxxxxxxx"
                  className="glass-sm w-full px-4 py-2 text-sm rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={dnsSaving}
                className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-lg bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-55"
              >
                {dnsSaving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </form>

          {/* Instruções de DNS dinâmicas */}
          {dnsForm.emailDomain && (
            <div className="glass-md p-6 rounded-2xl space-y-4 animate-page-enter">
              <div className="flex items-center gap-2 border-b border-[var(--surface-border)] pb-3">
                <Info className="w-5 h-5 text-indigo-400" />
                <h4 className="font-semibold text-slate-200 text-sm">Registros DNS Necessários</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Acesse o provedor onde você comprou seu domínio (Cloudflare, Registro.br, GoDaddy, Hostgator) e adicione os seguintes apontamentos DNS:
              </p>

              {/* Tabela de DNS */}
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--surface-border)] text-slate-500 font-semibold">
                      <th className="py-2 pr-4">Tipo</th>
                      <th className="py-2 pr-4">Nome / Host</th>
                      <th className="py-2 pr-4">Valor / Conteúdo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300 font-mono">
                    <tr>
                      <td className="py-3 text-indigo-400 font-bold">TXT</td>
                      <td className="py-3 truncate max-w-[150px]">{dnsForm.emailDomain}</td>
                      <td className="py-3 text-slate-400 break-all">resend-verification=re_verification_key_hash</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-indigo-400 font-bold">TXT</td>
                      <td className="py-3 truncate max-w-[150px]">{dnsForm.emailDomain}</td>
                      <td className="py-3 text-slate-400">v=spf1 include:amazonses.com ~all</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-indigo-400 font-bold">CNAME</td>
                      <td className="py-3 truncate max-w-[150px]">resend._domainkey.{dnsForm.emailDomain}</td>
                      <td className="py-3 text-slate-400 break-all">{dnsForm.emailDomain}.dkim.resend.com</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-2 text-xs text-indigo-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  O processo de propagação de DNS pode demorar de 10 minutos a 24 horas. Após propagado, seus envios passarão a usar o remetente oficial da sua clínica.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL: DETALHES DA CAMPANHA */}
      {selectedCampaign && renderPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedCampaign(null)}
            className="absolute inset-0 cursor-pointer"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--brand-bg-color) 85%, transparent)',
            }}
          />

          <div className="brand-modal w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl relative z-10 animate-modal-enter">
            {/* Header */}
            <div className="p-6 border-b border-[var(--surface-border)] bg-slate-950/5 dark:bg-slate-950/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-400">
                  Visualização da Campanha
                </span>
                <h2 className="text-lg font-bold text-slate-100 leading-tight">{selectedCampaign.title}</h2>
              </div>
              <button onClick={() => setSelectedCampaign(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex justify-between border-b border-[var(--surface-border)] pb-2">
                  <span>Assunto:</span>
                  <span className="text-slate-200 font-semibold">{selectedCampaign.subject}</span>
                </div>
                <div className="flex justify-between border-b border-[var(--surface-border)] py-2">
                  <span>Status:</span>
                  <span
                    className={`font-semibold ${
                      selectedCampaign.status === 'sent' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {selectedCampaign.status === 'sent' ? 'Enviado' : 'Rascunho'}
                  </span>
                </div>
                {selectedCampaign.sent_at && (
                  <div className="flex justify-between border-b border-[var(--surface-border)] py-2">
                    <span>Enviado em:</span>
                    <span className="text-slate-300">
                      {new Date(selectedCampaign.sent_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>

              {/* Corpo do E-mail */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Conteúdo do E-mail</label>
                <div className="glass-sm p-4 rounded-xl text-sm text-slate-300 leading-relaxed font-sans whitespace-pre-wrap max-h-56 overflow-y-auto custom-scrollbar">
                  {selectedCampaign.body}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[var(--surface-border)] flex items-center justify-between bg-slate-950/5 dark:bg-slate-950/20">
              <button
                onClick={() => handleDeleteCampaign(selectedCampaign.id)}
                className="text-xs text-red-500 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir Rascunho
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="glass-sm px-4 py-2 text-xs text-slate-300 rounded-xl hover:bg-white/5 active:scale-95 transition-all"
                >
                  Fechar
                </button>
                {selectedCampaign.status === 'draft' && (
                  <button
                    onClick={() => handleSendCampaign(selectedCampaign)}
                    className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" /> Disparar E-mails
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR NOVA CAMPANHA */}
      {isCreateOpen && renderPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsCreateOpen(false)}
            className="absolute inset-0 cursor-pointer"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--brand-bg-color) 85%, transparent)',
            }}
          />

          <div className="brand-modal w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative z-10 animate-modal-enter">
            {/* Header */}
            <div className="p-6 border-b border-[var(--surface-border)] bg-slate-950/5 dark:bg-slate-950/20 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" /> Criar Nova Campanha
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleCreateCampaign} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Título Interno da Campanha *</label>
                <input
                  type="text"
                  required
                  value={newCampaign.title}
                  onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                  placeholder="Ex: Newsletter Saúde Mental Agosto"
                  className="glass-sm w-full px-3.5 py-2 text-sm rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Assunto do E-mail *</label>
                <input
                  type="text"
                  required
                  value={newCampaign.subject}
                  onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                  placeholder="Ex: 5 dicas práticas para reduzir a ansiedade diária"
                  className="glass-sm w-full px-3.5 py-2 text-sm rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Conteúdo do E-mail *</label>
                <textarea
                  rows={6}
                  required
                  value={newCampaign.body}
                  onChange={(e) => setNewCampaign({ ...newCampaign, body: e.target.value })}
                  placeholder="Olá [nome], no comunicado de hoje falaremos sobre..."
                  className="glass-sm w-full px-3.5 py-2 text-sm rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="glass-sm px-4 py-2 text-sm text-slate-300 rounded-xl hover:bg-white/5 active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-lg bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] hover:brightness-110 active:scale-95 transition-all"
                >
                  Criar Rascunho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
