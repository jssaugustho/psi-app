import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', style, ...props }: InputProps) {
  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          className="block text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--brand-text-color)', opacity: 0.65 }}
        >
          {label}
        </label>
      )}
      <input
        className={`w-full rounded-xl px-4 py-2.5 text-sm transition-all brand-input ${className}`}
        style={{
          background: 'var(--surface-input, rgba(0,0,0,0.30))',
          border: error
            ? '1px solid var(--status-error-border, rgba(239,68,68,0.25))'
            : '1px solid var(--surface-border, rgba(255,255,255,0.08))',
          color: 'var(--brand-text-color)',
          ...style,
        }}
        {...props}
      />
      {error && (
        <span
          className="block text-xs font-medium mt-1"
          style={{ color: 'var(--status-error-text, #F87171)' }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
