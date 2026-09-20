import React from 'react';
import { Minus } from 'lucide-react';
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { dividerPropControls } from './schema';
import { dividerDefaults } from './defaults';

export const dividerElementDefinition: ElementDefinition = {
  type: 'divider',
  label: 'Divisória',
  description: 'Linha de separação entre elementos',
  icon: Minus,
  category: 'media',
  features: { inlineTextEditable: false, supportsTypography: false, supportsBackground: false, supportsBorder: false, supportsHover: false, supportsAction: false },
  propControls: dividerPropControls,
  defaultProps: dividerDefaults.defaultProps,
  defaultStyle: dividerDefaults.defaultStyle,
  component: () => null,
};

ElementRegistry.register(dividerElementDefinition);
