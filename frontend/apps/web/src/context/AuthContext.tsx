'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, User } from '../lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    nome: string,
    sobrenome: string,
    telefone: string,
    email: string,
    password: string,
    cpf?: string,
    crp?: string,
    hasNoCrp?: boolean
  ) => Promise<void>;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isProfileOpen: boolean;
  setIsProfileOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Lê o timestamp de expiração salvo e calcula quantos ms faltam,
 * descontando 60s de margem de segurança.
 */
function msUntilExpiry(): number {
  if (typeof window === 'undefined') return 0;
  const expiresAt = Number(localStorage.getItem('token_expires_at') ?? 0);
  if (!expiresAt) return 0;
  const safetyMarginMs = 60 * 1000; // renovar 60s antes
  return expiresAt * 1000 - Date.now() - safetyMarginMs;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const router = useRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── logout imperativo ───────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expires_at');
    if (typeof window !== 'undefined') {
      document.cookie = 'token=; path=/; max-age=0; SameSite=Lax; Secure';
    }
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setUser(null);
    router.push('/login');
  }, [router]);

  // ─── agendamento de refresh proativo do JWT ─────────────────────────────
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    const msLeft = msUntilExpiry();
    if (msLeft <= 0) {
      performRefresh();
      return;
    }

    refreshTimerRef.current = setTimeout(performRefresh, msLeft);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const performRefresh = useCallback(async () => {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    if (!refreshToken) {
      logout();
      return;
    }
    try {
      const data = await api.refreshToken(refreshToken);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('token_expires_at', String(data.expires_at));
      if (typeof window !== 'undefined') {
        document.cookie = `token=${data.access_token}; path=/; max-age=604800; SameSite=Lax; Secure`;
      }
      scheduleRefresh(); // agenda o próximo ciclo
    } catch {
      logout();
    }
  }, [logout, scheduleRefresh]);

  // ─── escuta evento 'auth:logout' emitido pelo fetchApi ──────────────────
  useEffect(() => {
    const handleAuthLogout = () => logout();
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, [logout]);

  // ─── carregamento inicial da sessão ──────────────────────────────────────
  useEffect(() => {
    async function loadUser() {
      if (typeof window !== 'undefined' && window.location.pathname === '/offline') {
        setLoading(false);
        return;
      }
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          scheduleRefresh(); // inicia o ciclo proativo
        } catch {
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem('token', res.access_token);
    localStorage.setItem('refresh_token', res.refresh_token);
    if (typeof window !== 'undefined') {
      document.cookie = `token=${res.access_token}; path=/; max-age=604800; SameSite=Lax; Secure`;
    }

    // Calcula e persiste o timestamp absoluto de expiração
    const expiresAt = Math.floor(Date.now() / 1000) + (res.expires_in ?? 3600);
    localStorage.setItem('token_expires_at', String(expiresAt));

    setUser(res.user);
    scheduleRefresh(); // inicia o ciclo proativo
    router.push('/dashboard');
  };

  const register = async (
    nome: string,
    sobrenome: string,
    telefone: string,
    email: string,
    password: string,
    cpf?: string,
    crp?: string,
    hasNoCrp?: boolean
  ) => {
    await api.register({ nome, sobrenome, telefone, email, password, cpf, crp, hasNoCrp });
    await login(email, password);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser, isProfileOpen, setIsProfileOpen }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
