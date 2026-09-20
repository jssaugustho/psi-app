import { useState, useEffect } from 'react';

const ADJUST_EVENT_NAME = 'psi-property-adjust';

export function startAdjustingProperty() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ADJUST_EVENT_NAME, { detail: { isAdjusting: true } }));

  const handleUp = () => {
    window.dispatchEvent(new CustomEvent(ADJUST_EVENT_NAME, { detail: { isAdjusting: false } }));
    window.removeEventListener('pointerup', handleUp);
    window.removeEventListener('mouseup', handleUp);
    window.removeEventListener('touchend', handleUp);
  };

  window.addEventListener('pointerup', handleUp, { once: true });
  window.addEventListener('mouseup', handleUp, { once: true });
  window.addEventListener('touchend', handleUp, { once: true });
}

export function stopAdjustingProperty() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ADJUST_EVENT_NAME, { detail: { isAdjusting: false } }));
}

export function useIsAdjustingProperty() {
  const [isAdjusting, setIsAdjusting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCustomEvent = (e: any) => {
      if (e && e.detail) {
        setIsAdjusting(!!e.detail.isAdjusting);
      }
    };

    window.addEventListener(ADJUST_EVENT_NAME, handleCustomEvent);
    return () => {
      window.removeEventListener(ADJUST_EVENT_NAME, handleCustomEvent);
    };
  }, []);

  return isAdjusting;
}
