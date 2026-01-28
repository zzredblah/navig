'use client';

import { useRef, useState, useCallback, memo } from 'react';
import { Text, Group, Rect } from 'react-konva';
import type Konva from 'konva';
import type { BoardElement } from '@/types/board';
import { useBoardStore } from '@/stores/board-store';

interface TextElementProps {
  element: BoardElement;
  isSelected: boolean;
  onSelect: (id: string, e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragEnd: (id: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (id: string, e: Konva.KonvaEventObject<Event>) => void;
}

export const TextElement = memo(function TextElement({
  element,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: TextElementProps) {
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
    const stage = groupRef.current?.getStage();
    const group = groupRef.current;
    if (!stage || !group) return;

    setIsEditing(true);

    const stageContainer = stage.container();
    const stageBox = stageContainer.getBoundingClientRect();

    // 그룹의 절대 위치 계산
    const groupPosition = group.getAbsolutePosition();
    const scale = stage.scaleX();

    // 기존 textarea 제거
    if (textareaRef.current) {
      try {
        document.body.removeChild(textareaRef.current);
      } catch {
        // 이미 제거됨
      }
    }

    const textarea = document.createElement('textarea');
    textareaRef.current = textarea;
    document.body.appendChild(textarea);

    const areaPosition = {
      x: stageBox.left + groupPosition.x,
      y: stageBox.top + groupPosition.y,
    };

    textarea.value = element.content.text || '';
    textarea.style.cssText = `
      position: fixed;
      top: ${areaPosition.y}px;
      left: ${areaPosition.x}px;
      width: ${element.width * scale}px;
      height: ${element.height * scale}px;
      font-size: ${(element.style.font_size || 16) * scale}px;
      font-weight: ${element.style.font_weight || 'normal'};
      text-align: ${element.style.text_align || 'left'};
      color: ${element.style.text_color || '#000000'};
      padding: ${8 * scale}px;
      margin: 0;
      border: 2px solid #3b82f6;
      border-radius: 4px;
      outline: none;
      resize: none;
      background: white;
      overflow: hidden;
      z-index: 9999;
      line-height: 1.4;
      box-sizing: border-box;
    `;

    textarea.focus();
    textarea.select();

    const handleBlur = () => {
      if (textareaRef.current) {
        updateElementContent(element.id, { text: textareaRef.current.value });
        saveHistory();
        try {
          document.body.removeChild(textareaRef.current);
        } catch {
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
      // Enter는 줄바꿈 허용 (Shift+Enter 없이도)
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
      onDblClick={handleDblClick}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      {/* 히트 영역 (클릭/더블클릭 감지용) */}
      <Rect
        width={element.width}
        height={element.height}
        fill="transparent"
        listening={true}
      />

      {/* 배경 */}
      {style.background_color && (
        <Rect
          width={element.width}
          height={element.height}
          fill={style.background_color}
          stroke={isSelected ? '#3b82f6' : style.border_color}
          strokeWidth={isSelected ? 2 : style.border_width || 0}
          cornerRadius={style.border_radius || 0}
          opacity={style.opacity ?? 1}
        />
      )}

      {/* 텍스트 */}
      {!isEditing && (
        <Text
          ref={textRef}
          text={element.content.text || '더블클릭하여 입력'}
          width={element.width}
          height={element.height}
          fontSize={style.font_size || 16}
          fontStyle={`${style.font_weight || 'normal'} ${style.font_style || 'normal'}`}
          fill={element.content.text ? (style.text_color || '#000000') : '#9ca3af'}
          align={style.text_align || 'left'}
          verticalAlign="middle"
          padding={8}
          opacity={style.opacity ?? 1}
          listening={false}
        />
      )}

      {/* 선택 테두리 (배경 없을 때) */}
      {!style.background_color && isSelected && (
        <Rect
          width={element.width}
          height={element.height}
          stroke="#3b82f6"
          strokeWidth={2}
          fill="transparent"
          dash={[4, 4]}
        />
      )}
    </Group>
  );
});
