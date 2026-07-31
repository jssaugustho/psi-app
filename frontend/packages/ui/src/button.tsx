import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  submitting?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  submitting = false,
  className = '',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const baseStyle =
    'w-full font-semibold py-3 px-5 rounded-xl shadow-lg transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm outline-none border-none';

  // Estilos dinâmicos via CSS vars — sem cores hardcoded
  const variantStyle: React.CSSProperties = (() => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--brand-gradient, linear-gradient(135deg, #4F46E5, #06B6D4))',
          color: 'var(--brand-contrast-color, #FFFFFF)',
          boxShadow: '0 4px 24px color-mix(in srgb, var(--brand-gradient-start, #4F46E5) 30%, transparent)',
        };
      case 'secondary':
        return {
          background: 'var(--surface-active, rgba(255,255,255,0.10))',
          color: 'var(--brand-text-color, #F8FAFC)',
          border: '1px solid var(--surface-border, rgba(255,255,255,0.08))',
        };
      case 'outline':
        return {
          background: 'transparent',
          color: 'var(--brand-text-color, #F8FAFC)',
          border: '1px solid var(--surface-border, rgba(255,255,255,0.08))',
          opacity: 0.85,
        };
      case 'danger':
        return {
          background: 'linear-gradient(135deg, #DC2626, #E11D48)',
          color: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(220,38,38,0.25)',
        };
      default:
        return {};
    }
  })();

  return (
    <button
      disabled={disabled || submitting}
      style={{ ...variantStyle, ...style }}
      className={`${baseStyle} ${className}`}
      {...props}
    >
      {submitting ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Processando...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
