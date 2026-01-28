'use client';

/**
 * 영상 버전 비교 모달 (통합)
 *
 * 다양한 비교 모드 지원:
 * - 슬라이더: 좌우 드래그로 비교
 * - 나란히: 두 영상을 병렬 배치
 * - 오버레이: 투명도 조절로 겹쳐 비교
 * - 와이프: 대각선 와이프 효과
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Loader2,
  AlertCircle,
  GitCompare,
  X,
  Calendar,
  HardDrive,
  Clock,
  FileVideo,
  ArrowRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Link2,
  Link2Off,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SliderCompare } from './compare/SliderCompare';
import { SideBySideCompare } from './compare/SideBySideCompare';
import { OverlayCompare } from './compare/OverlayCompare';
import { WipeCompare } from './compare/WipeCompare';
import { VideoVersionWithUploader, formatDuration } from '@/types/video';
import { cn } from '@/lib/utils';

type ModalMode = 'direct' | 'select';
type CompareMode = 'slider' | 'side-by-side' | 'overlay' | 'wipe';

interface VideoCompareModalProps {
  // 방식 1: 직접 영상 전달 (영상 버전관리 페이지)
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  video1?: VideoVersionWithUploader | null;
  video2?: VideoVersionWithUploader | null;
  // 방식 2: projectId로 선택 (영상 상세 페이지)
  isOpen?: boolean;
  onClose?: () => void;
  projectId?: string;
  currentVideoId?: string;
}

export function VideoCompareModal({
  // 방식 1
  open,
  onOpenChange,
  video1: directVideo1,
  video2: directVideo2,
  // 방식 2
  isOpen,
  onClose,
  projectId,
  currentVideoId,
}: VideoCompareModalProps) {
  // 모드 결정
  const mode: ModalMode = directVideo1 && directVideo2 ? 'direct' : 'select';
  const isModalOpen = mode === 'direct' ? open : isOpen;

  const [versions, setVersions] = useState<VideoVersionWithUploader[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [leftVersionId, setLeftVersionId] = useState<string>('');
  const [rightVersionId, setRightVersionId] = useState<string>('');
  const [compareMode, setCompareMode] = useState<CompareMode>('slider');

  // 비디오 플레이어 상태
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 오디오 상태
  const [leftMuted, setLeftMuted] = useState(false);
  const [rightMuted, setRightMuted] = useState(true); // 기본적으로 오른쪽은 음소거
  const [leftVolume, setLeftVolume] = useState(1);
  const [rightVolume, setRightVolume] = useState(1);

  // 전체화면 상태
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 직접 전달된 영상 또는 선택된 영상
  const leftVideo = mode === 'direct' ? directVideo1 : versions.find((v) => v.id === leftVersionId);
  const rightVideo = mode === 'direct' ? directVideo2 : versions.find((v) => v.id === rightVersionId);

  // 모달 닫기 핸들러
  const handleClose = useCallback(() => {
    if (mode === 'direct' && onOpenChange) {
      onOpenChange(false);
    } else if (onClose) {
      onClose();
    }
  }, [mode, onOpenChange, onClose]);

  // 버전 목록 조회 (select 모드)
  useEffect(() => {
    if (mode !== 'select' || !isOpen || !projectId) return;

    async function fetchVersions() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/projects/${projectId}/videos?all=true`);
        if (response.ok) {
          const data = await response.json();
          const versionList = data.videos || [];
          setVersions(versionList);

          // 기본 선택 설정
          if (versionList.length >= 2) {
            if (currentVideoId) {
              const currentIndex = versionList.findIndex(
                (v: VideoVersionWithUploader) => v.id === currentVideoId
              );
              if (currentIndex >= 0) {
                setRightVersionId(currentVideoId);
                const prevVersion = versionList[currentIndex + 1] || versionList[0];
                if (prevVersion.id !== currentVideoId) {
                  setLeftVersionId(prevVersion.id);
                } else if (versionList.length > 1) {
                  setLeftVersionId(versionList[1].id);
                }
              }
            } else {
              setLeftVersionId(versionList[1]?.id || '');
              setRightVersionId(versionList[0]?.id || '');
            }
          }
        } else {
          setError('버전 목록을 불러올 수 없습니다.');
        }
      } catch {
        setError('서버 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchVersions();
  }, [mode, isOpen, projectId, currentVideoId]);

  // 직접 전달 모드에서 영상이 변경되면 버전 ID 동기화
  useEffect(() => {
    if (mode === 'direct') {
      if (directVideo1) setLeftVersionId(directVideo1.id);
      if (directVideo2) setRightVersionId(directVideo2.id);
    }
  }, [mode, directVideo1, directVideo2]);

  // 버전이 2개 미만인지 체크
  const hasEnoughVersions =
    mode === 'direct' ? !!(directVideo1 && directVideo2) : versions.length >= 2;

  // 비교 모드 설정
  const modeOptions: { value: CompareMode; label: string }[] = [
    { value: 'slider', label: '슬라이더' },
    { value: 'side-by-side', label: '나란히 보기' },
    { value: 'overlay', label: '겹쳐 보기' },
    { value: 'wipe', label: '와이프' },
  ];

  // 재생/정지 토글
  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // 시간 이동
  const handleSeek = useCallback((value: number[]) => {
    setCurrentTime(value[0]);
  }, []);

  // 5초 뒤로
  const skipBackward = useCallback(() => {
    setCurrentTime((prev) => Math.max(0, prev - 5));
  }, []);

  // 5초 앞으로
  const skipForward = useCallback(() => {
    setCurrentTime((prev) => Math.min(duration, prev + 5));
  }, [duration]);

  // 동기화 토글
  const toggleSync = useCallback(() => {
    setSyncEnabled((prev) => !prev);
  }, []);

  // 전체화면 토글
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
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

  // 왼쪽 영상 음소거 토글
  const toggleLeftMute = useCallback(() => {
    setLeftMuted((prev) => !prev);
  }, []);

  // 오른쪽 영상 음소거 토글
  const toggleRightMute = useCallback(() => {
    setRightMuted((prev) => !prev);
  }, []);

  // 컨트롤 표시/숨김 타이머 리셋
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

  // 마우스 이동 시 컨트롤 표시
  const handleMouseMove = useCallback(() => {
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  // 마우스가 영역을 벗어나면 재생 중일 때 컨트롤 숨김
  const handleMouseLeave = useCallback(() => {
    if (isPlaying) {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 500);
    }
  }, [isPlaying]);

  // 재생 상태 변경 시 컨트롤 타이머 업데이트
  useEffect(() => {
    if (isPlaying) {
      resetControlsTimeout();
    } else {
      // 일시정지 시 컨트롤 계속 표시
      setShowControls(true);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    }
  }, [isPlaying, resetControlsTimeout]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);

  // 시간 포맷
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 키보드 단축키
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, togglePlay, skipBackward, skipForward]);

  // 공통 props for compare components
  const compareProps = {
    leftVideo: {
      url: leftVideo?.file_url || '',
      label: leftVideo ? `v${leftVideo.version_number}` : '',
    },
    rightVideo: {
      url: rightVideo?.file_url || '',
      label: rightVideo ? `v${rightVideo.version_number}` : '',
    },
    currentTime,
    isPlaying,
    onTimeUpdate: setCurrentTime,
    onDurationChange: setDuration,
    syncEnabled,
    // 오디오 설정
    leftMuted,
    rightMuted,
    leftVolume,
    rightVolume,
  };

  return (
    <Dialog
      open={isModalOpen}
      onOpenChange={(open) => !open && handleClose()}
    >
      <DialogContent
        className="max-w-6xl w-[95vw] max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden [&>button]:hidden"
      >
        {/* 접근성을 위한 숨겨진 제목 */}
        <VisuallyHidden>
          <DialogTitle>영상 버전 비교</DialogTitle>
        </VisuallyHidden>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-primary-500/20">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">버전 비교</h2>
              {leftVideo && rightVideo && (
                <p className="text-sm text-gray-500">
                  v{leftVideo.version_number}
                  {leftVideo.version_name && ` (${leftVideo.version_name})`}
                  <span className="mx-2 text-gray-300">→</span>
                  v{rightVideo.version_number}
                  {rightVideo.version_name && ` (${rightVideo.version_name})`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 버전 선택 (select 모드) */}
            {mode === 'select' && !isLoading && versions.length >= 2 && (
              <div className="flex items-center gap-2">
                <Select value={leftVersionId} onValueChange={setLeftVersionId}>
                  <SelectTrigger className="w-36 h-9">
                    <SelectValue placeholder="이전 버전" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem
                        key={v.id}
                        value={v.id}
                        disabled={v.id === rightVersionId}
                      >
                        v{v.version_number} {v.version_name && `(${v.version_name})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <ArrowRight className="h-4 w-4 text-gray-400" />

                <Select value={rightVersionId} onValueChange={setRightVersionId}>
                  <SelectTrigger className="w-36 h-9">
                    <SelectValue placeholder="현재 버전" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem
                        key={v.id}
                        value={v.id}
                        disabled={v.id === leftVersionId}
                      >
                        v{v.version_number} {v.version_name && `(${v.version_name})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 비교 모드 선택 */}
            {hasEnoughVersions && !isLoading && (
              <Select value={compareMode} onValueChange={(v) => setCompareMode(v as CompareMode)}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* 닫기 버튼 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-9 w-9 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden bg-gray-950 flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary-400 mx-auto mb-4" />
                <p className="text-gray-400">버전 목록을 불러오는 중...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <AlertCircle className="h-16 w-16 text-red-400" />
              <p className="text-gray-300 text-lg">{error}</p>
              <Button variant="outline" onClick={handleClose}>
                닫기
              </Button>
            </div>
          ) : !hasEnoughVersions ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-gray-500" />
              </div>
              <p className="text-gray-300 text-lg">비교할 버전이 2개 이상 필요합니다.</p>
              <p className="text-gray-500 text-sm">영상을 더 업로드해 주세요.</p>
              <Button variant="outline" onClick={handleClose} className="mt-2">
                닫기
              </Button>
            </div>
          ) : leftVideo?.file_url && rightVideo?.file_url ? (
            <>
              {/* 비교 영역 + 오버레이 컨트롤 */}
              <div
                className="flex-1 min-h-0 flex items-center justify-center p-4 relative"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <div className="w-full h-full max-w-[calc((100vh-300px)*16/9)] flex items-center justify-center relative">
                  {compareMode === 'slider' && <SliderCompare {...compareProps} />}
                  {compareMode === 'side-by-side' && <SideBySideCompare {...compareProps} />}
                  {compareMode === 'overlay' && <OverlayCompare {...compareProps} />}
                  {compareMode === 'wipe' && <WipeCompare {...compareProps} />}

                  {/* 중앙 플레이 버튼 (일시정지 상태에서 표시) */}
                  {!isPlaying && (
                    <div
                      className="absolute inset-0 flex items-center justify-center cursor-pointer z-10"
                      onClick={togglePlay}
                    >
                      <div className="w-20 h-20 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-2xl transition-all hover:scale-110">
                        <Play className="h-10 w-10 text-gray-900 ml-1" />
                      </div>
                    </div>
                  )}

                  {/* 오버레이 컨트롤바 */}
                  <div
                    className={cn(
                      "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 pt-12 transition-opacity duration-300 z-20",
                      showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {/* 재생/정지 버튼 */}
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={skipBackward}
                                className="h-8 w-8 text-white hover:bg-white/20"
                              >
                                <SkipBack className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>5초 뒤로 (←)</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={togglePlay}
                          className="h-10 w-10 text-white hover:bg-white/20 rounded-full bg-white/10"
                        >
                          {isPlaying ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5 ml-0.5" />
                          )}
                        </Button>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={skipForward}
                                className="h-8 w-8 text-white hover:bg-white/20"
                              >
                                <SkipForward className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>5초 앞으로 (→)</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      {/* 시간 표시 */}
                      <span className="text-white text-sm font-mono min-w-[80px]">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>

                      {/* 프로그레스 바 */}
                      <div className="flex-1">
                        <Slider
                          value={[currentTime]}
                          onValueChange={handleSeek}
                          min={0}
                          max={duration || 100}
                          step={0.1}
                          className="cursor-pointer"
                        />
                      </div>

                      {/* 왼쪽 영상 볼륨 */}
                      <div className="flex items-center gap-1 group/vol-left">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleLeftMute}
                                className={cn(
                                  "h-8 w-8 hover:bg-white/20",
                                  !leftMuted ? "text-blue-400" : "text-gray-400"
                                )}
                              >
                                {leftMuted ? (
                                  <VolumeX className="h-4 w-4" />
                                ) : (
                                  <Volume2 className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {leftVideo ? `v${leftVideo.version_number}` : '이전'} {leftMuted ? '음소거 해제' : '음소거'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <div className="w-0 overflow-hidden group-hover/vol-left:w-16 transition-all duration-200">
                          <Slider
                            value={[leftVolume]}
                            onValueChange={([v]) => setLeftVolume(v)}
                            min={0}
                            max={1}
                            step={0.05}
                            className="w-14"
                            disabled={leftMuted}
                          />
                        </div>
                      </div>

                      {/* 오른쪽 영상 볼륨 */}
                      <div className="flex items-center gap-1 group/vol-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleRightMute}
                                className={cn(
                                  "h-8 w-8 hover:bg-white/20",
                                  !rightMuted ? "text-purple-400" : "text-gray-400"
                                )}
                              >
                                {rightMuted ? (
                                  <VolumeX className="h-4 w-4" />
                                ) : (
                                  <Volume2 className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {rightVideo ? `v${rightVideo.version_number}` : '현재'} {rightMuted ? '음소거 해제' : '음소거'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <div className="w-0 overflow-hidden group-hover/vol-right:w-16 transition-all duration-200">
                          <Slider
                            value={[rightVolume]}
                            onValueChange={([v]) => setRightVolume(v)}
                            min={0}
                            max={1}
                            step={0.05}
                            className="w-14"
                            disabled={rightMuted}
                          />
                        </div>
                      </div>

                      {/* 동기화 토글 */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={toggleSync}
                              className={cn(
                                "h-8 w-8 hover:bg-white/20",
                                syncEnabled ? "text-primary-400" : "text-gray-400"
                              )}
                            >
                              {syncEnabled ? (
                                <Link2 className="h-4 w-4" />
                              ) : (
                                <Link2Off className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {syncEnabled ? '영상 동기화 켜짐' : '영상 동기화 꺼짐'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* 전체화면 토글 */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={toggleFullscreen}
                              className="h-8 w-8 text-white hover:bg-white/20"
                            >
                              {isFullscreen ? (
                                <Minimize className="h-4 w-4" />
                              ) : (
                                <Maximize className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isFullscreen ? '전체화면 종료' : '전체화면'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">
                  선택한 버전의 영상 파일을 사용할 수 없습니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 - 컴팩트한 버전 비교 */}
        {leftVideo && rightVideo && !isLoading && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-3">
              {/* 버전 비교 - AS IS / TO BE */}
              <div className="flex items-center gap-2 shrink-0">
                {/* AS IS */}
                <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 min-w-[140px]">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-1.5 py-0">
                      v{leftVideo.version_number}
                    </Badge>
                    <span className="text-[10px] text-gray-400 uppercase">이전</span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">길이</span>
                      <span>{leftVideo.duration ? formatDuration(leftVideo.duration) : '--:--'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">용량</span>
                      <span>{formatFileSize(leftVideo.file_size)}</span>
                    </div>
                    {leftVideo.resolution && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">해상도</span>
                        <span>{leftVideo.resolution}</span>
                      </div>
                    )}
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />

                {/* TO BE */}
                <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 min-w-[140px]">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-1.5 py-0">
                      v{rightVideo.version_number}
                    </Badge>
                    <span className="text-[10px] text-gray-400 uppercase">현재</span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">길이</span>
                      <span>{rightVideo.duration ? formatDuration(rightVideo.duration) : '--:--'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">용량</span>
                      <span>{formatFileSize(rightVideo.file_size)}</span>
                    </div>
                    {rightVideo.resolution && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">해상도</span>
                        <span>{rightVideo.resolution}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 변경 요약 - 확장된 정보 */}
              <div className="flex-1 bg-white rounded-lg border border-gray-200 px-3 py-2 overflow-hidden">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">변경 요약</h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                  {/* 길이 변화 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">길이</span>
                    <span className={cn(
                      "font-medium",
                      getDurationDiff(leftVideo.duration, rightVideo.duration) === 0
                        ? "text-gray-600"
                        : getDurationDiff(leftVideo.duration, rightVideo.duration) > 0
                          ? "text-green-600"
                          : "text-red-600"
                    )}>
                      {formatDurationDiff(leftVideo.duration, rightVideo.duration)}
                    </span>
                  </div>

                  {/* 용량 변화 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">용량</span>
                    <span className={cn(
                      "font-medium",
                      getSizeDiff(leftVideo.file_size, rightVideo.file_size) === 0
                        ? "text-gray-600"
                        : getSizeDiff(leftVideo.file_size, rightVideo.file_size) > 0
                          ? "text-orange-600"
                          : "text-green-600"
                    )}>
                      {formatFileSizeDiff(leftVideo.file_size, rightVideo.file_size)}
                    </span>
                  </div>

                  {/* 해상도 변화 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">해상도</span>
                    <span className={cn(
                      "font-medium",
                      leftVideo.resolution === rightVideo.resolution
                        ? "text-gray-600"
                        : "text-blue-600"
                    )}>
                      {getResolutionChange(leftVideo.resolution, rightVideo.resolution)}
                    </span>
                  </div>

                  {/* 코덱 변화 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">코덱</span>
                    <span className={cn(
                      "font-medium",
                      leftVideo.codec === rightVideo.codec
                        ? "text-gray-600"
                        : "text-blue-600"
                    )}>
                      {getCodecChange(leftVideo.codec, rightVideo.codec)}
                    </span>
                  </div>

                  {/* 업로드 간격 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">업로드 간격</span>
                    <span className="font-medium text-gray-600">
                      {getTimeDiff(leftVideo.created_at, rightVideo.created_at)}
                    </span>
                  </div>

                  {/* 파일명 변화 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">파일명</span>
                    <span className={cn(
                      "font-medium truncate max-w-[80px]",
                      leftVideo.original_filename === rightVideo.original_filename
                        ? "text-gray-600"
                        : "text-blue-600"
                    )} title={rightVideo.original_filename}>
                      {leftVideo.original_filename === rightVideo.original_filename
                        ? "동일"
                        : "변경됨"}
                    </span>
                  </div>

                  {/* 업로더 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">업로더</span>
                    <span className={cn(
                      "font-medium truncate max-w-[80px]",
                      leftVideo.uploader?.id === rightVideo.uploader?.id
                        ? "text-gray-600"
                        : "text-purple-600"
                    )} title={rightVideo.uploader?.name || '알 수 없음'}>
                      {leftVideo.uploader?.id === rightVideo.uploader?.id
                        ? "동일"
                        : rightVideo.uploader?.name || '변경됨'}
                    </span>
                  </div>

                  {/* 버전명 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">버전명</span>
                    <span className="font-medium text-gray-600 truncate max-w-[80px]" title={rightVideo.version_name || ''}>
                      {rightVideo.version_name || '-'}
                    </span>
                  </div>
                </div>

                {/* 변경 노트 */}
                {rightVideo.change_notes && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <span className="text-[10px] text-gray-400 uppercase">변경 노트</span>
                    <p className="text-xs text-gray-700 line-clamp-2 mt-0.5">
                      {rightVideo.change_notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// 버전 정보 카드 컴포넌트
function VersionInfoCard({
  video,
  label,
  color
}: {
  video: VideoVersionWithUploader;
  label: string;
  color: 'blue' | 'purple';
}) {
  const colorStyles = {
    blue: {
      badge: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: 'text-blue-500',
    },
    purple: {
      badge: 'bg-purple-100 text-purple-700 border-purple-200',
      icon: 'text-purple-500',
    },
  };

  const styles = colorStyles[color];

  return (
    <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline" className={styles.badge}>
          v{video.version_number}
        </Badge>
        <span className="text-xs text-gray-500">{label}</span>
      </div>

      {video.version_name && (
        <p className="text-sm font-medium text-gray-900 mb-2 truncate">
          {video.version_name}
        </p>
      )}

      <div className="space-y-1.5 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Clock className={cn("h-3.5 w-3.5", styles.icon)} />
          <span>{video.duration ? formatDuration(video.duration) : '--:--'}</span>
        </div>
        <div className="flex items-center gap-2">
          <HardDrive className={cn("h-3.5 w-3.5", styles.icon)} />
          <span>{formatFileSize(video.file_size)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className={cn("h-3.5 w-3.5", styles.icon)} />
          <span>{new Date(video.created_at).toLocaleDateString('ko-KR')}</span>
        </div>
      </div>
    </div>
  );
}

// 유틸 함수들
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getSizeDiff(size1: number, size2: number): number {
  return size2 - size1;
}

function formatFileSizeDiff(size1: number, size2: number): string {
  const diff = size2 - size1;
  const absDiff = Math.abs(diff);

  if (absDiff < 1024) return diff === 0 ? '동일' : `${diff > 0 ? '+' : ''}${diff} B`;
  if (absDiff < 1024 * 1024)
    return `${diff > 0 ? '+' : ''}${(diff / 1024).toFixed(1)} KB`;
  return `${diff > 0 ? '+' : ''}${(diff / (1024 * 1024)).toFixed(1)} MB`;
}

function getDurationDiff(duration1: number | null, duration2: number | null): number {
  if (!duration1 || !duration2) return 0;
  return duration2 - duration1;
}

function formatDurationDiff(duration1: number | null, duration2: number | null): string {
  if (!duration1 || !duration2) return '--';

  const diff = duration2 - duration1;
  const absDiff = Math.abs(diff);

  const mins = Math.floor(absDiff / 60);
  const secs = Math.floor(absDiff % 60);

  if (diff === 0) return '동일';
  const formatted = mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`;
  return diff > 0 ? `+${formatted}` : `-${formatted}`;
}

function getResolutionChange(res1: string | null, res2: string | null): string {
  if (!res1 && !res2) return '--';
  if (!res1) return res2 || '--';
  if (!res2) return '--';
  if (res1 === res2) return '동일';

  // 해상도 파싱 (예: "1920x1080")
  const parse = (r: string) => {
    const [w, h] = r.split('x').map(Number);
    return w * h;
  };

  const pixels1 = parse(res1);
  const pixels2 = parse(res2);

  if (pixels2 > pixels1) return '↑ 향상';
  if (pixels2 < pixels1) return '↓ 감소';
  return '변경됨';
}

function getCodecChange(codec1: string | null, codec2: string | null): string {
  if (!codec1 && !codec2) return '--';
  if (!codec1) return codec2 || '--';
  if (!codec2) return '--';
  if (codec1 === codec2) return '동일';
  return '변경됨';
}

function getTimeDiff(date1: string, date2: string): string {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = d2.getTime() - d1.getTime();

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) return `${diffDays}일`;
  if (diffHours > 0) return `${diffHours}시간`;
  if (diffMins > 0) return `${diffMins}분`;
  return '즉시';
}
