import React from 'react';
import { MessageSquare } from 'lucide-react';
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { testimonialPropControls } from './schema';
import { testimonialDefaults } from './defaults';

export const testimonialElementDefinition: ElementDefinition = {
  type: 'testimonial',
  label: 'Depoimento',
  description: 'Citação de depoimento de paciente ou cliente',
  icon: MessageSquare,
  category: 'marketing',
  features: { inlineTextEditable: true, supportsTypography: true, supportsBackground: true, supportsBorder: true, supportsHover: true, supportsAction: false },
  propControls: testimonialPropControls,
  defaultProps: testimonialDefaults.defaultProps,
  defaultStyle: testimonialDefaults.defaultStyle,
  component: () => null,
};

ElementRegistry.register(testimonialElementDefinition);
