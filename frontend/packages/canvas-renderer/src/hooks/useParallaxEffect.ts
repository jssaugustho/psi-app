import { useState, useEffect, useRef, CSSProperties } from 'react';

export interface UseParallaxOptions {
  speed?: number;
  disableMobile?: boolean;
  isMobile?: boolean;
  isEditorMode?: boolean;
}

export function useParallaxEffect({
  speed = 0,
  disableMobile = false,
  isMobile = false,
  isEditorMode = false,
}: UseParallaxOptions) {
  const elementRef = useRef<HTMLElement | null>(null);
  const [translateY, setTranslateY] = useState<number>(0);

  const isActive = !!speed && speed !== 0 && !(isMobile && disableMobile);

  useEffect(() => {
    if (!isActive || typeof window === 'undefined') {
      setTranslateY(0);
      return;
    }

    let animationFrameId: number;

    const updateParallax = () => {
      const el = elementRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight || 800;

      if (rect.bottom >= -200 && rect.top <= windowHeight + 200) {
        const elementCenter = rect.top + rect.height / 2;
        const viewportCenter = windowHeight / 2;
        const offsetFromCenter = elementCenter - viewportCenter;

        const calculatedY = Math.round(offsetFromCenter * speed * 0.25);
        setTranslateY(calculatedY);
      }
    };

    const onScrollOrResize = () => {
      animationFrameId = requestAnimationFrame(updateParallax);
    };

    updateParallax();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [isActive, speed, isMobile, disableMobile]);

  const style: CSSProperties = isActive && translateY !== 0
    ? {
        transform: `translate3d(0, ${translateY}px, 0)`,
        willChange: 'transform',
        transition: isEditorMode ? 'transform 0.1s ease-out' : 'transform 0.05s linear',
      }
    : {};

  return { ref: elementRef, style, translateY, isActive };
}
