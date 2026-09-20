'use client';

import React from 'react';
import { CanvasRenderer as SharedCanvasRenderer, CanvasData, ViewportMode } from '@psi/canvas-renderer';

export interface CanvasRendererProps {
  canvasData: CanvasData | null;
  viewportMode?: ViewportMode;
  page?: any;
  onCtaClick?: () => void;
  isPublicView?: boolean;
}

export function CanvasRenderer({
  canvasData,
  viewportMode = 'desktop',
  page,
  isPublicView = true,
}: CanvasRendererProps) {
  return (
    <SharedCanvasRenderer
      canvasData={canvasData}
      viewportMode={viewportMode}
      page={page}
      isPublicView={isPublicView}
    />
  );
}

export * from '@psi/canvas-renderer';
