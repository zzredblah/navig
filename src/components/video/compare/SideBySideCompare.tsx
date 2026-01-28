'use client';

import { useRef, useEffect, useState } from 'react';

interface SideBySideCompareProps {
  leftVideo: { url: string; label: string };
  rightVideo: { url: string; label: string };
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  syncEnabled: boolean;
}

export function SideBySideCompare({
  leftVideo,
  rightVideo,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onDurationChange,
  syncEnabled,
}: SideBySideCompareProps) {
  const leftVideoRef = useRef<HTMLVideoElement>(null);
  const rightVideoRef = useRef<HTMLVideoElement>(null);
  const [videosReady, setVideosReady] = useState({ left: false, right: false });

  // 재생 중 상태 추적
  const isPlayingRef = useRef(false);

  // 비디오 로드 상태 추적
  useEffect(() => {
    const leftVid = leftVideoRef.current;
    const rightVid = rightVideoRef.current;
    if (!leftVid || !rightVid) return;

    console.log('[SideBySide] 비디오 URL:', { left: leftVideo.url, right: rightVideo.url });
    setVideosReady({ left: false, right: false });

    const handleLeftCanPlay = () => {
      console.log('[SideBySide] 왼쪽 비디오 준비됨');
      setVideosReady((prev) => ({ ...prev, left: true }));
    };
    const handleRightCanPlay = () => {
      console.log('[SideBySide] 오른쪽 비디오 준비됨');
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

    // 재생 중이면 동기화하지 않음
    if (isPlayingRef.current) return;

    // 시간 차이가 0.5초 이상일 때만 동기화
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

    console.log('[SideBySide] 재생 상태:', { isPlaying, videosReady });
    isPlayingRef.current = isPlaying;

    if (isPlaying) {
      if (!videosReady.left || !videosReady.right) {
        console.log('[SideBySide] 비디오 로딩 중...');
        const retryTimer = setTimeout(() => {
          if (leftVid.readyState >= 3 && rightVid.readyState >= 3) {
            if (syncEnabled) rightVid.currentTime = leftVid.currentTime;
            leftVid.play().catch((e) => console.error('[SideBySide] 재생 실패:', e));
            rightVid.play().catch((e) => console.error('[SideBySide] 재생 실패:', e));
          }
        }, 500);
        return () => clearTimeout(retryTimer);
      }

      if (syncEnabled && Math.abs(leftVid.currentTime - rightVid.currentTime) > 0.1) {
        rightVid.currentTime = leftVid.currentTime;
      }
      leftVid.play().catch((e) => console.error('[SideBySide] 재생 실패:', e));
      rightVid.play().catch((e) => console.error('[SideBySide] 재생 실패:', e));
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
      <div className="absolute inset-0 flex gap-1">
        {/* 좌측 영상 */}
        <div className="flex-1 relative bg-gray-900">
          <video
            ref={leftVideoRef}
            src={leftVideo.url}
            className="absolute inset-0 w-full h-full object-contain"
            muted
            playsInline
          />
          <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded font-medium">
            {leftVideo.label}
          </div>
        </div>

        {/* 중앙 구분선 */}
        <div className="w-0.5 bg-gray-600 shrink-0" />

        {/* 우측 영상 */}
        <div className="flex-1 relative bg-gray-900">
          <video
            ref={rightVideoRef}
            src={rightVideo.url}
            className="absolute inset-0 w-full h-full object-contain"
            muted
            playsInline
          />
          <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded font-medium">
            {rightVideo.label}
          </div>
        </div>
      </div>
    </div>
  );
}
