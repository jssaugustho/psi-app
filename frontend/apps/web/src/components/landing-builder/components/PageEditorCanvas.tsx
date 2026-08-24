'use client';

import React from 'react';

interface PageEditorCanvasProps {
  page: any;
  devicePreview: 'desktop' | 'mobile';
  visualIdentity: any;
}

export function PageEditorCanvas({ page, devicePreview, visualIdentity }: PageEditorCanvasProps) {
  const sections = page?.sections || [];

  return (
    <main className="flex-1 bg-zinc-950 overflow-y-auto p-4 md:p-8 flex justify-center">
      <div
        className={`bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden flex flex-col min-h-[600px] ${
          devicePreview === 'mobile' ? 'w-[375px] my-auto border-4 border-zinc-800 rounded-[36px]' : 'w-full max-w-5xl'
        }`}
        style={{
          fontFamily: visualIdentity.fontBody,
        }}
      >
        {/* Topo simulado do navegador/device */}
        <div className="bg-zinc-950/80 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[200px]">
            https://{page?.slug || 'preview'}.psiapp.com.br
          </span>
          <span className="w-4" />
        </div>

        {/* Corpo do Canvas / Renderizador das Seções */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-zinc-950 text-zinc-100">
          {sections.length === 0 ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 border border-dashed border-zinc-800 rounded-2xl">
              <span className="text-3xl mb-2">✨</span>
              <h3 className="text-sm font-bold text-white mb-1">Sua Landing Page está Vazia</h3>
              <p className="text-xs text-zinc-400 max-w-xs">
                Adicione seções no painel lateral à esquerda para visualizar e personalizar sua apresentação em tempo real.
              </p>
            </div>
          ) : (
            sections.map((sec: any, idx: number) => (
              <section
                key={sec.id || idx}
                className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-violet-500/50 transition-all space-y-3"
              >
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-violet-400">
                    {sec.title || sec.type}
                  </span>
                </div>
                <div className="text-xs text-zinc-300">
                  <p className="leading-relaxed">
                    [Conteúdo interativo da seção <strong className="text-white">{sec.title || sec.type}</strong> renderizado em tempo real].
                  </p>
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
