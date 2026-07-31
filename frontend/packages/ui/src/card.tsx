import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  style?: React.CSSProperties;
}

export function Card({ children, className = '', title, subtitle, style }: CardProps) {
  return (
    <div
      style={{
        color: 'var(--brand-text-color, #F8FAFC)',
        ...style,
      }}
      className={`glass-md rounded-2xl shadow-xl p-8 transition-all duration-300 ${className}`}
    >
      {(title || subtitle) && (
        <div className="mb-6 space-y-1">
          {title && <h3 className="text-xl font-bold tracking-tight">{title}</h3>}
          {subtitle && (
            <p className="text-sm" style={{ color: 'var(--brand-text-color)', opacity: 0.6 }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
