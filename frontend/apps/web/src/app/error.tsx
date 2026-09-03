'use client';

import React from 'react';
import { ErrorView } from '@psi/ui';

export default function WebGlobalError({
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
      title="Ops! Erro ao carregar o Painel"
      description="Desculpe pelo inconveniente. Ocorreu uma falha durante a exibição desta área. Tente recarregar a página."
    />
  );
}
