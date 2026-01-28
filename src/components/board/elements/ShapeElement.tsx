'use client';

import { useRef, useCallback, memo } from 'react';
import { Rect, Circle, RegularPolygon, Arrow, Group, Star, Line } from 'react-konva';
import type Konva from 'konva';
import type { BoardElement } from '@/types/board';

interface ShapeElementProps {
  element: BoardElement;
  isSelected: boolean;
  onSelect: (id: string, e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragEnd: (id: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (id: string, e: Konva.KonvaEventObject<Event>) => void;
}

export const ShapeElement = memo(function ShapeElement({
  element,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: ShapeElementProps) {
  const groupRef = useRef<Konva.Group>(null);

  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect(element.id, e);
  }, [element.id, onSelect]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    onDragEnd(element.id, e);
  }, [element.id, onDragEnd]);

  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>) => {
    onTransformEnd(element.id, e);
  }, [element.id, onTransformEnd]);

  const style = element.style;
  const shapeType = element.content.shape_type || 'rectangle';

  const commonProps = {
    fill: style.background_color || '#e5e7eb',
    stroke: isSelected ? '#3b82f6' : style.border_color || '#000000',
    strokeWidth: isSelected ? 2 : style.border_width || 1,
    opacity: style.opacity ?? 1,
    shadowEnabled: style.shadow,
    shadowBlur: 10,
    shadowOpacity: 0.3,
    shadowOffset: { x: 2, y: 2 },
  };

  const renderShape = () => {
    switch (shapeType) {
      case 'rectangle':
        return (
          <Rect
            width={element.width}
            height={element.height}
            cornerRadius={style.border_radius || 0}
            {...commonProps}
          />
        );

      case 'circle':
        return (
          <Circle
            x={element.width / 2}
            y={element.height / 2}
            radius={Math.min(element.width, element.height) / 2}
            {...commonProps}
          />
        );

      case 'triangle':
        return (
          <RegularPolygon
            x={element.width / 2}
            y={element.height / 2}
            sides={3}
            radius={Math.min(element.width, element.height) / 2}
            {...commonProps}
          />
        );

      case 'arrow':
        return (
          <Arrow
            points={[0, element.height / 2, element.width, element.height / 2]}
            pointerLength={20}
            pointerWidth={20}
            {...commonProps}
          />
        );

      case 'star':
        return (
          <Star
            x={element.width / 2}
            y={element.height / 2}
            numPoints={5}
            innerRadius={Math.min(element.width, element.height) / 4}
            outerRadius={Math.min(element.width, element.height) / 2}
            {...commonProps}
          />
        );

      case 'line':
        return (
          <Line
            points={[0, element.height / 2, element.width, element.height / 2]}
            stroke={isSelected ? '#3b82f6' : style.border_color || style.background_color || '#1f2937'}
            strokeWidth={style.border_width || 4}
            opacity={style.opacity ?? 1}
            lineCap="round"
            lineJoin="round"
          />
        );

      default:
        return (
          <Rect
            width={element.width}
            height={element.height}
            {...commonProps}
          />
        );
    }
  };

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={element.position_x}
      y={element.position_y}
      width={element.width}
      height={element.height}
      rotation={element.rotation}
      draggable={!element.locked && isSelected}
      onClick={handleClick}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      {renderShape()}
    </Group>
  );
});
