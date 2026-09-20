import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { spacerPropControls } from './schema';
import { spacerDefaults } from './defaults';

export const spacerElementDefinition: ElementDefinition = {
  type: 'spacer',
  label: 'Espaçador',
  description: 'Espaço em branco transparente',
  icon: ArrowUpDown,
  category: 'media',
  features: { inlineTextEditable: false, supportsTypography: false, supportsBackground: false, supportsBorder: false, supportsHover: false, supportsAction: false },
  propControls: spacerPropControls,
  defaultProps: spacerDefaults.defaultProps,
  defaultStyle: spacerDefaults.defaultStyle,
  component: () => null,
};

ElementRegistry.register(spacerElementDefinition);
