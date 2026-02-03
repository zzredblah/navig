'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { useEditWorkspaceStore } from '@/stores/edit-workspace-store';
import { cn } from '@/lib/utils';

export function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {
    videoDuration,
    currentTime,
    metadata,
    setCurrentTime,
    setIsPlaying,
  } = useEditWorkspaceStore();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 클릭/드래그로 시간 이동
  const handleSeek = useCallback((e: React.MouseEvent | MouseEvent) => {
    const container = containerRef.current;
    if (!container || videoDuration === 0) return;

    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    const time = ratio * videoDuration;

    // 트림 범위 내로 제한
    const clampedTime = Math.max(
      metadata.trim.startTime,
      Math.min(time, metadata.trim.endTime)
    );

    setCurrentTime(clampedTime);
  }, [videoDuration, metadata.trim, setCurrentTime]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setIsPlaying(false);
    handleSeek(e);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleSeek(e);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleSeek]);

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
        className="relative h-12 bg-gray-200 rounded cursor-pointer"
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

        {/* 텍스트 오버레이 표시 */}
        {metadata.textOverlays.map((overlay) => {
          const startPercent = (overlay.startTime / videoDuration) * 100;
          const endPercent = (overlay.endTime / videoDuration) * 100;
          return (
            <div
              key={overlay.id}
              className="absolute top-1 h-3 bg-blue-400 rounded-sm opacity-70"
              style={{
                left: `${startPercent}%`,
                width: `${endPercent - startPercent}%`,
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

      {/* 트림 시간 표시 */}
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>
          시작: {formatTime(metadata.trim.startTime)}
        </span>
        <span>
          길이: {formatTime(metadata.trim.endTime - metadata.trim.startTime)}
        </span>
        <span>
          끝: {formatTime(metadata.trim.endTime)}
        </span>
      </div>
    </div>
  );
}
