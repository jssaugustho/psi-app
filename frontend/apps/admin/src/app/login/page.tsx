'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button, Input, Card } from '@psi/ui';

export default function AdminLoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [bootstrapped, setBootstrapped] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkBootstrap() {
      try {
        const res = await api.getBootstrapStatus();
        setBootstrapped(res.bootstrapped);
        if (res.bootstrapped === false) {
          router.push('/setup');
        }
      } catch (err: any) {
        console.error('Erro ao verificar status do bootstrap:', err);
      }
    }
    checkBootstrap();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          {/* Badge de acesso restrito — usa gradiente da marca com opacidade */}
          <div
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2"
            style={{
              background: 'color-mix(in srgb, var(--brand-gradient-start) 15%, transparent)',
              border: '1px solid color-mix(in srgb, var(--brand-gradient-start) 30%, transparent)',
              color: 'var(--brand-gradient-start)',
            }}
          >
            Área de Acesso Restrito
          </div>

          <h1
            className="text-3xl font-bold"
            style={{
              background: 'var(--brand-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Backoffice Admin
          </h1>
          <p className="text-sm" style={{ color: 'var(--brand-text-color)', opacity: 0.6 }}>
            Apenas administradores autorizados do sistema
          </p>
        </div>

        {/* Banner de primeiro setup */}
        {bootstrapped === false && (
          <div
            className="rounded-xl p-4 space-y-3 text-center shadow-lg"
            style={{
              background: 'color-mix(in srgb, var(--brand-gradient-start) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--brand-gradient-start) 35%, transparent)',
            }}
          >
            <svg className="w-8 h-8 text-indigo-400 mx-auto" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 8.41a14.98 14.98 0 00-2.58 5.84m8.54-5.84a6 6 0 01-7.38 5.84v4.8m0 0L3 21l3-3.59" />
            </svg>
            <h3
              className="text-sm font-bold"
              style={{ color: 'var(--brand-text-color)' }}
            >
              Primeira Inicialização do Sistema
            </h3>
            <p className="text-xs" style={{ color: 'var(--brand-text-color)', opacity: 0.75 }}>
              Nenhum Administrador foi encontrado. Redirecionando para o Setup de Inicialização...
            </p>
            <Link href="/setup" className="block w-full">
              <Button className="w-full text-xs py-2">
                Criar Primeiro Administrador →
              </Button>
            </Link>
          </div>
        )}

        {error && (
          <div
            className="text-sm p-3 rounded-lg text-center font-medium"
            style={{
              background: 'var(--status-error-bg)',
              border: '1px solid var(--status-error-border)',
              color: 'var(--status-error-text)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="E-mail Admin"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@exemplo.com"
          />

          <Input
            label="Senha"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <Button type="submit" submitting={submitting} className="w-full mt-2">
            Acessar Backoffice
          </Button>
        </form>
      </Card>
    </div>
  );
}
