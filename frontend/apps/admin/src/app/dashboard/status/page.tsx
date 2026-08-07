'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api, ServiceStatus, StatusBucket, StatusHistoryResponse } from '@/lib/api';
import { Card, Button, LoadingSpinner } from '@psi/ui';
import { io, Socket } from 'socket.io-client';


const OfficeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

export default function StatusPage() {
  const { user } = useAuth();
  const { theme } = useBrand();

  const [range, setRange] = useState<'24h' | '7d'>('24h');
  const [data, setData] = useState<StatusHistoryResponse | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [checkingNow, setCheckingNow] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Carrega histórico de status da API
  const loadStatusHistory = useCallback(async (selectedRange: '24h' | '7d') => {
    setLoadingData(true);
    setError('');
    try {
      const res = await api.getStatusHistory(selectedRange);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar histórico de status.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Inicializa carregamento e verificação de permissão
  useEffect(() => {
    if (user) {
      loadStatusHistory(range);
    }
  }, [user, range, loadStatusHistory]);

  // Conexão WebSocket (Socket.io) para atualizações em tempo real
  useEffect(() => {
    if (!user) return;

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1';
    const socketOrigin = apiBaseUrl.replace(/\/v1\/?$/, '');
    const socketPath = '/v1/socket.io';

    console.log(`🔌 Conectando ao WebSocket de Status: ${socketOrigin} com path ${socketPath}`);
    const socket = io(socketOrigin, {
      path: socketPath,
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ WebSocket conectado com sucesso!');
      // Inscreve na sala de updates globais
      socket.emit('subscribe', 'global');
    });

    // Escuta novos batimentos em tempo real enviados do Worker
    socket.on('realtime-event', (event: { type: string; data: any }) => {
      if (event.type === 'system_status_update') {
        const newLog = event.data as {
          serviceName: string;
          status: 'operational' | 'degraded' | 'down';
          responseTimeMs: number;
          createdAt: string;
        };

        console.log(`📢 Atualização de status recebida via WS para ${newLog.serviceName}:`, newLog);

        setData((prev) => {
          if (!prev) return null;

          // 1. Atualizar o status atual do serviço
          const updatedStatus = prev.currentStatus.map((s) => {
            if (s.serviceName === newLog.serviceName) {
              return {
                ...s,
                status: newLog.status,
                responseTimeMs: newLog.responseTimeMs,
                lastCheckAt: newLog.createdAt,
              };
            }
            return s;
          });

          // 2. Atualizar o último bucket de histórico
          const updatedHistory = { ...prev.history };
          const serviceHistory = updatedHistory[newLog.serviceName];

          if (serviceHistory && serviceHistory.length > 0) {
            const lastIndex = serviceHistory.length - 1;
            const lastBucket = serviceHistory[lastIndex];

            // Atualiza status do bucket conforme relevância
            let nextStatus = lastBucket.status;
            if (lastBucket.status === 'no_data') {
              nextStatus = newLog.status;
            } else if (newLog.status === 'down') {
              nextStatus = 'down';
            } else if (newLog.status === 'degraded' && lastBucket.status !== 'down') {
              nextStatus = 'degraded';
            }

            const nextAvg = lastBucket.avgResponseTimeMs === 0
              ? newLog.responseTimeMs
              : Math.round((lastBucket.avgResponseTimeMs + newLog.responseTimeMs) / 2);

            updatedHistory[newLog.serviceName] = serviceHistory.map((bucket, idx) => {
              if (idx === lastIndex) {
                return {
                  ...bucket,
                  status: nextStatus as any,
                  avgResponseTimeMs: nextAvg,
                };
              }
              return bucket;
            });
          }

          return {
            ...prev,
            currentStatus: updatedStatus,
            history: updatedHistory,
          };
        });
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ Falha ao conectar ao WebSocket (fallback automático para polling):', err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Dispara uma verificação manual forçada
  const handleManualCheck = async () => {
    setCheckingNow(true);
    try {
      await api.triggerStatusCheck();
      // O evento deve chegar pelo WS em segundos, mas recarregamos após 1s para garantir
      setTimeout(() => loadStatusHistory(range), 1000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setCheckingNow(false);
    }
  };

  // Determinar status geral do app
  const getOverallStatus = () => {
    if (!data || data.currentStatus.length === 0) {
      return {
        label: 'Carregando...',
        color: 'var(--brand-text-color)',
        icon: (
          <svg className="w-6 h-6 animate-spin text-current" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        ),
        bg: 'var(--surface-hover)',
      };
    }
    
    const anyDown = data.currentStatus.some(s => s.status === 'down');
    const anyDegraded = data.currentStatus.some(s => s.status === 'degraded');
    
    if (anyDown) {
      return {
        label: 'Falha Crítica Detectada em Serviços',
        color: '#EF4444',
        icon: (
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.3)',
      };
    }
    if (anyDegraded) {
      return {
        label: 'Alguns Serviços Estão Instáveis ou Lentos',
        color: '#F59E0B',
        icon: (
          <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.3)',
      };
    }
    return {
      label: 'Todos os Sistemas Operando Normalmente',
      color: '#10B981',
      icon: (
        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.3)',
    };
  };

  const overall = getOverallStatus();



  if (loadingData) {
    return <LoadingSpinner message="Carregando dados de status..." className="min-h-[50vh]" />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-page-enter">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Status da Infraestrutura</h1>
            <p className="text-xs mt-1" style={{ opacity: 0.6 }}>
              Acompanhamento de disponibilidade e tempo de resposta dos serviços em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl overflow-hidden p-0.5 glass-sm">
              <button
                onClick={() => setRange('24h')}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border-none"
                style={range === '24h'
                  ? { background: 'var(--brand-gradient)', color: 'var(--brand-contrast-color)' }
                  : { background: 'transparent', color: 'var(--brand-text-color)', opacity: 0.7 }}
              >
                Últimas 24 Horas
              </button>
              <button
                onClick={() => setRange('7d')}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border-none"
                style={range === '7d'
                  ? { background: 'var(--brand-gradient)', color: 'var(--brand-contrast-color)' }
                  : { background: 'transparent', color: 'var(--brand-text-color)', opacity: 0.7 }}
              >
                Últimos 7 Dias
              </button>
            </div>

            {/* Trigger Check Manual */}
            <div className="relative group">
              <Button
                onClick={handleManualCheck}
                disabled={checkingNow || loadingData}
                variant="outline"
                className="!w-8 !h-8 !p-0 flex items-center justify-center text-xs"
              >
                <svg className={`w-3.5 h-3.5 ${checkingNow ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.283 8H18.5" />
                </svg>
              </Button>
              
              {/* Tooltip Helper */}
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shadow-xl border border-solid"
                style={{
                  background: 'var(--brand-card-bg-color)',
                  color: 'var(--brand-text-color)',
                  borderColor: 'var(--surface-border)',
                }}
              >
                {checkingNow ? 'Verificando...' : 'Verificar Agora'}
              </div>
            </div>
          </div>
        </div>

        {/* Banner Geral de Status */}
        <div
          className="flex items-center gap-3 p-5 rounded-2xl border transition-all shadow-md"
          style={{
            backgroundColor: overall.bg,
            borderColor: overall.border || 'var(--surface-border)',
            color: overall.color,
          }}
        >
          <span className="flex-shrink-0">{overall.icon}</span>
          <span className="font-bold text-base md:text-lg">{overall.label}</span>
        </div>

        {/* Feedback de erro se houver */}
        {error && (
          <div className="text-sm p-4 rounded-xl font-medium flex items-center gap-2" style={{ background: 'var(--status-error-bg)', border: '1px solid var(--status-error-border)', color: 'var(--status-error-text)' }}>
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Lista de Serviços */}
        <div className="space-y-6">
          {loadingData && !data ? (
            // Skeleton de Carregamento
            [1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--surface-hover)', border: '1px solid var(--surface-border)' }} />
            ))
          ) : (
            data?.currentStatus.map((service) => {
              const history = data.history[service.serviceName] || [];
              const uptimePercent = history.length > 0
                ? Math.round((history.filter(h => h.status === 'operational').length / history.length) * 100)
                : 100;

              return (
                <Card key={service.serviceName} className="p-5 md:p-6 space-y-4">
                  {/* Linha do Cabeçalho do Serviço */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg font-bold">{service.serviceName}</span>
                      <span className="text-xs font-mono opacity-50">• {service.responseTimeMs}ms</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ opacity: 0.6 }}>Uptime: {uptimePercent}%</span>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold capitalize"
                        style={service.status === 'operational'
                          ? { background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' }
                          : service.status === 'degraded'
                          ? { background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)' }
                          : { background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)' }
                        }
                      >
                        {service.status === 'operational' ? 'Operacional' : service.status === 'degraded' ? 'Instável' : 'Fora do Ar'}
                      </span>
                    </div>
                  </div>

                  {/* Grid de Barras de Histórico */}
                  <div className="space-y-1">
                    <div className="flex gap-[3px] h-10 md:h-12 w-full">
                      {history.map((bucket, idx) => {
                        let barBg = theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
                        let barOpacity = 1;

                        if (bucket.status === 'operational') {
                          barBg = '#10B981';
                        } else if (bucket.status === 'degraded') {
                          barBg = '#F59E0B';
                        } else if (bucket.status === 'down') {
                          barBg = '#EF4444';
                        }

                        const dateFormatted = new Date(bucket.timestamp).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                        const tooltipText = `${dateFormatted} - ${
                          bucket.status === 'operational' ? 'Operacional'
                          : bucket.status === 'degraded' ? 'Lentidão'
                          : bucket.status === 'down' ? 'Fora do Ar'
                          : 'Sem dados'
                        } ${bucket.avgResponseTimeMs > 0 ? `(${bucket.avgResponseTimeMs}ms)` : ''}`;

                        return (
                          <div
                            key={idx}
                            className="flex-1 h-full rounded-sm transition-all hover:scale-y-110 relative group cursor-pointer"
                            style={{
                              backgroundColor: barBg,
                              opacity: barOpacity,
                            }}
                          >
                            {/* Custom Tooltip */}
                            <div
                              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none px-3 py-1.5 rounded-lg text-[10px] font-mono whitespace-nowrap shadow-xl border border-solid"
                              style={{
                                background: 'var(--brand-card-bg-color)',
                                color: 'var(--brand-text-color)',
                                borderColor: 'var(--surface-border)',
                              }}
                            >
                              {tooltipText}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Timeline Footer Labels */}
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider pt-1" style={{ opacity: 0.45 }}>
                      <span>{range === '24h' ? 'Há 24 Horas' : 'Há 7 Dias'}</span>
                      <span className="w-16 h-[1px]" style={{ background: 'currentColor', opacity: 0.3 }} />
                      <span>{uptimePercent === 100 ? '100% de Uptime' : `${uptimePercent}% de Uptime`}</span>
                      <span className="w-16 h-[1px]" style={{ background: 'currentColor', opacity: 0.3 }} />
                      <span>Hoje</span>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
  );
}
