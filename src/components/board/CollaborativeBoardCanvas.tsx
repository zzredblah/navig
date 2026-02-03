'use client';

/**
 * 실시간 협업 기능이 포함된 보드 캔버스
 *
 * 기존 BoardCanvas를 감싸고 다음 기능을 제공합니다:
 * - 다른 사용자의 커서 실시간 표시
 * - 다른 사용자의 선택 영역 표시
 * - 연결 상태 및 협업자 목록 표시
 * - 다른 사용자 선택 요소 잠금 표시
 */

import React, { useCallback, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { BoardCanvas, type BoardCanvasRef } from './BoardCanvas';
import { useCollaboration } from '@/hooks/use-collaboration';
import { CollaboratorCursor } from '@/components/collaboration/CollaboratorCursor';
import {
  CollaboratorAvatars,
  ConnectionStatus,
} from '@/components/collaboration/CollaboratorAvatars';
import { useBoardStore } from '@/stores/board-store';
import { cn } from '@/lib/utils';

interface CollaborativeBoardCanvasProps {
  boardId: string;
  width: number;
  height: number;
  user: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
  enableCollaboration?: boolean;
  className?: string;
}

export const CollaborativeBoardCanvas = forwardRef<BoardCanvasRef, CollaborativeBoardCanvasProps>(
  function CollaborativeBoardCanvas(
    {
      boardId,
      width,
      height,
      user,
      enableCollaboration = true,
      className,
    },
    ref
  ) {
  const canvasRef = useRef<BoardCanvasRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 외부에서 접근할 수 있도록 ref 전달
  useImperativeHandle(ref, () => canvasRef.current!, []);
  const { selectedIds, zoom, panX, panY } = useBoardStore();

  // 실시간 협업 연결
  const {
    isConnected,
    status,
    collaborators,
    updateCursor,
    updateSelection,
  } = useCollaboration({
    boardId,
    user,
    enabled: enableCollaboration,
  });

  // 마우스 움직임 추적
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!enableCollaboration || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      // 캔버스 좌표로 변환 (줌과 팬 고려)
      const x = (e.clientX - rect.left - panX) / zoom;
      const y = (e.clientY - rect.top - panY) / zoom;

      updateCursor({ x, y });
    },
    [enableCollaboration, updateCursor, zoom, panX, panY]
  );

  // 마우스가 캔버스를 벗어날 때
  const handleMouseLeave = useCallback(() => {
    if (enableCollaboration) {
      updateCursor(null);
    }
  }, [enableCollaboration, updateCursor]);

  // 선택 변경 시 협업자에게 알림
  useEffect(() => {
    if (enableCollaboration) {
      updateSelection(selectedIds);
    }
  }, [selectedIds, enableCollaboration, updateSelection]);

  // 다른 사용자가 선택한 요소 확인
  const lockedElementsMap = useMemo(() => {
    const map = new Map<string, { userId: string; userName: string; color: string }>();
    collaborators.forEach((collab) => {
      if (collab.selection) {
        collab.selection.forEach((id) => {
          map.set(id, {
            userId: collab.user.id,
            userName: collab.user.name,
            color: collab.user.color,
          });
        });
      }
    });
    return map;
  }, [collaborators]);

  // 요소가 잠겨있는지 확인하는 함수 (외부에서 사용 가능)
  const isElementLocked = useCallback(
    (elementId: string) => lockedElementsMap.has(elementId),
    [lockedElementsMap]
  );

  // 요소를 잠근 사용자 정보 반환
  const getLockedByUser = useCallback(
    (elementId: string) => lockedElementsMap.get(elementId) || null,
    [lockedElementsMap]
  );

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 협업 상태 표시 (상단 좌측) */}
      {enableCollaboration && (
        <div className="absolute top-4 left-4 z-50 flex items-center gap-4">
          <ConnectionStatus status={status} />
        </div>
      )}

      {/* 협업자 아바타 (상단 우측) */}
      {enableCollaboration && collaborators.length > 0 && (
        <div className="absolute top-4 right-4 z-50">
          <CollaboratorAvatars collaborators={collaborators} maxVisible={5} />
        </div>
      )}

      {/* 메인 캔버스 */}
      <BoardCanvas ref={canvasRef} width={width} height={height} />

      {/* 다른 사용자 커서 오버레이 */}
      {enableCollaboration && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {collaborators.map((collab) =>
            collab.cursor ? (
              <CollaboratorCursor
                key={collab.user.id}
                position={{
                  x: collab.cursor.x * zoom + panX,
                  y: collab.cursor.y * zoom + panY,
                }}
                user={collab.user}
                scale={1}
              />
            ) : null
          )}
        </div>
      )}

      {/* 다른 사용자 선택 영역 표시 */}
      {enableCollaboration && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {collaborators.map((collab) =>
            collab.selection?.map((elementId) => (
              <SelectionOverlay
                key={`${collab.user.id}-${elementId}`}
                elementId={elementId}
                color={collab.user.color}
                userName={collab.user.name}
                zoom={zoom}
                panX={panX}
                panY={panY}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
});

/**
 * 다른 사용자의 선택 영역 표시
 */
interface SelectionOverlayProps {
  elementId: string;
  color: string;
  userName: string;
  zoom: number;
  panX: number;
  panY: number;
}

function SelectionOverlay({
  elementId,
  color,
  userName,
  zoom,
  panX,
  panY,
}: SelectionOverlayProps) {
  const elements = useBoardStore((state) => state.elements);
  const element = elements.find((el) => el.id === elementId);

  if (!element) return null;

  // 화면 좌표로 변환
  const x = element.position_x * zoom + panX;
  const y = element.position_y * zoom + panY;
  const width = element.width * zoom;
  const height = element.height * zoom;

  return (
    <div
      className="absolute border-2 pointer-events-none"
      style={{
        left: x - 2,
        top: y - 2,
        width: width + 4,
        height: height + 4,
        borderColor: color,
        borderStyle: 'dashed',
        borderRadius: 4,
      }}
    >
      {/* 사용자 이름 라벨 + 잠금 아이콘 */}
      <div
        className="absolute -top-6 left-0 flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        {/* 잠금 아이콘 */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        {userName}
      </div>

      {/* 반투명 오버레이 (잠김 상태 강조) */}
      <div
        className="absolute inset-0 rounded"
        style={{
          backgroundColor: color,
          opacity: 0.05,
        }}
      />
    </div>
  );
}
