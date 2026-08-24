'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@psi/ui';
import { ArrowLeft, Smartphone, Monitor, Save, Globe, Eye } from 'lucide-react';

interface PageEditorHeaderProps {
  title: string;
  onChangeTitle: (val: string) => void;
  isPublished?: boolean;
  saving?: boolean;
  devicePreview: 'desktop' | 'mobile';
  onChangeDevice: (device: 'desktop' | 'mobile') => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}

export function PageEditorHeader({
  title,
  onChangeTitle,
  isPublished,
  saving,
  devicePreview,
  onChangeDevice,
  onSaveDraft,
  onPublish,
}: PageEditorHeaderProps) {
  const router = useRouter();

  return (
    <header className="h-16 px-6 border-b border-zinc-800/80 bg-zinc-950/80 glass-sm flex items-center justify-between gap-4 sticky top-0 z-40">
      {/* Esquerda: Voltar e Título */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => router.push('/dashboard/captacao')}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer bg-transparent border-none"
          title="Voltar para a Lista de Páginas"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <input
            type="text"
            value={title}
            onChange={(e) => onChangeTitle(e.target.value)}
            className="bg-transparent border border-transparent hover:border-zinc-800 focus:border-violet-500 rounded-lg px-2 py-1 text-sm font-bold text-white focus:outline-none transition-all truncate"
            placeholder="Título da Página..."
          />
          <span
            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${
              isPublished
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {isPublished ? 'Publicada' : 'Rascunho'}
          </span>
        </div>
      </div>

      {/* Centro: Alternador Desktop / Mobile */}
      <div className="hidden sm:flex items-center gap-1 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
        <button
          type="button"
          onClick={() => onChangeDevice('desktop')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border-none ${
            devicePreview === 'desktop' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Desktop</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeDevice('mobile')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border-none ${
            devicePreview === 'mobile' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Mobile</span>
        </button>
      </div>

      {/* Direita: Ações de Salvar e Publicar */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          onClick={onSaveDraft}
          disabled={saving}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Salvar...' : 'Salvar Rascunho'}</span>
        </Button>

        <Button
          type="button"
          onClick={onPublish}
          disabled={saving}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-violet-500/20"
        >
          <Globe className="w-4 h-4" />
          <span>Publicar no Cloudflare</span>
        </Button>
      </div>
    </header>
  );
}
