import React from 'react';
import { UserCheck } from 'lucide-react';
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { logoPropControls } from './schema';
import { logoDefaults } from './defaults';

export const logoElementDefinition: ElementDefinition = {
  type: 'logo',
  label: 'Logotipo',
  description: 'Logotipo ou nome da marca',
  icon: UserCheck,
  category: 'branding',
  features: { inlineTextEditable: true, supportsTypography: true, supportsBackground: false, supportsBorder: false, supportsHover: true, supportsAction: false },
  propControls: logoPropControls,
  defaultProps: logoDefaults.defaultProps,
  defaultStyle: logoDefaults.defaultStyle,
  component: () => null,
};

ElementRegistry.register(logoElementDefinition);
