'use client';

import React from 'react';
import { BrandModal } from '@psi/ui';
import { Sparkles, Upload, ArrowRight } from 'lucide-react';

interface LogoOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (mode: 'html' | 'image') => void;
}

export function LogoOptionModal({
  isOpen,
  onClose,
  onSelectOption,
}: LogoOptionModalProps) {
  return (
    <BrandModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl">
      <div className="space-y-6">
        <div>
          <span className="text-[10px] font-bold text-[#CC8667] uppercase tracking-widest block mb-1">
            Identidade Visual
          </span>
          <h3 className="text-lg font-bold text-white tracking-wide">
            Como você deseja definir seu Logotipo?
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Escolha como prefere exibir a identificação do seu consultório no cabeçalho e rodapé da página.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Opção 1: Criar Logo em HTML */}
          <div
            onClick={() => {
              onSelectOption('html');
              onClose();
            }}
            className="group relative bg-zinc-900/80 border border-white/10 hover:border-[#CC8667] rounded-2xl p-5 cursor-pointer transition-all hover:bg-zinc-900 hover:shadow-xl hover:shadow-[#CC8667]/5 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#CC8667]/20 to-[#E5A98B]/20 border border-[#CC8667]/30 text-[#CC8667]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#CC8667]/10 text-[#CC8667] border border-[#CC8667]/20">
                  Rápido & Prático
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-[#CC8667] transition-colors">
                  Criar Logotipo
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1 font-sans">
                  Não tem imagem de logo? Monte em instantes um logotipo visual com o ícone da psicologia e seu nome.
                </p>
              </div>
            </div>

            <div className="flex items-center text-xs font-bold text-[#CC8667] pt-2 border-t border-white/5">
              <span>Criar Agora</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Opção 2: Enviar Imagem */}
          <div
            onClick={() => {
              onSelectOption('image');
              onClose();
            }}
            className="group relative bg-zinc-900/80 border border-white/10 hover:border-slate-400 rounded-2xl p-5 cursor-pointer transition-all hover:bg-zinc-900 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-zinc-800 border border-white/10 text-slate-300">
                  <Upload className="h-5 w-5" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-slate-400 border border-white/10">
                  Arquivo PNG / WebP
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-slate-200 transition-colors">
                  Subir Imagem Pronta
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1 font-sans">
                  Já possui arquivo de imagem final criado por um designer? Selecione da sua biblioteca de mídia.
                </p>
              </div>
            </div>

            <div className="flex items-center text-xs font-bold text-slate-300 pt-2 border-t border-white/5">
              <span>Abrir Galeria</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </BrandModal>
  );
}
