'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { MediaLibraryModal } from '@/components/media-library-modal';
import { LogoOptionModal } from '@/components/logo-option-modal';
import { LogoBuilderModal } from '@/components/logo-builder-modal';
import { Upload, ImageIcon, Loader2, Sparkles } from 'lucide-react';

export interface ImageUploaderProps {
  id?: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  onFocus?: () => void;
  isFocused?: boolean;
  tenantId: string;
  aspectRatio?: number;
  targetWidth?: number;
  targetHeight?: number;
  allowTransparency?: boolean;
  hideOnMobile?: boolean;
  onToggleHideOnMobile?: (hidden: boolean) => void;
  isLogo?: boolean;
  logoConfig?: {
    mode?: 'html' | 'image';
    text?: string;
    iconType?: 'psi' | 'custom';
    customIconUrl?: string;
  };
  onLogoConfigChange?: (config: {
    mode: 'html';
    text: string;
    iconType: 'psi' | 'custom';
    customIconUrl?: string;
  }) => void;
  defaultLogoText?: string;
  onClearLogoConfig?: () => void;
  gradientStart?: string;
  gradientEnd?: string;
  contrastColor?: string;
  headingFont?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  id,
  label,
  value,
  onChange,
  onFocus,
  isFocused,
  tenantId,
  aspectRatio,
  targetWidth,
  targetHeight,
  allowTransparency = false,
  hideOnMobile,
  onToggleHideOnMobile,
  isLogo = false,
  logoConfig,
  onLogoConfigChange,
  defaultLogoText = '',
  onClearLogoConfig,
  gradientStart,
  gradientEnd,
  contrastColor,
  headingFont,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modais de Biblioteca & Logotipo
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [optionModalOpen, setOptionModalOpen] = useState(false);
  const [builderModalOpen, setBuilderModalOpen] = useState(false);

  return (
    <div 
      id={id} 
      className={`space-y-2 border border-[var(--surface-border)] glass-sm p-3 rounded-xl transition-all duration-300 ${
        isFocused ? 'ring-2 ring-blue-500 border-transparent' : ''
      }`}
      onClick={() => onFocus?.()}
    >
      <div className="flex justify-between items-center">
        <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">{label}</label>
        {(value || (isLogo && logoConfig?.mode === 'html')) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
              if (onClearLogoConfig) onClearLogoConfig();
            }}
            className="text-[9px] text-red-500 dark:text-red-400 hover:underline font-semibold transition-colors cursor-pointer"
          >
            Remover
          </button>
        )}
      </div>

      <div className="flex gap-3 items-center">
        {isLogo && logoConfig?.mode === 'html' ? (
          <div className="h-16 px-3 glass-sm border border-[var(--surface-border)] rounded-lg shrink-0 flex items-center justify-center gap-2 select-none">
            <div 
              className="h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-sm"
              style={{
                background: gradientStart && gradientEnd ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})` : 'linear-gradient(135deg, var(--brand-gradient-start), #E5A98B)',
                color: contrastColor || '#FFFFFF'
              }}
            >
              {logoConfig.iconType === 'custom' && logoConfig.customIconUrl ? (
                <img src={logoConfig.customIconUrl} alt="Ícone" className="h-4 w-4 object-contain" />
              ) : (
                <span style={{ color: contrastColor || '#FFFFFF' }}>Ψ</span>
              )}
            </div>
            <span 
              className="text-[10px] font-bold text-slate-900 dark:text-white truncate max-w-[100px]"
              style={{ fontFamily: headingFont ? `'${headingFont}', serif` : 'serif' }}
            >
              {logoConfig.text || 'Psicologia'}
            </span>
          </div>
        ) : (
          <div 
            className="relative glass-sm border border-[var(--surface-border)] rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-cover bg-center"
            style={{ 
              width: '64px', 
              height: '64px',
              ...(allowTransparency
                ? {
                    backgroundImage: value
                      ? `url(${value}), repeating-conic-gradient(#a1a1aa 0% 25%, #e4e4e7 0% 50%)`
                      : 'repeating-conic-gradient(#a1a1aa 0% 25%, #e4e4e7 0% 50%)',
                    backgroundSize: value ? `cover, 12px 12px` : '12px 12px',
                    backgroundPosition: 'center, 0 0',
                  }
                : {
                    backgroundImage: value ? `url(${value})` : 'none',
                  })
            }}
          >
            {!value && <ImageIcon className="h-5 w-5 text-slate-400 dark:text-slate-600" />}
          </div>
        )}

        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {isLogo ? (
              logoConfig?.mode === 'html' ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBuilderModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded brand-accent text-white text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer border-none"
                  >
                    <Sparkles className="h-3 w-3" />
                    Editar Logotipo
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOptionModalOpen(true);
                    }}
                    className="px-2 py-1 rounded glass-sm border border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-[9px] transition-all cursor-pointer"
                  >
                    Alternar Modo
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOptionModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded bg-[var(--brand-gradient-start)]/10 border border-[var(--brand-gradient-start)]/20 text-[var(--brand-gradient-start)] hover:bg-[var(--brand-gradient-start)]/20 disabled:opacity-50 text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {uploading ? 'Processando...' : 'Definir Logotipo'}
                </button>
              )
            ) : (
              <button
                type="button"
                disabled={uploading}
                onClick={(e) => {
                  e.stopPropagation();
                  setLibraryOpen(true);
                }}
                className="px-2.5 py-1.5 rounded bg-[var(--brand-gradient-start)]/10 border border-[var(--brand-gradient-start)]/20 text-[var(--brand-gradient-start)] hover:bg-[var(--brand-gradient-start)]/20 disabled:opacity-50 text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3" />
                )}
                {uploading ? 'Processando...' : 'Biblioteca de Mídia'}
              </button>
            )}
            <span className="text-[8px] text-slate-500">
              {isLogo && logoConfig?.mode === 'html' ? 'Personalizado' : (targetWidth && targetHeight ? `${targetWidth}x${targetHeight}px` : 'Galeria')}
            </span>
          </div>
        </div>
      </div>
      
      {error && (
        <span className="text-[8px] text-red-400 block font-sans font-medium">{error}</span>
      )}

      {onToggleHideOnMobile && (
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--surface-border)] mt-1">
          <input
            type="checkbox"
            id={`hideMobile-${id || label}`}
            checked={hideOnMobile ?? false}
            onChange={(e) => onToggleHideOnMobile(e.target.checked)}
            className="rounded border-[var(--surface-border)] text-[var(--brand-gradient-start)] focus:ring-[var(--brand-gradient-start)] h-3.5 w-3.5 cursor-pointer"
          />
          <label htmlFor={`hideMobile-${id || label}`} className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold cursor-pointer select-none">
            📱 Ocultar imagem no mobile
          </label>
        </div>
      )}

      {/* Modal de escolha do modo do logotipo */}
      {isLogo && (
        <LogoOptionModal
          isOpen={optionModalOpen}
          onClose={() => setOptionModalOpen(false)}
          onSelectOption={(mode) => {
            if (mode === 'html') {
              setBuilderModalOpen(true);
            } else {
              setLibraryOpen(true);
            }
          }}
        />
      )}

      {/* Modal do construtor de logotipo HTML */}
      {isLogo && (
        <LogoBuilderModal
          isOpen={builderModalOpen}
          onClose={() => setBuilderModalOpen(false)}
          tenantId={tenantId}
          initialText={logoConfig?.text || defaultLogoText}
          initialIconType={logoConfig?.iconType || 'psi'}
          initialCustomIconUrl={logoConfig?.customIconUrl || ''}
          gradientStart={gradientStart}
          gradientEnd={gradientEnd}
          contrastColor={contrastColor}
          headingFont={headingFont}
          onSave={(cfg) => {
            if (onLogoConfigChange) {
              onLogoConfigChange(cfg);
            }
          }}
        />
      )}

      {/* Modal de seleção da biblioteca de mídia */}
      <MediaLibraryModal
        isOpen={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        tenantId={tenantId}
        resolution={{
          width: targetWidth || 800,
          height: targetHeight || (aspectRatio ? Math.round((targetWidth || 800) / aspectRatio) : 800)
        }}
        type={allowTransparency || isLogo ? 'logotipo' : 'imagem'}
        onSelectImage={(asset: any) => {
          const url = typeof asset === 'string' ? asset : (asset?.url || asset);
          onChange(url);
          setLibraryOpen(false);
        }}
        uploadType={allowTransparency ? (id?.includes('favicon') ? 'icon' : 'logo') : 'asset'}
        usageContext={id}
      />
    </div>
  );
};
