'use client';

import { useRef, useState, useCallback, memo } from 'react';
import { Text, Group, Rect } from 'react-konva';
import type Konva from 'konva';
import type { BoardElement } from '@/types/board';
import { useBoardStore } from '@/stores/board-store';

interface StickyElementProps {
  element: BoardElement;
  isSelected: boolean;
  onSelect: (id: string, e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragEnd: (id: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (id: string, e: Konva.KonvaEventObject<Event>) => void;
}

const STICKY_COLORS = [
  '#fef08a', // yellow
  '#bbf7d0', // green
  '#bfdbfe', // blue
  '#fbcfe8', // pink
  '#fed7aa', // orange
  '#e9d5ff', // purple
];

export const StickyElement = memo(function StickyElement({
  element,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: StickyElementProps) {
  const groupRef = useRef<Konva.Group>(null);
  const textRef = useRef<Konva.Text>(null);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { updateElementContent, saveHistory } = useBoardStore();

  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect(element.id, e);
  }, [element.id, onSelect]);

  const handleDblClick = useCallback(() => {
    setIsEditing(true);
    const stage = groupRef.current?.getStage();
    if (!stage) return;

    const stageContainer = stage.container();
    const textNode = textRef.current;
    if (!textNode) return;

    const textPosition = textNode.getAbsolutePosition();
    const stageBox = stageContainer.getBoundingClientRect();

    // 기존 textarea 제거
    if (textareaRef.current) {
      try {
        document.body.removeChild(textareaRef.current);
      } catch (e) {
        // 이미 제거됨
      }
    }

    const textarea = document.createElement('textarea');
    textareaRef.current = textarea;
    document.body.appendChild(textarea);

    const areaPosition = {
      x: stageBox.left + textPosition.x,
      y: stageBox.top + textPosition.y,
    };

    const scale = stage.scaleX();
    const backgroundColor = element.style.background_color || STICKY_COLORS[0];

    textarea.value = element.content.text || '';
    textarea.style.cssText = `
      position: absolute;
      top: ${areaPosition.y}px;
      left: ${areaPosition.x}px;
      width: ${(element.width - 16) * scale}px;
      height: ${(element.height - 16) * scale}px;
      font-size: ${14 * scale}px;
      font-family: sans-serif;
      padding: 8px;
      margin: 0;
      border: none;
      outline: none;
      resize: none;
      background: ${backgroundColor};
      overflow: hidden;
      z-index: 1000;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      line-height: 1.4;
    `;

    textarea.focus();
    textarea.select();

    const handleBlur = () => {
      if (textareaRef.current) {
        updateElementContent(element.id, { text: textareaRef.current.value });
        saveHistory();
        try {
          document.body.removeChild(textareaRef.current);
        } catch (e) {
          // 이미 제거됨
        }
        textareaRef.current = null;
      }
      setIsEditing(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        textarea.blur();
      }
      // Enter는 줄바꿈 허용
    };

    textarea.addEventListener('blur', handleBlur);
    textarea.addEventListener('keydown', handleKeyDown);
  }, [element, updateElementContent, saveHistory]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    onDragEnd(element.id, e);
  }, [element.id, onDragEnd]);

  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>) => {
    onTransformEnd(element.id, e);
  }, [element.id, onTransformEnd]);

  const backgroundColor = element.style.background_color || STICKY_COLORS[0];

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
      onDblClick={handleDblClick}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      {/* 그림자 */}
      <Rect
        x={2}
        y={4}
        width={element.width}
        height={element.height}
        fill="rgba(0,0,0,0.1)"
        cornerRadius={8}
      />

      {/* 스티키 노트 배경 */}
      <Rect
        width={element.width}
        height={element.height}
        fill={backgroundColor}
        stroke={isSelected ? '#3b82f6' : 'transparent'}
        strokeWidth={isSelected ? 2 : 0}
        cornerRadius={8}
      />

      {/* 상단 폴드 효과 */}
      <Rect
        width={element.width}
        height={6}
        fill="rgba(0,0,0,0.05)"
        cornerRadius={[8, 8, 0, 0]}
      />

      {/* 텍스트 */}
      {!isEditing && (
        <Text
          ref={textRef}
          text={element.content.text || '메모를 입력하세요'}
          width={element.width - 16}
          height={element.height - 16}
          x={8}
          y={12}
          fontSize={element.style.font_size || 14}
          fontFamily="sans-serif"
          fontStyle={`${element.style.font_weight || 'normal'} ${element.style.font_style || 'normal'}`}
          fill={element.style.text_color || '#374151'}
          align={element.style.text_align || 'left'}
          lineHeight={1.4}
        />
      )}
    </Group>
  );
});
