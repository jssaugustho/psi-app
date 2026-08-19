'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface BrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
  showCloseButton?: boolean;
}

export function BrandModal({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-lg',
  className = '',
  showCloseButton = true,
}: BrandModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'unset';
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop com blur cobrindo 100% da viewport */}
      <div
        onClick={onClose}
        className="absolute inset-0 cursor-pointer backdrop-blur-md"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--brand-bg-color, #09090b) 85%, rgba(0, 0, 0, 0.75))',
          backgroundImage: 'radial-gradient(circle at center, color-mix(in srgb, var(--brand-gradient-start, #4f46e5) 12%, transparent) 0%, transparent 70%)'
        }}
      />
      
      {/* Modal Card content */}
      <div className={`brand-modal w-full ${maxWidth} rounded-2xl shadow-2xl relative z-10 animate-modal-enter text-left p-6 space-y-6 ${className}`}>
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors bg-transparent border-none cursor-pointer p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
