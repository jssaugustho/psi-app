import React from 'react';
import { Heading as HeadingIcon } from 'lucide-react';
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { headingPropControls } from './schema';
import { headingDefaults } from './defaults';

export const headingElementDefinition: ElementDefinition = {
  type: 'heading',
  label: 'Título',
  description: 'Título hierárquico (H1 a H4) com tipografia responsiva',
  icon: HeadingIcon,
  category: 'typography',
  features: {
    inlineTextEditable: true,
    supportsTypography: true,
    supportsBackground: false,
    supportsBorder: false,
    supportsHover: true,
    supportsAction: false,
  },
  propControls: headingPropControls,
  defaultProps: headingDefaults.defaultProps,
  defaultStyle: headingDefaults.defaultStyle,
  // Component visual do canvas será mapeado no renderizador unificado do pacote
  component: () => null,
};

ElementRegistry.register(headingElementDefinition);
