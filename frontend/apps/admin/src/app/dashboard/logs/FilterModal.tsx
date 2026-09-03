'use client';

import React from 'react';
import { BrandModal, Button, Input, Select } from '@psi/ui';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  setServiceName: (v: string) => void;
  logType: string;
  setLogType: (v: string) => void;
  severity: string;
  setSeverity: (v: string) => void;
  errorName: string;
  setErrorName: (v: string) => void;
  errorMessage: string;
  setErrorMessage: (v: string) => void;
  userId: string;
  setUserId: (v: string) => void;
  sessionId: string;
  setSessionId: (v: string) => void;
  requestId: string;
  setRequestId: (v: string) => void;
  clientApp: string;
  setClientApp: (v: string) => void;
  userRole: string;
  setUserRole: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  onApply: () => void;
  onReset: () => void;
}

function formatForDatetimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function FilterModal({
  isOpen,
  onClose,
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
  onApply,
  onReset,
}: FilterModalProps) {
  const handleApply = () => {
    onApply();
    onClose();
  };

  const setPresetLastHour = () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    setStartDate(formatForDatetimeInput(oneHourAgo));
    setEndDate(formatForDatetimeInput(now));
  };

  const setPresetLast24h = () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    setStartDate(formatForDatetimeInput(yesterday));
    setEndDate(formatForDatetimeInput(now));
  };

  const setPresetToday = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    setStartDate(formatForDatetimeInput(startOfDay));
    setEndDate(formatForDatetimeInput(now));
  };

  return (
    <BrandModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div className="border-b border-brand-divider pb-3">
          <h2 className="text-lg font-bold">Filtros de Monitoramento</h2>
          <p className="text-xs opacity-60">Filtre os registros por serviço, severidade, intervalo de data/hora preciso ou usuário.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <label className="block text-xs font-semibold mb-1 opacity-70">Origem da Aplicação (Client App)</label>
            <Select
              value={clientApp}
              onChange={(e) => setClientApp(e.target.value)}
              className="w-full"
              options={[
                { value: '', label: 'Todas as Aplicações' },
                { value: 'admin', label: 'Admin (Backoffice)' },
                { value: 'web', label: 'Web App (Clínicas/Dashboard)' },
                { value: 'sites', label: 'Sites / Triagens Públicas' },
                { value: 'core-api', label: 'Core API' },
                { value: 'workers', label: 'Background Workers' },
                { value: 'unknown', label: 'Desconhecido / Externo' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 opacity-70">Papel do Usuário (User Role)</label>
            <Select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="w-full"
              options={[
                { value: '', label: 'Todos os Papéis' },
                { value: 'admin', label: 'Administrador Global' },
                { value: 'psychologist', label: 'Psicólogo Titular' },
                { value: 'collaborator', label: 'Colaborador / Secretária' },
                { value: 'anon', label: 'Visitante / Não Autenticado' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 opacity-70">Tipo de Log</label>
            <Select
              value={logType}
              onChange={(e) => setLogType(e.target.value)}
              className="w-full"
              options={[
                { value: '', label: 'Todos os Tipos' },
                { value: 'error', label: 'Error (Erro)' },
                { value: 'info', label: 'Info (Informação)' },
                { value: 'audit', label: 'Audit (Auditoria)' },
                { value: 'system', label: 'System (Sistema)' },
                { value: 'dlq', label: 'DLQ (Fila Morta)' },
                { value: 'warn', label: 'Warn (Aviso)' },
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
                { value: 'info', label: 'Info (Informação)' },
                { value: 'warning', label: 'Warning (Aviso)' },
                { value: 'error', label: 'Error (Erro)' },
                { value: 'fatal', label: 'Fatal (Crítico)' },
                { value: 'debug', label: 'Debug' },
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

          <div>
            <label className="block text-xs font-semibold mb-1 opacity-70">User ID</label>
            <Input
              type="text"
              placeholder="UUID do Usuário..."
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 opacity-70">Request ID (Tracing)</label>
            <Input
              type="text"
              placeholder="UUID da Requisição..."
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              className="w-full text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 opacity-70">Session ID</label>
            <Input
              type="text"
              placeholder="UUID da Sessão..."
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 opacity-70">Data e Hora Inicial</label>
            <Input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 opacity-70">Data e Hora Final</label>
            <Input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs"
            />
          </div>
        </div>

        {/* Presets Rápidos de Data/Hora */}
        <div className="pt-2">
          <label className="block text-xs font-semibold mb-1.5 opacity-70">Atalhos de Intervalo de Tempo:</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={setPresetLastHour}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-brand-divider hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Última 1 hora
            </button>
            <button
              type="button"
              onClick={setPresetLast24h}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-brand-divider hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Últimas 24 horas
            </button>
            <button
              type="button"
              onClick={setPresetToday}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-brand-divider hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Hoje
            </button>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="px-2.5 py-1 text-xs rounded text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-colors cursor-pointer"
              >
                Limpar Horários
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-brand-divider">
          <Button variant="secondary" onClick={onReset}>
            Limpar Filtros
          </Button>
          <Button variant="primary" onClick={handleApply}>
            Aplicar Filtros
          </Button>
        </div>
      </div>
    </BrandModal>
  );
}
