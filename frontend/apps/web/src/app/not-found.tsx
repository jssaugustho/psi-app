import React from 'react';
import { NotFoundView } from '@psi/ui';

export default function WebNotFound() {
  return (
    <NotFoundView
      homePath="/dashboard"
      title="Página Não Encontrada"
      description="A página que você está buscando não existe no painel ou foi removida."
    />
  );
}
