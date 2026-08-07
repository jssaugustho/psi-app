'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button, Input, Card } from '@psi/ui';

export default function RegisterPage() {
  const { register } = useAuth();
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await register(nome, sobrenome, telefone, email, password);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao cadastrar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent" style={{ background: "var(--brand-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Criar sua Conta
          </h1>
          <p className="text-sm" style={{ color: 'var(--brand-text-color)', opacity: 0.6 }}>
            Preencha os campos para registrar seu perfil
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
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nome *"
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="João"
            />
            <Input
              label="Sobrenome *"
              type="text"
              required
              value={sobrenome}
              onChange={(e) => setSobrenome(e.target.value)}
              placeholder="Silva"
            />
          </div>

          <Input
            label="Telefone"
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(11) 99999-9999"
          />

          <Input
            label="E-mail *"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="joao@exemplo.com"
          />

          <Input
            label="Senha *"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <Button type="submit" submitting={submitting} className="w-full mt-2">
            Cadastrar
          </Button>
        </form>

        <div className="text-center text-xs" style={{ color: 'var(--brand-text-color)', opacity: 0.65 }}>
          Já possui uma conta?{' '}
          <Link href="/login" className="hover:underline font-medium" style={{ color: "var(--brand-gradient-start)" }}>
            Entrar
          </Link>
        </div>
      </Card>
    </div>
  );
}
