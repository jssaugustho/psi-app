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
  
  // Dynamic Sizing option
  size?: 'sm' | 'md' | 'lg' | 'social' | 'social-compact';
  height?: number | string;
  width?: number | string;
  customStyle?: React.CSSProperties;
  
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
  fallbackText = 'Psi App',
  primaryStart = 'var(--brand-gradient-start, #6366F1)',
  primaryEnd = 'var(--brand-gradient-end, #8B5CF6)',
  contrastColor = 'var(--brand-contrast-color, #FFFFFF)',
  fontHeading,
  textColor,
  size = 'md',
  height,
  width,
  customStyle,
  imgClassName,
  iconClassName,
  badgeClassName,
  textClassName,
  containerClassName,
}: BrandLogoProps) {
  
  // 1. Sizing defaults mapping
  let defaultContainerClass = 'flex items-center gap-2.5 font-serif select-none max-w-full';
  let defaultImgClass = 'max-h-11 max-w-[220px] object-contain';
  let defaultIconClass = 'h-8 w-8 object-contain shrink-0';
  let defaultBadgeClass = 'h-9 w-9 rounded-xl bg-gradient-to-tr flex items-center justify-center shadow-md shrink-0';
  let defaultTextClass = 'font-serif text-lg tracking-wide font-normal';
  let badgeTextClass = 'font-bold text-base leading-none';
  
  if (size === 'sm') {
    defaultContainerClass = 'flex items-center gap-2 font-serif select-none max-w-full';
    defaultImgClass = 'max-h-7 max-w-[140px] object-contain';
    defaultIconClass = 'h-7 w-7 object-contain shrink-0';
    defaultBadgeClass = 'h-7 w-7 rounded-lg bg-gradient-to-tr flex items-center justify-center shadow-sm shrink-0';
    defaultTextClass = 'font-serif text-sm font-semibold tracking-wide';
    badgeTextClass = 'font-bold text-xs leading-none';
  } else if (size === 'lg') {
    defaultContainerClass = 'flex items-center gap-3 font-serif select-none max-w-full';
    defaultImgClass = 'max-h-16 max-w-[320px] object-contain';
    defaultIconClass = 'h-10 w-10 object-contain shrink-0';
    defaultBadgeClass = 'h-12 w-12 rounded-2xl bg-gradient-to-tr flex items-center justify-center shadow-lg shrink-0';
    defaultTextClass = 'font-serif text-2xl tracking-wide font-normal';
    badgeTextClass = 'font-bold text-xl leading-none';
  } else if (size === 'social') {
    defaultContainerClass = 'flex items-center gap-3 sm:gap-4 font-serif select-none max-w-full';
    defaultImgClass = 'h-12 sm:h-18 max-w-[360px] sm:max-w-[420px] object-contain object-left';
    defaultIconClass = 'h-9 w-9 sm:h-12 sm:w-12 object-contain shrink-0';
    defaultBadgeClass = 'h-9 sm:h-12 w-9 sm:w-12 rounded-xl bg-gradient-to-tr flex items-center justify-center shadow-md shrink-0';
    defaultTextClass = 'font-serif text-base sm:text-2xl tracking-wide font-normal max-w-[320px] truncate';
    badgeTextClass = 'font-bold text-sm sm:text-lg leading-none';
  } else if (size === 'social-compact') {
    defaultContainerClass = 'flex items-center gap-2 sm:gap-3 font-serif select-none max-w-full';
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

  const logoWidthPx = width ? (typeof width === 'number' ? `${width}px` : width) : undefined;
  const widthNum = typeof width === 'number' ? width : (width ? parseInt(String(width), 10) : undefined);

  const logoHeightPx = height ? (typeof height === 'number' ? `${height}px` : height) : undefined;
  const heightNum = typeof height === 'number'
    ? height
    : (height ? parseInt(String(height), 10) : (widthNum ? Math.min(96, Math.max(24, Math.round(widthNum * 0.22))) : undefined));

  const fontStyle = fontHeading ? { fontFamily: `'${fontHeading}', serif` } : undefined;
  const textColorStyle = textColor ? { color: textColor } : undefined;

  const textFontSizeStyle = heightNum ? {
    fontSize: `${Math.round(heightNum * 0.5)}px`,
    lineHeight: '1.2',
  } : undefined;

  const combinedTextStyle = { ...fontStyle, ...textColorStyle, ...textFontSizeStyle };

  const badgeSizeStyle = heightNum ? {
    height: `${Math.round(heightNum * 0.85)}px`,
    width: `${Math.round(heightNum * 0.85)}px`,
    fontSize: `${Math.round(heightNum * 0.45)}px`,
  } : undefined;

  const iconSizeStyle = heightNum ? {
    height: `${Math.round(heightNum * 0.85)}px`,
    width: `${Math.round(heightNum * 0.85)}px`,
  } : undefined;

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={title || fallbackText}
        className={imgClassName || (width || height ? 'max-w-full h-auto object-contain shrink-0' : defaultImgClass)}
        style={{
          ...(logoWidthPx ? { width: logoWidthPx, maxWidth: '100%' } : {}),
          ...(logoHeightPx ? { height: logoHeightPx, maxHeight: logoHeightPx } : { height: 'auto' }),
          ...customStyle,
        }}
      />
    );
  }

  return (
    <div
      className={containerClassName || defaultContainerClass}
      style={{
        ...(logoWidthPx ? { width: logoWidthPx, maxWidth: '100%' } : {}),
        ...(logoHeightPx ? { height: logoHeightPx } : {}),
        ...customStyle,
      }}
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          alt="Ícone"
          className={iconClassName || (height ? 'w-auto object-contain shrink-0' : defaultIconClass)}
          style={iconSizeStyle}
        />
      ) : (
        <div
          className={badgeClassName || defaultBadgeClass}
          style={{
            background: `linear-gradient(135deg, ${primaryStart} 0%, ${primaryEnd} 100%)`,
            color: contrastColor,
            ...badgeSizeStyle,
          }}
        >
          <span
            className={badgeTextClass}
            style={{
              color: contrastColor,
              ...(heightNum ? { fontSize: `${Math.round(heightNum * 0.45)}px` } : {}),
            }}
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
