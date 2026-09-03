'use client';

import React from 'react';
import { ErrorView } from '@psi/ui';

export default function SitesGlobalError({
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
      homePath="/"
      title="Página Indisponível"
      description="Desculpe pelo inconveniente. Ocorreu um erro ao renderizar esta página de captação."
    />
  );
}
