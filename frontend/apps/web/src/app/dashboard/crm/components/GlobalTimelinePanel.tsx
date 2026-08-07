'use client';

import React, { useState, useEffect } from 'react';
import { api, InteractionHistory } from '@/lib/api';
import { useRealtime } from '@/context/RealtimeContext';
import { useCrmStore } from '@/stores/crmStore';
import { Clock, ArrowLeft, ExternalLink, Activity, AlertCircle } from 'lucide-react';

interface GlobalTimelinePanelProps {
  tenantId: string;
}

export function GlobalTimelinePanel({ tenantId }: GlobalTimelinePanelProps) {
  const [history, setHistory] = useState<InteractionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { contacts, openContactTab, setActiveContact } = useCrmStore();
  const { subscribe } = useRealtime();

  // Carregar histórico global inicial
  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    api
      .getGlobalInteractionHistory(tenantId)
      .then((res) => {
        setHistory(res);
      })
      .catch((err) => console.error('Erro ao buscar histórico global:', err))
      .finally(() => setLoading(false));
  }, [tenantId]);

  // Escuta em tempo real de novas interações no tenant
  useEffect(() => {
    if (!tenantId) return;

    const unsubscribe = subscribe('interaction_history', (event) => {
      const eventTenantId = event.data.tenant_id || event.data.tenantId;
      if (eventTenantId !== tenantId) return;

      if (event.action === 'created') {
        const logData = event.data;
        // Enriquecer com o nome do contato localmente se disponível
        const matchedContact = contacts.find((c) => c.id === logData.contact_id);
        const newLog: InteractionHistory = {
          ...logData,
          contact: matchedContact ? { name: matchedContact.name } : null,
        };

        setHistory((prev) => {
          if (prev.some((h) => h.id === newLog.id)) return prev;
          return [newLog, ...prev];
        });
      }
    });

    return () => unsubscribe();
  }, [subscribe, tenantId, contacts]);

  const handleOpenContact = (contactId: string) => {
    const contact = contacts.find((c) => c.id === contactId);
    if (contact) {
      openContactTab(contact, tenantId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Botão de Voltar / Título */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveContact(null, tenantId)}
          className="glass-sm p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-white/5 active:scale-95 transition-all border-none cursor-pointer"
          title="Voltar para o Funil"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            Histórico Geral de Alterações
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhe atualizações de funil, novas notas e movimentações em tempo real.
          </p>
        </div>
      </div>

      {/* Container Principal */}
      <div className="glass-md rounded-2xl p-6 border border-[var(--surface-border)] bg-white/[0.01]">
        {loading ? (
          <div className="text-center text-sm text-slate-500 py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <span>Carregando alterações...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center text-sm text-slate-600 py-12 flex flex-col items-center justify-center gap-2">
            <AlertCircle className="w-8 h-8 text-slate-700" />
            <span>Nenhuma alteração registrada no sistema ainda.</span>
          </div>
        ) : (
          <div className="relative max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            <div className="relative border-l border-[var(--surface-border)] ml-4 pl-6 space-y-6 py-2">
              {history.map((log) => {
                const isStatusChange = log.type === 'status_change';
                return (
                  <div key={log.id} className="relative group">
                    {/* Indicador na linha */}
                    <div
                      className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--brand-bg-color, #09090b)] flex items-center justify-center text-[8px] transition-all group-hover:scale-110 ${
                        isStatusChange ? 'bg-[var(--brand-gradient-start)]' : 'bg-slate-700'
                      }`}
                    >
                      {isStatusChange ? '⚡' : '✍️'}
                    </div>

                    {/* Conteúdo do Registro */}
                    <div className="glass-sm p-4 rounded-xl border border-[var(--surface-border)] bg-white/[0.005] hover:bg-white/[0.02] transition-all space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        {/* Tipo e Contato */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {isStatusChange ? 'Funil' : 'Nota Interna'}
                          </span>
                          <span className="text-slate-600 text-xs">•</span>
                          {log.contact?.name ? (
                            <button
                              onClick={() => handleOpenContact(log.contact_id)}
                              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline bg-transparent border-none p-0 cursor-pointer flex items-center gap-1"
                            >
                              {log.contact.name}
                              <ExternalLink className="w-3 h-3 inline" />
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Contato removido</span>
                          )}
                        </div>

                        {/* Data/Hora */}
                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-600" />
                          {new Date(log.created_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Nota/Descrição da alteração */}
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {log.notes}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
