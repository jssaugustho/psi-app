'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';

export default function Home() {
  const { user, loading } = useAuth();
  const { isBootReady } = useBrand();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isBootReady) {
      if (user && user.role === 'admin') {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [loading, isBootReady, user, router]);

  // O BrandContext já exibe o loader de tela cheia durante o boot.
  // Retornar null evita um segundo spinner piscando sob ele.
  return null;
}
