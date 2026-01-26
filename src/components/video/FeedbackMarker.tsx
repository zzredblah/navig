'use client';

/**
 * 피드백 마커 컴포넌트
 *
 * 비디오 타임라인 위에 피드백 위치를 표시합니다.
 * 가까운 위치의 피드백은 그룹화하여 표시합니다.
 */

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { FeedbackWithAuthor, feedbackStatusLabels, formatTimestamp } from '@/types/feedback';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// 가까운 피드백을 그룹화 (3% 이내)
function groupFeedbacks(feedbacks: FeedbackWithAuthor[], duration: number) {
  const threshold = duration * 0.03; // 3% 범위 내 그룹화
  const groups: FeedbackWithAuthor[][] = [];

  const sorted = [...feedbacks].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

  sorted.forEach((feedback) => {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && feedback.timestamp_seconds - lastGroup[0].timestamp_seconds <= threshold) {
      lastGroup.push(feedback);
    } else {
      groups.push([feedback]);
    }
  });

  return groups;
}

interface FeedbackMarkerGroupProps {
  feedbacks: FeedbackWithAuthor[];
  duration: number;
  activeFeedbackId?: string;
  onFeedbackClick?: (feedback: FeedbackWithAuthor) => void;
}

function FeedbackMarkerGroup({
  feedbacks,
  duration,
  activeFeedbackId,
  onFeedbackClick,
}: FeedbackMarkerGroupProps) {
  const [open, setOpen] = useState(false);
  const position = (feedbacks[0].timestamp_seconds / duration) * 100;
  const isActive = feedbacks.some((f) => f.id === activeFeedbackId);
  const hasUrgent = feedbacks.some((f) => f.is_urgent && f.status === 'open');
  const hasOpen = feedbacks.some((f) => f.status === 'open');
  const isSingle = feedbacks.length === 1;

  // 그룹 마커 색상: 선택됨 > 긴급 > 열림 > 완료
  const getGroupMarkerColor = () => {
    if (isActive) return 'bg-amber-400 border-amber-500 ring-2 ring-amber-200 z-20'; // 선택됨: 노란색
    if (hasUrgent) return 'bg-red-500 border-red-600'; // 긴급: 붉은색
    if (hasOpen) return 'bg-blue-500 border-blue-600'; // 열림: 파란색
    return 'bg-green-500 border-green-600'; // 완료: 초록색
  };

  if (isSingle) {
    const feedback = feedbacks[0];
    // 색상 우선순위: 선택됨 > 긴급 > 상태별
    const getMarkerColor = () => {
      if (isActive) return 'bg-amber-400 border-amber-500 ring-2 ring-amber-200 z-20'; // 선택됨: 노란색
      if (feedback.is_urgent) return 'bg-red-500 border-red-600'; // 긴급: 붉은색
      if (feedback.status === 'resolved') return 'bg-green-500 border-green-600'; // 완료: 초록색
      if (feedback.status === 'wontfix') return 'bg-gray-400 border-gray-500'; // 진행안함: 회색
      return 'bg-blue-500 border-blue-600'; // 열림: 파란색
    };

    return (
      <button
        onClick={() => onFeedbackClick?.(feedback)}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 transition-all',
          'hover:scale-125 hover:z-10',
          getMarkerColor()
        )}
        style={{ left: `${position}%` }}
        title={`${formatTime(feedback.timestamp_seconds)} - ${feedback.content.slice(0, 50)}...`}
      />
    );
  }

  // 여러 피드백이 그룹화된 경우 Popover로 표시
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 min-w-5 h-5 px-1 rounded-full border-2 transition-all',
            'hover:scale-110 hover:z-10 text-[10px] font-bold text-white',
            getGroupMarkerColor()
          )}
          style={{ left: `${position}%` }}
        >
          {feedbacks.length}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="center">
        <div className="p-2 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500">
            {formatTime(feedbacks[0].timestamp_seconds)} 부근 피드백 ({feedbacks.length}개)
          </p>
        </div>
        <div className="max-h-48 overflow-y-auto scrollbar-thin">
          {feedbacks.map((feedback) => (
            <button
              key={feedback.id}
              onClick={() => {
                onFeedbackClick?.(feedback);
                setOpen(false);
              }}
              className={cn(
                'w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0',
                feedback.id === activeFeedbackId && 'bg-primary-50'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    feedback.is_urgent && feedback.status === 'open'
                      ? 'bg-red-500'
                      : feedback.status === 'open'
                      ? 'bg-blue-500'
                      : feedback.status === 'resolved'
                      ? 'bg-green-500'
                      : 'bg-gray-400'
                  )}
                />
                <span className="text-xs text-gray-500">
                  {formatTimestamp(feedback.timestamp_seconds)}
                </span>
                <span className="text-xs text-gray-400 truncate">
                  {feedback.author.name}
                </span>
              </div>
              <p className="text-sm text-gray-700 line-clamp-2">
                {feedback.content}
              </p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface FeedbackTimelineProps {
  feedbacks: FeedbackWithAuthor[];
  duration: number;
  activeFeedbackId?: string;
  onFeedbackClick?: (feedback: FeedbackWithAuthor) => void;
}

export function FeedbackTimeline({
  feedbacks,
  duration,
  activeFeedbackId,
  onFeedbackClick,
}: FeedbackTimelineProps) {
  const groups = useMemo(
    () => groupFeedbacks(feedbacks, duration),
    [feedbacks, duration]
  );

  if (duration <= 0 || feedbacks.length === 0) {
    return null;
  }

  return (
    <div className="relative h-6 bg-gray-200 rounded-full overflow-visible">
      {groups.map((group, index) => (
        <FeedbackMarkerGroup
          key={group[0].id}
          feedbacks={group}
          duration={duration}
          activeFeedbackId={activeFeedbackId}
          onFeedbackClick={onFeedbackClick}
        />
      ))}
    </div>
  );
}
