import React from 'react';
import { List } from 'lucide-react';
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { listPropControls } from './schema';
import { listDefaults } from './defaults';

export const listElementDefinition: ElementDefinition = {
  type: 'list',
  label: 'Lista de Tópicos',
  description: 'Lista de itens com ícone de marcação',
  icon: List,
  category: 'typography',
  features: { inlineTextEditable: true, supportsTypography: true, supportsBackground: false, supportsBorder: false, supportsHover: true, supportsAction: false },
  propControls: listPropControls,
  defaultProps: listDefaults.defaultProps,
  defaultStyle: listDefaults.defaultStyle,
  component: () => null,
};

ElementRegistry.register(listElementDefinition);
