'use client';

import React from 'react';
import { SectionLayout, DivLayout } from '@psi/canvas-renderer';

interface PositioningControlProps {
  layout: SectionLayout | DivLayout;
  mobileOverride?: any;
  onChange: (patch: Record<string, any>) => void;
  onMobileOverrideChange?: (patch: Record<string, any>) => void;
  isMobile?: boolean;
}

export function PositioningControl({
  layout,
  mobileOverride,
  onChange,
  onMobileOverrideChange,
  isMobile = false,
}: PositioningControlProps) {
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl border border-[var(--surface-border)] glass-sm text-xs text-slate-500">
        <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Fluxo de Layout Responsivo</p>
        <p className="text-[11px] leading-relaxed">
          Containers seguem o fluxo natural do documento e alinhamento Flexbox/Grid para garantir máxima compatibilidade responsiva.
        </p>
      </div>
    </div>
  );
}
