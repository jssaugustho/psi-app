'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api } from '@/lib/api';
import { Button, Input, Card } from '@psi/ui';

export default function AdminLoginPage() {
  const { login } = useAuth();
  const { tenant, theme, toggleTheme } = useBrand();
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

  const logoUrl =
    theme === 'light'
      ? tenant?.logoLightUrl || tenant?.logoDarkUrl
      : tenant?.logoDarkUrl || tenant?.logoLightUrl;

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

      <Card className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          {logoUrl && (
            <img src={logoUrl} alt={tenant?.name || 'Logo'} className="max-h-16 max-w-[80%] mx-auto object-contain mb-4" />
          )}

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
            <svg className="w-8 h-8 mx-auto" style={{ color: "var(--brand-gradient-start)" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
