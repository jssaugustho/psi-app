'use client';

import React from 'react';
import { usePageEditor } from './hooks/usePageEditor';
import { PageEditorHeader } from './components/PageEditorHeader';
import { PageEditorSidebar } from './components/PageEditorSidebar';
import { PageEditorCanvas } from './components/PageEditorCanvas';
import { LoadingSpinner } from '@psi/ui';
import { AlertCircle } from 'lucide-react';

interface PageEditorWorkspaceProps {
  pageId?: string;
  isNewPage?: boolean;
}

export function PageEditorWorkspace({ pageId, isNewPage }: PageEditorWorkspaceProps) {
  const {
    loading,
    saving,
    page,
    setPage,
    activeTab,
    setActiveTab,
    devicePreview,
    setDevicePreview,
    message,
    setMessage,
    saveDraft,
    publishPage,
    visualIdentity,
  } = usePageEditor(pageId, isNewPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100">
      {/* Alerta de Feedback */}
      {message && (
        <div
          className={`px-6 py-3 text-xs font-semibold flex items-center justify-between border-b ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="opacity-70 hover:opacity-100 cursor-pointer bg-transparent border-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Header Fixo */}
      <PageEditorHeader
        title={page?.title || 'Sem título'}
        onChangeTitle={(newTitle) => setPage((prev: any) => (prev ? { ...prev, title: newTitle } : null))}
        isPublished={page?.isPublished}
        saving={saving}
        devicePreview={devicePreview}
        onChangeDevice={setDevicePreview}
        onSaveDraft={saveDraft}
        onPublish={publishPage}
      />

      {/* Corpo Principal: Sidebar + Canvas */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <PageEditorSidebar
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          page={page}
          onChangePage={setPage}
          visualIdentity={visualIdentity}
        />

        <PageEditorCanvas
          page={page}
          devicePreview={devicePreview}
          visualIdentity={visualIdentity}
        />
      </div>
    </div>
  );
}
