'use client';

import React from 'react';
import { ErrorView } from '@psi/ui';

export default function AdminGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorView
      error={error}
      reset={reset}
      homePath="/dashboard"
      title="Falha no Portal Admin"
      description="Ocorreu um erro ao carregar os módulos administrativos. Verifique o estado do sistema ou tente novamente."
      logoProps={{
        fallbackText: 'TheraOS Admin',
        logoConfig: { mode: 'html', text: 'TheraOS Admin' },
      }}
    />
  );
}
