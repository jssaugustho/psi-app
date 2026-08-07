'use client';

import React, { useState, useEffect } from 'react';
import { api, Contact, PipelineColumn, InteractionHistory } from '@/lib/api';
import { useRealtime } from '@/context/RealtimeContext';
import { ContactFieldsPanel } from './ContactFieldsPanel';
import { ContactNetworkPanel } from './ContactNetworkPanel';
import { Clock, Tag } from 'lucide-react';

interface ContactTabPanelProps {
  contact: Contact;
  columns: PipelineColumn[];
  sources: string[];
  tenantId: string;
}

export function ContactTabPanel({ contact, columns, sources, tenantId }: ContactTabPanelProps) {
  const [history, setHistory] = useState<InteractionHistory[]>([]);
  const [newComment, setNewComment] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);

  // Carregar histórico de interações quando o contato mudar
  useEffect(() => {
    setHistoryLoading(true);
    api
      .getInteractionHistory(contact.id)
      .then((res) => {
        setHistory(res);
      })
      .catch((err) => console.error('Erro ao buscar histórico:', err))
      .finally(() => setHistoryLoading(false));
  }, [contact.id]);

  // Escuta de histórico de interações em tempo real
  const { subscribe } = useRealtime();

  useEffect(() => {
    const unsubscribe = subscribe('interaction_history', (event) => {
      // Ignora se não for para o lead ativo
      const eventContactId = event.data.contact_id || event.data.contactId;
      if (eventContactId !== contact.id) return;

      if (event.action === 'created') {
        setHistory((prev) => {
          // Evita duplicar se já foi adicionado localmente pelo autor no formulário
          if (prev.some((h) => h.id === event.data.id)) return prev;
          return [event.data, ...prev];
        });
      }
    });

    return () => unsubscribe();
  }, [subscribe, contact.id]);

  // Adicionar comentário/interação
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !tenantId) return;

    try {
      const log = await api.createInteractionHistory({
        contact_id: contact.id,
        tenant_id: tenantId,
        type: 'comment',
        notes: newComment.trim(),
      });
      setHistory((prev) => [log, ...prev]);
      setNewComment('');
    } catch (err) {
      alert('Falha ao registrar nota');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-page-enter">
      {/* Coluna Esquerda: Cadastro + Contatos e Prontuários (7 colunas) */}
      <div className="lg:col-span-7 space-y-6">
        <ContactFieldsPanel
          contact={contact}
          columns={columns}
          sources={sources}
          tenantId={tenantId}
        />

        <ContactNetworkPanel
          contactId={contact.id}
          patientName={contact.name}
        />
      </div>

      {/* Coluna Direita: UTMs + Timeline (5 colunas) */}
      <div className="lg:col-span-5 space-y-6">
        {/* Parâmetros de Rastreamento (UTM) */}
        {(contact.utm_source || contact.utm_campaign) && (
          <div className="glass-md rounded-2xl p-4 border border-[var(--surface-border)] space-y-3 bg-white/[0.01]">
            <h4 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[var(--brand-gradient-start)]" /> Parâmetros de Campanha (UTM)
            </h4>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
              {contact.utm_source && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Source:</span>
                  <span className="text-slate-300 font-mono bg-white/5 px-1.5 py-0.5 rounded">{contact.utm_source}</span>
                </div>
              )}
              {contact.utm_medium && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Medium:</span>
                  <span className="text-slate-300 font-mono bg-white/5 px-1.5 py-0.5 rounded">{contact.utm_medium}</span>
                </div>
              )}
              {contact.utm_campaign && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Campaign:</span>
                  <span className="text-slate-300 font-mono bg-white/5 px-1.5 py-0.5 rounded">{contact.utm_campaign}</span>
                </div>
              )}
              {contact.utm_content && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Content:</span>
                  <span className="text-slate-300 font-mono bg-white/5 px-1.5 py-0.5 rounded">{contact.utm_content}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Linha do Tempo e Interações */}
        <div className="glass-md rounded-2xl p-4 border border-[var(--surface-border)] space-y-4 bg-white/[0.01]">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--brand-gradient-start)]" /> Linha do Tempo / Triagem
          </h3>

          {/* Formulário de Comentário */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Adicionar nota ou evolução..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="glass-sm flex-1 px-4 py-2 text-sm rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--brand-gradient-start)] bg-transparent"
            />
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-lg bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] hover:brightness-110 active:scale-95 transition-all border-none cursor-pointer"
            >
              Adicionar
            </button>
          </form>

          {/* Lista do Histórico */}
          {historyLoading ? (
            <div className="text-center text-xs text-slate-500 py-4">
              Carregando timeline...
            </div>
          ) : (
            <div className="relative max-h-[400px] overflow-y-auto custom-scrollbar">
              {history.length === 0 ? (
                <div className="text-center text-xs text-slate-600 py-4">
                  Nenhuma anotação registrada ainda.
                </div>
              ) : (
                <div className="relative border-l border-[var(--surface-border)] ml-4 pl-6 space-y-5">
                  {history.map((log) => (
                    <div key={log.id} className="relative group">
                      {/* Indicador na linha */}
                      <div className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--brand-bg-color, #09090b)] flex items-center justify-center text-[8px] ${
                        log.type === 'status_change' ? 'bg-[var(--brand-gradient-start)]' : 'bg-slate-700'
                      }`}>
                        {log.type === 'status_change' ? '⚡' : '✍️'}
                      </div>

                      {/* Metadados */}
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="font-semibold text-slate-400">
                          {log.type === 'status_change' ? 'Funil' : 'Nota Interna'}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(log.created_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Texto */}
                      <p className="mt-1 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {log.notes}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
