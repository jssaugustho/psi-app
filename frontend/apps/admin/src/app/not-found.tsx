import React from 'react';
import { NotFoundView } from '@psi/ui';

export default function AdminNotFound() {
  return (
    <NotFoundView
      homePath="/dashboard"
      title="Página Admin Não Encontrada"
      description="Esta rota de administração não existe ou você não possui permissões para acessá-la."
      logoProps={{
        fallbackText: 'TheraOS Admin',
        logoConfig: { mode: 'html', text: 'TheraOS Admin' },
      }}
    />
  );
}
