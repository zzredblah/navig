'use client';

/**
 * 피드백 패널 컴포넌트
 *
 * 영상 피드백 목록과 작성 폼을 포함합니다.
 * Supabase Realtime으로 실시간 동기화를 지원합니다.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Filter,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FeedbackForm } from './FeedbackForm';
import { FeedbackItem } from './FeedbackItem';
import { FeedbackTimeline } from './FeedbackMarker';
import { FeedbackSummaryButton } from './FeedbackSummaryButton';
import {
  FeedbackWithAuthor,
  ReplyWithAuthor,
  FeedbackStatus,
} from '@/types/feedback';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface FeedbackPanelProps {
  videoId: string;
  videoDuration: number;
  currentTime: number;
  currentUserId?: string;
  onSeek?: (timestamp: number) => void;
  onDrawingModeToggle?: () => void;
  drawingImage?: string | null;
  onClearDrawing?: () => void;
  isDrawingMode?: boolean;
}

export function FeedbackPanel({
  videoId,
  videoDuration,
  currentTime,
  currentUserId,
  onSeek,
  onDrawingModeToggle,
  drawingImage,
  onClearDrawing,
  isDrawingMode,
}: FeedbackPanelProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackWithAuthor[]>([]);
  const [repliesMap, setRepliesMap] = useState<Record<string, ReplyWithAuthor[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // 피드백 목록 조회
  const fetchFeedbacks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      // urgent 필터는 클라이언트 측에서 처리하므로 API에 보내지 않음
      if (statusFilter !== 'all' && statusFilter !== 'urgent') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/videos/${videoId}/feedbacks?${params}`);
      if (response.ok) {
        const data = await response.json();
        setFeedbacks(data.feedbacks);
      }
    } catch (error) {
      console.error('피드백 목록 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, [videoId, statusFilter]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // Supabase Realtime 구독
  useEffect(() => {
    const supabase = createClient();

    // 피드백 테이블 변경 구독
    const channel = supabase
      .channel(`video_feedbacks:${videoId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모두 감지
          schema: 'public',
          table: 'video_feedbacks',
          filter: `video_id=eq.${videoId}`,
        },
        () => {
          // 변경 감지 시 목록 새로고침
          fetchFeedbacks();
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    // 클린업: 구독 해제
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [videoId, fetchFeedbacks]);

  // 피드백 생성
  const handleCreateFeedback = async (content: string, timestamp: number, drawingImageData?: string, isUrgent?: boolean) => {
    const response = await fetch(`/api/videos/${videoId}/feedbacks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        timestamp_seconds: timestamp,
        drawing_image: drawingImageData,
        is_urgent: isUrgent || false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '피드백 작성에 실패했습니다');
    }

    await fetchFeedbacks();
  };

  // 피드백 상태 변경
  const handleStatusChange = async (feedbackId: string, status: FeedbackStatus) => {
    const response = await fetch(`/api/feedbacks/${feedbackId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '상태 변경에 실패했습니다');
    }

    await fetchFeedbacks();
  };

  // 피드백 삭제
  const handleDeleteFeedback = async (feedbackId: string) => {
    const response = await fetch(`/api/feedbacks/${feedbackId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '삭제에 실패했습니다');
    }

    await fetchFeedbacks();
  };

  // 답글 조회
  const fetchReplies = async (feedbackId: string) => {
    try {
      const response = await fetch(`/api/feedbacks/${feedbackId}/replies`);
      if (response.ok) {
        const data = await response.json();
        setRepliesMap((prev) => ({
          ...prev,
          [feedbackId]: data.replies,
        }));
      }
    } catch (error) {
      console.error('답글 조회 실패:', error);
    }
  };

  // 답글 작성
  const handleReply = async (feedbackId: string, content: string) => {
    const response = await fetch(`/api/feedbacks/${feedbackId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '답글 작성에 실패했습니다');
    }

    await fetchReplies(feedbackId);
  };

  // 피드백 클릭 시 해당 구간으로 이동 + 답글 로드
  const handleFeedbackClick = (feedback: FeedbackWithAuthor) => {
    setActiveFeedbackId(feedback.id);
    onSeek?.(feedback.timestamp_seconds);
    if (!repliesMap[feedback.id]) {
      fetchReplies(feedback.id);
    }
  };

  // 피드백 마커 클릭 시 해당 위치로 이동
  const handleMarkerClick = (feedback: FeedbackWithAuthor) => {
    setActiveFeedbackId(feedback.id);
    onSeek?.(feedback.timestamp_seconds);
    if (!repliesMap[feedback.id]) {
      fetchReplies(feedback.id);
    }
  };

  const openCount = feedbacks.filter((f) => f.status === 'open').length;
  const resolvedCount = feedbacks.filter((f) => f.status === 'resolved').length;
  const urgentCount = feedbacks.filter((f) => f.is_urgent && f.status === 'open').length;

  // 필터링된 피드백 (타임라인 + 목록에 공통 사용)
  const filteredFeedbacks = feedbacks.filter((feedback) => {
    if (statusFilter === 'urgent') {
      return feedback.is_urgent === true;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="p-3 border-b border-gray-200 space-y-2">
        {/* 상단: 제목 + 통계 + 실시간 상태 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-gray-500 shrink-0" />
            <span className="font-medium text-gray-900">피드백</span>
            <span className="text-xs text-gray-500">
              {openCount}/{resolvedCount}
            </span>
            {urgentCount > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                <AlertTriangle className="h-3 w-3" />
                {urgentCount}
              </span>
            )}
          </div>

          {/* 실시간 연결 상태 */}
          <div
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs shrink-0 ${
              isRealtimeConnected
                ? 'text-green-600 bg-green-50'
                : 'text-gray-400 bg-gray-50'
            }`}
            title={isRealtimeConnected ? '실시간 동기화 연결됨' : '실시간 동기화 연결 중...'}
          >
            <Radio className={`h-3 w-3 ${isRealtimeConnected ? 'animate-pulse' : ''}`} />
          </div>
        </div>

        {/* 하단: 필터 + AI 요약 + 새로고침 */}
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="urgent">긴급</SelectItem>
              <SelectItem value="open">열림</SelectItem>
              <SelectItem value="resolved">해결됨</SelectItem>
              <SelectItem value="wontfix">수정 안함</SelectItem>
            </SelectContent>
          </Select>

          <FeedbackSummaryButton
            videoId={videoId}
            feedbackCount={feedbacks.length}
          />

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchFeedbacks}
            disabled={isLoading}
            title="새로고침"
            className="shrink-0 h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 타임라인 마커 */}
      {videoDuration > 0 && filteredFeedbacks.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-200">
          <FeedbackTimeline
            feedbacks={filteredFeedbacks}
            duration={videoDuration}
            activeFeedbackId={activeFeedbackId || undefined}
            onFeedbackClick={handleMarkerClick}
          />
        </div>
      )}

      {/* 피드백 목록 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 mb-1">
              {statusFilter === 'urgent' ? '긴급 피드백이 없습니다' : '피드백이 없습니다'}
            </p>
            <p className="text-sm text-gray-400">
              {statusFilter === 'urgent'
                ? '긴급으로 표시된 피드백이 없습니다'
                : '영상을 재생하면서 피드백을 남겨보세요'}
            </p>
          </div>
        ) : (
          filteredFeedbacks.map((feedback) => (
              <FeedbackItem
                key={feedback.id}
                feedback={feedback}
                replies={repliesMap[feedback.id] || []}
                isActive={feedback.id === activeFeedbackId}
                currentUserId={currentUserId}
                onSeek={onSeek}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteFeedback}
                onReply={handleReply}
                onClick={() => handleFeedbackClick(feedback)}
              />
            ))
        )}
      </div>

      {/* 피드백 작성 폼 */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <FeedbackForm
          videoId={videoId}
          versionId={videoId}
          currentTime={currentTime}
          onSubmit={handleCreateFeedback}
          onDrawingModeToggle={onDrawingModeToggle}
          drawingImage={drawingImage}
          onClearDrawing={onClearDrawing}
          disabled={isDrawingMode}
          onVoiceFeedbackSuccess={fetchFeedbacks}
        />
      </div>
    </div>
  );
}
