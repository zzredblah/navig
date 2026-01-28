'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { GripVertical } from 'lucide-react';

interface SliderCompareProps {
  leftVideo: { url: string; label: string };
  rightVideo: { url: string; label: string };
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  syncEnabled: boolean;
  // 오디오 설정
  leftMuted?: boolean;
  rightMuted?: boolean;
  leftVolume?: number;
  rightVolume?: number;
}

export function SliderCompare({
  leftVideo,
  rightVideo,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onDurationChange,
  syncEnabled,
  leftMuted = false,
  rightMuted = true,
  leftVolume = 1,
  rightVolume = 1,
}: SliderCompareProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftVideoRef = useRef<HTMLVideoElement>(null);
  const rightVideoRef = useRef<HTMLVideoElement>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [videosReady, setVideosReady] = useState({ left: false, right: false });

  // 재생 중 상태 추적 (seek와 구분하기 위함)
  const isPlayingRef = useRef(false);
  const lastSyncTimeRef = useRef(0);

  // 비디오 로드 상태 추적
  useEffect(() => {
    const leftVid = leftVideoRef.current;
    const rightVid = rightVideoRef.current;
    if (!leftVid || !rightVid) return;

    console.log('[SliderCompare] 비디오 URL:', { left: leftVideo.url, right: rightVideo.url });

    // 비디오 준비 상태 초기화
    setVideosReady({ left: false, right: false });

    const handleLeftCanPlay = () => {
      console.log('[SliderCompare] 왼쪽 비디오 준비됨');
      setVideosReady((prev) => ({ ...prev, left: true }));
    };
    const handleRightCanPlay = () => {
      console.log('[SliderCompare] 오른쪽 비디오 준비됨');
      setVideosReady((prev) => ({ ...prev, right: true }));
    };

    const handleError = (side: string) => (e: Event) => {
      const video = e.target as HTMLVideoElement;
      console.error(`[SliderCompare] ${side} 비디오 로드 실패:`, video.error);
    };

    leftVid.addEventListener('canplay', handleLeftCanPlay);
    rightVid.addEventListener('canplay', handleRightCanPlay);
    leftVid.addEventListener('error', handleError('왼쪽'));
    rightVid.addEventListener('error', handleError('오른쪽'));

    // URL이 변경되면 비디오 다시 로드
    if (leftVideo.url) {
      leftVid.load();
    }
    if (rightVideo.url) {
      rightVid.load();
    }

    // 이미 로드된 경우 체크
    if (leftVid.readyState >= 3) handleLeftCanPlay();
    if (rightVid.readyState >= 3) handleRightCanPlay();

    return () => {
      leftVid.removeEventListener('canplay', handleLeftCanPlay);
      rightVid.removeEventListener('canplay', handleRightCanPlay);
      leftVid.removeEventListener('error', handleError('왼쪽'));
      rightVid.removeEventListener('error', handleError('오른쪽'));
    };
  }, [leftVideo.url, rightVideo.url]);

  // 외부에서 시간 변경 시 (seek) - 재생 중이 아닐 때만 동기화
  useEffect(() => {
    const leftVid = leftVideoRef.current;
    const rightVid = rightVideoRef.current;
    if (!leftVid || !rightVid) return;

    // 재생 중이면 동기화하지 않음 (자연스러운 재생 유지)
    if (isPlayingRef.current) return;

    // 시간 차이가 0.5초 이상일 때만 동기화 (불필요한 seek 방지)
    const timeDiff = Math.abs(leftVid.currentTime - currentTime);
    if (timeDiff > 0.5 && syncEnabled) {
      leftVid.currentTime = currentTime;
      rightVid.currentTime = currentTime;
      lastSyncTimeRef.current = currentTime;
    }
  }, [currentTime, syncEnabled]);

  // 재생/정지 동기화
  useEffect(() => {
    const leftVid = leftVideoRef.current;
    const rightVid = rightVideoRef.current;
    if (!leftVid || !rightVid) return;

    console.log('[SliderCompare] 재생 상태 변경:', { isPlaying, videosReady });

    isPlayingRef.current = isPlaying;

    if (isPlaying) {
      // 비디오가 준비되지 않았으면 재시도 예약
      if (!videosReady.left || !videosReady.right) {
        console.log('[SliderCompare] 비디오 로딩 중... 준비 상태:', videosReady);

        // 0.5초 후 재시도
        const retryTimer = setTimeout(() => {
          if (leftVid.readyState >= 3 && rightVid.readyState >= 3) {
            console.log('[SliderCompare] 비디오 준비됨, 재생 시작');
            if (syncEnabled) {
              rightVid.currentTime = leftVid.currentTime;
            }
            leftVid.play().catch((e) => console.error('[SliderCompare] 재생 실패:', e));
            rightVid.play().catch((e) => console.error('[SliderCompare] 재생 실패:', e));
          }
        }, 500);

        return () => clearTimeout(retryTimer);
      }

      // 재생 시작 전 두 영상 시간 동기화
      if (syncEnabled && Math.abs(leftVid.currentTime - rightVid.currentTime) > 0.1) {
        rightVid.currentTime = leftVid.currentTime;
      }

      console.log('[SliderCompare] 재생 시작');
      leftVid.play().catch((e) => console.error('[SliderCompare] 왼쪽 비디오 재생 실패:', e));
      rightVid.play().catch((e) => console.error('[SliderCompare] 오른쪽 비디오 재생 실패:', e));
    } else {
      console.log('[SliderCompare] 일시 정지');
      leftVid.pause();
      rightVid.pause();
    }
  }, [isPlaying, syncEnabled, videosReady]);

  // 좌측 영상 기준 시간 업데이트 (throttled)
  useEffect(() => {
    const leftVid = leftVideoRef.current;
    if (!leftVid) return;

    let lastUpdateTime = 0;
    const THROTTLE_MS = 250; // 250ms마다 업데이트

    const handleTimeUpdate = () => {
      const now = Date.now();
      // throttle: 자주 업데이트하지 않음
      if (now - lastUpdateTime >= THROTTLE_MS) {
        onTimeUpdate(leftVid.currentTime);
        lastUpdateTime = now;
      }
    };

    const handleLoadedMetadata = () => {
      onDurationChange(leftVid.duration);
    };

    // 영상 간 동기화 (재생 중 드리프트 보정)
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

  // 슬라이더 드래그 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 터치 핸들러
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !containerRef.current) return;

      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    },
    [isDragging]
  );

  // 이벤트 리스너 등록
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  // 키보드로 슬라이더 이동
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setSliderPosition((prev) => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight') {
      setSliderPosition((prev) => Math.min(100, prev + 5));
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 볼륨 업데이트
  useEffect(() => {
    if (leftVideoRef.current) {
      leftVideoRef.current.volume = leftVolume;
    }
    if (rightVideoRef.current) {
      rightVideoRef.current.volume = rightVolume;
    }
  }, [leftVolume, rightVolume]);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black overflow-hidden select-none"
    >
      {/* 우측 영상 (전체) */}
      <video
        ref={rightVideoRef}
        src={rightVideo.url}
        className="absolute inset-0 w-full h-full object-contain"
        muted={rightMuted}
        playsInline
      />

      {/* 좌측 영상 (클리핑) */}
      <video
        ref={leftVideoRef}
        src={leftVideo.url}
        className="absolute inset-0 w-full h-full object-contain"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        muted={leftMuted}
        playsInline
      />

      {/* 슬라이더 라인 */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize z-10"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* 슬라이더 핸들 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center cursor-ew-resize">
          <GripVertical className="h-5 w-5 text-gray-600" />
        </div>
      </div>

      {/* 레이블 */}
      <div className="absolute top-4 left-4 px-2 py-1 bg-black/50 text-white text-sm rounded">
        {leftVideo.label}
      </div>
      <div className="absolute top-4 right-4 px-2 py-1 bg-black/50 text-white text-sm rounded">
        {rightVideo.label}
      </div>
    </div>
  );
}
