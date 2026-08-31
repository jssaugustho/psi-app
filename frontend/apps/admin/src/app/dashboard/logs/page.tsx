'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api, ErrorLog } from '@/lib/api';
import { env } from '@/env';
import { Card, Button, Input, Select, LoadingSpinner } from '@psi/ui';
import { io, Socket } from 'socket.io-client';

export default function LogsPage() {
  const { user } = useAuth();
  const { theme } = useBrand();

  // Filtros
  const [serviceName, setServiceName] = useState('');
  const [severity, setSeverity] = useState('');
  const [errorName, setErrorName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [userId, setUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState(250);

  // Estados dos dados
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Realtime
  const [hasNewChanges, setHasNewChanges] = useState(false);
  const [pendingLogsCount, setPendingLogsCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  // Accordion (Itens abertos)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Refs de Virtualização
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  // Carregar dados da API
  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    setHasNewChanges(false);
    setPendingLogsCount(0);
    try {
      const res = await api.getErrorLogs({
        limit,
        offset: 0,
        serviceName: serviceName || undefined,
        severity: severity || undefined,
        name: errorName || undefined,
        message: errorMessage || undefined,
        userId: userId || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar os logs de erros.');
    } finally {
      setLoading(false);
    }
  }, [limit, serviceName, severity, errorName, errorMessage, userId, startDate, endDate]);

  // Carrega ao montar ou alterar filtros
  useEffect(() => {
    if (user) {
      loadLogs();
    }
  }, [user, loadLogs]);

  // Conexão WebSocket para monitoramento em tempo real de novos erros
  useEffect(() => {
    if (!user) return;

    const apiBaseUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1';
    const socketOrigin = apiBaseUrl.replace(/\/v1\/?$/, '');
    const socketPath = '/v1/socket.io';

    const socket = io(socketOrigin, {
      path: socketPath,
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('subscribe', 'global');
    });

    socket.on('realtime-event', (event: { type: string; data: any }) => {
      if (event.type === 'system_error') {
        // Incrementa indicador de modificação realtime
        setHasNewChanges(true);
        setPendingLogsCount((prev) => prev + 1);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Toggle expandir accordion
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Escuta resize no viewport
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setViewportHeight(entry.contentRect.height || 600);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Cálculo de offsets e alturas virtuais para renderização eficiente de accordions (tamanhos variáveis)
  const virtualRows = useMemo(() => {
    let currentOffset = 0;
    return logs.map((log) => {
      const isExpanded = expandedIds.has(log.id);
      const height = isExpanded ? 420 : 54; // Altura estimada para expandido e colapsado
      const offset = currentOffset;
      currentOffset += height;
      return { log, offset, height };
    });
  }, [logs, expandedIds]);

  const totalHeight = virtualRows.length > 0 ? virtualRows[virtualRows.length - 1].offset + virtualRows[virtualRows.length - 1].height : 0;

  // Filtrar apenas linhas visíveis (com margem de segurança de 3 itens acima/abaixo)
  const visibleRows = useMemo(() => {
    const buffer = 3;
    const start = scrollTop - buffer * 100;
    const end = scrollTop + viewportHeight + buffer * 100;

    return virtualRows.filter((row) => {
      const rowEnd = row.offset + row.height;
      return rowEnd >= start && row.offset <= end;
    });
  }, [virtualRows, scrollTop, viewportHeight]);

  const resetFilters = () => {
    setServiceName('');
    setSeverity('');
    setErrorName('');
    setErrorMessage('');
    setUserId('');
    setStartDate('');
    setEndDate('');
    setLimit(250);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ color: 'var(--brand-text-color)' }}>
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monitoramento de Erros</h1>
          <p className="text-sm opacity-60">Terminal de visualização, auditoria e logs do ecossistema.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={loadLogs}
            variant={hasNewChanges ? 'primary' : 'secondary'}
            className="relative w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
            </svg>
            Atualizar
            {hasNewChanges && (
              <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
                {pendingLogsCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Alerta Realtime */}
      {hasNewChanges && (
        <div className="flex items-center justify-between p-4 rounded-lg border bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
            </span>
            <span className="text-sm font-medium">
              Novos erros foram detectados na plataforma ({pendingLogsCount} pendentes). Clique em Atualizar para carregar.
            </span>
          </div>
          <Button variant="secondary" className="text-xs px-2.5 py-1" onClick={loadLogs}>
            Carregar Agora
          </Button>
        </div>
      )}

      {/* Painel de Filtros */}
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-70">Serviço</label>
            <Select
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="w-full"
              options={[
                { value: '', label: 'Todos os Serviços' },
                { value: 'frontend', label: 'Frontend Client' },
                { value: 'core-api', label: 'Core API (Fastify)' },
                { value: 'postgres', label: 'Banco de Dados (Postgres)' },
                { value: 'workers', label: 'Background Workers' },
                { value: 'gotrue', label: 'Autenticação (GoTrue)' },
                { value: 'postgrest', label: 'Interface PostgREST' },
              ]}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-70">Severidade</label>
            <Select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full"
              options={[
                { value: '', label: 'Todas as Severidades' },
                { value: 'error', label: 'Error' },
                { value: 'warning', label: 'Warning' },
                { value: 'fatal', label: 'Fatal' },
              ]}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-70">Nome do Erro</label>
            <Input
              type="text"
              placeholder="Ex: TypeError"
              value={errorName}
              onChange={(e) => setErrorName(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-70">Mensagem</label>
            <Input
              type="text"
              placeholder="Buscar na mensagem..."
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-70">User ID</label>
            <Input
              type="text"
              placeholder="UUID do Usuário..."
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-70">Data de Início</label>
            <Input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-70">Data Limite</label>
            <Input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-70">Exibir</label>
            <Select
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full"
              options={[
                { value: '100', label: '100 registros' },
                { value: '250', label: '250 registros' },
                { value: '500', label: '500 registros' },
                { value: '1000', label: '1000 registros' },
              ]}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-brand-divider opacity-80">
          <Button variant="secondary" onClick={resetFilters}>
            Limpar Filtros
          </Button>
          <Button onClick={loadLogs} variant="primary">
            Aplicar Filtros
          </Button>
        </div>
      </Card>

      {/* Terminal de Logs */}
      <Card className="p-0 overflow-hidden flex flex-col border border-neutral-800 bg-[#0c0f12]">
        {/* Barra do Terminal */}
        <div className="bg-[#161b22] px-4 py-2 border-b border-neutral-800 flex justify-between items-center text-xs text-neutral-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56]"></span>
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e]"></span>
              <span className="w-3 h-3 rounded-full bg-[#27c93f]"></span>
            </span>
            <span className="ml-2 font-semibold">terminal://errors.logs</span>
          </div>
          <div>
            Total: <span className="text-[#58a6ff]">{total}</span>
          </div>
        </div>

        {/* Console virtual */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-[600px] overflow-y-auto font-mono text-[13px] relative scrollbar-thin select-text"
        >
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 gap-3">
              <LoadingSpinner />
              <span className="text-neutral-400">Varrendo os logs no banco...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              <p className="font-bold">Falha ao se conectar com o terminal:</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              Nenhum log de erro encontrado com os filtros selecionados.
            </div>
          ) : (
            <div style={{ height: `${totalHeight}px`, width: '100%', position: 'relative' }}>
              {visibleRows.map((row) => {
                const isExpanded = expandedIds.has(row.log.id);
                
                // Formatação do timestamp para formato amigável
                const dateStr = new Date(row.log.createdAt).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                // Cores por severidade
                const sevColor = 
                  row.log.severity === 'fatal' ? 'text-purple-400 border-purple-500/30 bg-purple-500/10' :
                  row.log.severity === 'warning' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' : 
                  'text-red-400 border-red-500/30 bg-red-500/10';

                // Cores por serviço
                const serviceColor =
                  row.log.serviceName === 'postgres' ? 'text-teal-400' :
                  row.log.serviceName === 'gotrue' ? 'text-blue-400' :
                  row.log.serviceName === 'postgrest' ? 'text-indigo-400' :
                  row.log.serviceName === 'workers' ? 'text-amber-400' :
                  row.log.serviceName === 'frontend' ? 'text-pink-400' :
                  'text-emerald-400';

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
                    className="border-b border-neutral-900 overflow-hidden"
                  >
                    {/* Linha do Accordion (Header) */}
                    <div
                      onClick={() => toggleExpand(row.log.id)}
                      className={`flex items-center px-4 py-3 cursor-pointer hover:bg-neutral-900/60 select-none transition-colors ${
                        isExpanded ? 'bg-neutral-900/40 border-l-2 border-brand-primary' : ''
                      }`}
                    >
                      {/* Indicador de Expandir */}
                      <span className="mr-3 text-neutral-600">
                        {isExpanded ? '▼' : '►'}
                      </span>

                      {/* Data */}
                      <span className="w-36 text-neutral-500 shrink-0">{dateStr}</span>

                      {/* Serviço */}
                      <span className={`w-28 font-semibold shrink-0 ${serviceColor}`}>
                        [{row.log.serviceName}]
                      </span>

                      {/* Severidade */}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border mr-3 shrink-0 ${sevColor}`}>
                        {row.log.severity.toUpperCase()}
                      </span>

                      {/* Nome do Erro */}
                      <span className="w-48 text-neutral-300 font-semibold truncate shrink-0 mr-4">
                        {row.log.name || 'Error'}
                      </span>

                      {/* Mensagem do Erro */}
                      <span className="text-neutral-400 truncate flex-grow">
                        {row.log.message}
                      </span>

                      {/* ID do Usuário (se houver) */}
                      {row.log.userId ? (
                        <span className="text-[11px] text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded shrink-0 hidden md:inline">
                          User: {row.log.userId.substring(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-600 italic shrink-0 hidden md:inline">
                          Anon
                        </span>
                      )}
                    </div>

                    {/* Conteúdo Expandido (Accordion Body) */}
                    {isExpanded && (
                      <div className="px-10 py-4 bg-[#090b0d] border-t border-neutral-900/80 text-neutral-300 text-xs overflow-y-auto h-[366px] select-text">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-neutral-500 font-bold mb-1">DETALHES DO ERRO</p>
                            <table className="w-full text-left font-mono">
                              <tbody>
                                <tr>
                                  <td className="text-neutral-600 pr-4 pb-1">Log ID:</td>
                                  <td className="text-neutral-400 pb-1 select-all">{row.log.id}</td>
                                </tr>
                                <tr>
                                  <td className="text-neutral-600 pr-4 pb-1">Nome:</td>
                                  <td className="text-neutral-300 font-bold pb-1">{row.log.name || 'Error'}</td>
                                </tr>
                                <tr>
                                  <td className="text-neutral-600 pr-4 pb-1">Mensagem:</td>
                                  <td className="text-red-400 pb-1">{row.log.message}</td>
                                </tr>
                                <tr>
                                  <td className="text-neutral-600 pr-4 pb-1">Serviço:</td>
                                  <td className="text-neutral-300 pb-1 font-bold">{row.log.serviceName}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <div>
                            <p className="text-neutral-500 font-bold mb-1">CONTEXTO DO CLIENTE</p>
                            <table className="w-full text-left font-mono">
                              <tbody>
                                <tr>
                                  <td className="text-neutral-600 pr-4 pb-1">User ID:</td>
                                  <td className="text-neutral-400 pb-1">{row.log.userId || <span className="italic text-neutral-600">Nenhum</span>}</td>
                                </tr>
                                <tr>
                                  <td className="text-neutral-600 pr-4 pb-1">URL Origem:</td>
                                  <td className="text-neutral-400 pb-1 truncate max-w-xs" title={row.log.url || ''}>
                                    {row.log.url ? (
                                      <a href={row.log.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-400">
                                        {row.log.url}
                                      </a>
                                    ) : (
                                      <span className="italic text-neutral-600">Nenhuma</span>
                                    )}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="text-neutral-600 pr-4 pb-1">User Agent:</td>
                                  <td className="text-neutral-400 pb-1 truncate max-w-xs" title={row.log.userAgent || ''}>
                                    {row.log.userAgent || <span className="italic text-neutral-600">Nenhum</span>}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Stack Trace */}
                        {row.log.stack && (
                          <div className="mb-4">
                            <p className="text-neutral-500 font-bold mb-1">STACK TRACE</p>
                            <pre className="p-3 rounded bg-black/60 border border-neutral-900 text-[11px] text-red-300/95 overflow-x-auto whitespace-pre select-text leading-relaxed">
                              {row.log.stack}
                            </pre>
                          </div>
                        )}

                        {/* Metadados Extras */}
                        {row.log.metadata && Object.keys(row.log.metadata).length > 0 && (
                          <div>
                            <p className="text-neutral-500 font-bold mb-1">METADADOS ADICIONAIS</p>
                            <pre className="p-3 rounded bg-black/60 border border-neutral-900 text-[11px] text-[#9ecbff] overflow-x-auto select-text">
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
      </Card>
    </div>
  );
}
