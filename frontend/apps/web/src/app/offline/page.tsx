'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button } from '@psi/ui';
import { useBrand } from '@/context/BrandContext';
import { WifiOff, ServerCrash, Database, RefreshCw, AlertTriangle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function OfflinePage() {
  const [checking, setChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { theme, toggleTheme } = useBrand();

  // Estados individuais dos serviços em tempo real
  const [apiStatus, setApiStatus] = useState<'checking' | 'operational' | 'down'>('checking');
  const [dbStatus, setDbStatus] = useState<'checking' | 'operational' | 'down' | 'waiting'>('waiting');
  const [queueStatus, setQueueStatus] = useState<'checking' | 'operational' | 'down' | 'waiting'>('waiting');

  // Executa uma verificação silenciosa em segundo plano para o auto-ping
  const checkBackgroundStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(3000) : undefined,
      });

      if (response.ok) {
        const data = await response.json();
        setApiStatus('operational');

        const dbOk = data.services?.database === 'operational';
        const queueOk = data.services?.queue === 'operational';

        setDbStatus(dbOk ? 'operational' : 'down');
        setQueueStatus(queueOk ? 'operational' : 'down');

        if (dbOk && queueOk) {
          // Tudo normalizado -> redireciona de volta
          window.location.href = '/dashboard';
        }
      } else {
        setApiStatus('down');
        setDbStatus('waiting');
        setQueueStatus('waiting');
      }
    } catch (err) {
      setApiStatus('down');
      setDbStatus('waiting');
      setQueueStatus('waiting');
    }
  };

  // Executa a verificação ativa com spinner e mensagens de erro na UI
  const handleRetry = async () => {
    setChecking(true);
    setErrorMsg(null);
    setApiStatus('checking');
    setDbStatus('checking');
    setQueueStatus('checking');

    try {
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(4000) : undefined,
      });

      if (response.ok) {
        const data = await response.json();
        setApiStatus('operational');

        const dbOk = data.services?.database === 'operational';
        const queueOk = data.services?.queue === 'operational';

        setDbStatus(dbOk ? 'operational' : 'down');
        setQueueStatus(queueOk ? 'operational' : 'down');

        if (dbOk && queueOk) {
          window.location.href = '/dashboard';
        } else {
          setErrorMsg('O servidor de API respondeu, mas existem serviços internos inoperantes.');
        }
      } else {
        setApiStatus('down');
        setDbStatus('waiting');
        setQueueStatus('waiting');
        setErrorMsg(`O servidor de API retornou código de erro ${response.status}.`);
      }
    } catch (err) {
      setApiStatus('down');
      setDbStatus('waiting');
      setQueueStatus('waiting');
      setErrorMsg('Sem resposta do servidor de API. Verifique se o backend está rodando.');
    } finally {
      setChecking(false);
    }
  };

  // Configurar timer periódico de auto-ping a cada 3 segundos
  useEffect(() => {
    handleRetry();

    const interval = setInterval(() => {
      // Evita sobrepor se o usuário clicou no botão de verificar manualmente
      if (!checking) {
        checkBackgroundStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: 'checking' | 'operational' | 'down' | 'waiting') => {
    switch (status) {
      case 'checking':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 animate-pulse uppercase tracking-wider">
            Verificando
          </span>
        );
      case 'operational':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 uppercase tracking-wider">
            Online
          </span>
        );
      case 'down':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 uppercase tracking-wider">
            Inativo
          </span>
        );
      case 'waiting':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-500 uppercase tracking-wider">
            Aguardando API
          </span>
        );
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ backgroundColor: 'var(--brand-bg-color)', transition: 'background-color 0.3s' }}
    >
      {/* Botão de alternância de tema no canto superior direito */}
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={toggleTheme}
          style={{
            border: '1px solid var(--surface-border)',
            color: 'var(--brand-text-color)',
          }}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all text-base cursor-pointer bg-transparent hover:bg-[var(--surface-hover)]"
          title={`Alternar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
        >
          {theme === 'dark' ? (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
            </svg>
          ) : (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>

      <Card className="w-full max-w-md space-y-6 relative overflow-hidden">
        {/* Detalhe de linha de gradiente no topo */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'var(--brand-gradient)' }} />

        <div className="text-center space-y-3 pt-2">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-red-500/10 text-red-400">
            <WifiOff className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--brand-text-color)' }}>
            Conexão Indisponível
          </h1>
          <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--brand-text-color)', opacity: 0.6 }}>
            Não conseguimos estabelecer conexão com a plataforma no momento.
          </p>
        </div>

        {/* Status dos Serviços Individuais em Tempo Real */}
        <div className="space-y-2.5">
          <label
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--brand-text-color)', opacity: 0.5 }}
          >
            Status dos Serviços (Tempo Real)
          </label>
          
          <div className="space-y-2">
            {/* Serviço 1: API */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-hover)] border border-[var(--surface-border)]">
              <div className="flex items-center gap-2">
                <ServerCrash className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium" style={{ color: 'var(--brand-text-color)' }}>Servidor de API</span>
              </div>
              {getStatusBadge(apiStatus)}
            </div>

            {/* Serviço 2: Database */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-hover)] border border-[var(--surface-border)]">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium" style={{ color: 'var(--brand-text-color)' }}>Banco de Dados</span>
              </div>
              {getStatusBadge(dbStatus)}
            </div>

            {/* Serviço 3: Mensageria */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-hover)] border border-[var(--surface-border)]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium" style={{ color: 'var(--brand-text-color)' }}>Realtime & Fila</span>
              </div>
              {getStatusBadge(queueStatus)}
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="text-xs p-3 rounded-lg text-center font-medium" style={{ background: 'var(--status-error-bg)', border: '1px solid var(--status-error-border)', color: 'var(--status-error-text)' }}>
            {errorMsg}
          </div>
        )}

        <div className="pt-2">
          <Button
            onClick={handleRetry}
            disabled={checking}
            className="w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Verificando Conexão...' : 'Tentar Novamente'}
          </Button>
        </div>

        <div
          className="text-center text-[10px]"
          style={{ color: 'var(--brand-text-color)', opacity: 0.5 }}
        >
          Tentando conectar automaticamente a cada 3 segundos.
        </div>
      </Card>
    </div>
  );
}
