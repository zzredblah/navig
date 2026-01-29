'use client';

/**
 * 영상 리뷰 페이지
 *
 * 영상 재생과 프레임 단위 피드백을 함께 제공합니다.
 */

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Hls from 'hls.js';
import {
  ArrowLeft,
  Video,
  Loader2,
  Download,
  Info,
  MessageSquare,
  X,
  GitCompare,
  Maximize,
  Minimize,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FeedbackPanel } from '@/components/video/FeedbackPanel';
import { DrawingCanvas } from '@/components/video/DrawingCanvas';
import { ApprovalButton } from '@/components/video/ApprovalButton';
import { VideoCompareModal } from '@/components/video/VideoCompareModal';
import { cn } from '@/lib/utils';
import { useVideoHotkeys } from '@/hooks/use-global-hotkeys';
import { useWatermark } from '@/hooks/use-watermark';
import { useWatermarkDownload } from '@/hooks/use-watermark-download';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';

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
  status: 'uploading' | 'encoding' | 'processing' | 'ready' | 'error';
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  watermark_enabled: boolean;
  // Cloudflare Stream 관련 필드
  stream_video_id: string | null;
  stream_ready: boolean;
  hls_url: string | null;
  download_url: string | null;
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
  encoding: { label: '인코딩 중', color: 'bg-orange-100 text-orange-700' },
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
  const hlsRef = useRef<Hls | null>(null);

  // 상태
  const [video, setVideo] = useState<VideoVersion | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [currentUserRole, setCurrentUserRole] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(true);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingImage, setDrawingImage] = useState<string | null>(null);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 워터마크 설정 및 렌더링 (영상에 워터마크 활성화된 경우에만)
  const { canvasRef: watermarkCanvasRef, settings: watermarkSettings } = useWatermark({
    projectId: resolvedParams.id,
    videoRef,
    containerRef: videoContainerRef,
    enabled: !!(video?.file_url || video?.hls_url) && video?.watermark_enabled !== false,
  });

  // 워터마크 포함 다운로드
  const {
    isProcessing: isDownloadProcessing,
    progress: downloadProgress,
    downloadWithWatermark,
    cancelDownload,
  } = useWatermarkDownload();

  // 영상 정보 조회
  useEffect(() => {
    async function fetchVideo() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/videos/${resolvedParams.videoId}`);
        if (response.ok) {
          const data = await response.json();
          setVideo(data.video);
          setCurrentUserRole(data.userRole);
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

  // HLS.js 초기화 (Stream 영상용)
  useEffect(() => {
    const videoElement = videoRef.current;

    // HLS URL이 없거나 비디오 요소가 없거나 Stream이 준비되지 않았으면 스킵
    if (!video?.hls_url || !videoElement) {
      return;
    }

    // Stream이 아직 인코딩 중이면 스킵
    if (!video.stream_ready) {
      console.log('[HLS] Stream not ready yet, waiting for encoding...');
      return;
    }

    console.log('[HLS] Initializing with URL:', video.hls_url);

    // 기존 HLS 인스턴스 정리
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // HLS.js 지원 확인
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        debug: false,
      });

      hls.loadSource(video.hls_url);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[HLS] Manifest parsed, ready to play');
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.warn('[HLS] Error:', data.type, data.details, data.fatal);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('[HLS] Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('[HLS] Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.error('[HLS] Unrecoverable error, destroying...');
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari 네이티브 HLS 지원
      videoElement.src = video.hls_url;
    }

    // 정리 함수
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video?.hls_url, video?.stream_ready]);

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

  // 영상 키보드 단축키 핸들러
  const handlePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, []);

  const handleSeekForward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        videoRef.current.currentTime + 5,
        videoRef.current.duration
      );
    }
  }, []);

  const handleSeekBackward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        videoRef.current.currentTime - 5,
        0
      );
    }
  }, []);

  const handleToggleFeedbackPanel = useCallback(() => {
    setShowFeedbackPanel((prev) => !prev);
  }, []);

  // 전체화면 토글 (컨테이너 기준)
  const handleToggleFullscreen = useCallback(async () => {
    if (!videoContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await videoContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('전체화면 전환 실패:', error);
    }
  }, []);

  // 전체화면 상태 변경 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 컨트롤 표시/숨김 타이머
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  // 비디오 재생 상태 감지
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      resetControlsTimeout();
    };
    const handlePause = () => {
      setIsPlaying(false);
      setShowControls(true);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimeout]);

  // 마우스 이동 시 컨트롤 표시
  const handleMouseMove = useCallback(() => {
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  // 영상 키보드 단축키 활성화
  useVideoHotkeys({
    onPlayPause: handlePlayPause,
    onSeekForward: handleSeekForward,
    onSeekBackward: handleSeekBackward,
    onToggleFeedbackPanel: handleToggleFeedbackPanel,
    enabled: !isDrawingMode && !!video?.file_url,
  });

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
          {/* 승인 버튼 */}
          <ApprovalButton
            videoId={video.id}
            projectClientId={video.project.client_id}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            isApproved={!!video.approved_at}
            approvedAt={video.approved_at}
            onApprovalChange={(approved) => {
              setVideo((prev) =>
                prev
                  ? {
                      ...prev,
                      approved_at: approved ? new Date().toISOString() : null,
                      approved_by: approved ? currentUserId || null : null,
                    }
                  : null
              );
            }}
          />
          {/* 버전 비교 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCompareModal(true)}
          >
            <GitCompare className="h-4 w-4 mr-2" />
            버전 비교
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFeedbackPanel(!showFeedbackPanel)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {showFeedbackPanel ? '피드백 숨기기' : '피드백 보기'}
          </Button>
          {video.file_url && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isDownloadProcessing}>
                  {isDownloadProcessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {isDownloadProcessing ? `${downloadProgress}%` : '다운로드'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href={video.file_url} download={video.original_filename}>
                    원본 다운로드
                  </a>
                </DropdownMenuItem>
                {video.watermark_enabled !== false && watermarkSettings && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        if (video.file_url && watermarkSettings) {
                          downloadWithWatermark(
                            video.file_url,
                            video.original_filename,
                            {
                              text: watermarkSettings.type === 'text' || watermarkSettings.type === 'combined' ? watermarkSettings.text || 'NAVIG' : undefined,
                              logoUrl: watermarkSettings.type === 'logo' ? watermarkSettings.logo_url || undefined : undefined,
                              position: watermarkSettings.position,
                              opacity: watermarkSettings.opacity,
                            }
                          );
                        }
                      }}
                    >
                      워터마크 포함 다운로드
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex gap-4 h-[calc(100%-4rem)]">
        {/* 비디오 플레이어 */}
        <div
          className={cn(
            'flex-1 flex flex-col bg-black rounded-lg overflow-hidden',
            showFeedbackPanel ? 'lg:flex-[2]' : ''
          )}
        >
          {/* Stream 인코딩 중인 경우 */}
          {video.hls_url && !video.stream_ready ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-white">
                <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin opacity-70" />
                <p className="text-lg font-medium mb-2">영상 인코딩 중...</p>
                <p className="text-sm text-gray-400">잠시 후 다시 시도해주세요</p>
              </div>
            </div>
          ) : (video.file_url || (video.hls_url && video.stream_ready)) ? (
            <>
              {/* 영상 + 워터마크 래퍼 */}
              <div
                ref={videoContainerRef}
                className="flex-1 relative min-h-0"
                onMouseMove={handleMouseMove}
              >
                <video
                  ref={videoRef}
                  src={video.file_url || undefined}
                  poster={video.thumbnail_url || undefined}
                  controls={false}
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain cursor-pointer"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={handlePlayPause}
                />

                {/* 워터마크 오버레이 - 영상 위에만 겹침 */}
                <canvas
                  ref={watermarkCanvasRef}
                  className="absolute inset-0 pointer-events-none"
                />

                {/* 커스텀 컨트롤바 (네이티브 컨트롤 대신) */}
                <div
                  className={cn(
                    'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 py-3 transition-opacity duration-300 z-10',
                    showControls && !isDrawingMode ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  )}
                >
                  {/* 프로그레스 바 */}
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer mb-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #8B5CF6 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.3) ${(currentTime / (duration || 1)) * 100}%)`,
                    }}
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* 재생/일시정지 버튼 */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePlayPause}
                        className="h-8 w-8 text-white hover:bg-white/20"
                      >
                        {isPlaying ? (
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </Button>

                      {/* 시간 표시 */}
                      <span className="text-white text-sm font-mono">
                        {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
                      </span>
                    </div>

                    {/* 전체화면 버튼 */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleToggleFullscreen}
                      className="h-8 w-8 text-white hover:bg-white/20"
                      title={isFullscreen ? '전체화면 종료' : '전체화면'}
                    >
                      {isFullscreen ? (
                        <Minimize className="h-5 w-5" />
                      ) : (
                        <Maximize className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* 중앙 재생 버튼 (일시정지 상태) */}
                {!isPlaying && !isDrawingMode && showControls && (
                  <div
                    className="absolute inset-0 flex items-center justify-center cursor-pointer"
                    onClick={handlePlayPause}
                  >
                    <div className="w-16 h-16 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-xl transition-all hover:scale-110">
                      <svg className="h-8 w-8 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* 그리기 모드 오버레이 */}
                {isDrawingMode && videoSize.width > 0 && (
                  <div className="absolute inset-0 bg-black/20" style={{ zIndex: 20 }}>
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
              </div>
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
          <div className="p-4 bg-gray-900 text-white shrink-0">
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

      {/* 워터마크 다운로드 처리 중 오버레이 */}
      {isDownloadProcessing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="text-center">
              <Loader2 className="h-10 w-10 text-primary-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                워터마크 처리 중
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                영상에 워터마크를 합성하고 있습니다.
                <br />
                영상 길이에 따라 시간이 소요될 수 있습니다.
              </p>
              <Progress value={downloadProgress} className="h-2 mb-4" />
              <p className="text-sm font-medium text-gray-700 mb-4">
                {downloadProgress}% 완료
              </p>
              <Button variant="outline" onClick={cancelDownload}>
                취소
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 버전 비교 모달 */}
      <VideoCompareModal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        projectId={resolvedParams.id}
        currentVideoId={video.id}
      />
    </div>
  );
}
