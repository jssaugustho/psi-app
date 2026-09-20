'use client';

import React from 'react';
import { ComponentStyle } from '../../types';
import { EffectsControl } from './EffectsControl';

interface TransformControlProps {
  style: ComponentStyle;
  isHoverTab?: boolean;
  onChangeStyle: (key: keyof ComponentStyle, value: any) => void;
  page?: any;
  canvasData?: any;
}

export function TransformControl({
  style,
  isHoverTab = false,
  onChangeStyle,
  page,
  canvasData,
}: TransformControlProps) {
  return (
    <EffectsControl
      style={style}
      isHoverTab={isHoverTab}
      onChangeStyle={onChangeStyle}
      page={page}
      canvasData={canvasData}
    />
  );
}
