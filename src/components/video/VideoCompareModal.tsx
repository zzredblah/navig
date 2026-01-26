'use client';

/**
 * 영상 버전 비교 모달
 *
 * 두 영상을 나란히 재생하며 비교합니다.
 * 동기화 모드로 같은 시점에서 비교 가능.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Link, Unlink, Play, Pause, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VideoPlayer } from './VideoPlayer';
import { VideoVersionWithUploader, formatDuration } from '@/types/video';
import { cn } from '@/lib/utils';

interface VideoCompareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video1: VideoVersionWithUploader | null;
  video2: VideoVersionWithUploader | null;
}

export function VideoCompareModal({
  open,
  onOpenChange,
  video1,
  video2,
}: VideoCompareModalProps) {
  const [isSynced, setIsSynced] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [feedbackCounts, setFeedbackCounts] = useState<{
    video1: { total: number; open: number } | null;
    video2: { total: number; open: number } | null;
  }>({ video1: null, video2: null });

  const video1Ref = useRef<HTMLVideoElement | null>(null);
  const video2Ref = useRef<HTMLVideoElement | null>(null);

  // 피드백 개수 조회
  useEffect(() => {
    if (!open || !video1 || !video2) return;

    const fetchFeedbackCounts = async (videoId: string) => {
      try {
        const response = await fetch(`/api/videos/${videoId}/feedbacks?limit=1`);
        if (response.ok) {
          const data = await response.json();
          const feedbacks = data.feedbacks || [];
          const total = data.pagination?.total || 0;
          // 전체 피드백을 가져와서 open 상태 개수 계산 (페이지네이션 때문에 별도 요청)
          const allResponse = await fetch(`/api/videos/${videoId}/feedbacks?limit=100`);
          if (allResponse.ok) {
            const allData = await allResponse.json();
            const openCount = (allData.feedbacks || []).filter(
              (f: { status: string }) => f.status === 'open'
            ).length;
            return { total: allData.pagination?.total || 0, open: openCount };
          }
          return { total, open: 0 };
        }
        return null;
      } catch {
        return null;
      }
    };

    Promise.all([
      fetchFeedbackCounts(video1.id),
      fetchFeedbackCounts(video2.id),
    ]).then(([count1, count2]) => {
      setFeedbackCounts({ video1: count1, video2: count2 });
    });
  }, [open, video1, video2]);

  // 동기화된 시간 업데이트
  const handleTimeUpdate = useCallback(
    (time: number) => {
      if (isSynced) {
        setCurrentTime(time);
      }
    },
    [isSynced]
  );

  // 동시 재생/일시정지
  const togglePlayBoth = useCallback(() => {
    const videos = document.querySelectorAll(
      '.compare-video video'
    ) as NodeListOf<HTMLVideoElement>;

    videos.forEach((video) => {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
    });

    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  if (!video1 || !video2) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>버전 비교</DialogTitle>
          <div className="flex items-center gap-2">
            {/* 동기화 토글 */}
            <Button
              variant={isSynced ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsSynced(!isSynced)}
              className={cn(
                isSynced && 'bg-primary-600 hover:bg-primary-700'
              )}
            >
              {isSynced ? (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  동기화됨
                </>
              ) : (
                <>
                  <Unlink className="h-4 w-4 mr-2" />
                  개별 재생
                </>
              )}
            </Button>

            {/* 동시 재생 버튼 */}
            {isSynced && (
              <Button
                variant="outline"
                size="sm"
                onClick={togglePlayBoth}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    일시정지
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    동시 재생
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* 비교 영상 */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* 영상 1 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  v{video1.version_number}
                </span>
                {video1.version_name && (
                  <span className="text-gray-600 text-sm">
                    - {video1.version_name}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {video1.duration ? formatDuration(video1.duration) : '--:--'}
              </span>
            </div>

            <div className="compare-video">
              {video1.file_url ? (
                <VideoPlayer
                  src={video1.file_url}
                  poster={video1.thumbnail_url || undefined}
                  className="aspect-video"
                  externalTime={isSynced ? currentTime : undefined}
                  onTimeUpdate={handleTimeUpdate}
                />
              ) : (
                <div className="aspect-video bg-gray-200 flex items-center justify-center rounded-lg">
                  <p className="text-gray-500">영상을 불러올 수 없습니다</p>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-600 line-clamp-2">
              {video1.change_notes}
            </p>
          </div>

          {/* 영상 2 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  v{video2.version_number}
                </span>
                {video2.version_name && (
                  <span className="text-gray-600 text-sm">
                    - {video2.version_name}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {video2.duration ? formatDuration(video2.duration) : '--:--'}
              </span>
            </div>

            <div className="compare-video">
              {video2.file_url ? (
                <VideoPlayer
                  src={video2.file_url}
                  poster={video2.thumbnail_url || undefined}
                  className="aspect-video"
                  externalTime={isSynced ? currentTime : undefined}
                  onTimeUpdate={handleTimeUpdate}
                />
              ) : (
                <div className="aspect-video bg-gray-200 flex items-center justify-center rounded-lg">
                  <p className="text-gray-500">영상을 불러올 수 없습니다</p>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-600 line-clamp-2">
              {video2.change_notes}
            </p>
          </div>
        </div>

        {/* 비교 정보 */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">버전 비교</h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">파일 크기 차이</p>
              <p className="font-medium">
                {formatFileSizeDiff(video1.file_size, video2.file_size)}
              </p>
            </div>
            {video1.duration && video2.duration && (
              <div>
                <p className="text-gray-500 mb-1">길이 차이</p>
                <p className="font-medium">
                  {formatDurationDiff(video1.duration, video2.duration)}
                </p>
              </div>
            )}
            {video1.resolution && video2.resolution && (
              <div>
                <p className="text-gray-500 mb-1">해상도</p>
                <p className="font-medium">
                  {video1.resolution === video2.resolution
                    ? video1.resolution
                    : `${video1.resolution} → ${video2.resolution}`}
                </p>
              </div>
            )}
            {(video1.codec || video2.codec) && (
              <div>
                <p className="text-gray-500 mb-1">코덱</p>
                <p className="font-medium">
                  {video1.codec === video2.codec
                    ? video1.codec || '-'
                    : `${video1.codec || '-'} → ${video2.codec || '-'}`}
                </p>
              </div>
            )}
            <div>
              <p className="text-gray-500 mb-1">업로드 날짜</p>
              <p className="font-medium">
                {formatDateDiff(video1.created_at, video2.created_at)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                피드백
              </p>
              <p className="font-medium">
                {feedbackCounts.video1 && feedbackCounts.video2 ? (
                  <>
                    <span className={feedbackCounts.video1.open > 0 ? 'text-blue-600' : ''}>
                      v{video1.version_number}: {feedbackCounts.video1.total}개
                      {feedbackCounts.video1.open > 0 && ` (${feedbackCounts.video1.open} 열림)`}
                    </span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className={feedbackCounts.video2.open > 0 ? 'text-blue-600' : ''}>
                      v{video2.version_number}: {feedbackCounts.video2.total}개
                      {feedbackCounts.video2.open > 0 && ` (${feedbackCounts.video2.open} 열림)`}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-400">로딩 중...</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 파일 크기 차이 포맷
function formatFileSizeDiff(size1: number, size2: number): string {
  const diff = size2 - size1;
  const absDiff = Math.abs(diff);

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(absDiff || 1) / Math.log(k));
  const formattedDiff = `${parseFloat((absDiff / Math.pow(k, i)).toFixed(1))} ${units[i]}`;

  if (diff === 0) return '동일';
  if (diff > 0) return `+${formattedDiff} (증가)`;
  return `-${formattedDiff} (감소)`;
}

// 길이 차이 포맷
function formatDurationDiff(duration1: number, duration2: number): string {
  const diff = duration2 - duration1;
  const absDiff = Math.abs(diff);

  const mins = Math.floor(absDiff / 60);
  const secs = Math.floor(absDiff % 60);
  const formatted = mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`;

  if (diff === 0) return '동일';
  if (diff > 0) return `+${formatted} (길어짐)`;
  return `-${formatted} (짧아짐)`;
}

// 날짜 차이 포맷
function formatDateDiff(date1: string, date2: string): string {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = d2.getTime() - d1.getTime();
  const absDiff = Math.abs(diff);

  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const formatDate = (d: Date) =>
    d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (days === 0 && hours === 0) {
    return `${formatDate(d1)} (동시)`;
  }

  const diffText = days > 0 ? `${days}일 ${hours}시간` : `${hours}시간`;
  return `${formatDate(d1)} → ${formatDate(d2)} (${diffText} 후)`;
}
