'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Move } from 'lucide-react';
import Hls from 'hls.js';

interface WipeCompareProps {
  leftVideo: { url: string; label: string; isHls?: boolean };
  rightVideo: { url: string; label: string; isHls?: boolean };
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

export function WipeCompare({
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
}: WipeCompareProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftVideoRef = useRef<HTMLVideoElement>(null);
  const rightVideoRef = useRef<HTMLVideoElement>(null);
  const [wipePosition, setWipePosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [videosReady, setVideosReady] = useState({ left: false, right: false });

  // 재생 중 상태 추적
  const isPlayingRef = useRef(false);
  // play() Promise 추적 (play/pause 충돌 방지)
  const playPromisesRef = useRef<Map<HTMLVideoElement, Promise<void>>>(new Map());

  // HLS 인스턴스 추적
  const leftHlsRef = useRef<Hls | null>(null);
  const rightHlsRef = useRef<Hls | null>(null);

  // 비디오 로드 상태 추적 (HLS 지원 포함)
  useEffect(() => {
    const leftVid = leftVideoRef.current;
    const rightVid = rightVideoRef.current;
    if (!leftVid || !rightVid) return;

    setVideosReady({ left: false, right: false });

    // 이전 HLS 인스턴스 정리
    if (leftHlsRef.current) {
      leftHlsRef.current.destroy();
      leftHlsRef.current = null;
    }
    if (rightHlsRef.current) {
      rightHlsRef.current.destroy();
      rightHlsRef.current = null;
    }

    const handleLeftCanPlay = () => {
      setVideosReady((prev) => ({ ...prev, left: true }));
    };
    const handleRightCanPlay = () => {
      setVideosReady((prev) => ({ ...prev, right: true }));
    };

    leftVid.addEventListener('canplay', handleLeftCanPlay);
    rightVid.addEventListener('canplay', handleRightCanPlay);

    // 왼쪽 비디오 로드 (HLS 또는 일반)
    if (leftVideo.url) {
      if (leftVideo.isHls && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(leftVideo.url);
        hls.attachMedia(leftVid);
        leftHlsRef.current = hls;
      } else if (leftVideo.isHls && leftVid.canPlayType('application/vnd.apple.mpegurl')) {
        leftVid.src = leftVideo.url;
        leftVid.load();
      } else {
        leftVid.src = leftVideo.url;
        leftVid.load();
      }
    }

    // 오른쪽 비디오 로드 (HLS 또는 일반)
    if (rightVideo.url) {
      if (rightVideo.isHls && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(rightVideo.url);
        hls.attachMedia(rightVid);
        rightHlsRef.current = hls;
      } else if (rightVideo.isHls && rightVid.canPlayType('application/vnd.apple.mpegurl')) {
        rightVid.src = rightVideo.url;
        rightVid.load();
      } else {
        rightVid.src = rightVideo.url;
        rightVid.load();
      }
    }

    if (leftVid.readyState >= 3) handleLeftCanPlay();
    if (rightVid.readyState >= 3) handleRightCanPlay();

    return () => {
      leftVid.removeEventListener('canplay', handleLeftCanPlay);
      rightVid.removeEventListener('canplay', handleRightCanPlay);
      // HLS 정리
      if (leftHlsRef.current) {
        leftHlsRef.current.destroy();
        leftHlsRef.current = null;
      }
      if (rightHlsRef.current) {
        rightHlsRef.current.destroy();
        rightHlsRef.current = null;
      }
    };
  }, [leftVideo.url, rightVideo.url, leftVideo.isHls, rightVideo.isHls]);

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

  // 안전한 재생 함수 (play/pause 충돌 방지)
  const safePlay = async (video: HTMLVideoElement) => {
    try {
      const playPromise = video.play();
      playPromisesRef.current.set(video, playPromise);
      await playPromise;
    } catch (e) {
      // AbortError는 무시 (pause()에 의해 중단된 경우)
      if (e instanceof DOMException && e.name === 'AbortError') {
        return;
      }
      console.error('[Wipe] 재생 실패:', e);
    } finally {
      playPromisesRef.current.delete(video);
    }
  };

  // 안전한 정지 함수 (진행 중인 play() 완료 후 정지)
  const safePause = async (video: HTMLVideoElement) => {
    const playPromise = playPromisesRef.current.get(video);
    if (playPromise) {
      try {
        await playPromise;
      } catch {
        // 이미 실패한 Promise 무시
      }
      playPromisesRef.current.delete(video);
    }
    video.pause();
  };

  // 재생/정지 동기화
  useEffect(() => {
    const leftVid = leftVideoRef.current;
    const rightVid = rightVideoRef.current;
    if (!leftVid || !rightVid) return;

    isPlayingRef.current = isPlaying;

    if (isPlaying) {
      if (!videosReady.left || !videosReady.right) {
        const retryTimer = setTimeout(() => {
          if (leftVid.readyState >= 3 && rightVid.readyState >= 3) {
            if (syncEnabled) rightVid.currentTime = leftVid.currentTime;
            safePlay(leftVid);
            safePlay(rightVid);
          }
        }, 500);
        return () => clearTimeout(retryTimer);
      }

      if (syncEnabled && Math.abs(leftVid.currentTime - rightVid.currentTime) > 0.1) {
        rightVid.currentTime = leftVid.currentTime;
      }
      safePlay(leftVid);
      safePlay(rightVid);
    } else {
      safePause(leftVid);
      safePause(rightVid);
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

  // 대각선 클립 패스 계산
  const getClipPath = () => {
    const { x, y } = wipePosition;
    // 대각선 와이프 효과
    return `polygon(0 0, ${x}% 0, 0 ${y}%)`;
  };

  // 드래그 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      // 마우스 위치를 그대로 사용하여 대각선이 전체 화면을 커버할 수 있게 함
      const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
      const mouseY = ((e.clientY - rect.top) / rect.height) * 100;
      const x = Math.max(0, Math.min(200, mouseX * 2));
      const y = Math.max(0, Math.min(200, mouseY * 2));
      setWipePosition({ x, y });
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
      // 터치 위치를 그대로 사용하여 대각선이 전체 화면을 커버할 수 있게 함
      const touchX = ((touch.clientX - rect.left) / rect.width) * 100;
      const touchY = ((touch.clientY - rect.top) / rect.height) * 100;
      const x = Math.max(0, Math.min(200, touchX * 2));
      const y = Math.max(0, Math.min(200, touchY * 2));
      setWipePosition({ x, y });
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
      {/* 우측 영상 (전체) - src는 useEffect에서 설정 */}
      <video
        ref={rightVideoRef}
        className="absolute inset-0 w-full h-full object-contain"
        muted={rightMuted}
        playsInline
      />

      {/* 좌측 영상 (대각선 클리핑) - src는 useEffect에서 설정 */}
      <video
        ref={leftVideoRef}
        className="absolute inset-0 w-full h-full object-contain"
        style={{ clipPath: getClipPath() }}
        muted={leftMuted}
        playsInline
      />

      {/* 대각선 경계선 */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <line
          x1={wipePosition.x}
          y1="0"
          x2="0"
          y2={wipePosition.y}
          stroke="white"
          strokeWidth="0.3"
          strokeDasharray="2,2"
        />
      </svg>

      {/* 드래그 핸들 - 대각선의 중점에 배치 */}
      <div
        className="absolute w-12 h-12 bg-white/95 rounded-full shadow-lg flex items-center justify-center cursor-move z-10 hover:scale-110 transition-transform border-2 border-white"
        style={{
          left: `calc(${wipePosition.x / 2}%)`,
          top: `calc(${wipePosition.y / 2}%)`,
          transform: 'translate(-50%, -50%)',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <Move className="h-6 w-6 text-gray-700" />
      </div>

      {/* 추가 드래그 힌트 - 대각선 끝점 표시 */}
      <div
        className="absolute w-3 h-3 bg-white rounded-full shadow border border-gray-300 pointer-events-none"
        style={{
          left: `${wipePosition.x}%`,
          top: '0',
          transform: 'translate(-50%, -50%)',
        }}
      />
      <div
        className="absolute w-3 h-3 bg-white rounded-full shadow border border-gray-300 pointer-events-none"
        style={{
          left: '0',
          top: `${wipePosition.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* 레이블 */}
      <div className="absolute top-4 left-4 px-2 py-1 bg-black/60 text-white text-xs rounded font-medium">
        {leftVideo.label}
      </div>
      <div className="absolute top-4 right-4 px-2 py-1 bg-black/60 text-white text-xs rounded font-medium">
        {rightVideo.label}
      </div>

      {/* 사용법 안내 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 rounded text-white text-xs">
        원형 핸들을 드래그하여 와이프 영역을 조절하세요
      </div>
    </div>
  );
}
