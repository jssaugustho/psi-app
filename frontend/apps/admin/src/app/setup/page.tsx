'use client';

import React from 'react';
import { Card } from '@psi/ui';

export default function SetupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#09090B] text-slate-200">
      <Card className="w-full max-w-md text-center space-y-6 border border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-white">Setup via Interface Desativado</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Por motivos de segurança, o provisionamento do primeiro administrador do sistema pela interface gráfica foi desativado.
          </p>
        </div>
        <div className="text-left text-xs bg-black/40 border border-zinc-800 p-4 rounded-xl font-mono text-slate-500 space-y-3">
          <p className="text-slate-300">
            A ativação inicial e criação de usuário administrador deve ser realizada exclusivamente via terminal no servidor de backend:
          </p>
          <div className="bg-slate-950 p-2.5 rounded border border-zinc-800 text-slate-200 select-all font-semibold">
            npm run bootstrap
          </div>
        </div>
      </Card>
    </div>
  );
}
