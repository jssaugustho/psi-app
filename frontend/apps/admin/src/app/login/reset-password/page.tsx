'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBrand } from '@/context/BrandContext';
import { api } from '@/lib/api';
import { Button, Input, Card } from '@psi/ui';

export default function AdminResetPasswordPage() {
  const { tenant, theme, toggleTheme } = useBrand();
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Extrai o token de recuperação do hash da URL (#access_token=...) ou da query string (?token=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;

      let extractedToken: string | null = null;

      if (hash) {
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        extractedToken = params.get('access_token') || params.get('token') || params.get('token_hash');
      }

      if (!extractedToken && search) {
        const params = new URLSearchParams(search);
        extractedToken = params.get('access_token') || params.get('token') || params.get('token_hash');
      }

      if (extractedToken) {
        setToken(extractedToken);
      } else {
        setError('Token de recuperação não encontrado na URL. Por favor, solicite um novo link de redefinição.');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (!token) {
      setError('Token de recuperação inválido ou expirado.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.resetPassword(password, token);
      setSuccess(res.message || 'Senha redefinida com sucesso! Você já pode fazer login com a nova senha.');
    } catch (err: any) {
      setError(err.message || 'Falha ao redefinir senha. O token pode ter expirado.');
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
      {/* Botão de alternância de tema */}
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

          <div
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2"
            style={{
              background: 'color-mix(in srgb, var(--brand-gradient-start) 15%, transparent)',
              border: '1px solid color-mix(in srgb, var(--brand-gradient-start) 30%, transparent)',
              color: 'var(--brand-gradient-start)',
            }}
          >
            Redefinição de Senha
          </div>

          <h1
            className="text-2xl font-bold"
            style={{
              background: 'var(--brand-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Cadastrar Nova Senha
          </h1>
          <p className="text-sm" style={{ color: 'var(--brand-text-color)', opacity: 0.65 }}>
            Crie uma nova senha segura para acessar o Backoffice
          </p>
        </div>

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

        {success ? (
          <div
            className="text-sm p-5 rounded-xl text-center space-y-4 shadow-lg"
            style={{
              background: 'var(--status-success-bg)',
              border: '1px solid var(--status-success-border)',
              color: 'var(--status-success-text)',
            }}
          >
            <p className="font-semibold text-base">{success}</p>
            <Link href="/login" className="block w-full">
              <Button className="w-full text-xs py-2.5">
                Ir para a Tela de Login →
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nova Senha"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />

            <Input
              label="Confirmar Nova Senha"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
            />

            <Button
              type="submit"
              submitting={submitting}
              disabled={!token}
              className="w-full mt-2"
            >
              Salvar Nova Senha
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
