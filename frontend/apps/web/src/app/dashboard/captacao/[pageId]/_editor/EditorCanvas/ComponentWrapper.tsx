'use client';

import React from 'react';
import { Component, DivComponent, CarouselComponent, AtomicComponent, ViewportMode } from '../types';
import { DivWrapper } from './DivWrapper';
import { CarouselWrapper } from './CarouselWrapper';
import { AtomicComponentWrapper } from './AtomicComponentWrapper';

interface ComponentWrapperProps {
  component: Component;
  selectedId: string | null;
  viewportMode?: ViewportMode;
  page?: any;
  onSelect: (id: string, type: any) => void;
  onRemove: (id: string) => void;
  onUpdateComponent?: (id: string, patch: any) => void;
  onAddComponent?: (parentId: string, comp: any) => void;
  onMoveElement?: (elementId: string, targetParentId: string) => void;
  onMoveElementBeforeOrAfter?: (elementId: string, targetElementId: string, position: 'before' | 'after') => void;
  onAddComponentBeforeOrAfter?: (targetElementId: string, comp: any, position: 'before' | 'after') => void;
  onContextMenu?: (e: React.MouseEvent, id: string, type: string) => void;
  isPublicView?: boolean;
}

export function ComponentWrapper({
  component,
  selectedId,
  viewportMode = 'desktop',
  page,
  onSelect,
  onRemove,
  onUpdateComponent,
  onAddComponent,
  onMoveElement,
  onMoveElementBeforeOrAfter,
  onAddComponentBeforeOrAfter,
  onContextMenu,
  isPublicView = false,
}: ComponentWrapperProps) {
  if (component.type === 'carousel') {
    return (
      <CarouselWrapper
        carouselComponent={component as CarouselComponent}
        selectedId={selectedId}
        viewportMode={viewportMode}
        page={page}
        onSelect={onSelect}
        onRemove={onRemove}
        onUpdateComponent={onUpdateComponent}
        onAddComponent={onAddComponent}
        onMoveElement={onMoveElement}
        onMoveElementBeforeOrAfter={onMoveElementBeforeOrAfter}
        onAddComponentBeforeOrAfter={onAddComponentBeforeOrAfter}
        onContextMenu={onContextMenu}
        isPublicView={isPublicView}
      />
    );
  }

  if (component.type === 'div') {
    return (
      <DivWrapper
        divComponent={component as DivComponent}
        selectedId={selectedId}
        viewportMode={viewportMode}
        page={page}
        onSelect={onSelect}
        onRemove={onRemove}
        onUpdateComponent={onUpdateComponent}
        onAddComponent={onAddComponent}
        onMoveElement={onMoveElement}
        onMoveElementBeforeOrAfter={onMoveElementBeforeOrAfter}
        onAddComponentBeforeOrAfter={onAddComponentBeforeOrAfter}
        onContextMenu={onContextMenu}
        isPublicView={isPublicView}
      />
    );
  }

  return (
    <AtomicComponentWrapper
      component={component as AtomicComponent}
      isSelected={selectedId === component.id}
      viewportMode={viewportMode}
      page={page}
      onSelect={onSelect}
      onRemove={onRemove}
      onUpdateComponent={onUpdateComponent}
      onMoveElementBeforeOrAfter={onMoveElementBeforeOrAfter}
      onAddComponentBeforeOrAfter={onAddComponentBeforeOrAfter}
      onContextMenu={onContextMenu}
      isPublicView={isPublicView}
    />
  );
}
