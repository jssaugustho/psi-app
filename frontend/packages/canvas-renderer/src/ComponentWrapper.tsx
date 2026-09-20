'use client';

import React from 'react';
import { Component, DivComponent, CarouselComponent, AtomicComponent, ViewportMode, CanvasData } from './types';
import { DivWrapper } from './DivWrapper';
import { CarouselWrapper } from './CarouselWrapper';
import { AtomicComponentWrapper } from './AtomicComponentWrapper';

interface ComponentWrapperProps {
  component: Component;
  selectedId?: string | null;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  viewportMode?: ViewportMode;
  page?: any;
  canvasData?: CanvasData | null;
  onSelect?: (id: string, type: any) => void;
  onRemove?: (id: string) => void;
  onUpdateComponent?: (id: string, patch: any) => void;
  onAddComponent?: (parentId: string, comp: any) => void;
  onMoveElement?: (elementId: string, targetParentId: string) => void;
  onMoveElementBeforeOrAfter?: (elementId: string, targetElementId: string, position: 'before' | 'after') => void;
  onAddComponentBeforeOrAfter?: (targetElementId: string, comp: any, position: 'before' | 'after') => void;
  onContextMenu?: (e: React.MouseEvent, id: string, type: string) => void;
  onCtaClick?: () => void;
  isPublicView?: boolean;
}

export function ComponentWrapper({
  component,
  selectedId = null,
  hoveredId = null,
  onHover,
  viewportMode = 'desktop',
  page,
  canvasData,
  onSelect,
  onRemove,
  onUpdateComponent,
  onAddComponent,
  onMoveElement,
  onMoveElementBeforeOrAfter,
  onAddComponentBeforeOrAfter,
  onContextMenu,
  onCtaClick,
  isPublicView = false,
}: ComponentWrapperProps) {
  if (component.type === 'carousel') {
    return (
      <CarouselWrapper
        carouselComponent={component as CarouselComponent}
        selectedId={selectedId}
        viewportMode={viewportMode}
        page={page}
        canvasData={canvasData}
        onSelect={onSelect}
        onRemove={onRemove}
        onUpdateComponent={onUpdateComponent}
        onAddComponent={onAddComponent}
        onMoveElement={onMoveElement}
        onMoveElementBeforeOrAfter={onMoveElementBeforeOrAfter}
        onAddComponentBeforeOrAfter={onAddComponentBeforeOrAfter}
        onContextMenu={onContextMenu}
        onCtaClick={onCtaClick}
        isPublicView={isPublicView}
      />
    );
  }

  if (component.type === 'div') {
    return (
      <DivWrapper
        divComponent={component as DivComponent}
        selectedId={selectedId}
        hoveredId={hoveredId}
        onHover={onHover}
        viewportMode={viewportMode}
        page={page}
        canvasData={canvasData}
        onSelect={onSelect}
        onRemove={onRemove}
        onUpdateComponent={onUpdateComponent}
        onAddComponent={onAddComponent}
        onMoveElement={onMoveElement}
        onMoveElementBeforeOrAfter={onMoveElementBeforeOrAfter}
        onAddComponentBeforeOrAfter={onAddComponentBeforeOrAfter}
        onContextMenu={onContextMenu}
        onCtaClick={onCtaClick}
        isPublicView={isPublicView}
      />
    );
  }

  return (
    <AtomicComponentWrapper
      component={component as AtomicComponent}
      isSelected={!isPublicView && selectedId === component.id}
      hoveredId={hoveredId}
      onHover={onHover}
      viewportMode={viewportMode}
      page={page}
      canvasData={canvasData}
      onSelect={onSelect}
      onRemove={onRemove}
      onUpdateComponent={onUpdateComponent}
      onMoveElementBeforeOrAfter={onMoveElementBeforeOrAfter}
      onAddComponentBeforeOrAfter={onAddComponentBeforeOrAfter}
      onContextMenu={onContextMenu}
      onCtaClick={onCtaClick}
      isPublicView={isPublicView}
    />
  );
}
