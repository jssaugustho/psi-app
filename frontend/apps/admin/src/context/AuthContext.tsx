'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, User } from '../lib/api';
import { EditProfileModal } from '../components/edit-profile-modal';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (nome: string, sobrenome: string, telefone: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isProfileOpen: boolean;
  setIsProfileOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const router = useRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── logout imperativo ───────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.logout().catch(() => {});
    } finally {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  // ─── renovação proativa do JWT ───────────────────────────────────────────
  const performRefresh = useCallback(async () => {
    try {
      await api.refreshToken();
      scheduleRefresh();
    } catch {
      await logout();
    }
  }, [logout]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    // Agenda renovação a cada 45 minutos para manter os cookies renovados
    refreshTimerRef.current = setTimeout(performRefresh, 45 * 60 * 1000);
  }, [performRefresh]);

  // ─── escuta evento 'auth:logout' emitido pelo fetchApi e visibilidade da aba ───
  useEffect(() => {
    const handleAuthLogout = () => {
      logout();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        performRefresh().catch(() => {});
      }
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [logout, performRefresh, user]);

  // ─── carregamento inicial da sessão via cookies HttpOnly ─────────────────
  useEffect(() => {
    async function loadUser() {
      if (typeof window !== 'undefined' && window.location.pathname === '/offline') {
        setLoading(false);
        return;
      }

      try {
        const res = await api.getMe();
        setUser(res.user);
        scheduleRefresh();
      } catch {
        try {
          await api.refreshToken();
          const res = await api.getMe();
          setUser(res.user);
          scheduleRefresh();
        } catch {
          setUser(null);
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

  // ─── login ────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });

    setUser(res.user);
    scheduleRefresh();
    router.push('/dashboard');
  };

  // ─── register ────────────────────────────────────────────────────────────
  const register = async (
    nome: string,
    sobrenome: string,
    telefone: string,
    email: string,
    password: string
  ) => {
    await api.register({ nome, sobrenome, telefone, email, password });
    await login(email, password);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser, isProfileOpen, setIsProfileOpen }}>
      {children}
      {user && (
        <EditProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={user}
          onUserUpdated={(u) => setUser(u)}
        />
      )}
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
