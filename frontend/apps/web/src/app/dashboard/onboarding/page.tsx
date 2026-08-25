'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api } from '@/lib/api';
import { Card, Input, Button } from '@psi/ui';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { primaryTenant, theme, toggleTheme, reloadBrand } = useBrand();

  const [workspaceName, setWorkspaceName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  
  const [subdomainError, setSubdomainError] = useState<string | null>(null);
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redireciona se o usuário não estiver autenticado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Sanitizar o nome do workspace para gerar o subdomínio padrão
  const sanitizeSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD') // remove acentos
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '-') // apenas letras, números e hífen
      .replace(/-+/g, '-') // remove hífens duplicados
      .replace(/^-+|-+$/g, ''); // remove hífens nas pontas
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWorkspaceName(val);
    
    // Atualiza o subdomínio automaticamente se o usuário ainda não tiver editado manualmente
    setSubdomain(sanitizeSlug(val));
    setSubdomainAvailable(null);
    setSubdomainError(null);
  };

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = sanitizeSlug(e.target.value);
    setSubdomain(val);
    setSubdomainAvailable(null);
    setSubdomainError(null);
  };

  // Efeito para verificar a disponibilidade do subdomínio
  useEffect(() => {
    if (!subdomain.trim() || subdomain.length < 3) {
      setSubdomainAvailable(null);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsCheckingSubdomain(true);
      try {
        const isTaken = await api.checkSubdomainExists(subdomain);
        if (isTaken) {
          setSubdomainError('Este subdomínio já está em uso.');
          setSubdomainAvailable(false);
        } else {
          setSubdomainError(null);
          setSubdomainAvailable(true);
        }
      } catch (err) {
        console.error('Erro ao checar subdomínio:', err);
      } finally {
        setIsCheckingSubdomain(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [subdomain]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) return;
    if (!workspaceName.trim()) {
      setError('O nome do workspace é obrigatório.');
      return;
    }

    if (!subdomain.trim() || subdomain.length < 3) {
      setError('O subdomínio deve conter no mínimo 3 caracteres.');
      return;
    }

    if (subdomainAvailable === false) {
      setError('Por favor, escolha um subdomínio disponível.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Criar o Workspace
      const workspace = await api.createWorkspace(workspaceName.trim(), user.id);
      
      if (!workspace || !workspace.id) {
        throw new Error('Falha ao instanciar o workspace.');
      }

      // 2. Cadastrar o Subdomínio
      await api.createWorkspaceDomain(workspace.id, subdomain.toLowerCase().trim());

      // 3. Cadastrar a Identidade Visual Padrão
      await api.createVisualIdentity({
        workspaceId: workspace.id,
        name: 'Identidade Padrão',
        isWorkspaceDefault: true,
        primaryColor: '#7C3AED',
        secondaryColor: '#A855F7',
        contrastColor: '#FFFFFF',
        bgColor: '#09090B',
        cardColor: '#18181B',
        textColor: '#F4F4F5'
      });

      // 4. Seed das Colunas Iniciais do CRM
      const defaultColumns = [
        { name: 'Triagem Pendente', slug: 'pendente', color: '#64748B', category: 'pendente', order: 1 },
        { name: 'Acolhimento', slug: 'acolhimento', color: '#3B82F6', category: 'acolhimento', order: 2 },
        { name: 'Em Terapia', slug: 'paciente', color: '#10B981', category: 'paciente', order: 3 },
        { name: 'Alta', slug: 'alta', color: '#8B5CF6', category: 'alta', order: 4 },
        { name: 'Arquivado', slug: 'negativa', color: '#EF4444', category: 'negativa', order: 5 },
      ];

      for (const col of defaultColumns) {
        await api.createPipelineColumn({
          tenant_id: workspace.id,
          name: col.name,
          order: col.order,
          slug: col.slug,
          color: col.color,
          category: col.category,
        }).catch((err) => {
          console.warn(`Erro ao criar coluna CRM "${col.name}":`, err);
        });
      }

      // 6. Configurar o workspace recém-criado como o ativo
      localStorage.setItem('active_workspace_id', workspace.id);
      localStorage.setItem('active_tenant_id', workspace.id);
      sessionStorage.setItem('active_workspace_id', workspace.id);
      document.cookie = `active_workspace_id=${workspace.id}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `active_tenant_id=${workspace.id}; path=/; max-age=31536000; SameSite=Lax`;

      // 7. Sincronizar branding e redirecionar
      await reloadBrand();
      
      // Redireciona de forma definitiva recarregando o app
      window.location.href = '/dashboard/crm';
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro ao criar seu workspace. Tente novamente.');
      setSubmitting(false);
    }
  };

  const logoUrl =
    theme === 'light'
      ? (primaryTenant?.logoLightUrl || primaryTenant?.logoDarkUrl)
      : (primaryTenant?.logoDarkUrl || primaryTenant?.logoLightUrl);

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'theraos.app';

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="animate-pulse flex items-center gap-2 brand-text-muted">
          <span>Verificando autenticação...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative animate-page-enter">
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

      <Card className="w-full max-w-lg space-y-6 p-8">
        <div className="text-center space-y-2">
          {logoUrl && (
            <img 
              src={logoUrl} 
              alt={primaryTenant?.name || 'TheraOS'} 
              className="max-h-12 max-w-[60%] mx-auto object-contain mb-4" 
            />
          )}

          <h1 
            className="text-3xl font-bold bg-clip-text text-transparent" 
            style={{ 
              background: "var(--brand-gradient)", 
              WebkitBackgroundClip: "text", 
              WebkitTextFillColor: "transparent" 
            }}
          >
            Configurar Workspace
          </h1>
          <p className="text-sm brand-text-muted max-w-md mx-auto">
            Crie o seu espaço de trabalho profissional e personalize seu endereço de acesso na plataforma.
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Nome do Workspace *"
            type="text"
            required
            value={workspaceName}
            onChange={handleNameChange}
            placeholder="Ex: Consultório de Psicologia Ana"
          />

          <div className="space-y-1">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--brand-text-color)', opacity: 0.8 }}>
              Endereço do Workspace (Subdomínio) *
            </label>
            <div className="flex rounded-xl overflow-hidden border border-[var(--surface-border)] bg-[var(--surface-input)] focus-within:border-[var(--brand-gradient-start)] transition-all">
              <input
                type="text"
                required
                value={subdomain}
                onChange={handleSubdomainChange}
                placeholder="consultorio-ana"
                className="flex-1 px-4 py-3 bg-transparent text-sm text-[var(--brand-text-color)] outline-none border-none"
              />
              <span className="flex items-center px-4 py-3 bg-white/5 border-l border-[var(--surface-border)] text-xs font-semibold brand-text-muted">
                .{baseDomain}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-[11px] pt-1">
              {isCheckingSubdomain ? (
                <span className="text-slate-400">Verificando disponibilidade...</span>
              ) : subdomainError ? (
                <span className="text-red-400">{subdomainError}</span>
              ) : subdomainAvailable ? (
                <span className="text-emerald-400">✓ Este endereço está disponível!</span>
              ) : subdomain.length > 0 && subdomain.length < 3 ? (
                <span className="text-amber-400">Deve conter pelo menos 3 caracteres.</span>
              ) : (
                <span className="brand-text-muted">Apenas letras minúsculas, números e hífens.</span>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              submitting={submitting} 
              disabled={subdomainAvailable === false || subdomain.length < 3}
              className="w-full"
            >
              Criar Workspace & Entrar
            </Button>
          </div>
        </form>

        <div className="flex items-center justify-between text-xs pt-4 border-t border-[var(--surface-border)]" style={{ color: 'var(--brand-text-color)', opacity: 0.6 }}>
          <span>Logado como: <strong className="font-semibold" style={{ color: 'var(--brand-text-color)' }}>{user.email}</strong></span>
          <button
            onClick={logout}
            className="hover:underline transition-colors bg-transparent border-none cursor-pointer font-semibold"
            style={{ color: 'var(--brand-gradient-start)' }}
          >
            Sair da Conta
          </button>
        </div>
      </Card>
    </div>
  );
}
