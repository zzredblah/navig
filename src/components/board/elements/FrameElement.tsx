'use client';

import { useRef, useCallback, memo } from 'react';
import { Rect, Group, Text } from 'react-konva';
import type Konva from 'konva';
import type { BoardElement } from '@/types/board';

interface FrameElementProps {
  element: BoardElement;
  isSelected: boolean;
  onSelect: (id: string, e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragEnd: (id: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (id: string, e: Konva.KonvaEventObject<Event>) => void;
}

export const FrameElement = memo(function FrameElement({
  element,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: FrameElementProps) {
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
      {/* 프레임 배경 */}
      <Rect
        width={element.width}
        height={element.height}
        fill={style.background_color || '#ffffff'}
        stroke={isSelected ? '#3b82f6' : style.border_color || '#e5e7eb'}
        strokeWidth={isSelected ? 2 : style.border_width || 1}
        cornerRadius={style.border_radius || 0}
        opacity={style.opacity ?? 1}
      />

      {/* 프레임 라벨 (상단) */}
      <Rect
        x={0}
        y={-24}
        width={Math.max(80, (element.content.frame_name?.length || 5) * 8 + 16)}
        height={20}
        fill={isSelected ? '#3b82f6' : '#6b7280'}
        cornerRadius={[4, 4, 0, 0]}
      />
      <Text
        x={8}
        y={-20}
        text={element.content.frame_name || 'Frame'}
        fontSize={12}
        fill="#ffffff"
        fontFamily="sans-serif"
      />
    </Group>
  );
});
