'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { useEditWorkspaceStore } from '@/stores/edit-workspace-store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type DragTarget = {
  type: 'subtitle-start' | 'subtitle-end' | 'subtitle-move';
  segmentId: string;
  initialTime: number;
  initialStartTime?: number;
  initialEndTime?: number;
} | null;

export function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);

  // 자막 드래그 상태
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);

  const {
    videoDuration,
    currentTime,
    metadata,
    selectionRange,
    subtitleSegments,
    setCurrentTime,
    setIsPlaying,
    setSelectionRange,
    clearSelectionRange,
    updateSubtitleSegment,
  } = useEditWorkspaceStore();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 위치에서 시간으로 변환
  const getTimeFromPosition = useCallback((e: React.MouseEvent | MouseEvent) => {
    const container = containerRef.current;
    if (!container || videoDuration === 0) return 0;

    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    return ratio * videoDuration;
  }, [videoDuration]);

  // 클릭/드래그로 시간 이동
  const handleSeek = useCallback((e: React.MouseEvent | MouseEvent) => {
    const time = getTimeFromPosition(e);

    // 트림 범위 내로 제한
    const clampedTime = Math.max(
      metadata.trim.startTime,
      Math.min(time, metadata.trim.endTime)
    );

    setCurrentTime(clampedTime);
  }, [getTimeFromPosition, metadata.trim, setCurrentTime]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Shift+클릭으로 범위 선택 시작
    if (e.shiftKey) {
      setIsSelecting(true);
      const time = getTimeFromPosition(e);
      setSelectionStart(time);
      setSelectionRange({ startTime: time, endTime: time });
    } else {
      // 일반 클릭은 시크
      setIsDragging(true);
      setIsPlaying(false);
      clearSelectionRange();
      handleSeek(e);
    }
  };

  // 자막 세그먼트 드래그 시작
  const handleSubtitleDragStart = (
    e: React.MouseEvent,
    segmentId: string,
    type: 'subtitle-start' | 'subtitle-end' | 'subtitle-move'
  ) => {
    e.stopPropagation();
    const segment = subtitleSegments.find(s => s.id === segmentId);
    if (!segment) return;

    setDragTarget({
      type,
      segmentId,
      initialTime: getTimeFromPosition(e),
      initialStartTime: segment.start_time,
      initialEndTime: segment.end_time,
    });
    setDragStartX(e.clientX);
  };

  // 자막 변경사항 API에 저장
  const saveSubtitleSegment = async (segmentId: string, startTime: number, endTime: number) => {
    const segment = subtitleSegments.find(s => s.id === segmentId);
    if (!segment) return;

    try {
      // subtitle_id를 찾기 위해 metadata에서 가져옴
      const subtitleId = metadata.subtitleId;
      if (!subtitleId) return;

      const response = await fetch(`/api/ai/subtitles/${subtitleId}/segments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: [{
            id: segmentId,
            start_time: startTime,
            end_time: endTime,
          }],
        }),
      });

      if (!response.ok) {
        throw new Error('저장 실패');
      }
    } catch (err) {
      toast.error('자막 시간 저장에 실패했습니다');
      console.error('Failed to save subtitle segment:', err);
    }
  };

  useEffect(() => {
    if (!isDragging && !isSelecting && !dragTarget) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleSeek(e);
      } else if (isSelecting && selectionStart !== null) {
        const time = getTimeFromPosition(e);
        const startTime = Math.min(selectionStart, time);
        const endTime = Math.max(selectionStart, time);
        setSelectionRange({ startTime, endTime });
      } else if (dragTarget) {
        // 자막 드래그 처리
        const time = getTimeFromPosition(e);
        const segment = subtitleSegments.find(s => s.id === dragTarget.segmentId);
        if (!segment || !dragTarget.initialStartTime || !dragTarget.initialEndTime) return;

        const timeDelta = time - dragTarget.initialTime;
        const duration = dragTarget.initialEndTime - dragTarget.initialStartTime;

        let newStartTime = segment.start_time;
        let newEndTime = segment.end_time;

        if (dragTarget.type === 'subtitle-start') {
          // 시작점 드래그
          newStartTime = Math.max(0, Math.min(dragTarget.initialStartTime + timeDelta, segment.end_time - 0.1));
        } else if (dragTarget.type === 'subtitle-end') {
          // 끝점 드래그
          newEndTime = Math.min(videoDuration, Math.max(dragTarget.initialEndTime + timeDelta, segment.start_time + 0.1));
        } else if (dragTarget.type === 'subtitle-move') {
          // 전체 이동
          newStartTime = Math.max(0, Math.min(dragTarget.initialStartTime + timeDelta, videoDuration - duration));
          newEndTime = newStartTime + duration;
        }

        updateSubtitleSegment(dragTarget.segmentId, {
          start_time: newStartTime,
          end_time: newEndTime,
        });
      }
    };

    const handleMouseUp = async () => {
      // 자막 드래그 종료 시 API에 저장
      if (dragTarget) {
        const segment = subtitleSegments.find(s => s.id === dragTarget.segmentId);
        if (segment) {
          await saveSubtitleSegment(dragTarget.segmentId, segment.start_time, segment.end_time);
        }
      }

      setIsDragging(false);
      setIsSelecting(false);
      setSelectionStart(null);
      setDragTarget(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isSelecting, selectionStart, dragTarget, handleSeek, getTimeFromPosition, setSelectionRange, subtitleSegments, videoDuration, updateSubtitleSegment, metadata.subtitleId]);

  if (videoDuration === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        영상을 로드하면 타임라인이 표시됩니다
      </div>
    );
  }

  const trimStartPercent = (metadata.trim.startTime / videoDuration) * 100;
  const trimEndPercent = (metadata.trim.endTime / videoDuration) * 100;
  const currentPercent = (currentTime / videoDuration) * 100;

  // 선택 범위
  const selectionStartPercent = selectionRange
    ? (selectionRange.startTime / videoDuration) * 100
    : 0;
  const selectionEndPercent = selectionRange
    ? (selectionRange.endTime / videoDuration) * 100
    : 0;

  return (
    <div className="h-full flex flex-col p-4">
      {/* 시간 표시 */}
      <div className="flex justify-between text-xs text-gray-500 mb-2">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(videoDuration)}</span>
      </div>

      {/* 타임라인 바 */}
      <div
        ref={containerRef}
        className="relative h-14 bg-gray-200 rounded cursor-pointer"
        onMouseDown={handleMouseDown}
      >
        {/* 트림 외 영역 (비활성) */}
        <div
          className="absolute inset-y-0 left-0 bg-gray-300/50"
          style={{ width: `${trimStartPercent}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-gray-300/50"
          style={{ width: `${100 - trimEndPercent}%` }}
        />

        {/* 트림 영역 (활성) */}
        <div
          className="absolute inset-y-0 bg-primary-100"
          style={{
            left: `${trimStartPercent}%`,
            width: `${trimEndPercent - trimStartPercent}%`,
          }}
        />

        {/* 트림 핸들 (시작) */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-primary-600 cursor-ew-resize"
          style={{ left: `${trimStartPercent}%` }}
        >
          <div className="absolute -left-1 -top-1 -bottom-1 w-3 bg-primary-600 rounded-l" />
        </div>

        {/* 트림 핸들 (끝) */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-primary-600 cursor-ew-resize"
          style={{ left: `${trimEndPercent}%` }}
        >
          <div className="absolute -right-1 -top-1 -bottom-1 w-3 bg-primary-600 rounded-r" />
        </div>

        {/* 선택 범위 표시 */}
        {selectionRange && selectionRange.endTime > selectionRange.startTime && (
          <div
            className="absolute inset-y-0 bg-yellow-400/30 border-l-2 border-r-2 border-yellow-500 z-5"
            style={{
              left: `${selectionStartPercent}%`,
              width: `${selectionEndPercent - selectionStartPercent}%`,
            }}
          />
        )}

        {/* 자막 세그먼트 표시 (하단 줄) */}
        {subtitleSegments.map((segment) => {
          const startPercent = (segment.start_time / videoDuration) * 100;
          const endPercent = (segment.end_time / videoDuration) * 100;
          const widthPercent = Math.max(1, endPercent - startPercent);
          const isBeingDragged = dragTarget?.segmentId === segment.id;

          return (
            <div
              key={`sub-${segment.id}`}
              className={cn(
                "absolute bottom-1 h-4 rounded-sm group",
                isBeingDragged ? "bg-green-500 opacity-100 z-20" : "bg-green-400 opacity-70 hover:opacity-100"
              )}
              style={{
                left: `${startPercent}%`,
                width: `${widthPercent}%`,
              }}
              title={`${segment.text}\n(드래그로 시간 조절)`}
            >
              {/* 시작 핸들 */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1.5 bg-green-600 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-green-700 rounded-l-sm"
                onMouseDown={(e) => handleSubtitleDragStart(e, segment.id, 'subtitle-start')}
              />

              {/* 중앙 영역 (이동) */}
              <div
                className="absolute inset-0 mx-1.5 cursor-move"
                onMouseDown={(e) => handleSubtitleDragStart(e, segment.id, 'subtitle-move')}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentTime(segment.start_time);
                }}
              />

              {/* 끝 핸들 */}
              <div
                className="absolute right-0 top-0 bottom-0 w-1.5 bg-green-600 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-green-700 rounded-r-sm"
                onMouseDown={(e) => handleSubtitleDragStart(e, segment.id, 'subtitle-end')}
              />
            </div>
          );
        })}

        {/* 텍스트 오버레이 표시 (상단 줄) */}
        {metadata.textOverlays.map((overlay) => {
          const startPercent = (overlay.startTime / videoDuration) * 100;
          const endPercent = (overlay.endTime / videoDuration) * 100;
          return (
            <div
              key={overlay.id}
              className="absolute top-1 h-3 bg-blue-400 rounded-sm opacity-70 cursor-pointer hover:opacity-100"
              style={{
                left: `${startPercent}%`,
                width: `${Math.max(0.5, endPercent - startPercent)}%`,
              }}
              title={overlay.text}
            />
          );
        })}

        {/* 현재 위치 인디케이터 */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{ left: `${currentPercent}%` }}
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-red-500" />
        </div>
      </div>

      {/* 하단 정보 */}
      <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
        {selectionRange && selectionRange.endTime > selectionRange.startTime ? (
          <>
            <span className="text-yellow-600 font-medium">
              선택: {formatTime(selectionRange.startTime)} - {formatTime(selectionRange.endTime)}
            </span>
            <span className="text-yellow-600">
              ({formatTime(selectionRange.endTime - selectionRange.startTime)})
            </span>
            <button
              onClick={() => clearSelectionRange()}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded px-1"
              aria-label="선택 범위 해제"
            >
              선택 해제
            </button>
          </>
        ) : (
          <>
            <span>
              시작: {formatTime(metadata.trim.startTime)}
            </span>
            <span className="text-gray-400">
              Shift+드래그로 범위 선택
            </span>
            <span>
              끝: {formatTime(metadata.trim.endTime)}
            </span>
          </>
        )}
      </div>

      {/* 범례 */}
      {(subtitleSegments.length > 0 || metadata.textOverlays.length > 0) && (
        <div className="flex items-center gap-4 text-[10px] text-gray-400 mt-1">
          {metadata.textOverlays.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-sm" />
              텍스트 ({metadata.textOverlays.length})
            </span>
          )}
          {subtitleSegments.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-sm" />
              자막 ({subtitleSegments.length})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
