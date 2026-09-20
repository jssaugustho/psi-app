import React from 'react';
import { Compass } from 'lucide-react';
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { navbarLinksPropControls } from './schema';
import { navbarLinksDefaults } from './defaults';

export const navbarLinksElementDefinition: ElementDefinition = {
  type: 'navbar_links',
  label: 'Menu de Navegação',
  description: 'Links de navegação do site',
  icon: Compass,
  category: 'branding',
  features: { inlineTextEditable: true, supportsTypography: true, supportsBackground: false, supportsBorder: false, supportsHover: true, supportsAction: false },
  propControls: navbarLinksPropControls,
  defaultProps: navbarLinksDefaults.defaultProps,
  defaultStyle: navbarLinksDefaults.defaultStyle,
  component: () => null,
};

ElementRegistry.register(navbarLinksElementDefinition);
