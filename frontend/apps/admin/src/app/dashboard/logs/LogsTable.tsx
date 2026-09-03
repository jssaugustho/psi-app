'use client';

import React from 'react';
import Link from 'next/link';
import { Card, Button, LoadingSpinner } from '@psi/ui';
import { ErrorLog } from '@/lib/api';

interface LogsTableProps {
  logs: ErrorLog[];
  total: number;
  loadingInitial: boolean;
  loadingMore: boolean;
  error: string;
  activeFiltersCount: number;
  setIsFilterModalOpen: (open: boolean) => void;
  isRealtimeActive: boolean;
  setIsRealtimeActive: (active: boolean) => void;
  isConnected: boolean;
  hasNewChanges: boolean;
  pendingLogsCount: number;
  loadLogs: () => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  totalHeight: number;
  visibleRows: Array<{ log: ErrorLog; offset: number; height: number }>;
  setUserId: (v: string) => void;
  setSessionId: (v: string) => void;
  setRequestId: (v: string) => void;
  setClientApp: (v: string) => void;
  setUserRole: (v: string) => void;
}

export function LogsTable({
  logs,
  total,
  loadingInitial,
  loadingMore,
  error,
  activeFiltersCount,
  setIsFilterModalOpen,
  isRealtimeActive,
  setIsRealtimeActive,
  isConnected,
  hasNewChanges,
  pendingLogsCount,
  loadLogs,
  expandedIds,
  toggleExpand,
  containerRef,
  handleScroll,
  totalHeight,
  visibleRows,
  setUserId,
  setSessionId,
  setRequestId,
  setClientApp,
  setUserRole,
}: LogsTableProps) {
  const [copiedStackId, setCopiedStackId] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedStackId(id);
      setTimeout(() => setCopiedStackId(null), 2000);
    }
  };

  return (
    <Card className="p-0 overflow-hidden shadow-sm border-brand-divider">
      {/* Header Unificado da Tabela com Controles no Padrão da Plataforma */}
      <div className="px-6 py-3.5 border-b border-brand-divider flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-bold tracking-tight">Logs do Sistema</h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-black/5 dark:bg-white/10 opacity-70">
            {total}
          </span>
        </div>

        {/* Linha de Botões e Controles */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Status do WebSocket */}
          <div
            title={isConnected ? 'WebSocket Conectado' : 'Reconectando WebSocket...'}
            className="h-9 px-3 flex items-center gap-2 rounded-xl border border-brand-divider text-xs font-mono bg-black/5 dark:bg-white/5 shrink-0"
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="opacity-75 font-sans text-xs">{isConnected ? 'Conectado' : 'Reconectando'}</span>
          </div>

          {/* Botão de Filtros */}
          <Button
            onClick={() => setIsFilterModalOpen(true)}
            variant={activeFiltersCount > 0 ? 'primary' : 'secondary'}
            className="!h-9 !px-3.5 !py-0 flex items-center justify-center gap-2 text-xs font-medium shrink-0"
            title="Abrir filtros de busca"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/20">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          {/* Botão Icon-Only: Realtime Stream Toggle */}
          <Button
            onClick={() => setIsRealtimeActive(!isRealtimeActive)}
            variant={isRealtimeActive ? 'primary' : 'secondary'}
            className="!h-9 !w-9 !p-0 flex items-center justify-center shrink-0"
            title={isRealtimeActive ? 'Transmissão Ao Vivo (Clique para pausar)' : 'Transmissão Pausada (Clique para retomar)'}
          >
            {isRealtimeActive ? (
              <svg className="w-4 h-4 shrink-0 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </Button>

          {/* Botão Icon-Only: Refresh (Ícone moderno RefreshCw) */}
          <Button
            onClick={loadLogs}
            variant={hasNewChanges ? 'primary' : 'secondary'}
            className="!h-9 !w-9 !p-0 flex items-center justify-center relative shrink-0"
            title="Atualizar Logs"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 00-9-9 9.75 9.75 0 00-6.74 2.74L3 8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v5h5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 009 9 9.75 9.75 0 006.74-2.74L21 16" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 21h5v-5" />
            </svg>
            {hasNewChanges && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white animate-pulse">
                {pendingLogsCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Sub-Header de Colunas Alinhado em Grid Perfeito com as Linhas da Tabela */}
      <div className="px-6 py-2.5 border-b border-brand-divider grid grid-cols-[20px_125px_85px_80px_65px_70px_140px_1fr_75px] gap-3 items-center text-[11px] font-semibold opacity-50 font-mono select-none bg-black/5 dark:bg-white/5">
        <span className="text-center">#</span>
        <span>DATA / HORA</span>
        <span>SERVIÇO</span>
        <span>APP</span>
        <span>TIPO</span>
        <span>SEVERIDADE</span>
        <span>NOME / EVENTO</span>
        <span>MENSAGEM</span>
        <span className="hidden md:inline">USUÁRIO</span>
      </div>

      {/* Lista Virtualizada Interna com Scroll Próprio Customizado (custom-scrollbar) */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="max-h-[calc(100vh-310px)] min-h-[350px] overflow-y-auto custom-scrollbar font-mono text-[13px] relative select-text"
      >
        {loadingInitial ? (
          <div className="p-12 flex flex-col items-center justify-center bg-black/5 dark:bg-black/20 gap-3">
            <LoadingSpinner />
            <span className="text-xs opacity-70 font-sans">Carregando logs do banco de dados...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 font-sans">
            <p className="font-bold">Falha ao carregar os logs:</p>
            <p className="text-xs mt-1 font-mono">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center opacity-50 font-sans">
            Nenhum registro de log encontrado com os filtros selecionados.
          </div>
        ) : (
          <div style={{ height: `${totalHeight}px`, width: '100%', position: 'relative' }}>
            {visibleRows.map((row) => {
              const isExpanded = expandedIds.has(row.log.id);

              const dateStr = new Date(row.log.createdAt).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              const typeColor =
                row.log.type === 'error' ? 'text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10' :
                row.log.type === 'audit' ? 'text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10' :
                row.log.type === 'info' ? 'text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-500/10' :
                row.log.type === 'system' ? 'text-teal-600 dark:text-teal-400 border-teal-500/30 bg-teal-500/10' :
                row.log.type === 'dlq' ? 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10' :
                row.log.type === 'warn' ? 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10' :
                'text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10';

              const sevColor =
                row.log.severity === 'fatal' ? 'text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10' :
                row.log.severity === 'warning' || row.log.severity === 'warn' ? 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10' :
                row.log.severity === 'info' ? 'text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-500/10' :
                row.log.severity === 'debug' ? 'text-slate-600 dark:text-slate-400 border-slate-500/30 bg-slate-500/10' :
                'text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10';

              const serviceColor =
                row.log.serviceName === 'postgres' ? 'text-teal-600 dark:text-teal-400' :
                row.log.serviceName === 'gotrue' ? 'text-blue-600 dark:text-blue-400' :
                row.log.serviceName === 'postgrest' ? 'text-indigo-600 dark:text-indigo-400' :
                row.log.serviceName === 'workers' ? 'text-amber-600 dark:text-amber-400' :
                row.log.serviceName === 'frontend' ? 'text-pink-600 dark:text-pink-400' :
                'text-emerald-600 dark:text-emerald-400';

              const appColor =
                row.log.clientApp === 'admin' ? 'text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10' :
                row.log.clientApp === 'web' ? 'text-cyan-600 dark:text-cyan-400 border-cyan-500/30 bg-cyan-500/10' :
                row.log.clientApp === 'sites' ? 'text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10' :
                row.log.clientApp === 'workers' ? 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10' :
                row.log.clientApp === 'core-api' ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                'text-slate-500 border-slate-500/20 bg-slate-500/10';

              const roleLabelMap: Record<string, string> = {
                admin: 'ADMINISTRADOR',
                psychologist: 'PSICÓLOGO',
                collaborator: 'COLABORADOR',
                anon: 'VISITANTE / ANON',
              };

              const workerName = (row.log.metadata as any)?.workerName;

              return (
                <div
                  key={row.log.id}
                  style={{
                    position: 'absolute',
                    top: `${row.offset}px`,
                    left: 0,
                    width: '100%',
                    height: `${row.height}px`,
                  }}
                  className="border-b border-brand-divider overflow-hidden"
                >
                  {/* Linha da Tabela (Header Alinhado no Mesmo Grid) */}
                  <div
                    onClick={() => toggleExpand(row.log.id)}
                    className={`px-6 py-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 select-none transition-colors grid grid-cols-[20px_125px_85px_80px_65px_70px_140px_1fr_75px] gap-3 items-center ${
                      isExpanded ? 'bg-black/5 dark:bg-white/5 border-l-2 border-brand-primary' : ''
                    }`}
                  >
                    <span className="opacity-40 text-center">
                      {isExpanded ? '▼' : '►'}
                    </span>

                    <span className="opacity-60 truncate">{dateStr}</span>

                    <span className={`font-semibold truncate ${serviceColor}`}>
                      [{row.log.serviceName}]
                    </span>

                    <span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border inline-block uppercase truncate max-w-full ${appColor}`}>
                        {row.log.clientApp || 'unknown'}
                      </span>
                    </span>

                    <span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border inline-block uppercase ${typeColor}`}>
                        {row.log.type || 'ERROR'}
                      </span>
                    </span>

                    <span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border inline-block uppercase ${sevColor}`}>
                        {row.log.severity.toUpperCase()}
                      </span>
                    </span>

                    <span className="font-semibold truncate" title={row.log.name || 'system.event'}>
                      {row.log.name || 'system.event'}
                    </span>

                    <span className="opacity-80 truncate" title={row.log.message}>
                      {row.log.message}
                    </span>

                    {row.log.userId ? (
                      <span className="text-[11px] opacity-60 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded font-mono truncate hidden md:inline">
                        {row.log.userId.substring(0, 8)}...
                      </span>
                    ) : (
                      <span className="text-[11px] opacity-40 italic hidden md:inline">
                        Anon
                      </span>
                    )}
                  </div>

                  {/* Conteúdo Expandido com scrollbar customizada própria e cores adaptativas do tema */}
                  {isExpanded && (
                    <div className="px-6 py-4 bg-black/[0.03] dark:bg-white/[0.02] border-t border-b border-brand-divider text-xs overflow-y-auto custom-scrollbar max-h-[calc(100%-54px)] select-text space-y-4 transition-colors">
                      {/* Grid de Informações Principais em Cards Embutidos */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Card: Detalhes do Evento */}
                        <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-brand-divider shadow-xs">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-3 flex items-center gap-1.5">
                            <span>📋</span> DETALHES DO EVENTO
                          </h4>
                          <table className="w-full text-left font-mono text-xs">
                            <tbody>
                              <tr>
                                <td className="opacity-60 font-medium pr-4 pb-2 w-28">Data / Hora:</td>
                                <td className="opacity-90 font-semibold pb-2">{dateStr}</td>
                              </tr>
                              <tr>
                                <td className="opacity-60 font-medium pr-4 pb-2">Log ID:</td>
                                <td className="opacity-90 pb-2 select-all font-semibold break-all">{row.log.id}</td>
                              </tr>
                              <tr>
                                <td className="opacity-60 font-medium pr-4 pb-2">App (Origem):</td>
                                <td className="pb-2 break-all">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block uppercase ${appColor}`}>
                                      {row.log.clientApp || 'unknown'}
                                    </span>
                                    {row.log.clientApp && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setClientApp(row.log.clientApp!);
                                        }}
                                        className="inline-flex items-center gap-1 text-[11px] font-sans px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors font-medium cursor-pointer"
                                        title="Filtrar tabela por este App"
                                      >
                                        <span>🔍 Filtrar Logs</span>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              <tr>
                                <td className="opacity-60 font-medium pr-4 pb-2">User Role:</td>
                                <td className="opacity-90 font-bold pb-2 uppercase text-indigo-600 dark:text-indigo-400">
                                  {roleLabelMap[row.log.userRole || 'anon'] || (row.log.userRole || 'ANON').toUpperCase()}
                                </td>
                              </tr>
                              {workerName && (
                                <tr>
                                  <td className="opacity-60 font-medium pr-4 pb-2">Worker Exec:</td>
                                  <td className="opacity-90 font-bold text-amber-600 dark:text-amber-400 pb-2 font-mono">
                                    ⚙️ {workerName}
                                  </td>
                                </tr>
                              )}
                              <tr>
                                <td className="opacity-60 font-medium pr-4 pb-2">Nome:</td>
                                <td className="opacity-90 font-bold pb-2 break-all">{row.log.name || 'system.event'}</td>
                              </tr>
                              <tr>
                                <td className="opacity-60 font-medium pr-4 pb-2">Tipo:</td>
                                <td className="opacity-90 font-bold pb-2 uppercase text-indigo-600 dark:text-indigo-400">{row.log.type || 'error'}</td>
                              </tr>
                              <tr>
                                <td className="opacity-60 font-medium pr-4 pb-2">Mensagem:</td>
                                <td className={`font-semibold pb-2 leading-snug break-all ${
                                  row.log.severity === 'error' || row.log.severity === 'fatal' || row.log.type === 'error'
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'opacity-90'
                                }`}>
                                  {row.log.message}
                                </td>
                              </tr>
                              <tr>
                                <td className="opacity-60 font-medium pr-4 pb-2">Serviço:</td>
                                <td className="opacity-90 font-bold pb-2">{row.log.serviceName}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Card: Contexto do Cliente */}
                        <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-brand-divider shadow-xs">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-3 flex items-center gap-1.5">
                            <span>👤</span> CONTEXTO E RASTREAMENTO (TRACING)
                          </h4>
                          <table className="w-full text-left font-mono text-xs">
                            <tbody>
                              {(() => {
                                const reqId = (row.log.metadata as any)?.requestId;
                                const sessId = row.log.sessionId || (row.log.metadata as any)?.sessionId;
                                return (
                                  <>
                                    <tr>
                                      <td className="opacity-60 font-medium pr-4 pb-2 w-28">Request ID:</td>
                                      <td className="opacity-90 pb-2 break-all">
                                        {reqId ? (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 select-all">{reqId}</span>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setRequestId(reqId);
                                              }}
                                              className="inline-flex items-center gap-1 text-[11px] font-sans px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors font-medium cursor-pointer"
                                              title="Filtrar tabela de logs por este Request ID"
                                            >
                                              <span>🔍 Filtrar Logs</span>
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="italic opacity-40 font-normal">Nenhum</span>
                                        )}
                                      </td>
                                    </tr>

                                    <tr>
                                      <td className="opacity-60 font-medium pr-4 pb-2">User ID:</td>
                                      <td className="opacity-90 pb-2 break-all">
                                        {row.log.userId ? (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono font-semibold select-all">{row.log.userId}</span>

                                            {/* Botão 1: Abrir Perfil do Usuário */}
                                            <Link
                                              href={`/dashboard/users/${row.log.userId}`}
                                              target="_blank"
                                              onClick={(e) => e.stopPropagation()}
                                              className="inline-flex items-center gap-1 text-[11px] font-sans px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors font-medium cursor-pointer"
                                              title="Ver perfil do usuário no Admin (Abre em nova aba)"
                                            >
                                              <span>👤 Perfil</span>
                                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                              </svg>
                                            </Link>

                                            {/* Botão 2: Filtrar Tabela por este Usuário */}
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setUserId(row.log.userId!);
                                              }}
                                              className="inline-flex items-center gap-1 text-[11px] font-sans px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors font-medium cursor-pointer"
                                              title="Filtrar tabela de logs por este Usuário"
                                            >
                                              <span>🔍 Filtrar Logs</span>
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="italic opacity-40">Nenhum</span>
                                        )}
                                      </td>
                                    </tr>

                                    <tr>
                                      <td className="opacity-60 font-medium pr-4 pb-2">Session ID:</td>
                                      <td className="opacity-90 pb-2 break-all">
                                        {sessId ? (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono select-all">{sessId}</span>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSessionId(sessId);
                                              }}
                                              className="inline-flex items-center gap-1 text-[11px] font-sans px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors font-medium cursor-pointer"
                                              title="Filtrar tabela de logs por este Session ID"
                                            >
                                              <span>🔍 Filtrar Logs</span>
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="italic opacity-40">Nenhuma</span>
                                        )}
                                      </td>
                                    </tr>
                                  </>
                                );
                              })()}
                              <tr>
                                <td className="opacity-60 font-medium pr-4 pb-2">URL Origem:</td>
                                <td className="opacity-90 pb-2 break-all">
                                  {row.log.url ? (
                                    <a href={row.log.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-indigo-600 dark:text-indigo-400 font-semibold">
                                      {row.log.url}
                                    </a>
                                  ) : (
                                    <span className="italic opacity-40">Nenhuma</span>
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td className="opacity-60 font-medium pr-4 pb-2">User Agent:</td>
                                <td className="opacity-90 pb-2 break-all">
                                  {row.log.userAgent || <span className="italic opacity-40">Nenhum</span>}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Stack Trace em Card Destacado */}
                      {(() => {
                        const stackContent = row.log.stack || (row.log.metadata as any)?.stack || (row.log.metadata as any)?.stackTrace;
                        if (!stackContent) return null;

                        return (
                          <div className="p-4 rounded-xl bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 dark:border-red-500/30 shadow-xs">
                            <div className="flex justify-between items-center mb-2.5">
                              <p className="font-bold text-[11px] uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
                                <span>🔥</span> STACK TRACE DA EXCEÇÃO
                              </p>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(stackContent, `stack-${row.log.id}`);
                                }}
                                className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors font-medium flex items-center gap-1 cursor-pointer"
                              >
                                {copiedStackId === `stack-${row.log.id}` ? '✓ Copiado!' : '📋 Copiar Stack Trace'}
                              </button>
                            </div>
                            <pre className="p-3.5 rounded-lg bg-neutral-900 dark:bg-neutral-950 text-red-300 border border-neutral-800 text-[11px] overflow-x-auto custom-scrollbar whitespace-pre-wrap break-all select-text leading-relaxed font-mono shadow-inner max-h-[300px]">
                              {stackContent}
                            </pre>
                          </div>
                        );
                      })()}

                      {/* Metadados Extras em Card Embutido */}
                      {row.log.metadata && Object.keys(row.log.metadata).length > 0 && (
                        <div className="p-4 rounded-xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 dark:border-indigo-500/30 shadow-xs">
                          <div className="flex justify-between items-center mb-2.5">
                            <p className="font-bold text-[11px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                              <span>⚙️</span> METADADOS ADICIONAIS
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(JSON.stringify(row.log.metadata, null, 2), `meta-${row.log.id}`);
                              }}
                              className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors font-medium flex items-center gap-1 cursor-pointer"
                            >
                              {copiedStackId === `meta-${row.log.id}` ? '✓ Copiado!' : '📋 Copiar JSON'}
                            </button>
                          </div>
                          <pre className="p-3.5 rounded-lg bg-neutral-900 dark:bg-neutral-950 text-emerald-400 border border-neutral-800 text-[11px] overflow-x-auto custom-scrollbar whitespace-pre-wrap break-all select-text leading-relaxed font-mono shadow-inner max-h-[350px]">
                            {JSON.stringify(row.log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rodapé do Container de Virtual Scroll */}
      <div className="px-6 py-3.5 border-t border-brand-divider flex justify-between items-center text-xs opacity-80 font-mono">
        <div>
          Exibindo <span className="font-bold text-brand-primary">{logs.length}</span> de{' '}
          <span className="font-bold text-brand-primary">{total}</span> registros
        </div>

        <div>
          {loadingMore ? (
            <div className="flex items-center gap-2 text-brand-primary font-sans">
              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Carregando mais logs...</span>
            </div>
          ) : logs.length >= total && logs.length > 0 ? (
            <span className="opacity-50 font-sans">Todos os {total} logs carregados</span>
          ) : (
            <span className="opacity-40 font-sans">Role o container para carregar mais</span>
          )}
        </div>
      </div>
    </Card>
  );
}
