'use client';

/**
 * 영상 플레이어 컴포넌트
 *
 * 기능:
 * - HLS 적응형 스트리밍 (Cloudflare Stream)
 * - 일반 MP4 재생 (R2 폴백)
 * - 워터마크 오버레이 지원
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  Settings,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/types/video';
import type { WatermarkSettings } from '@/types/watermark';

interface VideoPlayerProps {
  // HLS URL (Cloudflare Stream) 또는 MP4 URL
  src: string;
  // HLS URL이 별도로 제공되는 경우 (src가 MP4이고 hlsSrc가 HLS일 때)
  hlsSrc?: string;
  poster?: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  // 외부에서 재생 상태 제어 (비교 모드용)
  externalTime?: number;
  onTimeUpdate?: (time: number) => void;
  // 워터마크 설정 (클라이언트 측 워터마크, Stream은 서버측 워터마크 사용)
  watermark?: WatermarkSettings;
}

export function VideoPlayer({
  src,
  hlsSrc,
  poster,
  title,
  className,
  autoPlay = false,
  onEnded,
  externalTime,
  onTimeUpdate,
  watermark,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHlsSupported, setIsHlsSupported] = useState(false);
  const [availableQualities, setAvailableQualities] = useState<{ height: number; level: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 = Auto

  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // HLS URL 결정 (hlsSrc가 있으면 사용, 없으면 src가 m3u8인지 확인)
  const effectiveHlsSrc = hlsSrc || (src.includes('.m3u8') ? src : null);
  const isHlsStream = !!effectiveHlsSrc;

  // HLS 초기화
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // 기존 HLS 인스턴스 정리
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHlsStream && effectiveHlsSrc) {
      if (Hls.isSupported()) {
        setIsHlsSupported(true);
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          // 적응형 비트레이트 설정
          abrEwmaDefaultEstimate: 500000, // 초기 대역폭 추정 (500kbps)
          abrBandWidthFactor: 0.95,
          abrBandWidthUpFactor: 0.7,
        });

        hls.loadSource(effectiveHlsSrc);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          // 사용 가능한 품질 목록 추출
          const qualities = data.levels.map((level, index) => ({
            height: level.height,
            level: index,
          }));
          setAvailableQualities(qualities);

          if (autoPlay) {
            video.play().catch(() => {
              // 자동 재생 실패 시 무시
            });
          }
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          setCurrentQuality(data.level);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('[VideoPlayer] HLS 에러:', data);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari 네이티브 HLS 지원
        video.src = effectiveHlsSrc;
        setIsHlsSupported(true);
      }
    } else {
      // 일반 MP4
      video.src = src;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, effectiveHlsSrc, isHlsStream, autoPlay]);

  // 품질 변경
  const handleQualityChange = useCallback((level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level; // -1 = Auto
      setCurrentQuality(level);
    }
  }, []);

  // 워터마크 위치 계산
  const getWatermarkPosition = useCallback(
    (
      position: string,
      canvasWidth: number,
      canvasHeight: number,
      textWidth: number,
      textHeight: number
    ) => {
      const padding = 20;
      switch (position) {
        case 'top-left':
          return { x: padding, y: padding + textHeight };
        case 'top-right':
          return { x: canvasWidth - textWidth - padding, y: padding + textHeight };
        case 'bottom-left':
          return { x: padding, y: canvasHeight - padding };
        case 'bottom-right':
          return { x: canvasWidth - textWidth - padding, y: canvasHeight - padding };
        case 'center':
          return { x: (canvasWidth - textWidth) / 2, y: canvasHeight / 2 };
        default:
          return { x: canvasWidth - textWidth - padding, y: canvasHeight - padding };
      }
    },
    []
  );

  // 워터마크 렌더링
  const renderWatermark = useCallback(() => {
    if (!watermark?.enabled || !canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 크기를 비디오에 맞춤
    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 워터마크 텍스트 구성
    let watermarkText = '';
    if (watermark.type === 'text' || watermark.type === 'combined') {
      watermarkText = watermark.text || '검토용';
    }
    if (watermark.type === 'timecode' || watermark.type === 'combined' || watermark.show_timecode) {
      const timecode = formatDuration(video.currentTime);
      if (watermarkText) {
        watermarkText += `  ${timecode}`;
      } else {
        watermarkText = timecode;
      }
    }

    if (!watermarkText && watermark.type !== 'logo') return;

    // 폰트 설정
    const fontSize = Math.max(14, Math.min(24, canvas.width / 40));
    ctx.font = `${fontSize}px "Pretendard", sans-serif`;
    ctx.globalAlpha = watermark.opacity;

    // 텍스트 크기 측정
    const metrics = ctx.measureText(watermarkText);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    // 위치 계산
    const { x, y } = getWatermarkPosition(
      watermark.position,
      canvas.width,
      canvas.height,
      textWidth,
      textHeight
    );

    // 텍스트 그림자 (가독성 향상)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeText(watermarkText, x, y);

    // 텍스트 그리기
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(watermarkText, x, y);

    // 애니메이션 프레임 요청 (재생 중일 때만)
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(renderWatermark);
    }
  }, [watermark, isPlaying, getWatermarkPosition]);

  // 워터마크 애니메이션 시작/중지
  useEffect(() => {
    if (watermark?.enabled && isPlaying) {
      renderWatermark();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [watermark, isPlaying, renderWatermark]);

  // 워터마크 초기 렌더링 (일시정지 상태에서도 보이도록)
  useEffect(() => {
    if (watermark?.enabled && !isPlaying) {
      renderWatermark();
    }
  }, [watermark, isPlaying, currentTime, renderWatermark]);

  // 외부 시간 동기화 (비교 모드)
  useEffect(() => {
    if (externalTime !== undefined && videoRef.current) {
      const diff = Math.abs(videoRef.current.currentTime - externalTime);
      if (diff > 0.5) {
        videoRef.current.currentTime = externalTime;
      }
    }
  }, [externalTime]);

  // 메타데이터 로드
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  // 시간 업데이트
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      onTimeUpdate?.(videoRef.current.currentTime);
    }
  }, [onTimeUpdate]);

  // 재생/일시정지 토글
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  // 음소거 토글
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // 볼륨 변경
  const handleVolumeChange = useCallback((value: number[]) => {
    if (videoRef.current) {
      const newVolume = value[0];
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  }, []);

  // 시크
  const handleSeek = useCallback((value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  }, []);

  // 5초 뒤로
  const skipBackward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
    }
  }, []);

  // 5초 앞으로
  const skipForward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        duration,
        videoRef.current.currentTime + 5
      );
    }
  }, [duration]);

  // 전체화면 토글
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('전체화면 전환 실패:', error);
    }
  }, [isFullscreen]);

  // 전체화면 상태 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 컨트롤 자동 숨김
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

  // 마우스 움직임 감지
  const handleMouseMove = useCallback(() => {
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 무시
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'm':
          toggleMute();
          break;
        case 'ArrowLeft':
          skipBackward();
          break;
        case 'ArrowRight':
          skipForward();
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleMute, skipBackward, skipForward, toggleFullscreen]);

  // 정리
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-black rounded-lg overflow-hidden group',
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* 비디오 */}
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain"
        autoPlay={autoPlay}
        playsInline
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
      />

      {/* 워터마크 오버레이 */}
      {watermark?.enabled && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        />
      )}

      {/* 중앙 재생 버튼 */}
      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
            <Play className="h-8 w-8 text-gray-900 ml-1" />
          </div>
        </div>
      )}

      {/* 컨트롤 바 */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300',
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* 제목 */}
        {title && (
          <p className="text-white text-sm font-medium mb-2 truncate">
            {title}
          </p>
        )}

        {/* 진행 바 */}
        <div className="mb-3">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="w-full"
          />
        </div>

        {/* 컨트롤 버튼 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* 재생/일시정지 */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            {/* 5초 뒤로 */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={skipBackward}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            {/* 5초 앞으로 */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={skipForward}
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            {/* 볼륨 */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={toggleMute}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-20"
              />
            </div>

            {/* 시간 */}
            <span className="text-white text-xs ml-2">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 품질 선택 (HLS 스트리밍일 때만) */}
            {isHlsSupported && availableQualities.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[120px]">
                  <DropdownMenuItem
                    onClick={() => handleQualityChange(-1)}
                    className={cn(currentQuality === -1 && 'bg-primary-100')}
                  >
                    자동
                  </DropdownMenuItem>
                  {availableQualities
                    .sort((a, b) => b.height - a.height)
                    .map((quality) => (
                      <DropdownMenuItem
                        key={quality.level}
                        onClick={() => handleQualityChange(quality.level)}
                        className={cn(currentQuality === quality.level && 'bg-primary-100')}
                      >
                        {quality.height}p
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* 전체화면 */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={toggleFullscreen}
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
