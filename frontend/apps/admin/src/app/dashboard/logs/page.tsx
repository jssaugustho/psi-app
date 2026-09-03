'use client';

import React from 'react';
import { useLogsPage } from './useLogsPage';
import { FilterModal } from './FilterModal';
import { LogsTable } from './LogsTable';

export default function LogsPage() {
  const state = useLogsPage();

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-page-enter">
      {/* Header Padrão do App com Espaçamento Amplo em Relação à Tabela */}
      <div className="pb-1">
        <h1 className="text-2xl font-bold tracking-tight">Monitoramento e Logs do Sistema</h1>
        <p className="text-sm mt-1.5 opacity-60">
          Visualização, auditoria e logs unificados em tempo real do ecossistema.
        </p>
      </div>

      {/* Tabela de Logs com Header Unificado e Controles Alinhados */}
      <LogsTable {...state} />

      {/* Overlay de Filtros */}
      <FilterModal
        isOpen={state.isFilterModalOpen}
        onClose={() => state.setIsFilterModalOpen(false)}
        onApply={state.loadLogs}
        onReset={state.resetFilters}
        {...state}
      />
    </div>
  );
}
