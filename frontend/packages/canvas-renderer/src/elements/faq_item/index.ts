import React from 'react';
import { HelpCircle } from 'lucide-react';
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { faqItemPropControls } from './schema';
import { faqItemDefaults } from './defaults';

export const faqItemElementDefinition: ElementDefinition = {
  type: 'faq_item',
  label: 'Pergunta Frequente',
  description: 'Acordeão de pergunta e resposta frequente',
  icon: HelpCircle,
  category: 'marketing',
  features: { inlineTextEditable: true, supportsTypography: true, supportsBackground: true, supportsBorder: true, supportsHover: true, supportsAction: false },
  propControls: faqItemPropControls,
  defaultProps: faqItemDefaults.defaultProps,
  defaultStyle: faqItemDefaults.defaultStyle,
  component: () => null,
};

ElementRegistry.register(faqItemElementDefinition);
