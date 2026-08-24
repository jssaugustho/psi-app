import React, { useEffect, useRef, useCallback } from 'react';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  maxAutoHeight?: number;
  minHeight?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      className = '',
      style,
      value,
      onChange,
      maxAutoHeight = Infinity,
      minHeight = 72,
      ...props
    },
    ref
  ) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const isManuallyResizedRef = useRef(false);
    const lastAutoHeightRef = useRef<number>(minHeight);

    const setRef = useCallback(
      (node: HTMLTextAreaElement | null) => {
        internalRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
        }
      },
      [ref]
    );

    const adjustHeight = useCallback(() => {
      const el = internalRef.current;
      if (!el) return;

      // Se o usuário limpou o texto por completo, reseta o estado de redimensionamento manual
      if (!value && value !== 0) {
        isManuallyResizedRef.current = false;
      }

      if (isManuallyResizedRef.current) {
        return;
      }

      // Reset temporário para calcular scrollHeight exato
      el.style.height = 'auto';

      const scrollH = el.scrollHeight;
      const targetH = Math.max(minHeight, Math.min(scrollH, maxAutoHeight));

      el.style.height = `${targetH}px`;
      lastAutoHeightRef.current = targetH;
    }, [value, maxAutoHeight, minHeight]);

    useEffect(() => {
      adjustHeight();
    }, [value, adjustHeight]);

    // Monitora redimensionamento manual pelo manipulador no canto inferior direito
    useEffect(() => {
      const el = internalRef.current;
      if (!el) return;

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const currentH = entry.borderBoxSize?.[0]?.blockSize || el.offsetHeight;
          if (
            lastAutoHeightRef.current > 0 &&
            Math.abs(currentH - lastAutoHeightRef.current) > 6
          ) {
            isManuallyResizedRef.current = true;
          }
        }
      });

      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (onChange) {
        onChange(e);
      }
      adjustHeight();
    };

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
        <textarea
          ref={setRef}
          value={value}
          onChange={handleChange}
          className={`w-full rounded-xl px-4 py-2.5 text-sm transition-colors brand-input resize-y overflow-y-auto ${className}`}
          style={{
            background: 'var(--surface-input, rgba(0,0,0,0.30))',
            border: error
              ? '1px solid var(--status-error-border, rgba(239,68,68,0.25))'
              : '1px solid var(--surface-border, rgba(255,255,255,0.08))',
            color: 'var(--brand-text-color)',
            minHeight: `${minHeight}px`,
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
);

Textarea.displayName = 'Textarea';
