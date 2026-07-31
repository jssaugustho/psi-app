'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppShell, Card } from '@psi/ui';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-indigo-500 animate-ping" />
          <span>Carregando sessão...</span>
        </div>
      </div>
    );
  }

  const menuItems = [
    { label: 'Perfil', href: '/dashboard', active: true },
    { label: 'Equipe', href: '/dashboard/membros', active: false },
    { label: 'Faturamento', href: '/dashboard/faturamento', active: false },
  ];

  return (
    <AppShell appName="Psi App" menuItems={menuItems} user={user} onLogout={logout} LinkComponent={Link}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-100">Meu Perfil</h1>

        <Card>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {user.nome[0]?.toUpperCase()}
              {user.sobrenome[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-100">
                {user.nome} {user.sobrenome}
              </h2>
              <p className="text-sm text-slate-400">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800/60 text-sm">
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/40">
              <span className="block text-xs text-slate-500 uppercase font-semibold">Nome</span>
              <span className="text-slate-200">{user.nome}</span>
            </div>
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/40">
              <span className="block text-xs text-slate-500 uppercase font-semibold">Sobrenome</span>
              <span className="text-slate-200">{user.sobrenome}</span>
            </div>
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/40">
              <span className="block text-xs text-slate-500 uppercase font-semibold">E-mail</span>
              <span className="text-slate-200">{user.email}</span>
            </div>
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/40">
              <span className="block text-xs text-slate-500 uppercase font-semibold">Telefone</span>
              <span className="text-slate-200">{user.telefone || 'Não informado'}</span>
            </div>
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/40 md:col-span-2">
              <span className="block text-xs text-slate-500 uppercase font-semibold">Role Global</span>
              <span className="font-mono text-xs text-indigo-400 font-bold uppercase">{user.role || 'user'}</span>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
