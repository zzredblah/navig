'use client';

import { useEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import type Konva from 'konva';
import { useBoardStore, useSelectedElements } from '@/stores/board-store';

interface SelectionBoxProps {
  stageRef: React.RefObject<Konva.Stage>;
}

export function SelectionBox({ stageRef }: SelectionBoxProps) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedElements = useSelectedElements();
  const { zoom } = useBoardStore();

  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    const stage = stageRef.current;
    const transformer = transformerRef.current;

    // 선택된 요소의 노드 찾기
    const nodes = selectedElements
      .map((element) => stage.findOne(`#${element.id}`))
      .filter((node): node is Konva.Node => node !== undefined);

    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedElements, stageRef]);

  if (selectedElements.length === 0) {
    return null;
  }

  // 잠긴 요소가 있으면 변환 비활성화
  const hasLockedElement = selectedElements.some((e) => e.locked);

  return (
    <Transformer
      ref={transformerRef}
      rotateEnabled={!hasLockedElement}
      resizeEnabled={!hasLockedElement}
      boundBoxFunc={(oldBox, newBox) => {
        // 최소 크기 제한
        if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
          return oldBox;
        }
        return newBox;
      }}
      // 핸들 스타일
      anchorFill="#ffffff"
      anchorStroke="#3b82f6"
      anchorSize={8 / zoom}
      anchorCornerRadius={2}
      borderStroke="#3b82f6"
      borderStrokeWidth={1 / zoom}
      borderDash={[4 / zoom, 4 / zoom]}
      // 회전 핸들
      rotateAnchorOffset={30 / zoom}
      rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
      rotationSnapTolerance={5}
      // 스냅
      enabledAnchors={[
        'top-left',
        'top-center',
        'top-right',
        'middle-right',
        'middle-left',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ]}
    />
  );
}
