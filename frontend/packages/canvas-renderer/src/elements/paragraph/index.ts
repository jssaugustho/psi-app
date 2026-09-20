import React from 'react';
import { AlignLeft } from 'lucide-react';
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { paragraphPropControls } from './schema';
import { paragraphDefaults } from './defaults';

export const paragraphElementDefinition: ElementDefinition = {
  type: 'paragraph',
  label: 'Parágrafo',
  description: 'Bloco de texto corrido ou explicativo',
  icon: AlignLeft,
  category: 'typography',
  features: {
    inlineTextEditable: true,
    supportsTypography: true,
    supportsBackground: false,
    supportsBorder: false,
    supportsHover: true,
    supportsAction: false,
  },
  propControls: paragraphPropControls,
  defaultProps: paragraphDefaults.defaultProps,
  defaultStyle: paragraphDefaults.defaultStyle,
  component: () => null,
};

ElementRegistry.register(paragraphElementDefinition);
