'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { BrandModal } from '@psi/ui';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
}

export function ContractModal({ isOpen, onClose, patientName }: ContractModalProps) {
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
    <BrandModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl" showCloseButton={true}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--surface-border)] pb-4 -mt-2">
        <FileText className="w-5 h-5 text-[var(--brand-gradient-start)]" />
        <h2 className="text-lg font-bold text-slate-100">Contrato de Prestação de Serviços</h2>
      </div>

      {/* Content */}
      <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-4 text-slate-300 text-xs leading-relaxed custom-scrollbar whitespace-pre-wrap">
        {contractContent}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--surface-border)] pt-4 flex justify-end">
        <button
          onClick={onClose}
          className="px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-lg bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none uppercase tracking-wider"
        >
          Fechar
        </button>
      </div>
    </BrandModal>
  );
}
