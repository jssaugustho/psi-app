'use client';

import React from 'react';

export interface BrandLogoProps {
  logoUrl?: string | null;
  logoConfig?: {
    mode?: 'html' | 'image';
    text?: string;
    iconType?: 'psi' | 'custom';
    customIconUrl?: string;
  } | null;
  faviconUrl?: string | null;
  title?: string;
  fallbackText?: string;
  
  // Custom styling props
  primaryStart?: string;
  primaryEnd?: string;
  contrastColor?: string;
  fontHeading?: string;
  textColor?: string;
  
  // Sizing option
  size?: 'sm' | 'md' | 'lg' | 'social' | 'social-compact';
  
  // Class name overrides
  imgClassName?: string;
  iconClassName?: string;
  badgeClassName?: string;
  textClassName?: string;
  containerClassName?: string;
}

export function BrandLogo({
  logoUrl,
  logoConfig,
  faviconUrl,
  title,
  fallbackText = 'Psicologia',
  primaryStart = '#CC8667',
  primaryEnd = '#AA5533',
  contrastColor = '#FFFFFF',
  fontHeading,
  textColor,
  size = 'md',
  imgClassName,
  iconClassName,
  badgeClassName,
  textClassName,
  containerClassName,
}: BrandLogoProps) {
  
  // 1. Sizing defaults mapping
  let defaultContainerClass = 'flex items-center gap-2.5 font-serif select-none';
  let defaultImgClass = 'max-h-11 max-w-[220px] object-contain';
  let defaultIconClass = 'h-8 w-8 object-contain shrink-0';
  let defaultBadgeClass = 'h-9 w-9 rounded-xl bg-gradient-to-tr flex items-center justify-center shadow-md shrink-0';
  let defaultTextClass = 'font-serif text-lg tracking-wide font-normal';
  let badgeTextClass = 'font-bold text-base leading-none';
  
  if (size === 'sm') {
    defaultContainerClass = 'flex items-center gap-2 font-serif select-none';
    defaultImgClass = 'max-h-7 max-w-[140px] object-contain';
    defaultIconClass = 'h-7 w-7 object-contain shrink-0';
    defaultBadgeClass = 'h-7 w-7 rounded-lg bg-gradient-to-tr flex items-center justify-center shadow-sm shrink-0';
    defaultTextClass = 'font-serif text-sm font-semibold tracking-wide';
    badgeTextClass = 'font-bold text-xs leading-none';
  } else if (size === 'lg') {
    defaultContainerClass = 'flex items-center gap-3 font-serif select-none';
    defaultImgClass = 'max-h-16 max-w-[320px] object-contain';
    defaultIconClass = 'h-10 w-10 object-contain shrink-0';
    defaultBadgeClass = 'h-12 w-12 rounded-2xl bg-gradient-to-tr flex items-center justify-center shadow-lg shrink-0';
    defaultTextClass = 'font-serif text-2xl tracking-wide font-normal';
    badgeTextClass = 'font-bold text-xl leading-none';
  } else if (size === 'social') {
    defaultContainerClass = 'flex items-center gap-3 sm:gap-4 font-serif select-none';
    defaultImgClass = 'h-12 sm:h-18 max-w-[360px] sm:max-w-[420px] object-contain object-left';
    defaultIconClass = 'h-9 w-9 sm:h-12 sm:w-12 object-contain shrink-0';
    defaultBadgeClass = 'h-9 sm:h-12 w-9 sm:w-12 rounded-xl bg-gradient-to-tr flex items-center justify-center shadow-md shrink-0';
    defaultTextClass = 'font-serif text-base sm:text-2xl tracking-wide font-normal max-w-[320px] truncate';
    badgeTextClass = 'font-bold text-sm sm:text-lg leading-none';
  } else if (size === 'social-compact') {
    defaultContainerClass = 'flex items-center gap-2 sm:gap-3 font-serif select-none';
    defaultImgClass = 'h-8 sm:h-10 max-w-[80%] object-contain object-left';
    defaultIconClass = 'h-6 w-6 sm:h-8 sm:w-8 object-contain shrink-0';
    defaultBadgeClass = 'h-6 sm:h-8 w-6 sm:w-8 rounded-lg bg-gradient-to-tr flex items-center justify-center shadow-sm shrink-0';
    defaultTextClass = 'font-serif text-xs sm:text-base tracking-wide font-normal max-w-[240px] truncate';
    badgeTextClass = 'font-bold text-xs sm:text-sm leading-none';
  }

  // 2. Compute variables
  const logoText = logoConfig?.text || title || fallbackText;
  const showCustomIcon = logoConfig?.iconType === 'custom' && logoConfig?.customIconUrl;
  const iconUrl = showCustomIcon ? logoConfig.customIconUrl : faviconUrl;

  const fontStyle = fontHeading ? { fontFamily: `'${fontHeading}', serif` } : undefined;
  const textColorStyle = textColor ? { color: textColor } : undefined;
  const combinedTextStyle = { ...fontStyle, ...textColorStyle };

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={title || fallbackText}
        className={imgClassName || defaultImgClass}
      />
    );
  }

  return (
    <div className={containerClassName || defaultContainerClass}>
      {iconUrl ? (
        <img
          src={iconUrl}
          alt="Ícone"
          className={iconClassName || defaultIconClass}
        />
      ) : (
        <div
          className={badgeClassName || defaultBadgeClass}
          style={{
            background: `linear-gradient(135deg, ${primaryStart} 0%, ${primaryEnd} 100%)`,
            color: contrastColor,
          }}
        >
          <span
            className={badgeTextClass}
            style={{ color: contrastColor }}
          >
            Ψ
          </span>
        </div>
      )}
      <span
        className={textClassName || defaultTextClass}
        style={combinedTextStyle}
      >
        {logoText}
      </span>
    </div>
  );
}
