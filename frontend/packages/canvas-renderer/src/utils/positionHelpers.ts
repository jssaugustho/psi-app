import { CSSProperties, useState, useEffect } from 'react';
import { SectionLayout, DivLayout } from '../types';

export function getPositionStyles(
  layout?: SectionLayout | DivLayout,
  mobileOverride?: any,
  isMobile?: boolean,
  isScrollTriggeredActive?: boolean,
  isEditorMode?: boolean
): CSSProperties {
  if (!layout) return {};

  const effective = isMobile && mobileOverride
    ? { ...layout, ...mobileOverride }
    : layout;

  let position = effective.position || 'relative';

  // Handle mobile position override mode
  if (isMobile && effective.mobilePositionMode) {
    if (effective.mobilePositionMode === 'static' || effective.mobilePositionMode === 'relative') {
      position = 'relative';
    } else if (effective.mobilePositionMode !== 'inherit') {
      position = effective.mobilePositionMode as any;
    }
  }

  if (position === 'relative' || position === 'static') {
    return { position: position as any };
  }

  const verticalAnchor = effective.verticalAnchor || 'top';
  const verticalOffset = effective.verticalOffset !== undefined
    ? effective.verticalOffset
    : (verticalAnchor === 'top' ? (effective.top || '0px') : (effective.bottom || '0px'));
  const initialOffset = effective.initialOffset;

  const stickyScope = effective.stickyScope || 'page';
  const isGlobalSticky = position === 'sticky' && stickyScope === 'page';
  const zIndex = effective.zIndex !== undefined ? Number(effective.zIndex) : (position === 'sticky' ? 50 : 40);

  const horizontalAnchor = effective.horizontalAnchor || 'stretch';
  const horizontalOffset = effective.horizontalOffset || (effective.left || effective.right || '24px');

  const style: CSSProperties = {
    position: (position === 'sticky' ? 'sticky' : position) as any,
    zIndex,
  };

  // Vertical anchoring
  if (verticalAnchor === 'top') {
    style.top = verticalOffset;
    style.bottom = 'auto';
    if (initialOffset) style.marginTop = initialOffset;
  } else if (verticalAnchor === 'bottom') {
    style.bottom = verticalOffset;
    style.top = 'auto';
    if (initialOffset) style.marginBottom = initialOffset;
  }

  // Horizontal anchoring
  if (isGlobalSticky) {
    const maxWidthVal = effective.maxWidth || effective.maxContentWidth || '1200px';
    style.width = '100%';

    if (horizontalAnchor === 'left') {
      style.maxWidth = maxWidthVal;
      style.marginLeft = horizontalOffset && horizontalOffset !== '0px' ? horizontalOffset : '0px';
      style.marginRight = 'auto';
      style.left = '0px';
      style.right = 'auto';
    } else if (horizontalAnchor === 'right') {
      style.maxWidth = maxWidthVal;
      style.marginLeft = 'auto';
      style.marginRight = horizontalOffset && horizontalOffset !== '0px' ? horizontalOffset : '0px';
      style.right = '0px';
      style.left = 'auto';
    } else if (horizontalAnchor === 'stretch') {
      style.maxWidth = '100%';
      style.marginLeft = '0px';
      style.marginRight = '0px';
      style.left = '0px';
      style.right = '0px';
    } else {
      // Default / Center: align to centered section width (1200px max width)
      style.maxWidth = maxWidthVal;
      style.marginLeft = 'auto';
      style.marginRight = 'auto';
      style.left = '0px';
      style.right = '0px';
    }
  } else {
    if (horizontalAnchor === 'left') {
      style.left = horizontalOffset;
      style.right = 'auto';
    } else if (horizontalAnchor === 'right') {
      style.right = horizontalOffset;
      style.left = 'auto';
    } else if (horizontalAnchor === 'center') {
      style.marginLeft = 'auto';
      style.marginRight = 'auto';
    } else if (horizontalAnchor === 'stretch') {
      if (position === 'fixed') {
        style.left = '0px';
        style.right = '0px';
      }
    }
  }

  // Scroll Triggered Visibility (Fade-in)
  if (effective.appearOnScroll && !isEditorMode) {
    style.transitionProperty = 'opacity, transform';
    style.transitionDuration = '300ms';
    style.transitionTimingFunction = 'ease';

    if (isScrollTriggeredActive) {
      style.opacity = 1;
      style.pointerEvents = 'auto';
    } else {
      style.opacity = 0;
      style.pointerEvents = 'none';
    }
  }

  return style;
}

export function useScrollThreshold(enabled: boolean = false, threshold: number | string = 300) {
  const numericThreshold = typeof threshold === 'number' ? threshold : (parseInt(String(threshold), 10) || 300);
  const [isPastThreshold, setIsPastThreshold] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setIsPastThreshold(true);
      return;
    }

    const handleScroll = () => {
      const scrollY = typeof window !== 'undefined' ? (window.scrollY || window.pageYOffset || 0) : 0;
      setIsPastThreshold(scrollY >= numericThreshold);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [enabled, numericThreshold]);

  return isPastThreshold;
}
