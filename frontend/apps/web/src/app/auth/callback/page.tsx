'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api } from '@/lib/api';
import { Card, LoadingSpinner } from '@psi/ui';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const { reloadBrand } = useBrand();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        // 1. Obter hash da URL (onde o GoTrue passa os tokens de acesso)
        const hash = window.location.hash;
        if (!hash) {
          setError('Nenhum dado de autenticação encontrado na URL.');
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
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
          <h2 className="text-xl font-bold text-slate-100">Erro de Autenticação</h2>
          <p className="text-sm text-slate-400 leading-relaxed">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full h-[42px] rounded-xl text-xs font-semibold cursor-pointer border-none text-white font-mono uppercase bg-slate-900 hover:bg-slate-800 transition-all"
          >
            Voltar para Login
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <LoadingSpinner message="Autenticando e preparando o seu espaço..." className="min-h-[50vh]" />
    </div>
  );
}
