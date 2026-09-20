import React from 'react';
import { User } from 'lucide-react';
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { avatarPropControls } from './schema';
import { avatarDefaults } from './defaults';

export const avatarElementDefinition: ElementDefinition = {
  type: 'avatar',
  label: 'Foto de Perfil',
  description: 'Foto de perfil circular com nome e cargo',
  icon: User,
  category: 'branding',
  features: { inlineTextEditable: true, supportsTypography: true, supportsBackground: false, supportsBorder: true, supportsHover: true, supportsAction: false },
  propControls: avatarPropControls,
  defaultProps: avatarDefaults.defaultProps,
  defaultStyle: avatarDefaults.defaultStyle,
  component: () => null,
};

ElementRegistry.register(avatarElementDefinition);
