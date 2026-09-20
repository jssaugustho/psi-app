import React from 'react';
import { Sparkles } from 'lucide-react';
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { iconPropControls } from './schema';
import { iconDefaults } from './defaults';

export const iconElementDefinition: ElementDefinition = {
  type: 'icon',
  label: 'Ícone',
  description: 'Ícone vetorial Lucide customizável',
  icon: Sparkles,
  category: 'media',
  features: {
    inlineTextEditable: false,
    supportsTypography: false,
    supportsBackground: false,
    supportsBorder: false,
    supportsHover: true,
    supportsAction: false,
  },
  propControls: iconPropControls,
  defaultProps: iconDefaults.defaultProps,
  defaultStyle: iconDefaults.defaultStyle,
  component: () => null,
};

ElementRegistry.register(iconElementDefinition);
