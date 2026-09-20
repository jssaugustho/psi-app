'use client';

import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { AtomicComponent, SocialLinkItem, SocialLinksProps, ViewportMode, CanvasData } from './types';
import { getThemeColors, getTextFallbackColor } from './utils/colorHelpers';

export function getSocialPlatformIcon(platform: string): React.ComponentType<any> {
  const p = (platform || '').toLowerCase();
  let iconName = 'Globe';

  if (p === 'instagram') iconName = 'Instagram';
  else if (p === 'whatsapp') iconName = 'MessageCircle';
  else if (p === 'linkedin') iconName = 'Linkedin';
  else if (p === 'facebook') iconName = 'Facebook';
  else if (p === 'youtube') iconName = 'Youtube';
  else if (p === 'tiktok') iconName = 'Video';
  else if (p === 'twitter' || p === 'x') iconName = 'Twitter';
  else if (p === 'email') iconName = 'Mail';
  else if (p === 'website') iconName = 'Globe';

  const icon = (LucideIcons as any)[iconName];
  return icon || (LucideIcons as any).Globe || (LucideIcons as any).Share2;
}

export function getSocialPlatformLabel(platform: string): string {
  switch ((platform || '').toLowerCase()) {
    case 'instagram': return 'Instagram';
    case 'whatsapp': return 'WhatsApp';
    case 'linkedin': return 'LinkedIn';
    case 'facebook': return 'Facebook';
    case 'youtube': return 'YouTube';
    case 'tiktok': return 'TikTok';
    case 'twitter': return 'X (Twitter)';
    case 'email': return 'E-mail';
    case 'website': return 'Website';
    default: return platform || 'Rede Social';
  }
}

interface SocialLinksWrapperProps {
  component: AtomicComponent;
  isSelected?: boolean;
  viewportMode?: ViewportMode;
  page?: any;
  canvasData?: CanvasData | null;
  isPublicView?: boolean;
}

export function SocialLinksWrapper({
  component,
  isSelected = false,
  viewportMode = 'desktop',
  page,
  canvasData,
  isPublicView = false,
}: SocialLinksWrapperProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { siteBg, primaryStart } = getThemeColors(page);
  const fallbackColor = getTextFallbackColor(siteBg, 'heading');

  const props = (component.props || {}) as SocialLinksProps;
  const style = component.style || {};

  const links: SocialLinkItem[] = Array.isArray(props.links) && props.links.length > 0
    ? props.links
    : [
        { id: '1', platform: 'instagram', url: 'https://instagram.com' },
        { id: '2', platform: 'whatsapp', url: 'https://wa.me/' },
        { id: '3', platform: 'linkedin', url: 'https://linkedin.com' },
      ];

  const gap = props.gap || (style as any).gap || '16px';
  const iconSizePx = props.iconSize || (style as any).fontSize || '20px';
  const variant = props.variant || 'minimal';
  const align = props.align || style.textAlign || 'left';
  const baseColor = props.color || style.color || fallbackColor;
  const hoverColor = props.hoverColor || style.hoverColor || primaryStart;

  let justifyClass = 'justify-start';
  if (align === 'center') justifyClass = 'justify-center';
  if (align === 'right') justifyClass = 'justify-end';
  if (align === 'space-between') justifyClass = 'justify-between';

  return (
    <nav className={`flex items-center flex-wrap ${justifyClass}`} style={{ gap }}>
      {links.map((link) => {
        const Icon = getSocialPlatformIcon(link.platform);
        const isHovered = hoveredId === link.id;
        const currentColor = isHovered ? hoverColor : baseColor;

        let containerStyle: React.CSSProperties = {
          color: currentColor,
          transition: 'all 200ms ease-in-out',
        };

        if (variant === 'circle') {
          containerStyle = {
            ...containerStyle,
            padding: '8px',
            borderRadius: '9999px',
            backgroundColor: isHovered
              ? `color-mix(in srgb, ${hoverColor} 15%, transparent)`
              : `color-mix(in srgb, ${baseColor} 10%, transparent)`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          };
        } else if (variant === 'filled') {
          containerStyle = {
            ...containerStyle,
            padding: '8px',
            borderRadius: '8px',
            backgroundColor: isHovered
              ? `color-mix(in srgb, ${hoverColor} 15%, transparent)`
              : `color-mix(in srgb, ${baseColor} 10%, transparent)`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          };
        } else if (variant === 'outline') {
          containerStyle = {
            ...containerStyle,
            padding: '8px',
            borderRadius: '8px',
            border: `1px solid ${currentColor}`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          };
        }

        return (
          <a
            key={link.id}
            href={isPublicView ? (link.url || '#') : '#'}
            onClick={!isPublicView ? (e) => e.preventDefault() : undefined}
            target={isPublicView ? '_blank' : undefined}
            rel="noopener noreferrer"
            title={link.label || getSocialPlatformLabel(link.platform)}
            onMouseEnter={() => setHoveredId(link.id)}
            onMouseLeave={() => setHoveredId(null)}
            className="inline-flex items-center justify-center transition-all cursor-pointer hover:opacity-80"
            style={containerStyle}
          >
            {Icon && <Icon style={{ width: iconSizePx, height: iconSizePx }} />}
          </a>
        );
      })}
    </nav>
  );
}
