import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api, ErrorLog } from '@/lib/api';
import { env } from '@/env';
import { io, Socket } from 'socket.io-client';

const BATCH_SIZE = 50;

export function useLogsPage() {
  const { user } = useAuth();

  // Filtros de busca
  const [serviceName, setServiceName] = useState('');
  const [logType, setLogType] = useState('');
  const [severity, setSeverity] = useState('');
  const [errorName, setErrorName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [userId, setUserId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [requestId, setRequestId] = useState('');
  const [clientApp, setClientApp] = useState('');
  const [userRole, setUserRole] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Controle do Modal de Filtros
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Estados dos dados e scroll infinito
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Realtime
  const [hasNewChanges, setHasNewChanges] = useState(false);
  const [pendingLogsCount, setPendingLogsCount] = useState(0);
  const [isRealtimeActive, setIsRealtimeActive] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const isRealtimeActiveRef = useRef(isRealtimeActive);

  useEffect(() => {
    isRealtimeActiveRef.current = isRealtimeActive;
  }, [isRealtimeActive]);

  // Accordion (Itens abertos)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Refs de Virtualização
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  // Refs de controle de carregamento para evitar requisições duplicadas
  const loadingMoreRef = useRef(false);
  const totalRef = useRef(0);
  const logsCountRef = useRef(0);

  totalRef.current = total;
  logsCountRef.current = logs.length;

  // Conta filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (serviceName) count++;
    if (logType) count++;
    if (severity) count++;
    if (errorName) count++;
    if (errorMessage) count++;
    if (userId) count++;
    if (sessionId) count++;
    if (requestId) count++;
    if (clientApp) count++;
    if (userRole) count++;
    if (startDate) count++;
    if (endDate) count++;
    return count;
  }, [serviceName, logType, severity, errorName, errorMessage, userId, sessionId, requestId, clientApp, userRole, startDate, endDate]);

  // Carregar os primeiros logs (Reset completo)
  const fetchInitialLogs = useCallback(async () => {
    setLoadingInitial(true);
    setError('');
    setHasNewChanges(false);
    setPendingLogsCount(0);
    try {
      const res = await api.getErrorLogs({
        limit: BATCH_SIZE,
        offset: 0,
        type: logType || undefined,
        serviceName: serviceName || undefined,
        severity: severity || undefined,
        name: errorName || undefined,
        message: errorMessage || undefined,
        userId: userId || undefined,
        sessionId: sessionId || undefined,
        requestId: requestId || undefined,
        clientApp: clientApp || undefined,
        userRole: userRole || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });
      setLogs(res.logs || []);
      setTotal(res.total || 0);

      // Reseta rolagem do container virtualizado
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
        setScrollTop(0);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar os logs.');
    } finally {
      setLoadingInitial(false);
    }
  }, [serviceName, logType, severity, errorName, errorMessage, userId, sessionId, requestId, clientApp, userRole, startDate, endDate]);

  // Carregar mais logs ao rolar (Infinite Scroll Virtualizado)
  const fetchMoreLogs = useCallback(async () => {
    if (loadingMoreRef.current || logsCountRef.current >= totalRef.current) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const offset = logsCountRef.current;
      const res = await api.getErrorLogs({
        limit: BATCH_SIZE,
        offset,
        type: logType || undefined,
        serviceName: serviceName || undefined,
        severity: severity || undefined,
        name: errorName || undefined,
        message: errorMessage || undefined,
        userId: userId || undefined,
        sessionId: sessionId || undefined,
        requestId: requestId || undefined,
        clientApp: clientApp || undefined,
        userRole: userRole || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });

      if (res.logs && res.logs.length > 0) {
        setLogs((prev) => {
          const existingIds = new Set(prev.map((l) => l.id));
          const newItems = res.logs.filter((l) => !existingIds.has(l.id));
          return [...prev, ...newItems];
        });
        setTotal(res.total || 0);
      }
    } catch (err: any) {
      console.error('Erro ao carregar mais logs:', err);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [serviceName, severity, errorName, errorMessage, userId, startDate, endDate]);

  // Carrega inicialmente ou altera ao trocar filtros
  useEffect(() => {
    if (user) {
      fetchInitialLogs();
    }
  }, [user, fetchInitialLogs]);

  // Conexão WebSocket para monitoramento em tempo real
  useEffect(() => {
    if (!user) return;

    const apiBaseUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1';
    const socketOrigin = apiBaseUrl.replace(/\/v1\/?$/, '');
    const socketPath = '/v1/socket.io';
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const socket = io(socketOrigin, {
      path: socketPath,
      transports: ['websocket'],
      auth: { token },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('subscribe-admin-logs', { token });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('realtime-event', (event: { type: string; data: any }) => {
      if (event.type === 'system_error' || event.type === 'system_audit' || event.type === 'system_log') {
        const logItem = event.data as ErrorLog;

        if (logItem && logItem.id) {
          if (isRealtimeActiveRef.current) {
            setLogs((prevLogs) => {
              if (prevLogs.some((item) => item.id === logItem.id)) return prevLogs;
              return [logItem, ...prevLogs];
            });
            setTotal((prevTotal) => prevTotal + 1);
          } else {
            setHasNewChanges(true);
            setPendingLogsCount((prev) => prev + 1);
          }
        } else {
          setHasNewChanges(true);
          setPendingLogsCount((prev) => prev + 1);
        }
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

  // Handler de Rolagem Virtual + Disparo de Infinite Scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);

    // Dispara carregamento de mais logs quando chegar próximo ao fim da lista virtual
    const isNearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 300;
    if (isNearBottom && logsCountRef.current < totalRef.current && !loadingInitial && !loadingMoreRef.current) {
      fetchMoreLogs();
    }
  };

  // Cálculo de offsets para renderização virtualizada de accordions
  const virtualRows = useMemo(() => {
    let currentOffset = 0;
    return logs.map((log) => {
      const isExpanded = expandedIds.has(log.id);
      const hasStack = Boolean(log.stack || (log.metadata as any)?.stack || (log.metadata as any)?.stackTrace);
      const hasMetadata = Boolean(log.metadata && Object.keys(log.metadata).length > 0);

      let height = 54;
      if (isExpanded) {
        height = 250; // Altura base para detalhes + contexto do cliente
        if (hasStack) height += 230; // Card de Stack Trace
        if (hasMetadata) height += 270; // Card de Metadados JSON
      }

      const offset = currentOffset;
      currentOffset += height;
      return { log, offset, height };
    });
  }, [logs, expandedIds]);

  const totalHeight = virtualRows.length > 0 ? virtualRows[virtualRows.length - 1].offset + virtualRows[virtualRows.length - 1].height : 0;

  const visibleRows = useMemo(() => {
    const buffer = 4;
    const start = scrollTop - buffer * 100;
    const end = scrollTop + viewportHeight + buffer * 100;

    return virtualRows.filter((row) => {
      const rowEnd = row.offset + row.height;
      return rowEnd >= start && row.offset <= end;
    });
  }, [virtualRows, scrollTop, viewportHeight]);

  const resetFilters = () => {
    setServiceName('');
    setLogType('');
    setSeverity('');
    setErrorName('');
    setErrorMessage('');
    setUserId('');
    setSessionId('');
    setRequestId('');
    setClientApp('');
    setUserRole('');
    setStartDate('');
    setEndDate('');
  };

  return {
    user,
    serviceName, setServiceName,
    logType, setLogType,
    severity, setSeverity,
    errorName, setErrorName,
    errorMessage, setErrorMessage,
    userId, setUserId,
    sessionId, setSessionId,
    requestId, setRequestId,
    clientApp, setClientApp,
    userRole, setUserRole,
    startDate, setStartDate,
    endDate, setEndDate,
    activeFiltersCount,
    isFilterModalOpen, setIsFilterModalOpen,
    logs, total,
    loadingInitial, loadingMore, error,
    hasNewChanges, pendingLogsCount,
    isRealtimeActive, setIsRealtimeActive,
    isConnected,
    expandedIds, toggleExpand,
    containerRef, handleScroll,
    totalHeight, visibleRows,
    loadLogs: fetchInitialLogs,
    resetFilters,
  };
}
