'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button, Input, Card } from '@psi/ui';

export default function SetupPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [checking, setChecking] = useState(true);
  const [bootstrapped, setBootstrapped] = useState(false);

  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      try {
        const status = await api.getBootstrapStatus();
        setBootstrapped(status.bootstrapped);
      } catch (err: any) {
        console.error('Erro ao verificar status de bootstrap:', err);
      } finally {
        setChecking(false);
      }
    }
    checkStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await api.bootstrapAdmin({
        nome,
        sobrenome,
        telefone: telefone || undefined,
        email,
        password,
      });

      // Salvar token e redirecionar
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('refresh_token', res.refresh_token);
        const expiresAt = Math.floor(Date.now() / 1000) + (res.expires_in ?? 3600);
        localStorage.setItem('token_expires_at', String(expiresAt));
      }

      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Falha ao realizar o bootstrap.');
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (checking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: 'color-mix(in srgb, var(--brand-gradient-start) 30%, transparent)',
              borderTopColor: 'var(--brand-gradient-start)',
            }}
          />
          <p className="text-sm" style={{ opacity: 0.6 }}>
            Verificando estado de inicialização do sistema...
          </p>
        </div>
      </div>
    );
  }

  // ── Já inicializado ───────────────────────────────────────────────────────
  if (bootstrapped) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
      >
        <Card className="w-full max-w-md text-center space-y-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto"
            style={{
              background: 'var(--status-success-bg)',
              border: '1px solid var(--status-success-border)',
              color: 'var(--status-success-text)',
            }}
          >
            🛡️
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Sistema Já Inicializado</h1>
            <p className="text-sm" style={{ opacity: 0.6 }}>
              O primeiro Administrador do sistema já foi cadastrado e a rota de bootstrap inicial
              foi desativada por segurança.
            </p>
          </div>
          <Button onClick={() => router.push('/login')} className="w-full">
            Ir para a Tela de Login
          </Button>
        </Card>
      </div>
    );
  }

  // ── Formulário de Bootstrap ───────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          {/* Badge de setup — usa gradiente da marca */}
          <div
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2"
            style={{
              background: 'color-mix(in srgb, var(--brand-gradient-start) 15%, transparent)',
              border: '1px solid color-mix(in srgb, var(--brand-gradient-start) 30%, transparent)',
              color: 'var(--brand-gradient-start)',
            }}
          >
            🚀 Setup de Inicialização do Sistema
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
            Primeiro Administrador
          </h1>
          <p className="text-sm" style={{ opacity: 0.6 }}>
            Nenhum administrador foi detectado. Preencha os dados para registrar o Super Admin do sistema.
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Nome *"
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Carlos"
            />
            <Input
              label="Sobrenome *"
              type="text"
              required
              value={sobrenome}
              onChange={(e) => setSobrenome(e.target.value)}
              placeholder="Ex: Eduardo"
            />
          </div>

          <Input
            label="Telefone (opcional)"
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(11) 99999-9999"
          />

          <Input
            label="E-mail do Administrador *"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@seudominio.com"
          />

          <Input
            label="Senha (mínimo 6 caracteres) *"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <Button type="submit" submitting={submitting} className="w-full mt-4 py-3 text-base">
            Inicializar e Criar Administrador
          </Button>
        </form>
      </Card>
    </div>
  );
}
