import React from 'react';
import { MousePointerClick } from 'lucide-react';
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { buttonPropControls } from './schema';
import { buttonDefaults } from './defaults';

export const buttonElementDefinition: ElementDefinition = {
  type: 'button',
  label: 'Botão CTA',
  description: 'Chamada para ação com suporte a formulário, WhatsApp e links',
  icon: MousePointerClick,
  category: 'interactive',
  features: {
    inlineTextEditable: true,
    supportsTypography: true,
    supportsBackground: true,
    supportsBorder: true,
    supportsHover: true,
    supportsAction: true,
  },
  propControls: buttonPropControls,
  defaultProps: buttonDefaults.defaultProps,
  defaultStyle: buttonDefaults.defaultStyle,
  component: () => null,
};

ElementRegistry.register(buttonElementDefinition);
