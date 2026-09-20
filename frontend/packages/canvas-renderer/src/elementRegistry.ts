import React from 'react';
import { AtomicComponent, ComponentStyle, ViewportMode, CanvasData } from './types';

export type PropertyControlType =
  | 'text'
  | 'textarea'
  | 'slider'
  | 'select'
  | 'color'
  | 'typography'
  | 'alignment'
  | 'icon'
  | 'image'
  | 'list_editor'
  | 'action'
  | 'boolean';

export interface PropertyControlSpec {
  name: string;
  label: string;
  type: PropertyControlType;
  defaultValue?: any;
  options?: Array<{ label: string; value: any }>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  category?: 'content' | 'appearance' | 'action' | 'layout';
  condition?: (props: Record<string, any>, style?: Record<string, any>) => boolean;
}

export interface ElementFeatures {
  inlineTextEditable?: boolean;
  supportsBackground?: boolean;
  supportsTypography?: boolean;
  supportsBorder?: boolean;
  supportsHover?: boolean;
  supportsAction?: boolean;
}

export interface ElementRenderProps {
  component: AtomicComponent;
  isSelected?: boolean;
  isPublicView?: boolean;
  viewportMode?: ViewportMode;
  canvasData?: CanvasData | null;
  onUpdateComponent?: (id: string, patch: Partial<AtomicComponent>) => void;
  onCtaClick?: () => void;
}

export interface ElementDefinition {
  type: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'structure' | 'typography' | 'media' | 'branding' | 'interactive' | 'marketing';
  features: ElementFeatures;
  propControls: PropertyControlSpec[];
  defaultProps: Record<string, any>;
  defaultStyle: Record<string, any>;
  component: React.ComponentType<ElementRenderProps>;
}

class ElementRegistryImpl {
  private registry = new Map<string, ElementDefinition>();

  register(definition: ElementDefinition) {
    this.registry.set(definition.type, definition);
  }

  get(type: string): ElementDefinition | undefined {
    return this.registry.get(type);
  }

  getAll(): ElementDefinition[] {
    return Array.from(this.registry.values());
  }

  getByCategory(category: ElementDefinition['category']): ElementDefinition[] {
    return this.getAll().filter((def) => def.category === category);
  }
}

export const ElementRegistry = new ElementRegistryImpl();
