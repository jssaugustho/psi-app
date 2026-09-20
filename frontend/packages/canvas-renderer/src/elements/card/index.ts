import React from 'react';
import { CreditCard } from 'lucide-react';
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { cardPropControls } from './schema';
import { cardDefaults } from './defaults';

export const cardElementDefinition: ElementDefinition = {
  type: 'card',
  label: 'Card',
  description: 'Bloco de conteúdo estruturado em cartão',
  icon: CreditCard,
  category: 'marketing',
  features: {
    inlineTextEditable: true,
    supportsTypography: true,
    supportsBackground: true,
    supportsBorder: true,
    supportsHover: true,
    supportsAction: false,
  },
  propControls: cardPropControls,
  defaultProps: cardDefaults.defaultProps,
  defaultStyle: cardDefaults.defaultStyle,
  component: () => null,
};

ElementRegistry.register(cardElementDefinition);
