'use client';

import React from 'react';
import { Card } from '@psi/ui';

export default function AgendaPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-page-enter">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Agenda de Consultas</h1>
      <Card className="p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto text-xl font-bold border" style={{ background: "color-mix(in srgb, var(--brand-gradient-start) 10%, transparent)", color: "var(--brand-gradient-start)", borderColor: "color-mix(in srgb, var(--brand-gradient-start) 20%, transparent)" }}>
          📅
        </div>
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Módulo de Agenda</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Esta tela conterá a agenda de atendimentos clínicos, marcações recorrentes e bloqueio de horários. Em breve na Etapa 2 de desenvolvimento.
        </p>
      </Card>
    </div>
  );
}
