'use client';

import { useState, useEffect } from 'react';

export interface UTMParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

const STORAGE_KEY = 'psi_utms';

/**
 * Lê os parâmetros UTM da URL e os persiste em sessionStorage,
 * garantindo que não se percam ao navegar dentro da mesma aba.
 */
export function useUTMParams(): UTMParams {
  const [utms, setUtms] = useState<UTMParams>({
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_term: null,
    utm_content: null,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const captured: UTMParams = {
      utm_source:   params.get('utm_source'),
      utm_medium:   params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_term:     params.get('utm_term'),
      utm_content:  params.get('utm_content'),
    };

    const hasUtms = Object.values(captured).some(Boolean);
    if (hasUtms) {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(captured)); } catch {}
      setUtms(captured);
    } else {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) setUtms(JSON.parse(stored));
        else setUtms(captured);
      } catch {
        setUtms(captured);
      }
    }
  }, []);

  return utms;
}
