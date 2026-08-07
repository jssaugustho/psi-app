'use client';

import React from 'react';
import { Users, FileText, Plus, UserPlus, ExternalLink } from 'lucide-react';

interface ContactNetworkPanelProps {
  contactId: string;
  patientName: string;
}

export function ContactNetworkPanel({ contactId, patientName }: ContactNetworkPanelProps) {
  return (
    <div className="space-y-4">
      {/* Bloco de Prontuários (Pacientes) */}
      <div className="glass-md rounded-2xl p-4 border border-[var(--surface-border)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--brand-gradient-start)]" />
            <h3 className="text-sm font-semibold text-slate-200">Prontuários Clínicos</h3>
          </div>
          <button
            onClick={() => alert('Lógica de criação de prontuários em desenvolvimento. Em breve você poderá vincular prontuários de múltiplos pacientes a este lead.')}
            className="flex items-center gap-1 text-[11px] font-semibold text-[var(--brand-gradient-start)] hover:brightness-110 active:scale-95 transition-all bg-transparent border-none cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Novo Paciente
          </button>
        </div>
        
        {/* Lista de prontuários (Mocked para demonstração) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-[var(--surface-border)] text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-medium text-slate-300">{patientName} (Principal)</span>
            </div>
            <button
              onClick={() => alert('Redirecionando para o prontuário do paciente (Em desenvolvimento)...')}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-all bg-transparent border-none cursor-pointer"
            >
              <span>Abrir</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        <p className="text-[10px] text-slate-500 mt-2">
          * Prontuários representam pacientes ativos. Um lead pode gerenciar múltiplos pacientes (ex: pais e filhos).
        </p>
      </div>

      {/* Bloco de Rede de Contatos */}
      <div className="glass-md rounded-2xl p-4 border border-[var(--surface-border)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--brand-gradient-start)]" />
            <h3 className="text-sm font-semibold text-slate-200">Rede Familiar / Casal</h3>
          </div>
          <button
            onClick={() => alert('Lógica de vínculo de contatos familiares em desenvolvimento. Em breve você poderá conectar este lead a outros membros da família.')}
            className="flex items-center gap-1 text-[11px] font-semibold text-[var(--brand-gradient-start)] hover:brightness-110 active:scale-95 transition-all bg-transparent border-none cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" /> Vincular Membro
          </button>
        </div>

        {/* Rede vazia com estado ilustrativo */}
        <div className="text-center py-4 rounded-xl border border-dashed border-[var(--surface-border)] bg-white/[0.01]">
          <Users className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
          <span className="text-[11px] text-slate-500 block">Nenhum membro da família ou casal vinculado.</span>
        </div>

        <p className="text-[10px] text-slate-500 mt-2">
          * Vincule leads para visualizar conexões em tratamentos de casal, família ou menores com responsáveis financeiros.
        </p>
      </div>
    </div>
  );
}
