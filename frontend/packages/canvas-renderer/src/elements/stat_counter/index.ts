import React from 'react';
import { BarChart3 } from 'lucide-react';
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { statCounterPropControls } from './schema';
import { statCounterDefaults } from './defaults';

export const statCounterElementDefinition: ElementDefinition = {
  type: 'stat_counter',
  label: 'Contador de Estatísticas',
  description: 'Exibição de métricas e estatísticas numéricas',
  icon: BarChart3,
  category: 'marketing',
  features: { inlineTextEditable: true, supportsTypography: true, supportsBackground: false, supportsBorder: false, supportsHover: true, supportsAction: false },
  propControls: statCounterPropControls,
  defaultProps: statCounterDefaults.defaultProps,
  defaultStyle: statCounterDefaults.defaultStyle,
  component: () => null,
};

ElementRegistry.register(statCounterElementDefinition);
