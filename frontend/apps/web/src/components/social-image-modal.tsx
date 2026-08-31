'use client';

import React, { useState } from 'react';
import { BrandModal, BrandLogo } from '@psi/ui';
import { api } from '@/lib/api';

import { Sparkles, Upload, Trash2, Loader2, Share2 } from 'lucide-react';

export interface SocialCoverBannerProps {
  logoUrl?: string;
  faviconUrl?: string;
  logoConfig?: any;
  title: string;
  description: string;
  domainUrl: string;
  bgLightColor?: string;
  activePrimaryStart?: string;
  activePrimaryEnd?: string;
  fontHeading?: string;
  fontBody?: string;
  compact?: boolean;
  className?: string;
}

export function SocialCoverBanner({
  logoUrl,
  faviconUrl,
  logoConfig,
  title,
  description,
  domainUrl,
  bgLightColor = '#FFFFFF',
  activePrimaryStart = '#CC8667',
  activePrimaryEnd = '#AA5533',
  fontHeading = 'Playfair Display',
  fontBody = 'Inter',
  compact = false,
  className = ''
}: SocialCoverBannerProps) {
  return (
    <div
      className={`w-full aspect-[1.91/1] rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-zinc-800 relative flex flex-col justify-between select-none transition-all ${className}`}
      style={{
        backgroundColor: bgLightColor,
        color: '#18181B',
        fontFamily: `'${fontBody}', sans-serif`
      }}
    >
      {/* Top Main Section */}
      <div className={`flex-1 flex flex-col justify-between relative overflow-hidden ${compact ? 'p-3.5 sm:p-5' : 'p-6 sm:p-8'}`}>
        {/* Watermark Psi Monogram */}
        <div className={`absolute right-2 -bottom-2 font-bold text-zinc-900/5 pointer-events-none select-none leading-none ${
          compact ? 'text-[90px] sm:text-[120px]' : 'text-[140px] sm:text-[190px]'
        }`}>
          Ψ
        </div>

        {/* Prominent Main Logo / Brand Name */}
        <div className="flex items-center z-10 pt-0.5">
          <BrandLogo
            logoUrl={logoUrl}
            logoConfig={logoConfig}
            faviconUrl={faviconUrl}
            title={title}
            fallbackText="Psicologia"
            primaryStart={activePrimaryStart}
            primaryEnd={activePrimaryEnd}
            contrastColor="#FFFFFF"
            fontHeading={fontHeading}
            textColor="#18181B"
            size={compact ? 'social-compact' : 'social'}
          />
        </div>

        {/* Subtitle Description */}
        <div className="z-10 my-auto pr-2">
          <p className={`text-zinc-600 leading-relaxed font-light ${
            compact ? 'text-[11px] sm:text-xs line-clamp-2 max-w-[94%]' : 'text-xs sm:text-base line-clamp-3 max-w-[92%]'
          }`}>
            {description}
          </p>
        </div>
      </div>

      {/* Bottom Solid Accent Bar */}
      <div
        className={`flex items-center justify-between z-10 text-white font-mono font-bold tracking-wide ${
          compact ? 'px-3.5 py-2 text-[10px] sm:text-xs' : 'px-6 sm:px-8 py-3.5 text-xs sm:text-sm'
        }`}
        style={{
          background: `linear-gradient(135deg, ${activePrimaryStart} 0%, ${activePrimaryEnd} 100%)`
        }}
      >
        <span className="truncate max-w-[62%] opacity-95 font-mono">{domainUrl}</span>
        <span className={`shrink-0 font-sans uppercase font-extrabold tracking-wider bg-white/20 rounded-md ${
          compact ? 'px-2 py-0.5 text-[8px] sm:text-[10px]' : 'px-3 py-1 text-[10px] sm:text-xs rounded-lg'
        }`}>
          AGENDE SUA CONSULTA →
        </span>
      </div>
    </div>
  );
}

export interface SocialImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSocialImage?: string;
  onSaveSocialImage: (imageUrl: string) => void;
  logoUrl?: string;
  faviconUrl?: string;
  title: string;
  description: string;
  domainUrl: string;
  bgLightColor?: string;
  activePrimaryStart?: string;
  activePrimaryEnd?: string;
  fontHeading?: string;
  fontBody?: string;
  onOpenMediaLibrary?: () => void;
}

export function SocialImageModal({
  isOpen,
  onClose,
  currentSocialImage = '',
  onSaveSocialImage,
  logoUrl,
  faviconUrl,
  title,
  description,
  domainUrl,
  bgLightColor = '#FFFFFF',
  activePrimaryStart = '#CC8667',
  activePrimaryEnd = '#AA5533',
  fontHeading = 'Playfair Display',
  fontBody = 'Inter',
  onOpenMediaLibrary
}: SocialImageModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const generateCanvasImage = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Não foi possível inicializar o canvas 2D.');

      const siteBgColor = bgLightColor || '#FFFFFF';
      const startColor = activePrimaryStart || '#CC8667';
      const endColor = activePrimaryEnd || '#AA5533';
      const textDarkColor = '#18181B';
      const textMutedColor = '#4B5563';

      // 1. Top Section Background (77% height = 485px)
      ctx.fillStyle = siteBgColor;
      ctx.fillRect(0, 0, 1200, 485);

      // 2. Bottom Accent Bar (23% height = 145px)
      const gradient = ctx.createLinearGradient(0, 485, 1200, 630);
      gradient.addColorStop(0, startColor);
      gradient.addColorStop(1, endColor);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 485, 1200, 145);

      // 3. Background watermark monogram
      ctx.save();
      ctx.fillStyle = 'rgba(24, 24, 27, 0.04)';
      ctx.font = 'bold 360px sans-serif';
      ctx.restore();

      // 4. Logo / Favicon / Title
      if (logoUrl) {
        try {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
            img.src = logoUrl;
          });
          const maxH = 170;
          const aspect = img.width / img.height;
          const logoW = Math.min(560, maxH * aspect);
          const logoH = logoW / aspect;
          ctx.drawImage(img, 80, 55, logoW, logoH);
        } catch {
          ctx.fillStyle = textDarkColor;
          ctx.font = `normal 44px '${fontHeading}', serif`;
          ctx.fillText(title || 'Psicologia', 80, 115);
        }
      } else if (faviconUrl) {
        try {
          const iconImg = new window.Image();
          iconImg.crossOrigin = 'anonymous';
          await new Promise((res, rej) => {
            iconImg.onload = res;
            iconImg.onerror = rej;
            iconImg.src = faviconUrl;
          });
          ctx.drawImage(iconImg, 80, 55, 80, 80);
          ctx.fillStyle = textDarkColor;
          ctx.font = `normal 44px '${fontHeading}', serif`;
          ctx.fillText(title || 'Psicologia', 180, 112);
        } catch {
          const iconGradient = ctx.createLinearGradient(80, 135, 160, 55);
          iconGradient.addColorStop(0, startColor);
          iconGradient.addColorStop(1, endColor);
          ctx.fillStyle = iconGradient;
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(80, 55, 80, 80, 16);
          } else {
            ctx.rect(80, 55, 80, 80);
          }
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 44px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Ψ', 120, 95);
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';

          ctx.fillStyle = textDarkColor;
          ctx.font = `normal 44px '${fontHeading}', serif`;
          ctx.fillText(title || 'Psicologia', 180, 112);
        }
      } else {
        const iconGradient = ctx.createLinearGradient(80, 135, 160, 55);
        iconGradient.addColorStop(0, startColor);
        iconGradient.addColorStop(1, endColor);
        ctx.fillStyle = iconGradient;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(80, 55, 80, 80, 16);
        } else {
          ctx.rect(80, 55, 80, 80);
        }
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Ψ', 120, 95);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        ctx.fillStyle = textDarkColor;
        ctx.font = `normal 44px '${fontHeading}', serif`;
        ctx.fillText(title || 'Psicologia', 180, 112);
      }


      // 5. Subheadline Description Text
      ctx.fillStyle = textMutedColor;
      ctx.font = `300 26px '${fontBody}', sans-serif`;

      const subText = description.trim() || `Atendimento psicológico especializado com ${title || 'a profissional'}. Agende sua consulta presencial ou online com segurança.`;
      const subWords = subText.split(' ');
      let subLine = '';
      let subY = 275;
      for (let j = 0; j < subWords.length; j++) {
        const testSub = subLine + subWords[j] + ' ';
        const subMetrics = ctx.measureText(testSub);
        if (subMetrics.width > 960 && j > 0) {
          ctx.fillText(subLine, 80, subY);
          subLine = subWords[j] + ' ';
          subY += 40;
        } else {
          subLine = testSub;
        }
      }
      ctx.fillText(subLine, 80, subY);

      // 6. Bottom Bar Domain & CTA
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(domainUrl, 80, 560);

      ctx.font = 'bold 22px sans-serif';
      const ctaText = 'AGENDE SUA CONSULTA →';
      const ctaWidth = ctx.measureText(ctaText).width;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(1120 - ctaWidth - 30, 530, ctaWidth + 30, 48, 14);
      } else {
        ctx.rect(1120 - ctaWidth - 30, 530, ctaWidth + 30, 48);
      }
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(ctaText, 1120 - ctaWidth - 15, 562);

      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', 0.92));
      if (!blob) throw new Error('Falha ao exportar blob WebP do canvas.');

      const file = new File([blob], `social-cover-${Date.now()}.webp`, { type: 'image/webp' });
      const { url } = await api.uploadImage(file, 'asset');

      if (url) {
        onSaveSocialImage(url);
        onClose();
      } else {
        throw new Error('Servidor não retornou a URL da imagem.');
      }
    } catch (err: any) {
      console.error('Erro ao gerar capa social:', err);
      setErrorMsg(err.message || 'Erro ao gerar e fazer upload da capa social.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveImage = () => {
    onSaveSocialImage('');
    onClose();
  };

  return (
    <BrandModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-5 p-1 text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-indigo-500" />
              Capa de Compartilhamento Social (1200 × 630px)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Esta é a imagem exibida quando seu site é compartilhado no WhatsApp, Facebook, LinkedIn e Twitter.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Live Preview Container */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {currentSocialImage ? 'Capa Salva Atualmente' : 'Prévia Gerada com Identidade da Marca'}
            </span>
            {currentSocialImage && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                Imagem Real Ativa
              </span>
            )}
          </div>

          {currentSocialImage ? (
            <div className="relative group rounded-2xl overflow-hidden border border-[var(--surface-border)] aspect-[1.91/1] bg-slate-950 flex items-center justify-center shadow-lg">
              <img src={currentSocialImage} alt="Capa Social Ativa" className="w-full h-full object-cover" />
            </div>
          ) : (
            <SocialCoverBanner
              logoUrl={logoUrl}
              faviconUrl={faviconUrl}
              title={title}
              description={description}
              domainUrl={domainUrl}
              bgLightColor={bgLightColor}
              activePrimaryStart={activePrimaryStart}
              activePrimaryEnd={activePrimaryEnd}
              fontHeading={fontHeading}
              fontBody={fontBody}
              compact={true}
            />
          )}
        </div>

        {/* Action Controls */}
        <div className="pt-3 border-t border-[var(--surface-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {currentSocialImage && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5 cursor-pointer border-none bg-transparent"
              >
                <Trash2 className="w-4 h-4" />
                Remover Capa Customizada
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {onOpenMediaLibrary && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMediaLibrary();
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200/60 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer border-none"
              >
                <Upload className="w-4 h-4" />
                Subir Imagem / Mídia
              </button>
            )}

            <button
              type="button"
              onClick={generateCanvasImage}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-xl text-xs font-bold brand-accent text-white flex items-center gap-1.5 shadow-md cursor-pointer border-none disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando Imagem Canvas...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {currentSocialImage ? 'Regerar com Marca Atual' : 'Gerar e Salvar Capa'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </BrandModal>
  );
}
