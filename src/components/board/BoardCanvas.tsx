'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Stage, Layer, Rect, Group } from 'react-konva';
import type Konva from 'konva';
import { useBoardStore, useSortedElements } from '@/stores/board-store';
import type { BoardElement } from '@/types/board';
import { ImageElement } from './elements/ImageElement';
import { TextElement } from './elements/TextElement';
import { ShapeElement } from './elements/ShapeElement';
import { StickyElement } from './elements/StickyElement';
import { FrameElement } from './elements/FrameElement';
import { SelectionBox } from './SelectionBox';

interface BoardCanvasProps {
  width: number;
  height: number;
}

const GRID_SIZE = 20;
const VIRTUAL_SIZE = 10000;

export function BoardCanvas({ width, height }: BoardCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [isDrawingSelection, setIsDrawingSelection] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const {
    boardId,
    zoom,
    panX,
    panY,
    gridEnabled,
    currentTool,
    selectedIds,
    setZoom,
    setPan,
    select,
    deselectAll,
    addElement,
    updateElement,
    setSelectedIds,
    setTool,
    saveHistory,
  } = useBoardStore();

  const elements = useSortedElements();

  // 디버깅: 요소 상태 확인
  useEffect(() => {
    console.log('[BoardCanvas] 요소 개수:', elements.length);
    if (elements.length > 0) {
      console.log('[BoardCanvas] 첫 번째 요소:', elements[0]);
    }
  }, [elements]);

  // 휠 이벤트로 줌/팬
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const stage = stageRef.current;
      if (!stage) return;

      // Ctrl/Cmd + 휠 = 줌
      if (e.evt.ctrlKey || e.evt.metaKey) {
        const oldZoom = zoom;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
          x: (pointer.x - panX) / oldZoom,
          y: (pointer.y - panY) / oldZoom,
        };

        const direction = e.evt.deltaY > 0 ? -1 : 1;
        const newZoom = Math.max(0.1, Math.min(5, oldZoom + direction * 0.1));

        const newPanX = pointer.x - mousePointTo.x * newZoom;
        const newPanY = pointer.y - mousePointTo.y * newZoom;

        setZoom(newZoom);
        setPan(newPanX, newPanY);
      } else {
        // 휠 = 팬
        setPan(panX - e.evt.deltaX, panY - e.evt.deltaY);
      }
    },
    [zoom, panX, panY, setZoom, setPan]
  );

  // 요소 선택
  const handleElementSelect = useCallback(
    (id: string, e: Konva.KonvaEventObject<MouseEvent>) => {
      const isMultiSelect = e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey;
      select(id, isMultiSelect);
    },
    [select]
  );

  // 요소 드래그 종료
  const handleElementDragEnd = useCallback(
    (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      updateElement(id, {
        position_x: node.x(),
        position_y: node.y(),
      });
      saveHistory();
    },
    [updateElement, saveHistory]
  );

  // 요소 변환 종료 (크기 조절, 회전)
  const handleElementTransformEnd = useCallback(
    (id: string, e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      // 스케일을 크기로 변환
      node.scaleX(1);
      node.scaleY(1);

      updateElement(id, {
        position_x: node.x(),
        position_y: node.y(),
        width: Math.max(10, node.width() * scaleX),
        height: Math.max(10, node.height() * scaleY),
        rotation: node.rotation(),
      });
      saveHistory();
    },
    [updateElement, saveHistory]
  );

  // 선택 박스 드래그 시작 (배경에서만)
  const handleSelectionStart = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // 선택 도구이고 배경 클릭일 때만
      if (currentTool !== 'select' || e.target.name() !== 'background') return;

      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const x = (pointer.x - panX) / zoom;
      const y = (pointer.y - panY) / zoom;

      setIsDrawingSelection(true);
      setSelectionRect({ x, y, width: 0, height: 0 });
    },
    [currentTool, panX, panY, zoom]
  );

  // 선택 박스 드래그
  const handleSelectionMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDrawingSelection || !selectionRect) return;

      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const x = (pointer.x - panX) / zoom;
      const y = (pointer.y - panY) / zoom;

      setSelectionRect({
        ...selectionRect,
        width: x - selectionRect.x,
        height: y - selectionRect.y,
      });
    },
    [isDrawingSelection, selectionRect, panX, panY, zoom]
  );

  // 선택 박스 드래그 종료
  const handleSelectionEnd = useCallback(() => {
    if (!isDrawingSelection || !selectionRect) {
      setIsDrawingSelection(false);
      setSelectionRect(null);
      return;
    }

    // 선택 박스 정규화
    const rect = {
      x: selectionRect.width < 0 ? selectionRect.x + selectionRect.width : selectionRect.x,
      y: selectionRect.height < 0 ? selectionRect.y + selectionRect.height : selectionRect.y,
      width: Math.abs(selectionRect.width),
      height: Math.abs(selectionRect.height),
    };

    // 교차하는 요소 선택
    const intersecting = elements.filter((element) => {
      return (
        element.position_x < rect.x + rect.width &&
        element.position_x + element.width > rect.x &&
        element.position_y < rect.y + rect.height &&
        element.position_y + element.height > rect.y
      );
    });

    if (intersecting.length > 0) {
      setSelectedIds(intersecting.map((e) => e.id));
    }

    setIsDrawingSelection(false);
    setSelectionRect(null);
  }, [isDrawingSelection, selectionRect, elements, setSelectedIds]);

  // 그리드 그리기
  const renderGrid = () => {
    if (!gridEnabled) return null;

    const gridLines: React.ReactElement[] = [];
    const startX = Math.floor(-panX / zoom / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(-panY / zoom / GRID_SIZE) * GRID_SIZE;
    const endX = startX + (width / zoom) + GRID_SIZE;
    const endY = startY + (height / zoom) + GRID_SIZE;

    for (let x = startX; x < endX; x += GRID_SIZE) {
      gridLines.push(
        <Rect
          key={`v-${x}`}
          x={x}
          y={startY}
          width={1}
          height={endY - startY}
          fill="#e5e7eb"
          listening={false}
        />
      );
    }

    for (let y = startY; y < endY; y += GRID_SIZE) {
      gridLines.push(
        <Rect
          key={`h-${y}`}
          x={startX}
          y={y}
          width={endX - startX}
          height={1}
          fill="#e5e7eb"
          listening={false}
        />
      );
    }

    return <Group listening={false}>{gridLines}</Group>;
  };

  // 요소 렌더링
  const renderElement = (element: (typeof elements)[0]) => {
    const isSelected = selectedIds.includes(element.id);
    const commonProps = {
      element,
      isSelected,
      onSelect: handleElementSelect,
      onDragEnd: handleElementDragEnd,
      onTransformEnd: handleElementTransformEnd,
    };

    switch (element.type) {
      case 'image':
      case 'video':
        return <ImageElement key={element.id} {...commonProps} />;
      case 'text':
        return <TextElement key={element.id} {...commonProps} />;
      case 'shape':
        return <ShapeElement key={element.id} {...commonProps} />;
      case 'sticky':
        return <StickyElement key={element.id} {...commonProps} />;
      case 'frame':
        return <FrameElement key={element.id} {...commonProps} />;
      default:
        return null;
    }
  };

  // 배경 클릭 핸들러 (요소 생성 또는 선택 해제)
  const handleBackgroundClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // 배경 Rect 클릭 시에만 처리
      const targetName = e.target.name();
      if (targetName !== 'background') {
        return;
      }

      const stage = stageRef.current;
      if (!stage) {
        return;
      }

      // boardId가 없어도 로컬에서 요소 생성 가능하도록 수정
      const currentBoardId = boardId || 'temp-board';

      const pointer = stage.getPointerPosition();
      if (!pointer) {
        return;
      }

      // 캔버스 좌표로 변환
      const x = (pointer.x - panX) / zoom;
      const y = (pointer.y - panY) / zoom;

      // 선택 도구면 선택 해제
      if (currentTool === 'select') {
        deselectAll();
        return;
      }

      // 이미지/비디오는 파일 선택 방식이므로 여기서 처리 안 함
      if (currentTool === 'image' || currentTool === 'video') {
        return;
      }

      // 현재 요소 개수 가져오기 (z_index 계산용)
      const currentElementCount = elements.length;

      // 도구에 따른 요소 생성 헬퍼 함수 (인라인)
      const createElementFromTool = (): BoardElement | null => {
        const baseElement = {
          id: crypto.randomUUID(),
          board_id: currentBoardId,
          position_x: x,
          position_y: y,
          rotation: 0,
          z_index: currentElementCount,
          locked: false,
          created_by: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        switch (currentTool) {
          case 'text':
            return {
              ...baseElement,
              type: 'text' as const,
              width: 200,
              height: 50,
              content: { text: '텍스트를 입력하세요' },
              style: {
                font_size: 16,
                text_color: '#1f2937',
                text_align: 'left' as const,
              },
            };
          case 'rectangle':
            return {
              ...baseElement,
              type: 'shape' as const,
              width: 150,
              height: 100,
              content: { shape_type: 'rectangle' as const },
              style: {
                background_color: '#e5e7eb',
                border_color: '#9ca3af',
                border_width: 2,
                border_radius: 8,
              },
            };
          case 'circle':
            return {
              ...baseElement,
              type: 'shape' as const,
              width: 100,
              height: 100,
              content: { shape_type: 'circle' as const },
              style: {
                background_color: '#dbeafe',
                border_color: '#3b82f6',
                border_width: 2,
              },
            };
          case 'sticky':
            return {
              ...baseElement,
              type: 'sticky' as const,
              width: 200,
              height: 200,
              content: { text: '' },
              style: {
                background_color: '#fef08a',
                font_size: 14,
                text_color: '#1f2937',
              },
            };
          case 'frame':
            return {
              ...baseElement,
              type: 'frame' as const,
              width: 400,
              height: 300,
              content: { children: [] },
              style: {
                background_color: '#ffffff',
                border_color: '#e5e7eb',
                border_width: 1,
              },
            };
          default:
            return null;
        }
      };

      // 도구에 따라 새 요소 생성
      const newElement = createElementFromTool();

      if (newElement) {
        addElement(newElement);
        select(newElement.id);
        // 요소 생성 후 선택 도구로 전환
        setTool('select');
      }
    },
    [boardId, zoom, panX, panY, currentTool, elements, deselectAll, addElement, select, setTool]
  );

  // 배경 영역 계산 (줌/팬 고려한 가상 캔버스 크기)
  const bgX = -panX / zoom - VIRTUAL_SIZE / 2;
  const bgY = -panY / zoom - VIRTUAL_SIZE / 2;

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      scaleX={zoom}
      scaleY={zoom}
      x={panX}
      y={panY}
      onWheel={handleWheel}
      onMouseMove={handleSelectionMove}
      onMouseUp={handleSelectionEnd}
      style={{ backgroundColor: '#f3f4f6' }}
    >
      {/* 그리드 레이어 */}
      <Layer listening={false}>{renderGrid()}</Layer>

      {/* 요소 레이어 (배경 포함) */}
      <Layer>
        {/* 배경 Rect (클릭 캡처용 - 요소보다 먼저 렌더링) */}
        <Rect
          name="background"
          x={bgX}
          y={bgY}
          width={VIRTUAL_SIZE}
          height={VIRTUAL_SIZE}
          fill="rgba(0, 0, 0, 0.001)"
          hitStrokeWidth={0}
          perfectDrawEnabled={false}
          onClick={handleBackgroundClick}
          onMouseDown={handleSelectionStart}
        />

        {/* 요소들 */}
        {elements.map(renderElement)}

        {/* 선택 박스 */}
        {isDrawingSelection && selectionRect && (
          <Rect
            x={selectionRect.x}
            y={selectionRect.y}
            width={selectionRect.width}
            height={selectionRect.height}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3b82f6"
            strokeWidth={1 / zoom}
            listening={false}
          />
        )}
      </Layer>

      {/* 선택 핸들 레이어 */}
      <Layer>
        <SelectionBox stageRef={stageRef} />
      </Layer>
    </Stage>
  );
}
