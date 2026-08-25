'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api } from '@/lib/api';
import { Button, Input, Card } from '@psi/ui';

export default function LoginPage() {
  const { login, user, loading: authLoading } = useAuth();
  const { tenant, primaryTenant, theme, toggleTheme, isBootReady } = useBrand();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Estados do Modal Esqueceu a Senha
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [sendingForgot, setSendingForgot] = useState(false);

  // Proteção: se já autenticado e boot concluído, aguardar redirect silencioso
  if (isBootReady && !authLoading && user) {
    return null;
  }

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
      ? (tenant?.logoLightUrl || tenant?.logoDarkUrl || primaryTenant?.logoLightUrl || primaryTenant?.logoDarkUrl)
      : (tenant?.logoDarkUrl || tenant?.logoLightUrl || primaryTenant?.logoDarkUrl || primaryTenant?.logoLightUrl);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
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
            <img src={logoUrl} alt={tenant?.name || primaryTenant?.name || 'Logo'} className="max-h-16 max-w-[80%] mx-auto object-contain mb-4" />
          )}

          <h1 className="text-3xl font-bold bg-clip-text text-transparent" style={{ background: "var(--brand-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Acessar Conta
          </h1>
          <p className="text-sm" style={{ color: 'var(--brand-text-color)', opacity: 0.6 }}>
            Entre com suas credenciais para continuar
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
          />

          <Input
            label="Senha"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <div className="flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={() => {
                setForgotEmail(email);
                setForgotSuccess(null);
                setForgotError(null);
                setIsForgotModalOpen(true);
              }}
              className="text-xs hover:underline bg-transparent border-none cursor-pointer font-medium"
              style={{ color: 'var(--brand-gradient-start)' }}
            >
              Esqueceu sua senha?
            </button>
          </div>

          <Button type="submit" submitting={submitting} className="w-full mt-2">
            Entrar
          </Button>
        </form>

        <div className="text-center text-xs" style={{ color: 'var(--brand-text-color)', opacity: 0.65 }}>
          Ainda não tem conta?{' '}
          <Link href="/register" className="hover:underline font-medium" style={{ color: "var(--brand-gradient-start)" }}>
            Cadastre-se
          </Link>
        </div>

        {/* Modal: Esqueceu a Senha */}
        {isForgotModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div
              className="w-full max-w-md p-6 rounded-2xl space-y-4 shadow-2xl relative text-left"
              style={{
                background: 'var(--surface-input, rgba(15, 23, 42, 0.95))',
                border: '1px solid var(--surface-border)',
                color: 'var(--brand-text-color)',
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-lg font-bold">Recuperar Senha</h3>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="opacity-60 hover:opacity-100 bg-transparent border-none cursor-pointer text-slate-300 text-lg"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs opacity-75 leading-relaxed">
                Digite o e-mail cadastrado na sua conta para receber as instruções de redefinição de senha.
              </p>

              {forgotError && (
                <div
                  className="text-xs p-3 rounded-lg text-center font-medium"
                  style={{
                    background: 'var(--status-error-bg)',
                    border: '1px solid var(--status-error-border)',
                    color: 'var(--status-error-text)',
                  }}
                >
                  {forgotError}
                </div>
              )}

              {forgotSuccess ? (
                <div
                  className="text-xs p-4 rounded-xl text-center space-y-3"
                  style={{
                    background: 'var(--status-success-bg)',
                    border: '1px solid var(--status-success-border)',
                    color: 'var(--status-success-text)',
                  }}
                >
                  <p className="font-semibold">{forgotSuccess}</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="w-full text-xs py-2 mt-2"
                  >
                    Voltar ao Login
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setSendingForgot(true);
                    setForgotError(null);
                    setForgotSuccess(null);
                    try {
                      const res = await api.forgotPassword(forgotEmail);
                      setForgotSuccess(res.message);
                    } catch (err: any) {
                      setForgotError(err.message || 'Não foi possível enviar o e-mail de recuperação.');
                    } finally {
                      setSendingForgot(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <Input
                    label="E-mail"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="seu@email.com"
                  />

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsForgotModalOpen(false)}
                      className="text-xs py-2"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" submitting={sendingForgot} className="text-xs py-2">
                      Enviar E-mail de Recuperação
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
