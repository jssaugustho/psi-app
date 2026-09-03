'use client';

import React from 'react';
import { ServiceStatusCard, useApiStatus } from '@psi/ui';
import { useBrand } from '@/context/BrandContext';

export default function OfflinePage() {
  const { isOffline, checking, errorMsg, apiStatus, dbStatus, queueStatus, checkHealth } = useApiStatus();
  const { theme, toggleTheme } = useBrand();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ backgroundColor: 'var(--brand-bg-color, #09090B)', transition: 'background-color 0.3s' }}
    >
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

      <ServiceStatusCard
        isModal={false}
        apiStatus={apiStatus}
        dbStatus={dbStatus}
        queueStatus={queueStatus}
        checking={checking}
        errorMsg={errorMsg}
        onRetry={() => checkHealth(false)}
      />
    </div>
  );
}
