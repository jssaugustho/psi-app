'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface ProgressContextType {
  start: () => void;
  stop: () => void;
  loading: boolean;
}

const ProgressContext = createContext<ProgressContextType>({
  start: () => {},
  stop: () => {},
  loading: false,
});

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();

  // Sempre que a rota mudar, para o progresso
  useEffect(() => {
    stop();
  }, [pathname]);

  const start = () => {
    setLoading(true);
    setProgress(15);
  };

  const stop = () => {
    setProgress(100);
    setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 200);
  };

  // Efeito para simular um progresso incremental realista
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading && progress < 90) {
      timer = setTimeout(() => {
        setProgress((prev) => {
          // Incrementa de forma desacelerada conforme se aproxima de 90%
          const increment = Math.max(1, Math.round((90 - prev) * 0.12));
          return prev + increment;
        });
      }, 80);
    }
    return () => clearTimeout(timer);
  }, [loading, progress]);

  return (
    <ProgressContext.Provider value={{ start, stop, loading }}>
      {/* Barra de carregamento fixa no topo na cor do gradiente do tenant */}
      {loading && (
        <div
          className="fixed top-0 left-0 h-[3px] z-[9999] transition-all duration-150 ease-out"
          style={{
            width: `${progress}%`,
            background: 'var(--brand-gradient)',
            boxShadow: '0 1px 10px rgba(6, 182, 212, 0.4)',
          }}
        />
      )}
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  return useContext(ProgressContext);
}
