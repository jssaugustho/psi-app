'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api } from '@/lib/api';
import { Card, LoadingSpinner } from '@psi/ui';

function AuthCallbackComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const { reloadBrand, theme, toggleTheme } = useBrand();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        // 1. Obter hash da URL (onde o GoTrue passa os tokens de acesso)
        const hash = window.location.hash;
        if (!hash) {
          setError('Nenhum dada de autenticação encontrado na URL.');
          return;
        }

        // Remover o caractere '#' inicial e parsear os parâmetros
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const expiresIn = params.get('expires_in');

        if (!accessToken || !refreshToken) {
          setError('Token de autenticação inválido ou expirado.');
          return;
        }

        // 2. Persistir a sessão nos locais esperados pela plataforma
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);

        const expiresAt = Math.floor(Date.now() / 1000) + (expiresIn ? Number(expiresIn) : 3600);
        localStorage.setItem('token_expires_at', String(expiresAt));

        // Gravar no cookie para SSR
        document.cookie = `token=${accessToken}; path=/; max-age=604800; SameSite=Lax; Secure`;

        // 3. Obter parâmetros adicionais de redirecionamento passados na URL de convite
        const type = searchParams.get('type');
        const tenantId = searchParams.get('tenant_id');

        if (tenantId) {
          sessionStorage.setItem('active_tenant_id', tenantId);
          // Recarrega o branding para coincidir com o consultório convidado
          await reloadBrand();
        }

        // 4. Buscar o perfil completo do usuário logado
        const profileRes = await api.getMe();
        setUser(profileRes.user);

        // 5. Redirecionar para o destino apropriado
        if (type === 'invite') {
          // Se for convite (novo usuário), deve definir senha e completar perfil
          router.push('/register/setup');
        } else {
          // Usuário existente ou login comum, vai direto para o dashboard
          router.push('/dashboard');
        }
      } catch (err: any) {
        console.error('Erro no callback de autenticação:', err);
        setError(err.message || 'Falha ao autenticar sua sessão.');
      }
    }

    handleCallback();
  }, [router, searchParams, setUser, reloadBrand]);

  if (error) {
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

        <Card className="w-full max-w-md p-6 space-y-4 text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl"
            style={{
              background: 'var(--status-error-bg)',
              color: 'var(--status-error-text)',
              border: '1px solid var(--status-error-border)',
            }}
          >
            ⚠️
          </div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--brand-text-color)' }}>Erro de Autenticação</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--brand-text-color)', opacity: 0.7 }}>{error}</p>
          <button
            onClick={() => router.push('/login')}
            style={{
              background: 'var(--brand-gradient-start)',
              color: 'var(--brand-contrast-color)',
            }}
            className="w-full h-[42px] rounded-xl text-xs font-semibold cursor-pointer border-none font-mono uppercase hover:opacity-90 transition-all"
          >
            Voltar para Login
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <LoadingSpinner message="Autenticando e preparando o seu espaço..." className="min-h-[50vh]" />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center relative">
        <LoadingSpinner message="Preparando o seu espaço..." className="min-h-[50vh]" />
      </div>
    }>
      <AuthCallbackComponent />
    </Suspense>
  );
}
