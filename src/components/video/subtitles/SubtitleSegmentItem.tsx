'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Trash2,
  Scissors,
  Merge,
  AlertCircle,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { SubtitleSegment, QualityIssue } from '@/types/subtitle';
import { formatSubtitleTime, parseSubtitleTime } from '@/types/subtitle';

interface SubtitleSegmentItemProps {
  segment: SubtitleSegment;
  index: number;
  isActive: boolean;
  isSelected: boolean;
  hasNextSegment: boolean;
  qualityIssue?: QualityIssue;
  onSelect: () => void;
  onTextChange: (text: string) => void;
  onTimeChange: (startTime: number, endTime: number) => void;
  onPlaySegment: () => void;
  onDelete: () => void;
  onSplit: (splitTime: number) => void;
  onMergeWithNext: () => void;
}

export function SubtitleSegmentItem({
  segment,
  index,
  isActive,
  isSelected,
  hasNextSegment,
  qualityIssue,
  onSelect,
  onTextChange,
  onTimeChange,
  onPlaySegment,
  onDelete,
  onSplit,
  onMergeWithNext,
}: SubtitleSegmentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(segment.text);
  const [startTimeStr, setStartTimeStr] = useState(formatSubtitleTime(segment.start_time));
  const [endTimeStr, setEndTimeStr] = useState(formatSubtitleTime(segment.end_time));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update local state when segment changes
  useEffect(() => {
    setEditText(segment.text);
    setStartTimeStr(formatSubtitleTime(segment.start_time));
    setEndTimeStr(formatSubtitleTime(segment.end_time));
  }, [segment.text, segment.start_time, segment.end_time]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editText, isEditing]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleTextBlur = useCallback(() => {
    setIsEditing(false);
    if (editText !== segment.text) {
      onTextChange(editText);
    }
  }, [editText, segment.text, onTextChange]);

  const handleTimeBlur = useCallback(
    (type: 'start' | 'end') => {
      const newStartTime = parseSubtitleTime(startTimeStr);
      const newEndTime = parseSubtitleTime(endTimeStr);

      // Validate times
      if (type === 'start' && newStartTime >= segment.end_time) {
        setStartTimeStr(formatSubtitleTime(segment.start_time));
        return;
      }
      if (type === 'end' && newEndTime <= segment.start_time) {
        setEndTimeStr(formatSubtitleTime(segment.end_time));
        return;
      }

      if (
        newStartTime !== segment.start_time ||
        newEndTime !== segment.end_time
      ) {
        onTimeChange(newStartTime, newEndTime);
      }
    },
    [startTimeStr, endTimeStr, segment.start_time, segment.end_time, onTimeChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleTextBlur();
      }
      if (e.key === 'Escape') {
        setEditText(segment.text);
        setIsEditing(false);
      }
    },
    [handleTextBlur, segment.text]
  );

  const handleSplit = useCallback(() => {
    // Split at the midpoint of the segment
    const midTime = (segment.start_time + segment.end_time) / 2;
    onSplit(midTime);
  }, [segment.start_time, segment.end_time, onSplit]);

  const confidencePercent = segment.confidence
    ? Math.round(segment.confidence * 100)
    : null;
  const isLowConfidence = confidencePercent !== null && confidencePercent < 70;

  if (!mounted) {
    return (
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
        <div className="h-8 bg-gray-200 rounded w-full" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border rounded-lg p-3 transition-all',
        isActive && 'border-primary-500 bg-primary-50/50',
        isSelected && !isActive && 'border-primary-300 bg-primary-50/30',
        !isActive && !isSelected && 'border-gray-200 bg-white hover:border-gray-300',
        qualityIssue && 'border-yellow-400'
      )}
      onClick={onSelect}
    >
      {/* Header: Index, Time, Actions */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Index */}
          <span className="flex-shrink-0 w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs font-medium flex items-center justify-center">
            {index + 1}
          </span>

          {/* Start Time */}
          <input
            type="text"
            value={startTimeStr}
            onChange={(e) => setStartTimeStr(e.target.value)}
            onBlur={() => handleTimeBlur('start')}
            className="w-20 px-2 py-1 text-xs font-mono bg-white text-gray-900 border border-gray-200 rounded focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            onClick={(e) => e.stopPropagation()}
          />

          <span className="text-gray-400 text-xs">→</span>

          {/* End Time */}
          <input
            type="text"
            value={endTimeStr}
            onChange={(e) => setEndTimeStr(e.target.value)}
            onBlur={() => handleTimeBlur('end')}
            className="w-20 px-2 py-1 text-xs font-mono bg-white text-gray-900 border border-gray-200 rounded focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Quality Issue Warning */}
          {qualityIssue && (
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded text-xs',
                qualityIssue.severity === 'error'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              )}
              title={qualityIssue.message}
            >
              <AlertCircle className="h-3 w-3" />
              <span className="hidden sm:inline">{qualityIssue.message}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Play Segment */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-500 hover:text-primary-600"
            onClick={(e) => {
              e.stopPropagation();
              onPlaySegment();
            }}
            title="이 구간 재생"
          >
            <Play className="h-3.5 w-3.5" />
          </Button>

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-500 hover:text-gray-700"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleSplit}>
                <Scissors className="h-4 w-4 mr-2" />
                분할
              </DropdownMenuItem>
              {hasNextSegment && (
                <DropdownMenuItem onClick={onMergeWithNext}>
                  <Merge className="h-4 w-4 mr-2" />
                  다음과 병합
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Text Content */}
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleTextBlur}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 text-sm bg-white text-gray-900 border border-primary-500 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary-500"
            rows={1}
          />
        ) : (
          <div
            className={cn(
              'px-3 py-2 text-sm rounded-lg cursor-text',
              'bg-gray-50 hover:bg-gray-100 transition-colors',
              isLowConfidence && 'bg-yellow-50'
            )}
            onDoubleClick={() => setIsEditing(true)}
          >
            {segment.text || (
              <span className="text-gray-400 italic">텍스트 없음</span>
            )}
          </div>
        )}
      </div>

      {/* Footer: Confidence, Word Count */}
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
        {confidencePercent !== null && (
          <span
            className={cn(
              'flex items-center gap-1',
              isLowConfidence && 'text-yellow-600'
            )}
          >
            신뢰도: {confidencePercent}%
            {isLowConfidence && (
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
            )}
          </span>
        )}
        <span>단어: {segment.text.split(/\s+/).filter(Boolean).length}</span>
        {segment.speaker && (
          <span className="text-primary-600">화자: {segment.speaker}</span>
        )}
      </div>
    </div>
  );
}
