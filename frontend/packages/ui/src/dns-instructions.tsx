'use client';

import React, { useState } from 'react';
import { ShieldCheck, Check, Copy, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from './loading-spinner';

export interface DnsRecordItem {
  type: string;
  name: string;
  value: string;
  description?: string;
}

export interface DnsInstructionsProps {
  /** Domínio sendo configurado (ex: www.suaclinica.com.br) */
  domain: string;
  /** Lista de registros DNS retornados da API (CNAME, TXT, A, etc) */
  dnsRecords?: DnsRecordItem[];
  /** Domínio base padrão da plataforma (ex: theraos.app) */
  baseDomain?: string;
  /** Função de callback ao clicar em "Checar Apontamento DNS Agora" */
  onVerifyDns?: () => void | Promise<void>;
  /** Estado de carregamento da checagem de DNS */
  isVerifying?: boolean;
  /** Função de fechar modal / concluir */
  onClose?: () => void;
  /** Título customizado (padrão: "Configuração DNS: {domain}") */
  title?: string;
  /** Subtítulo (padrão: "Integração Cloudflare & Registros de Apontamento") */
  subtitle?: string;
  /** Exibir ou não os botões de ação no rodapé */
  showActions?: boolean;
  /** Classes CSS adicionais para o container principal */
  className?: string;
}

export function DnsInstructions({
  domain,
  dnsRecords = [],
  baseDomain = 'theraos.app',
  onVerifyDns,
  isVerifying = false,
  onClose,
  title,
  subtitle = 'Integração Cloudflare & Registros de Apontamento',
  showActions = true,
  className = '',
}: DnsInstructionsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyText = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fallbackCnameTarget = baseDomain && !baseDomain.includes('localhost') ? `custom.${baseDomain}` : 'custom.ajstrategy.digital';

  const recordsToDisplay =
    dnsRecords && dnsRecords.length > 0
      ? dnsRecords
      : [
          { type: 'CNAME', name: 'www', value: fallbackCnameTarget, description: 'Redirecionamento CNAME do subdomínio para o servidor da plataforma' },
          { type: 'A', name: '@ (ou em branco)', value: '185.199.108.153', description: 'Endereço IP do servidor do site' },
        ];

  return (
    <div className={`space-y-5 text-slate-900 dark:text-white ${className}`}>
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {title || `Configuração DNS: ${domain || 'Seu Domínio'}`}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>

      {/* Guia Passo a Passo */}
      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-xs text-slate-700 dark:text-slate-300 space-y-2">
        <p className="font-semibold text-slate-900 dark:text-slate-200">Passo a Passo para Conectar seu Domínio:</p>
        <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-slate-600 dark:text-slate-300">
          <li>Acesse a sua registradora de domínio (Registro.br, GoDaddy, Hostinger, etc.).</li>
          <li>
            Abra a seção <strong>'Gerenciar DNS'</strong> ou <strong>'Editar Zona DNS'</strong>.
          </li>
          <li>Crie ou atualize os registros com os dados da tabela abaixo:</li>
        </ol>
      </div>

      {/* Tabela com os Registros DNS */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold font-sans">
              <th className="p-3">Tipo</th>
              <th className="p-3">Nome / Host</th>
              <th className="p-3">Valor / Apontamento</th>
              <th className="p-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
            {recordsToDisplay.map((rec, idx) => (
              <tr key={idx} className="hover:bg-slate-100/80 dark:hover:bg-slate-900/50 transition-colors">
                <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{rec.type}</td>
                <td className="p-3 text-slate-700 dark:text-slate-300">{rec.name}</td>
                <td className="p-3 text-indigo-600 dark:text-indigo-300 truncate max-w-[160px]" title={rec.value}>
                  {rec.value}
                </td>
                <td className="p-3 text-right font-sans">
                  <button
                    type="button"
                    onClick={() => handleCopyText(rec.value, `record-${idx}`)}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-[11px] font-semibold flex items-center gap-1 ml-auto cursor-pointer transition-colors"
                  >
                    {copiedField === `record-${idx}` ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Botões de Ação */}
      {showActions && (
        <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
          {onVerifyDns && (
            <button
              type="button"
              onClick={onVerifyDns}
              disabled={isVerifying}
              className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <LoadingSpinner />
                  <span>Verificando DNS...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Checar Apontamento DNS Agora</span>
                </>
              )}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-xs font-semibold cursor-pointer transition-colors ml-auto"
            >
              Concluído
            </button>
          )}
        </div>
      )}
    </div>
  );
}
