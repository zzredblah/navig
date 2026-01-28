'use client';

import { useRef, useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface OverlayCompareProps {
  leftVideo: { url: string; label: string };
  rightVideo: { url: string; label: string };
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  syncEnabled: boolean;
}

export function OverlayCompare({
  leftVideo,
  rightVideo,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onDurationChange,
  syncEnabled,
}: OverlayCompareProps) {
  const leftVideoRef = useRef<HTMLVideoElement>(null);
  const rightVideoRef = useRef<HTMLVideoElement>(null);
  const [opacity, setOpacity] = useState(0.5);
  const [videosReady, setVideosReady] = useState({ left: false, right: false });

  // 재생 중 상태 추적
  const isPlayingRef = useRef(false);

  // 비디오 로드 상태 추적
  useEffect(() => {
    const leftVid = leftVideoRef.current;
    const rightVid = rightVideoRef.current;
    if (!leftVid || !rightVid) return;

    console.log('[Overlay] 비디오 URL:', { left: leftVideo.url, right: rightVideo.url });
    setVideosReady({ left: false, right: false });

    const handleLeftCanPlay = () => {
      console.log('[Overlay] 왼쪽 비디오 준비됨');
      setVideosReady((prev) => ({ ...prev, left: true }));
    };
    const handleRightCanPlay = () => {
      console.log('[Overlay] 오른쪽 비디오 준비됨');
      setVideosReady((prev) => ({ ...prev, right: true }));
    };

    leftVid.addEventListener('canplay', handleLeftCanPlay);
    rightVid.addEventListener('canplay', handleRightCanPlay);

    if (leftVideo.url) leftVid.load();
    if (rightVideo.url) rightVid.load();

    if (leftVid.readyState >= 3) handleLeftCanPlay();
    if (rightVid.readyState >= 3) handleRightCanPlay();

    return () => {
      leftVid.removeEventListener('canplay', handleLeftCanPlay);
      rightVid.removeEventListener('canplay', handleRightCanPlay);
    };
  }, [leftVideo.url, rightVideo.url]);

  // 외부에서 시간 변경 시 (seek) - 재생 중이 아닐 때만 동기화
  useEffect(() => {
    const leftVid = leftVideoRef.current;
    const rightVid = rightVideoRef.current;
    if (!leftVid || !rightVid) return;

    if (isPlayingRef.current) return;

    const timeDiff = Math.abs(leftVid.currentTime - currentTime);
    if (timeDiff > 0.5 && syncEnabled) {
      leftVid.currentTime = currentTime;
      rightVid.currentTime = currentTime;
    }
  }, [currentTime, syncEnabled]);

  // 재생/정지 동기화
  useEffect(() => {
    const leftVid = leftVideoRef.current;
    const rightVid = rightVideoRef.current;
    if (!leftVid || !rightVid) return;

    console.log('[Overlay] 재생 상태:', { isPlaying, videosReady });
    isPlayingRef.current = isPlaying;

    if (isPlaying) {
      if (!videosReady.left || !videosReady.right) {
        console.log('[Overlay] 비디오 로딩 중...');
        const retryTimer = setTimeout(() => {
          if (leftVid.readyState >= 3 && rightVid.readyState >= 3) {
            if (syncEnabled) rightVid.currentTime = leftVid.currentTime;
            leftVid.play().catch((e) => console.error('[Overlay] 재생 실패:', e));
            rightVid.play().catch((e) => console.error('[Overlay] 재생 실패:', e));
          }
        }, 500);
        return () => clearTimeout(retryTimer);
      }

      if (syncEnabled && Math.abs(leftVid.currentTime - rightVid.currentTime) > 0.1) {
        rightVid.currentTime = leftVid.currentTime;
      }
      leftVid.play().catch((e) => console.error('[Overlay] 재생 실패:', e));
      rightVid.play().catch((e) => console.error('[Overlay] 재생 실패:', e));
    } else {
      leftVid.pause();
      rightVid.pause();
    }
  }, [isPlaying, syncEnabled, videosReady]);

  // 좌측 영상 기준 시간 업데이트 (throttled)
  useEffect(() => {
    const leftVid = leftVideoRef.current;
    if (!leftVid) return;

    let lastUpdateTime = 0;
    const THROTTLE_MS = 250;

    const handleTimeUpdate = () => {
      const now = Date.now();
      if (now - lastUpdateTime >= THROTTLE_MS) {
        onTimeUpdate(leftVid.currentTime);
        lastUpdateTime = now;
      }
    };

    const handleLoadedMetadata = () => {
      onDurationChange(leftVid.duration);
    };

    const handleSeeked = () => {
      const rightVid = rightVideoRef.current;
      if (rightVid && syncEnabled && !isPlayingRef.current) {
        rightVid.currentTime = leftVid.currentTime;
      }
    };

    leftVid.addEventListener('timeupdate', handleTimeUpdate);
    leftVid.addEventListener('loadedmetadata', handleLoadedMetadata);
    leftVid.addEventListener('seeked', handleSeeked);

    return () => {
      leftVid.removeEventListener('timeupdate', handleTimeUpdate);
      leftVid.removeEventListener('loadedmetadata', handleLoadedMetadata);
      leftVid.removeEventListener('seeked', handleSeeked);
    };
  }, [onTimeUpdate, onDurationChange, syncEnabled]);

  return (
    <div className="relative w-full aspect-video bg-black overflow-hidden">
      {/* 좌측 영상 (베이스) */}
      <video
        ref={leftVideoRef}
        src={leftVideo.url}
        className="absolute inset-0 w-full h-full object-contain"
        muted
        playsInline
      />

      {/* 우측 영상 (오버레이) */}
      <video
        ref={rightVideoRef}
        src={rightVideo.url}
        className="absolute inset-0 w-full h-full object-contain transition-opacity duration-150"
        style={{ opacity }}
        muted
        playsInline
      />

      {/* 레이블 */}
      <div className="absolute top-4 left-4 px-2 py-1 bg-black/60 text-white text-xs rounded font-medium">
        {leftVideo.label} (베이스)
      </div>
      <div className="absolute top-4 right-4 px-2 py-1 bg-black/60 text-white text-xs rounded font-medium">
        {rightVideo.label} (오버레이)
      </div>

      {/* 투명도 컨트롤 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 bg-black/80 backdrop-blur-sm rounded-lg shadow-lg border border-white/10">
        <Label className="text-white text-xs whitespace-nowrap font-medium">
          {leftVideo.label}
        </Label>
        <Slider
          value={[opacity]}
          onValueChange={([value]) => setOpacity(value)}
          min={0}
          max={1}
          step={0.05}
          className="w-36"
        />
        <Label className="text-white text-xs whitespace-nowrap font-medium">
          {rightVideo.label}
        </Label>
      </div>

      {/* 투명도 퍼센트 표시 */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 rounded text-white text-sm font-medium">
        {rightVideo.label}: {Math.round(opacity * 100)}%
      </div>
    </div>
  );
}
