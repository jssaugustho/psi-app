import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export function LoadingSpinner({ message = 'Carregando...', className = 'p-12' }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ color: 'var(--brand-text-color)' }}>
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{
            borderColor: 'color-mix(in srgb, var(--brand-gradient-start) 30%, transparent)',
            borderTopColor: 'var(--brand-gradient-start)',
          }}
        />
        <p className="text-xs" style={{ opacity: 0.6 }}>{message}</p>
      </div>
    </div>
  );
}
