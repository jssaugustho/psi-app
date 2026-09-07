'use client';

import React from 'react';
import { ErrorProvider as SharedErrorProvider, useError as useSharedError, GlobalError } from '@psi/ui';
import { api } from '../lib/api';

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  return (
    <SharedErrorProvider
      clientApp="web"
      onReportError={async (payload) => {
        await api.logError({
          name: payload.name,
          message: payload.message,
          stack: payload.stack,
          url: payload.url || (typeof window !== 'undefined' ? window.location.href : null),
          userAgent: payload.userAgent || (typeof window !== 'undefined' ? navigator.userAgent : null),
          severity: 'error',
        });
      }}
    >
      {children}
    </SharedErrorProvider>
  );
}

export function useError() {
  return useSharedError();
}

export type { GlobalError };
