'use client';

import React from 'react';
import { AtomicComponent, CanvasData } from '@psi/canvas-renderer';
import { ElementRegistry, PropertyControlSpec } from '@psi/canvas-renderer';
import { Input, Select } from '@psi/ui';
import { SliderNumberInput } from './components/SliderNumberInput';
import { GlobalColorPicker } from './components/GlobalColorPicker';
import { IconPicker } from './components/IconPicker';
import { ListItemsEditor } from './components/ListItemsEditor';
import { ImageUploader } from '../components/ImageUploader';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  MousePointerClick,
  Link,
  MessageSquare,
  FileText,
} from 'lucide-react';

interface DynamicPropertyRendererProps {
  component: AtomicComponent;
  effectiveProps: Record<string, any>;
  onPropChange: (key: string, value: any) => void;
  onPropsBatchChange?: (patch: Record<string, any>) => void;
  canvasData?: CanvasData | null;
  page?: any;
}

export function DynamicPropertyRenderer({
  component,
  effectiveProps,
  onPropChange,
  onPropsBatchChange,
  canvasData,
  page,
}: DynamicPropertyRendererProps) {
  const definition = ElementRegistry.get(component.type);
  if (!definition || !definition.propControls || definition.propControls.length === 0) {
    return null;
  }

  const renderControl = (spec: PropertyControlSpec) => {
    if (spec.condition && !spec.condition(effectiveProps, component.style)) {
      return null;
    }

    const value = effectiveProps[spec.name] !== undefined ? effectiveProps[spec.name] : spec.defaultValue;

    switch (spec.type) {
      case 'text':
        return (
          <div key={spec.name} className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{spec.label}</label>
            <Input
              type="text"
              value={value || ''}
              onChange={(e) => onPropChange(spec.name, e.target.value)}
              className="text-xs font-bold"
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={spec.name} className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{spec.label}</label>
            <textarea
              rows={3}
              value={value || ''}
              onChange={(e) => onPropChange(spec.name, e.target.value)}
              className="w-full text-xs font-medium p-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--mix-base)] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-gradient-start)]"
            />
          </div>
        );

      case 'slider':
        return (
          <div key={spec.name} className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{spec.label}</label>
            <SliderNumberInput
              value={value}
              min={spec.min || 0}
              max={spec.max || 100}
              step={spec.step || 1}
              defaultUnit={spec.unit || 'px'}
              onChange={(val) => onPropChange(spec.name, val)}
            />
          </div>
        );

      case 'select':
        return (
          <div key={spec.name} className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{spec.label}</label>
            <Select
              value={String(value || '')}
              options={(spec.options || []).map((opt) => ({ value: String(opt.value), label: opt.label }))}
              onChange={(e: any) => onPropChange(spec.name, e?.target ? e.target.value : e)}
              className="text-xs font-bold"
            />
          </div>
        );

      case 'color':
        return (
          <div key={spec.name} className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{spec.label}</label>
            <GlobalColorPicker
              label={spec.label}
              value={value || '#000000'}
              onChange={(c) => onPropChange(spec.name, c)}
            />
          </div>
        );

      case 'icon':
        return (
          <div key={spec.name} className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{spec.label}</label>
            <IconPicker
              selectedName={value || ''}
              onSelectIcon={(iconName: string) => onPropChange(spec.name, iconName)}
            />
          </div>
        );

      case 'image':
        return (
          <div key={spec.name} className="space-y-1">
            <ImageUploader
              label={spec.label}
              value={value || ''}
              onChange={(url) => onPropChange(spec.name, url)}
              tenantId={page?.tenantId || page?.workspaceId}
            />
          </div>
        );

      case 'list_editor':
        return (
          <div key={spec.name} className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{spec.label}</label>
            <ListItemsEditor
              items={Array.isArray(value) ? value : []}
              onChange={(items) => onPropChange(spec.name, items)}
            />
          </div>
        );

      case 'action':
        return (
          <div key={spec.name} className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{spec.label}</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { value: 'cta_primary', label: 'Formulário da Página', icon: FileText },
                { value: 'whatsapp', label: 'WhatsApp Direct', icon: MessageSquare },
                { value: 'external_url', label: 'Link Externo (URL)', icon: Link },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onPropChange(spec.name, opt.value)}
                    className={`py-2 px-2 rounded-xl border text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1 text-center cursor-pointer ${
                      isSelected
                        ? 'brand-accent text-white border-transparent shadow-xs'
                        : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white glass-sm'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {value === 'external_url' && (
              <div className="pt-2">
                <Input
                  type="url"
                  placeholder="https://exemplo.com"
                  value={effectiveProps.externalUrl || ''}
                  onChange={(e) => onPropChange('externalUrl', e.target.value)}
                  className="text-xs"
                />
              </div>
            )}

            {value === 'whatsapp' && (
              <div className="pt-2 space-y-2">
                <Input
                  type="text"
                  placeholder="Ex: 5511999998888"
                  value={effectiveProps.whatsappNumber || ''}
                  onChange={(e) => onPropChange('whatsappNumber', e.target.value)}
                  className="text-xs"
                />
                <Input
                  type="text"
                  placeholder="Mensagem padrão opcional"
                  value={effectiveProps.whatsappMessage || ''}
                  onChange={(e) => onPropChange('whatsappMessage', e.target.value)}
                  className="text-xs"
                />
              </div>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={spec.name} className="flex items-center justify-between py-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">{spec.label}</span>
            <button
              type="button"
              onClick={() => onPropChange(spec.name, !value)}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                value ? 'bg-[var(--brand-gradient-start)]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  value ? 'left-5' : 'left-1'
                }`}
              />
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return <div className="space-y-3">{definition.propControls.map(renderControl)}</div>;
}
