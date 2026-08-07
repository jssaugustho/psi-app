'use client';

import React from 'react';
import { X, FileText } from 'lucide-react';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
}

export function ContractModal({ isOpen, onClose, patientName }: ContractModalProps) {
  if (!isOpen) return null;

  const contractContent = `
# CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PSICOLOGIA

Pelo presente instrumento, de um lado o psicólogo clínico e de outro lado o(a) paciente/responsável ${patientName}, têm entre si justo e acordado as seguintes cláusulas:

## 1. Do Objetivo
O objetivo deste contrato é a prestação de serviços psicológicos na modalidade de psicoterapia, com foco no bem-estar, saúde mental e resolução de demandas clínicas apresentadas pelo(a) paciente.

## 2. Da Frequência e Duração das Sessões
As sessões de psicoterapia ocorrerão semanalmente (ou conforme alinhamento prévio), com duração de 50 (cinquenta) minutos por sessão.

## 3. Do Sigilo Profissional
O psicólogo se compromete a manter o sigilo absoluto sobre quaisquer informações obtidas durante o processo terapêutico, em estrita observância ao Código de Ética Profissional do Psicólogo. As exceções a esta regra limitam-se aos casos previstos por lei (como risco iminente à vida do paciente ou de terceiros).

## 4. Faltas e Desmarcações
Desmarcações deverão ser realizadas com no mínimo 24 horas de antecedência. Caso contrário, a sessão será considerada realizada e o valor correspondente será cobrado integralmente.

## 5. Do Pagamento e Valores
Os valores dos honorários serão acordados verbalmente ou em anexo financeiro e deverão ser pagos conforme a periodicidade estabelecida (mensal, por sessão, etc.).

## 6. Vigência e Rescisão
Este contrato tem vigência por prazo indeterminado e poderá ser rescindido por qualquer uma das partes a qualquer momento, mediante aviso prévio simples.

Este é um documento de valor ético e profissional.
`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="brand-overlay" onClick={onClose} />

      {/* Modal Content */}
      <div className="brand-modal w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl shadow-2xl relative z-10 animate-page-enter">
        {/* Header */}
        <div className="p-5 border-b border-[var(--surface-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--brand-gradient-start)]" />
            <h2 className="text-lg font-bold text-slate-100">Contrato de Prestação de Serviços</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-slate-300 text-sm leading-relaxed custom-scrollbar whitespace-pre-wrap">
          {contractContent}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[var(--surface-border)] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-lg bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
