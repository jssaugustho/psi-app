'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TypeformModal } from '@/components/TypeformModal';

export default function PublicFormPage() {
  const params = useParams();
  const formSlug = params?.formSlug as string;

  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!formSlug) return;

    async function loadPublicForm() {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/v1';
        const res = await fetch(`${apiUrl}/crm/forms/${formSlug}`);
        
        if (!res.ok) {
          throw new Error('Formulário não encontrado');
        }

        const data = await res.json();
        if (data.success && data.form) {
          setFormData(data.form);
        } else {
          throw new Error('Formulário não encontrado');
        }
      } catch (err: any) {
        console.error('Erro ao carregar formulário público:', err);
        setError(err.message || 'Formulário não encontrado');
      } finally {
        setLoading(false);
      }
    }

    loadPublicForm();
  }, [formSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F12] text-white flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span>Carregando formulário de triagem...</span>
        </div>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="min-h-screen bg-[#0F0F12] text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <h2 className="text-lg font-bold text-slate-200">Formulário Não Encontrado</h2>
          <p className="text-xs text-slate-400 max-w-sm">
            O endereço informado não corresponde a nenhum formulário de triagem ativo.
          </p>
        </div>
      </div>
    );
  }

  // Inject theme variables for public form
  const theme = formData.themeConfig || {};
  const primaryStart = theme.primaryStart || '#CC8667';
  const primaryEnd = theme.primaryEnd || '#AA5533';
  const contrast = theme.contrast || '#FFFFFF';

  return (
    <div
      className="min-h-screen bg-[#0F0F12]"
      style={{
        '--brand-gradient-start': primaryStart,
        '--brand-gradient-end': primaryEnd,
        '--brand-contrast-color': contrast,
      } as React.CSSProperties}
    >
      <TypeformModal
        open={true}
        onOpenChange={() => {}}
        tenantId={formData.tenantId}
        pageId=""
        formFlow={formData.formFlow}
      />
    </div>
  );
}
