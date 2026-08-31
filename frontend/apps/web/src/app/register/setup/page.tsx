'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api } from '@/lib/api';
import { Card, Input, Button } from '@psi/ui';

export default function RegisterSetupPage() {
  const router = useRouter();
  const { user, setUser, loading: authLoading } = useAuth();
  const { tenant, primaryTenant, theme, toggleTheme } = useBrand();
  
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [crp, setCrp] = useState('');
  const [hasNoCrp, setHasNoCrp] = useState(false);
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
      setCpf(user.cpf || '');
      setCrp(user.crp || '');
      setHasNoCrp(user.has_no_crp ?? false);
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
        cpf: cpf.trim() || null,
        crp: hasNoCrp ? null : (crp.trim() || null),
        hasNoCrp: hasNoCrp,
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

  const logoUrl =
    theme === 'light'
      ? (tenant?.logoLightUrl || tenant?.logoDarkUrl || primaryTenant?.logoLightUrl || primaryTenant?.logoDarkUrl)
      : (tenant?.logoDarkUrl || tenant?.logoLightUrl || primaryTenant?.logoDarkUrl || primaryTenant?.logoLightUrl);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <div className="animate-pulse flex items-center gap-2">
          <span>Carregando dados de ativação...</span>
        </div>
      </div>
    );
  }

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
            <img src={logoUrl} alt={tenant?.name || 'Logo'} className="max-h-16 max-w-[80%] mx-auto object-contain mb-4" />
          )}

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
          <p className="text-sm" style={{ color: 'var(--brand-text-color)', opacity: 0.6 }}>
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
            label="CPF (Opcional)"
            type="text"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="000.000.000-00"
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold" style={{ color: 'var(--brand-text-color)', opacity: 0.8 }}>
                CRP (Registro Profissional)
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none" style={{ color: 'var(--brand-text-color)', opacity: 0.8 }}>
                <input
                  type="checkbox"
                  checked={hasNoCrp}
                  onChange={(e) => {
                    setHasNoCrp(e.target.checked);
                    if (e.target.checked) setCrp('');
                  }}
                  className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer"
                />
                <span>Não tenho CRP</span>
              </label>
            </div>
            <Input
              type="text"
              disabled={hasNoCrp}
              value={hasNoCrp ? '' : crp}
              onChange={(e) => setCrp(e.target.value)}
              placeholder={hasNoCrp ? 'Dispensado de CRP' : 'Ex: CRP 06/123456'}
              className={hasNoCrp ? 'opacity-50 cursor-not-allowed' : ''}
            />
          </div>

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
