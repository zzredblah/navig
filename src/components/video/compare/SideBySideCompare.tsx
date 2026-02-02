'use client';

import { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';

interface SideBySideCompareProps {
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

export function SideBySideCompare({
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
}: SideBySideCompareProps) {
  const leftVideoRef = useRef<HTMLVideoElement>(null);
  const rightVideoRef = useRef<HTMLVideoElement>(null);
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

    // 재생 중이면 동기화하지 않음
    if (isPlayingRef.current) return;

    // 시간 차이가 0.5초 이상일 때만 동기화
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
      console.error('[SideBySide] 재생 실패:', e);
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
    <div className="relative w-full aspect-video bg-black overflow-hidden">
      <div className="absolute inset-0 flex gap-1">
        {/* 좌측 영상 - src는 useEffect에서 설정 */}
        <div className="flex-1 relative bg-gray-900">
          <video
            ref={leftVideoRef}
            className="absolute inset-0 w-full h-full object-contain"
            muted={leftMuted}
            playsInline
          />
          <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded font-medium">
            {leftVideo.label}
          </div>
        </div>

        {/* 중앙 구분선 */}
        <div className="w-0.5 bg-gray-600 shrink-0" />

        {/* 우측 영상 - src는 useEffect에서 설정 */}
        <div className="flex-1 relative bg-gray-900">
          <video
            ref={rightVideoRef}
            className="absolute inset-0 w-full h-full object-contain"
            muted={rightMuted}
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
