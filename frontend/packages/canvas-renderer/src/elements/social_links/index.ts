import React from 'react';
import { Share2 } from 'lucide-react';
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { socialLinksPropControls } from './schema';
import { socialLinksDefaults } from './defaults';

export const socialLinksElementDefinition: ElementDefinition = {
  type: 'social_links',
  label: 'Redes Sociais',
  description: 'Links e ícones para perfis sociais',
  icon: Share2,
  category: 'branding',
  features: { inlineTextEditable: false, supportsTypography: false, supportsBackground: false, supportsBorder: false, supportsHover: true, supportsAction: false },
  propControls: socialLinksPropControls,
  defaultProps: socialLinksDefaults.defaultProps,
  defaultStyle: socialLinksDefaults.defaultStyle,
  component: () => null,
};

ElementRegistry.register(socialLinksElementDefinition);
