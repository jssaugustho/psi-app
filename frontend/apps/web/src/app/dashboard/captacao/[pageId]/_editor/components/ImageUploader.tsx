'use client';

import React, { useState } from 'react';
import { MediaLibraryModal } from '@/components/media-library-modal';
import { Upload, ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { BrandLogo } from '@psi/ui';

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
  onLogoConfigChange?: (config: any) => void;
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
  defaultLogoText = '',
  onClearLogoConfig,
  gradientStart,
  gradientEnd,
  contrastColor,
  headingFont,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const handleClearLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    if (onClearLogoConfig) onClearLogoConfig();
  };

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
        {value && (
          <button
            type="button"
            onClick={handleClearLogo}
            className="text-[9px] text-red-500 dark:text-red-400 hover:underline font-semibold transition-colors cursor-pointer"
          >
            Remover
          </button>
        )}
      </div>

      <div className="flex gap-3 items-center">
        {/* Preview do Logotipo / Imagem */}
        {isLogo && !value ? (
          /* Quando não há logotipo de imagem definido, mostra o BrandLogo HTML padrão com ícone + nome */
          <div 
            onClick={() => setLibraryOpen(true)}
            className="h-14 px-3 glass-sm border border-[var(--surface-border)] hover:border-[var(--brand-gradient-start)] rounded-lg shrink-0 flex items-center justify-center cursor-pointer transition-all max-w-[180px] overflow-hidden select-none"
            title="Clique para definir uma imagem de logotipo"
          >
            <BrandLogo
              logoUrl={null}
              title={defaultLogoText || 'Logotipo'}
              primaryStart={gradientStart}
              primaryEnd={gradientEnd}
              contrastColor={contrastColor}
              fontHeading={headingFont}
              size="sm"
            />
          </div>
        ) : (
          /* Preview da imagem selecionada */
          <div 
            onClick={() => setLibraryOpen(true)}
            className="relative glass-sm border border-[var(--surface-border)] rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-cover bg-center cursor-pointer hover:border-[var(--brand-gradient-start)] transition-all"
            style={{ 
              width: '64px', 
              height: '64px',
              ...(allowTransparency || isLogo
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
            <button
              type="button"
              disabled={uploading}
              onClick={(e) => {
                e.stopPropagation();
                setLibraryOpen(true);
              }}
              className="px-2.5 py-1.5 rounded brand-accent text-white disabled:opacity-50 text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed border-none shadow-sm"
            >
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isLogo ? (
                <Sparkles className="h-3 w-3" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              {uploading ? 'Processando...' : isLogo ? (value ? 'Alterar Logotipo' : 'Definir Logotipo') : 'Galeria de Mídia'}
            </button>

            <span className="text-[8px] text-slate-500">
              {targetWidth && targetHeight ? `${targetWidth}x${targetHeight}px` : 'Galeria'}
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
