'use client';

import React, { use } from 'react';
import { EditorLayout } from './_editor/EditorLayout';

interface PageProps {
  params: Promise<{
    pageId: string;
  }>;
}

/**
 * Shell da Página do Editor de Captura (Visual Site Builder)
 * Cumpre a Regra de Ouro #5: Mantém page.tsx < 50 linhas delegando a lógica para _editor.
 */
export default function PageEditor({ params }: PageProps) {
  const { pageId } = use(params);

  return <EditorLayout pageId={pageId} />;
}
