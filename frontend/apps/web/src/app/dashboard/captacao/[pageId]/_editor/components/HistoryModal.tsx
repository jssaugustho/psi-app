'use client';

import React from 'react';
import { HistoryEntry } from '../hooks/useEditorHistory';
import { X, Clock, History, CheckCircle2, RotateCcw } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: HistoryEntry[];
  currentIndex: number;
  onJumpToIndex: (index: number) => void;
}

export function HistoryModal({
  isOpen,
  onClose,
  entries,
  currentIndex,
  onJumpToIndex,
}: HistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card max-w-lg w-full rounded-2xl border border-[var(--surface-border)] shadow-2xl overflow-hidden flex flex-col bg-[var(--surface-base)] text-slate-900 dark:text-white max-h-[85vh]">
        {/* Header do Modal */}
        <div className="p-5 border-b border-[var(--surface-border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Histórico de Alterações da Sessão
              </h3>
              <p className="text-[11px] text-slate-500">
                Selecione qualquer ponto anterior para restaurar a página naquele momento.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Timeline do Histórico */}
        <div className="p-5 overflow-y-auto space-y-2.5 flex-1 custom-scrollbar">
          {entries.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Nenhuma alteração registrada nesta sessão.
            </div>
          ) : (
            entries.map((entry, idx) => {
              const isCurrent = idx === currentIndex;
              const formattedTime = new Date(entry.timestamp).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={entry.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'border-purple-500/40 bg-purple-500/10 dark:bg-purple-950/20 shadow-sm'
                      : 'border-[var(--surface-border)] bg-[var(--surface-hover)]/30 hover:border-purple-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                        isCurrent
                          ? 'bg-purple-600 text-white font-bold'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {entry.label}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-purple-500 text-white tracking-wider shrink-0">
                            Versão Atual
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formattedTime}</span>
                      </div>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => {
                        onJumpToIndex(idx);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[var(--surface-border)] hover:border-purple-500/40 text-slate-700 dark:text-slate-200 hover:text-purple-500 text-xs font-semibold hover:bg-purple-500/10 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restaurar
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-[var(--surface-border)] flex items-center justify-between glass-sm">
          <span className="text-[11px] text-slate-500">
            Total de {entries.length} registro(s) no histórico.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl brand-accent text-white text-xs font-semibold cursor-pointer shadow-sm hover:opacity-90"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
