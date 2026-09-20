import React from 'react';
import { Award } from 'lucide-react';
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { badgePropControls } from './schema';
import { badgeDefaults } from './defaults';

export const badgeElementDefinition: ElementDefinition = {
  type: 'badge',
  label: 'Selo / Badge',
  description: 'Chip ou etiqueta de destaque com ícone',
  icon: Award,
  category: 'branding',
  features: { inlineTextEditable: true, supportsTypography: true, supportsBackground: true, supportsBorder: true, supportsHover: true, supportsAction: false },
  propControls: badgePropControls,
  defaultProps: badgeDefaults.defaultProps,
  defaultStyle: badgeDefaults.defaultStyle,
  component: () => null,
};

ElementRegistry.register(badgeElementDefinition);
