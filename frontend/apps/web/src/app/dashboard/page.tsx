'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@psi/ui';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-page-enter">
      <h1 className="text-2xl font-bold text-slate-100">Meu Perfil</h1>

      <Card>
        <div className="flex items-center gap-4 mb-6">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={`${user.nome} ${user.sobrenome}`}
              className="w-16 h-16 rounded-full object-cover shadow-lg"
            />
          ) : (
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg" style={{ background: 'var(--brand-gradient)' }}>
              {user.nome?.[0]?.toUpperCase()}
              {user.sobrenome?.[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-semibold text-slate-100">
              {user.nome} {user.sobrenome}
            </h2>
            <p className="text-sm text-slate-400">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800/60 text-sm">
          <div className="p-4 rounded-xl border" style={{ background: 'var(--surface-input, rgba(0,0,0,0.30))', borderColor: 'var(--surface-border)' }}>
            <span className="block text-xs text-slate-500 uppercase font-semibold">Nome</span>
            <span className="text-slate-200">{user.nome}</span>
          </div>
          <div className="p-4 rounded-xl border" style={{ background: 'var(--surface-input, rgba(0,0,0,0.30))', borderColor: 'var(--surface-border)' }}>
            <span className="block text-xs text-slate-500 uppercase font-semibold">Sobrenome</span>
            <span className="text-slate-200">{user.sobrenome}</span>
          </div>
          <div className="p-4 rounded-xl border" style={{ background: 'var(--surface-input, rgba(0,0,0,0.30))', borderColor: 'var(--surface-border)' }}>
            <span className="block text-xs text-slate-500 uppercase font-semibold">E-mail</span>
            <span className="text-slate-200">{user.email}</span>
          </div>
          <div className="p-4 rounded-xl border" style={{ background: 'var(--surface-input, rgba(0,0,0,0.30))', borderColor: 'var(--surface-border)' }}>
            <span className="block text-xs text-slate-500 uppercase font-semibold">Telefone</span>
            <span className="text-slate-200">{user.telefone || 'Não informado'}</span>
          </div>
          <div className="p-4 rounded-xl border md:col-span-2" style={{ background: 'var(--surface-input, rgba(0,0,0,0.30))', borderColor: 'var(--surface-border)' }}>
            <span className="block text-xs text-slate-500 uppercase font-semibold">Role Global</span>
            <span className="font-mono text-xs font-bold uppercase" style={{ color: 'var(--brand-gradient-start)' }}>{user.role || 'user'}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
