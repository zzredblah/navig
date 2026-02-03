'use client';

import { useRef, useEffect, useCallback } from 'react';
import { SubtitleSegmentItem } from './SubtitleSegmentItem';
import type { SubtitleSegment, QualityIssue } from '@/types/subtitle';

interface SubtitleSegmentListProps {
  segments: SubtitleSegment[];
  currentTime: number;
  selectedSegmentId: string | null;
  qualityIssues: QualityIssue[];
  onSelectSegment: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
  onTimeChange: (id: string, startTime: number, endTime: number) => void;
  onPlaySegment: (segment: SubtitleSegment) => void;
  onDeleteSegment: (id: string) => void;
  onSplitSegment: (id: string, splitTime: number) => void;
  onMergeSegments: (id: string, nextId: string) => void;
  autoScroll?: boolean;
}

export function SubtitleSegmentList({
  segments,
  currentTime,
  selectedSegmentId,
  qualityIssues,
  onSelectSegment,
  onTextChange,
  onTimeChange,
  onPlaySegment,
  onDeleteSegment,
  onSplitSegment,
  onMergeSegments,
  autoScroll = true,
}: SubtitleSegmentListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Find the currently active segment
  const activeSegment = segments.find(
    (segment) =>
      currentTime >= segment.start_time && currentTime < segment.end_time
  );

  // Auto-scroll to active segment
  useEffect(() => {
    if (!autoScroll || !activeSegment || !listRef.current) return;

    const itemEl = itemRefs.current.get(activeSegment.id);
    if (itemEl) {
      const listRect = listRef.current.getBoundingClientRect();
      const itemRect = itemEl.getBoundingClientRect();

      // Check if item is outside visible area
      const isAbove = itemRect.top < listRect.top;
      const isBelow = itemRect.bottom > listRect.bottom;

      if (isAbove || isBelow) {
        itemEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
    // Only re-run when activeSegment.id changes, not on every time update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSegment?.id, autoScroll]);

  const getQualityIssue = useCallback(
    (segmentId: string) =>
      qualityIssues.find((issue) => issue.segmentId === segmentId),
    [qualityIssues]
  );

  const setItemRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      itemRefs.current.set(id, el);
    } else {
      itemRefs.current.delete(id);
    }
  }, []);

  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <span className="text-2xl text-gray-400">📝</span>
        </div>
        <p className="text-gray-500">세그먼트가 없습니다</p>
        <p className="text-sm text-gray-400 mt-1">
          자막 생성 후 여기에 세그먼트가 표시됩니다
        </p>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto space-y-2 p-1"
    >
      {segments.map((segment, index) => (
        <div
          key={segment.id}
          ref={(el) => setItemRef(segment.id, el)}
        >
          <SubtitleSegmentItem
            segment={segment}
            index={index}
            isActive={activeSegment?.id === segment.id}
            isSelected={selectedSegmentId === segment.id}
            hasNextSegment={index < segments.length - 1}
            qualityIssue={getQualityIssue(segment.id)}
            onSelect={() => onSelectSegment(segment.id)}
            onTextChange={(text) => onTextChange(segment.id, text)}
            onTimeChange={(start, end) => onTimeChange(segment.id, start, end)}
            onPlaySegment={() => onPlaySegment(segment)}
            onDelete={() => onDeleteSegment(segment.id)}
            onSplit={(splitTime) => onSplitSegment(segment.id, splitTime)}
            onMergeWithNext={() => {
              const nextSegment = segments[index + 1];
              if (nextSegment) {
                onMergeSegments(segment.id, nextSegment.id);
              }
            }}
          />
        </div>
      ))}
    </div>
  );
}
