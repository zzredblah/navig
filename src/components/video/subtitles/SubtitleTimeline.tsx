'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { SubtitleSegment } from '@/types/subtitle';
import { formatSubtitleTime } from '@/types/subtitle';

interface SubtitleTimelineProps {
  segments: SubtitleSegment[];
  duration: number;
  currentTime: number;
  selectedSegmentId: string | null;
  onSeek: (time: number) => void;
  onSelectSegment: (id: string) => void;
  onSegmentTimeChange: (id: string, startTime: number, endTime: number) => void;
}

export function SubtitleTimeline({
  segments,
  duration,
  currentTime,
  selectedSegmentId,
  onSeek,
  onSelectSegment,
  onSegmentTimeChange,
}: SubtitleTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragInfo, setDragInfo] = useState<{
    segmentId: string;
    type: 'start' | 'end' | 'move';
    initialTime: number;
    initialMouseX: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Convert time to percentage position
  const timeToPercent = useCallback(
    (time: number) => {
      if (duration <= 0) return 0;
      return (time / duration) * 100;
    },
    [duration]
  );

  // Convert percentage to time
  const percentToTime = useCallback(
    (percent: number) => {
      return (percent / 100) * duration;
    },
    [duration]
  );

  // Get mouse position as percentage
  const getMousePercent = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = (x / rect.width) * 100;
      return Math.max(0, Math.min(100, percent));
    },
    []
  );

  // Handle click to seek
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) return;
      const percent = getMousePercent(e);
      const time = percentToTime(percent);
      onSeek(time);
    },
    [isDragging, getMousePercent, percentToTime, onSeek]
  );

  // Start dragging a segment boundary or moving it
  const handleDragStart = useCallback(
    (
      e: React.MouseEvent,
      segmentId: string,
      type: 'start' | 'end' | 'move'
    ) => {
      e.stopPropagation();
      const segment = segments.find((s) => s.id === segmentId);
      if (!segment) return;

      const initialTime =
        type === 'start'
          ? segment.start_time
          : type === 'end'
          ? segment.end_time
          : segment.start_time;

      setIsDragging(true);
      setDragInfo({
        segmentId,
        type,
        initialTime,
        initialMouseX: e.clientX,
      });
    },
    [segments]
  );

  // Handle drag movement
  useEffect(() => {
    if (!isDragging || !dragInfo || !containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const segment = segments.find((s) => s.id === dragInfo.segmentId);
      if (!segment) return;

      const rect = containerRef.current!.getBoundingClientRect();
      const deltaX = e.clientX - dragInfo.initialMouseX;
      const deltaPercent = (deltaX / rect.width) * 100;
      const deltaTime = percentToTime(deltaPercent);

      if (dragInfo.type === 'start') {
        const newStartTime = Math.max(0, Math.min(segment.end_time - 0.1, dragInfo.initialTime + deltaTime));
        onSegmentTimeChange(segment.id, newStartTime, segment.end_time);
      } else if (dragInfo.type === 'end') {
        const newEndTime = Math.min(duration, Math.max(segment.start_time + 0.1, dragInfo.initialTime + deltaTime));
        onSegmentTimeChange(segment.id, segment.start_time, newEndTime);
      } else if (dragInfo.type === 'move') {
        const segmentDuration = segment.end_time - segment.start_time;
        let newStartTime = dragInfo.initialTime + deltaTime;

        // Clamp to valid range
        newStartTime = Math.max(0, Math.min(duration - segmentDuration, newStartTime));
        const newEndTime = newStartTime + segmentDuration;

        onSegmentTimeChange(segment.id, newStartTime, newEndTime);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragInfo(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragInfo, segments, duration, percentToTime, onSegmentTimeChange]);

  // Generate time markers
  const timeMarkers = useMemo(() => {
    if (duration <= 0) return [];

    const markerCount = Math.min(10, Math.max(2, Math.floor(duration / 10)));
    const interval = duration / markerCount;

    return Array.from({ length: markerCount + 1 }, (_, i) => ({
      time: i * interval,
      percent: timeToPercent(i * interval),
    }));
  }, [duration, timeToPercent]);

  // Find current segment
  const currentSegment = useMemo(
    () =>
      segments.find(
        (s) => currentTime >= s.start_time && currentTime < s.end_time
      ),
    [segments, currentTime]
  );

  if (!mounted) {
    return (
      <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
    );
  }

  return (
    <div className="space-y-1">
      {/* Time display */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span className="font-mono">{formatSubtitleTime(currentTime)}</span>
        <span className="font-mono">{formatSubtitleTime(duration)}</span>
      </div>

      {/* Timeline container */}
      <div
        ref={containerRef}
        className={cn(
          'relative h-16 bg-gray-100 rounded-lg overflow-hidden cursor-crosshair select-none',
          isDragging && 'cursor-grabbing'
        )}
        onClick={handleTimelineClick}
      >
        {/* Time markers */}
        {timeMarkers.map(({ time, percent }) => (
          <div
            key={time}
            className="absolute top-0 bottom-0 w-px bg-gray-300"
            style={{ left: `${percent}%` }}
          >
            <span className="absolute top-1 left-1 text-[10px] text-gray-400 font-mono">
              {formatSubtitleTime(time).split('.')[0]}
            </span>
          </div>
        ))}

        {/* Segment bars */}
        <div className="absolute inset-0 top-6">
          {segments.map((segment) => {
            const left = timeToPercent(segment.start_time);
            const width = timeToPercent(segment.end_time - segment.start_time);
            const isActive = currentSegment?.id === segment.id;
            const isSelected = selectedSegmentId === segment.id;

            return (
              <div
                key={segment.id}
                className={cn(
                  'absolute h-8 rounded group cursor-pointer',
                  isActive
                    ? 'bg-primary-500'
                    : isSelected
                    ? 'bg-primary-400'
                    : 'bg-primary-300 hover:bg-primary-400'
                )}
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 0.5)}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSegment(segment.id);
                }}
              >
                {/* Left resize handle */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize opacity-0 group-hover:opacity-100 bg-primary-600 rounded-l"
                  onMouseDown={(e) => handleDragStart(e, segment.id, 'start')}
                />

                {/* Segment text preview (for wider segments) */}
                {width > 5 && (
                  <div
                    className="absolute inset-x-2 inset-y-1 overflow-hidden text-[10px] text-white/80 leading-tight pointer-events-none"
                    onMouseDown={(e) => handleDragStart(e, segment.id, 'move')}
                  >
                    {segment.text}
                  </div>
                )}

                {/* Right resize handle */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize opacity-0 group-hover:opacity-100 bg-primary-600 rounded-r"
                  onMouseDown={(e) => handleDragStart(e, segment.id, 'end')}
                />
              </div>
            );
          })}
        </div>

        {/* Current time indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
          style={{ left: `${timeToPercent(currentTime)}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
        </div>
      </div>

      {/* Instructions */}
      <div className="text-xs text-gray-400 text-center">
        클릭하여 탐색 • 세그먼트 드래그하여 이동 • 경계 드래그하여 시간 조정
      </div>
    </div>
  );
}
