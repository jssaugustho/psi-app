'use client';

import React, { useState, useEffect } from 'react';
import { BrandModal, Input } from '@psi/ui';
import { MediaLibraryModal } from './media-library-modal';
import { useBrand } from '@/context/BrandContext';
import { Image as ImageIcon, Upload, Check } from 'lucide-react';

interface LogoBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  initialText?: string;
  initialIconType?: 'psi' | 'custom';
  initialCustomIconUrl?: string;
  gradientStart?: string;
  gradientEnd?: string;
  contrastColor?: string;
  headingFont?: string;
  onSave: (logoConfig: {
    mode: 'html';
    text: string;
    iconType: 'psi' | 'custom';
    customIconUrl?: string;
  }) => void;
}

export function LogoBuilderModal({
  isOpen,
  onClose,
  tenantId,
  initialText = '',
  initialIconType = 'psi',
  initialCustomIconUrl = '',
  gradientStart: customStart,
  gradientEnd: customEnd,
  contrastColor: customContrast,
  headingFont: customFont,
  onSave,
}: LogoBuilderModalProps) {
  const { tenant } = useBrand();
  const gradientStart = customStart || tenant?.gradientColorStart || '#CC8667';
  const gradientEnd = customEnd || tenant?.gradientColorEnd || '#AA5533';
  const contrastColor = customContrast || tenant?.contrastColor || '#FFFFFF';
  const headingFont = customFont || 'serif';

  const [text, setText] = useState(initialText);
  const [iconType, setIconType] = useState<'psi' | 'custom'>(initialIconType);
  const [customIconUrl, setCustomIconUrl] = useState(initialCustomIconUrl);
  const [iconLibraryOpen, setIconLibraryOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      setIconType(initialIconType);
      setCustomIconUrl(initialCustomIconUrl);
    }
  }, [isOpen, initialText, initialIconType, initialCustomIconUrl]);

  const handleSave = () => {
    onSave({
      mode: 'html',
      text: text.trim() || 'Psicologia',
      iconType,
      customIconUrl: iconType === 'custom' ? customIconUrl : undefined,
    });
    onClose();
  };

  return (
    <>
      <BrandModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
        <div className="space-y-6">
          <div>
            <span className="text-[10px] font-bold text-[var(--brand-gradient-start)] uppercase tracking-widest block mb-1">
              Criador de Logotipo Visual
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-wide">
              Configurar Logotipo em HTML
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Personalize o nome e o ícone. O símbolo utilizará automaticamente as cores do gradiente da marca do site.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Nome da Psicóloga */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Nome no Logotipo
              </label>
              <Input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ex: Geovanna Santos"
                className="brand-input text-sm"
              />
            </div>

            {/* Escolha do Ícone */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Ícone do Quadro
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Opção Símbolo da Psicologia Ψ */}
                <div
                  onClick={() => setIconType('psi')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                    iconType === 'psi'
                      ? 'bg-[var(--brand-gradient-start)]/10 border-[var(--brand-gradient-start)] text-slate-900 dark:text-white shadow-md'
                      : 'glass-sm border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-700'
                  }`}
                >
                  <div 
                    className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-base shrink-0 shadow-sm"
                    style={{ 
                      background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
                      color: contrastColor
                    }}
                  >
                    Ψ
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold block text-slate-900 dark:text-white">Símbolo Ψ</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Psicologia</span>
                  </div>
                </div>

                {/* Opção Ícone Personalizado */}
                <div
                  onClick={() => setIconType('custom')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                    iconType === 'custom'
                      ? 'bg-[var(--brand-gradient-start)]/10 border-[var(--brand-gradient-start)] text-slate-900 dark:text-white shadow-md'
                      : 'glass-sm border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-700'
                  }`}
                >
                  <div 
                    className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-base shrink-0 overflow-hidden shadow-sm"
                    style={{ 
                      background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
                      color: contrastColor
                    }}
                  >
                    {customIconUrl ? (
                      <img src={customIconUrl} alt="Ícone" className="h-5 w-5 object-contain" />
                    ) : (
                      <ImageIcon className="h-4 w-4" style={{ color: contrastColor }} />
                    )}
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold block text-slate-900 dark:text-white">Ícone Custom</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                      {customIconUrl ? 'Imagem Carregada' : 'Upload de imagem'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botão de upload se o tipo for custom */}
              {iconType === 'custom' && (
                <div className="pt-2 animate-fade-in flex items-center gap-3">
                  {customIconUrl && (
                    <div className="h-10 w-10 rounded-lg glass-sm border border-[var(--surface-border)] p-1 flex items-center justify-center shrink-0">
                      <img src={customIconUrl} alt="Preview do Ícone" className="h-full w-full object-contain" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIconLibraryOpen(true)}
                    className="px-3 py-2 rounded-xl glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {customIconUrl ? 'Alterar Ícone' : 'Selecionar Ícone/Favicon'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="space-y-2 pt-2 border-t border-[var(--surface-border)]">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Pré-visualização do Logotipo no Site
            </span>
            <div className="p-5 rounded-2xl glass-sm border border-[var(--surface-border)] flex items-center justify-center min-h-[90px] shadow-inner">
              <div className="flex items-center gap-3 font-serif select-none">
                <div 
                  className="h-9 w-9 rounded-xl flex items-center justify-center shadow-md shrink-0"
                  style={{ 
                    background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
                    color: contrastColor 
                  }}
                >
                  {iconType === 'custom' && customIconUrl ? (
                    <img src={customIconUrl} alt="Ícone" className="h-5 w-5 object-contain" />
                  ) : (
                    <span className="font-bold text-base leading-none" style={{ color: contrastColor }}>Ψ</span>
                  )}
                </div>
                <span 
                  className="text-lg tracking-wide text-slate-900 dark:text-white font-normal"
                  style={{ fontFamily: headingFont ? `'${headingFont}', serif` : 'serif' }}
                >
                  {text.trim() || 'Nome da Psicóloga'}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--surface-border)]">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="py-2.5 px-4 rounded-xl brand-accent text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg border-none cursor-pointer"
            >
              <Check className="h-4 w-4" />
              Salvar
            </button>
          </div>
        </div>
      </BrandModal>

      {/* Selector modal for custom icon */}
      <MediaLibraryModal
        isOpen={iconLibraryOpen}
        onClose={() => setIconLibraryOpen(false)}
        tenantId={tenantId}
        uploadType="icon"
        onSelectImage={(asset) => {
          setCustomIconUrl(asset.url);
          setIconLibraryOpen(false);
        }}
      />
    </>
  );
}
