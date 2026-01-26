'use client';

/**
 * 영상 리뷰 페이지
 *
 * 영상 재생과 프레임 단위 피드백을 함께 제공합니다.
 */

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Video,
  Loader2,
  Download,
  Info,
  MessageSquare,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FeedbackPanel } from '@/components/video/FeedbackPanel';
import { DrawingCanvas } from '@/components/video/DrawingCanvas';
import { cn } from '@/lib/utils';

interface VideoVersion {
  id: string;
  project_id: string;
  version_number: number;
  version_name: string | null;
  original_filename: string;
  file_url: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  resolution: string | null;
  file_size: number;
  change_notes: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  created_at: string;
  uploader: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  project: {
    id: string;
    title: string;
    client_id: string;
  };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  uploading: { label: '업로드 중', color: 'bg-blue-100 text-blue-700' },
  processing: { label: '처리 중', color: 'bg-yellow-100 text-yellow-700' },
  ready: { label: '준비됨', color: 'bg-green-100 text-green-700' },
  error: { label: '오류', color: 'bg-red-100 text-red-700' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default function VideoReviewPage({
  params,
}: {
  params: Promise<{ id: string; videoId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  // 상태
  const [video, setVideo] = useState<VideoVersion | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(true);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingImage, setDrawingImage] = useState<string | null>(null);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // 영상 정보 조회
  useEffect(() => {
    async function fetchVideo() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/videos/${resolvedParams.videoId}`);
        if (response.ok) {
          const data = await response.json();
          setVideo(data.video);
        } else if (response.status === 404) {
          router.push(`/projects/${resolvedParams.id}/videos`);
        }
      } catch (error) {
        console.error('영상 조회 실패:', error);
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchCurrentUser() {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentUserId(data.user?.id);
        }
      } catch (error) {
        console.error('사용자 정보 조회 실패:', error);
      }
    }

    fetchVideo();
    fetchCurrentUser();
  }, [resolvedParams.id, resolvedParams.videoId, router]);

  // 비디오 시간 업데이트
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // 비디오 메타데이터 로드
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // 특정 시간으로 이동 (자동 재생 없이 구간만 이동)
  const handleSeek = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      // 자동 재생하지 않음 - 사용자가 직접 재생 버튼 클릭
    }
  };

  // 그리기 모드 토글
  const handleDrawingModeToggle = () => {
    if (!isDrawingMode && videoRef.current) {
      // 영상 일시정지
      videoRef.current.pause();
      // 비디오 컨테이너 크기 가져오기
      if (videoContainerRef.current) {
        const rect = videoContainerRef.current.getBoundingClientRect();
        setVideoSize({ width: rect.width, height: rect.height });
      }
    }
    setIsDrawingMode(!isDrawingMode);
  };

  // 그림 저장
  const handleSaveDrawing = (imageData: string) => {
    setDrawingImage(imageData);
    setIsDrawingMode(false);
  };

  // 그림 취소
  const handleCancelDrawing = () => {
    setIsDrawingMode(false);
  };

  // 그림 초기화
  const handleClearDrawing = () => {
    setDrawingImage(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!video) {
    return null;
  }

  const status = statusLabels[video.status] || statusLabels.ready;

  return (
    <div className="h-[calc(100vh-8rem)]">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/projects/${resolvedParams.id}/videos`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 truncate">
                v{video.version_number}
                {video.version_name && ` - ${video.version_name}`}
              </h1>
              <Badge className={status.color}>{status.label}</Badge>
            </div>
            <p className="text-sm text-gray-500 truncate">
              {video.original_filename}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFeedbackPanel(!showFeedbackPanel)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {showFeedbackPanel ? '피드백 숨기기' : '피드백 보기'}
          </Button>
          {video.file_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={video.file_url} download={video.original_filename}>
                <Download className="h-4 w-4 mr-2" />
                다운로드
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex gap-4 h-[calc(100%-4rem)]">
        {/* 비디오 플레이어 */}
        <div
          ref={videoContainerRef}
          className={cn(
            'flex-1 flex flex-col bg-black rounded-lg overflow-hidden relative',
            showFeedbackPanel ? 'lg:flex-[2]' : ''
          )}
        >
          {video.file_url ? (
            <>
              <video
                ref={videoRef}
                src={video.file_url}
                poster={video.thumbnail_url || undefined}
                controls={!isDrawingMode}
                crossOrigin="anonymous"
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
              />

              {/* 그리기 모드 오버레이 */}
              {isDrawingMode && videoSize.width > 0 && (
                <div className="absolute inset-0 bg-black/20">
                  <DrawingCanvas
                    width={videoSize.width}
                    height={videoSize.height - 80}
                    videoElement={videoRef.current}
                    onSave={handleSaveDrawing}
                    onCancel={handleCancelDrawing}
                    className="w-full h-full"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-white">
                <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>영상을 불러올 수 없습니다</p>
              </div>
            </div>
          )}

          {/* 영상 정보 */}
          <div className="p-4 bg-gray-900 text-white">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Info className="h-4 w-4 text-gray-400" />
                {formatFileSize(video.file_size)}
              </span>
              {video.resolution && <span>{video.resolution}</span>}
              {video.duration && <span>{formatDuration(video.duration)}</span>}
              <span className="text-gray-400">
                {new Date(video.created_at).toLocaleDateString('ko-KR')}
              </span>
            </div>
            {video.change_notes && (
              <p className="mt-2 text-sm text-gray-300">{video.change_notes}</p>
            )}
          </div>
        </div>

        {/* 피드백 패널 */}
        {showFeedbackPanel && (
          <div className="hidden lg:block lg:w-96 bg-white border border-gray-200 rounded-lg overflow-hidden">
            <FeedbackPanel
              videoId={video.id}
              videoDuration={duration || video.duration || 0}
              currentTime={currentTime}
              currentUserId={currentUserId}
              onSeek={handleSeek}
              onDrawingModeToggle={handleDrawingModeToggle}
              drawingImage={drawingImage}
              onClearDrawing={handleClearDrawing}
              isDrawingMode={isDrawingMode}
            />
          </div>
        )}
      </div>

      {/* 모바일 피드백 패널 토글 버튼 */}
      {showFeedbackPanel && (
        <div className="lg:hidden fixed bottom-4 right-4">
          <Button
            size="lg"
            className="rounded-full shadow-lg"
            onClick={() => {
              // TODO: 모바일에서 피드백 패널 모달로 표시
            }}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
