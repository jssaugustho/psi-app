'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Card, Input, Button } from '@psi/ui';

export default function RegisterSetupPage() {
  const router = useRouter();
  const { user, setUser, loading: authLoading } = useAuth();
  
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Inicializa os dados com base no usuário logado temporariamente
  useEffect(() => {
    if (user) {
      setNome(user.nome === 'Colaborador' ? '' : user.nome);
      setSobrenome(user.sobrenome || '');
      setTelefone(user.telefone || '');
    }
  }, [user]);

  // Bloqueia acesso caso o usuário não esteja pré-autenticado pelo magic-link
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nome.trim() || !sobrenome.trim()) {
      setError('Nome e sobrenome são obrigatórios.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Atualiza dados cadastrais e senha no GoTrue e banco de dados
      await api.updateMe({
        nome: nome.trim(),
        sobrenome: sobrenome.trim(),
        telefone: telefone.trim() || null,
        password: password,
      });

      // 2. Recarrega os dados do usuário para o AuthContext
      const profileRes = await api.getMe();
      setUser(profileRes.user);

      // 3. Redireciona para o painel principal
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro ao finalizar suas configurações de acesso.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="animate-pulse flex items-center gap-2">
          <span>Carregando dados de ativação...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <Card className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 
            className="text-3xl font-bold bg-clip-text text-transparent" 
            style={{ 
              background: "var(--brand-gradient)", 
              WebkitBackgroundClip: "text", 
              WebkitTextFillColor: "transparent" 
            }}
          >
            Ativar Conta
          </h1>
          <p className="text-sm text-slate-400">
            Defina sua senha e configure seu perfil para começar a colaborar
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
            label="Definir Senha *"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />

          <Input
            label="Confirmar Senha *"
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />

          <Button type="submit" submitting={submitting} className="w-full mt-2">
            Finalizar Cadastro & Acessar
          </Button>
        </form>
      </Card>
    </div>
  );
}
