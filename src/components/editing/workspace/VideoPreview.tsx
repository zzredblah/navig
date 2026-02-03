'use client';

import { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { useEditWorkspaceStore } from '@/stores/edit-workspace-store';
import { TextOverlayRenderer } from './overlays/TextOverlayRenderer';
import { Play, Pause, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    videoUrl,
    videoDuration,
    currentTime,
    isPlaying,
    metadata,
    setCurrentTime,
    setIsPlaying,
  } = useEditWorkspaceStore();

  // HLS 또는 일반 비디오 로드
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    setError(null);
    setIsVideoReady(false);

    // 이전 HLS 인스턴스 정리
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = videoUrl.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsVideoReady(true);
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError('영상을 불러올 수 없습니다');
        }
      });
      hlsRef.current = hls;
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari 네이티브 HLS
      video.src = videoUrl;
      video.addEventListener('loadedmetadata', () => setIsVideoReady(true), { once: true });
    } else {
      // 일반 비디오
      video.src = videoUrl;
      video.addEventListener('loadedmetadata', () => setIsVideoReady(true), { once: true });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoUrl]);

  // 재생/정지 상태 동기화
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideoReady) return;

    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying, isVideoReady, setIsPlaying]);

  // 현재 시간 업데이트
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideoReady) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;

      // 트림 범위 체크
      if (metadata.trim) {
        if (time < metadata.trim.startTime) {
          video.currentTime = metadata.trim.startTime;
          return;
        }
        if (time >= metadata.trim.endTime) {
          video.currentTime = metadata.trim.startTime;
          setIsPlaying(false);
          return;
        }
      }

      setCurrentTime(time);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [isVideoReady, metadata.trim, setCurrentTime, setIsPlaying]);

  // 외부에서 currentTime 변경 시 비디오 시크
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideoReady) return;

    if (Math.abs(video.currentTime - currentTime) > 0.5) {
      video.currentTime = currentTime;
    }
  }, [currentTime, isVideoReady]);

  // 속도 적용
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = metadata.speed;
  }, [metadata.speed]);

  // 볼륨/음소거 적용
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = metadata.audio.volume / 100;
    video.muted = metadata.audio.muted;
  }, [metadata.audio]);

  // CSS 필터 생성
  const getFilterStyle = () => {
    const f = metadata.filters;
    return {
      filter: `
        brightness(${f.brightness}%)
        contrast(${f.contrast}%)
        saturate(${f.saturation}%)
        grayscale(${f.grayscale}%)
      `.trim(),
    };
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  if (!videoUrl) {
    return (
      <div className="flex flex-col items-center justify-center text-gray-400">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p>영상이 없습니다</p>
        <p className="text-sm mt-1">영상을 업로드하거나 선택해주세요</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-red-400">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative max-w-full max-h-full aspect-video bg-black rounded-lg overflow-hidden"
    >
      {/* 비디오 */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        style={getFilterStyle()}
        playsInline
        onClick={handlePlayPause}
      />

      {/* 텍스트 오버레이 */}
      <TextOverlayRenderer
        overlays={metadata.textOverlays}
        currentTime={currentTime}
      />

      {/* 재생 버튼 오버레이 (정지 상태일 때) */}
      {!isPlaying && isVideoReady && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
          onClick={handlePlayPause}
        >
          <Button
            size="lg"
            variant="secondary"
            className="rounded-full w-16 h-16"
          >
            <Play className="h-8 w-8 ml-1" />
          </Button>
        </div>
      )}

      {/* 로딩 */}
      {!isVideoReady && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
