'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { PageEditorWorkspace } from '@/components/landing-builder/PageEditorWorkspace';

export default function EditCapturePage() {
  const params = useParams();
  const pageId = params.pageId as string;

  return <PageEditorWorkspace pageId={pageId} />;
}
