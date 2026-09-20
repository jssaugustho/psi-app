'use client';

import React from 'react';
import { AtomicComponent, MenuLinkItem, ViewportMode } from '../types';
import { getThemeColors, getThemeTypography, getTextFallbackColor } from '../utils/colorHelpers';

interface NavbarLinksWrapperProps {
  component: AtomicComponent;
  isSelected: boolean;
  viewportMode?: ViewportMode;
  page?: any;
  isPublicView?: boolean;
}

export function NavbarLinksWrapper({
  component,
  isSelected,
  viewportMode = 'desktop',
  page,
  isPublicView = false,
}: NavbarLinksWrapperProps) {
  const { siteBg } = getThemeColors(page);
  const fallbackColor = getTextFallbackColor(siteBg, 'heading');
  const themeTypo = getThemeTypography(page);

  const props = component.props || {};
  const style = component.style || {};

  const links: MenuLinkItem[] = Array.isArray(props.links) && props.links.length > 0
    ? props.links
    : [
        { id: '1', label: 'Sobre Mim', targetType: 'section', sectionId: 'sec-about' },
        { id: '2', label: 'Especialidades', targetType: 'section', sectionId: 'sec-diagnostic' },
        { id: '3', label: 'Processo', targetType: 'section', sectionId: 'sec-process' },
        { id: '4', label: 'Dúvidas', targetType: 'section', sectionId: 'sec-faq' },
      ];

  const fontFamily = style.fontFamily
    ? `'${style.fontFamily}', sans-serif`
    : (themeTypo.levels.nav_links?.fontFamily || themeTypo.levels.links.fontFamily)
    ? `'${themeTypo.levels.nav_links?.fontFamily || themeTypo.levels.links.fontFamily}', sans-serif`
    : themeTypo.fontBody
    ? `'${themeTypo.fontBody}', sans-serif`
    : 'inherit';

  const fontSize = style.fontSize || props.fontSize || themeTypo.levels.nav_links?.fontSize || themeTypo.levels.links.fontSize || '0.875rem';
  const fontWeight = style.fontWeight || props.fontWeight || themeTypo.levels.nav_links?.fontWeight || themeTypo.levels.links.fontWeight || '500';
  const letterSpacing = style.letterSpacing || props.letterSpacing || themeTypo.levels.nav_links?.letterSpacing || themeTypo.levels.links.letterSpacing || 'normal';
  const textTransform = style.textTransform || props.textTransform || themeTypo.levels.nav_links?.textTransform || themeTypo.levels.links.textTransform || 'none';
  const textColor = style.color || props.color || (style as any).textColor || fallbackColor;
  const gap = props.gap || '24px';

  const handleLinkClick = (e: React.MouseEvent, link: MenuLinkItem) => {
    if (link.targetType === 'section' && link.sectionId) {
      e.preventDefault();
      const target = document.getElementById(link.sectionId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav
      className="flex items-center flex-wrap"
      style={{
        gap,
        fontFamily,
        fontSize,
        fontWeight,
        letterSpacing,
        textTransform: textTransform as any,
        color: textColor,
      }}
    >
      {links.map((link) => (
        <a
          key={link.id}
          href={link.targetType === 'section' ? `#${link.sectionId || ''}` : link.externalUrl || '#'}
          onClick={(e) => handleLinkClick(e, link)}
          className="hover:opacity-80 transition-opacity cursor-pointer whitespace-nowrap"
          style={{ color: textColor }}
        >
          {link.label || 'Link'}
        </a>
      ))}
    </nav>
  );
}
