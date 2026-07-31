'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user && user.role === 'admin') {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [loading, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--brand-text-color)' }}>
      <div className="animate-pulse flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-indigo-500 animate-ping" />
        <span>Carregando Backoffice...</span>
      </div>
    </div>
  );
}
