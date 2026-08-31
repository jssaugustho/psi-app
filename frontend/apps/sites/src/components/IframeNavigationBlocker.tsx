'use client';

import { useEffect } from 'react';

export function IframeNavigationBlocker() {
  useEffect(() => {
    // Detect if running inside an iframe
    const isIframe = typeof window !== 'undefined' && window !== window.parent;
    if (!isIframe) return;

    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor) {
        const href = anchor.getAttribute('href');
        // Prevent navigation if it's not a local hash anchor (e.g. #faq)
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          e.preventDefault();
          console.warn('[IframeBlocker] Navigation blocked inside preview iframe:', href);
        }
      }
    };

    document.addEventListener('click', handleLinkClick, true);
    return () => {
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, []);

  return null;
}
