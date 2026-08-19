'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Info, Loader2 } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmação',
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <Trash2 className="h-5 w-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      default:
        return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  const getIconBg = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-500/10 border-red-500/20';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/20';
      default:
        return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  const getConfirmBtnClass = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20';
      default:
        return 'brand-accent';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 cursor-pointer"
        style={{
          backgroundColor: 'rgba(9, 9, 11, 0.85)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Modal Card */}
      <div className="brand-modal w-full max-w-md bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl relative z-10 animate-modal-enter text-left p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl border shrink-0 ${getIconBg()}`}>
            {getIcon()}
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-wide">{title}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
          <button
            type="button"
            disabled={loading || isSubmitting}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading || isSubmitting}
            onClick={handleConfirm}
            className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 border-none ${getConfirmBtnClass()} disabled:opacity-50`}
          >
            {(loading || isSubmitting) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
