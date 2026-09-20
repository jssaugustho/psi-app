import React from 'react';
import { Type } from 'lucide-react';
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { labelPropControls } from './schema';
import { labelDefaults } from './defaults';

export const labelElementDefinition: ElementDefinition = {
  type: 'label',
  label: 'Subtítulo',
  description: 'Texto curto de apoio ou etiqueta',
  icon: Type,
  category: 'typography',
  features: {
    inlineTextEditable: true,
    supportsTypography: true,
    supportsBackground: false,
    supportsBorder: false,
    supportsHover: true,
    supportsAction: false,
  },
  propControls: labelPropControls,
  defaultProps: labelDefaults.defaultProps,
  defaultStyle: labelDefaults.defaultStyle,
  component: () => null,
};

ElementRegistry.register(labelElementDefinition);
