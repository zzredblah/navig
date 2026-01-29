'use client';

/**
 * 워터마크 렌더링 훅
 *
 * Canvas를 사용하여 비디오 위에 워터마크를 오버레이합니다.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { WatermarkSettings } from '@/types/watermark';
import { DEFAULT_WATERMARK_SETTINGS } from '@/types/watermark';

// 시간 포맷팅
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface UseWatermarkOptions {
  projectId: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  enabled?: boolean;
}

interface UseWatermarkReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  settings: WatermarkSettings | null;
  isLoading: boolean;
}

export function useWatermark({
  projectId,
  videoRef,
  containerRef,
  enabled = true,
}: UseWatermarkOptions): UseWatermarkReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const [settings, setSettings] = useState<WatermarkSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 워터마크 설정 로드
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/watermark`);
        if (response.ok) {
          const { data } = await response.json();
          setSettings(data.settings || DEFAULT_WATERMARK_SETTINGS);
        }
      } catch (err) {
        console.error('워터마크 설정 로드 실패:', err);
        setSettings(DEFAULT_WATERMARK_SETTINGS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [projectId, enabled]);

  // 로고 이미지 로드
  useEffect(() => {
    if (settings?.logo_url && settings.type === 'logo') {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        logoImageRef.current = img;
      };
      img.onerror = () => {
        console.error('로고 이미지 로드 실패');
        logoImageRef.current = null;
      };
      img.src = settings.logo_url;
    } else {
      logoImageRef.current = null;
    }
  }, [settings?.logo_url, settings?.type]);

  // 워터마크 위치 계산 (텍스트용)
  const getTextPosition = useCallback(
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

  // 로고 위치 계산
  const getLogoPosition = useCallback(
    (
      position: string,
      canvasWidth: number,
      canvasHeight: number,
      logoWidth: number,
      logoHeight: number
    ) => {
      const padding = 20;
      switch (position) {
        case 'top-left':
          return { x: padding, y: padding };
        case 'top-right':
          return { x: canvasWidth - logoWidth - padding, y: padding };
        case 'bottom-left':
          return { x: padding, y: canvasHeight - logoHeight - padding };
        case 'bottom-right':
          return { x: canvasWidth - logoWidth - padding, y: canvasHeight - logoHeight - padding };
        case 'center':
          return { x: (canvasWidth - logoWidth) / 2, y: (canvasHeight - logoHeight) / 2 };
        default:
          return { x: canvasWidth - logoWidth - padding, y: canvasHeight - logoHeight - padding };
      }
    },
    []
  );

  // 워터마크 렌더링
  const renderWatermark = useCallback(() => {
    if (!settings?.enabled || !canvasRef.current || !videoRef.current || !containerRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 크기를 컨테이너에 맞춤
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = settings.opacity;

    // 로고 타입인 경우
    if (settings.type === 'logo' && logoImageRef.current) {
      const logo = logoImageRef.current;
      const maxLogoHeight = Math.max(30, Math.min(60, canvas.height / 8));
      const scale = maxLogoHeight / logo.height;
      const logoWidth = logo.width * scale;
      const logoHeight = maxLogoHeight;

      const { x, y } = getLogoPosition(
        settings.position,
        canvas.width,
        canvas.height,
        logoWidth,
        logoHeight
      );

      ctx.drawImage(logo, x, y, logoWidth, logoHeight);
      ctx.globalAlpha = 1;

      // 재생 중일 때 애니메이션 프레임 요청
      if (!video.paused && !video.ended) {
        animationFrameRef.current = requestAnimationFrame(renderWatermark);
      }
      return;
    }

    // 텍스트/타임코드/복합 타입
    let watermarkText = '';
    if (settings.type === 'text' || settings.type === 'combined') {
      watermarkText = settings.text || 'NAVIG Corp';
    }
    if (settings.type === 'timecode' || settings.type === 'combined' || settings.show_timecode) {
      const timecode = formatDuration(video.currentTime || 0);
      if (watermarkText) {
        watermarkText += `  ${timecode}`;
      } else {
        watermarkText = timecode;
      }
    }

    if (!watermarkText) {
      ctx.globalAlpha = 1;
      // 재생 중일 때 애니메이션 프레임 요청 (로고 타입이지만 이미지가 아직 없는 경우)
      if (!video.paused && !video.ended) {
        animationFrameRef.current = requestAnimationFrame(renderWatermark);
      }
      return;
    }

    // 폰트 설정
    const fontSize = Math.max(14, Math.min(24, canvas.width / 40));
    ctx.font = `${fontSize}px "Pretendard", sans-serif`;

    // 텍스트 크기 측정
    const metrics = ctx.measureText(watermarkText);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    // 위치 계산
    const { x, y } = getTextPosition(
      settings.position,
      canvas.width,
      canvas.height,
      textWidth,
      textHeight
    );

    // 텍스트 그림자
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeText(watermarkText, x, y);

    // 텍스트 그리기
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(watermarkText, x, y);

    ctx.globalAlpha = 1;

    // 재생 중일 때 애니메이션 프레임 요청
    if (!video.paused && !video.ended) {
      animationFrameRef.current = requestAnimationFrame(renderWatermark);
    }
  }, [settings, videoRef, containerRef, getTextPosition, getLogoPosition]);

  // 비디오 이벤트에 따라 워터마크 렌더링
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !settings?.enabled) return;

    const handlePlay = () => {
      renderWatermark();
    };

    const handlePause = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // 일시정지 상태에서도 워터마크 표시
      renderWatermark();
    };

    const handleTimeUpdate = () => {
      // 일시정지 상태에서 시간 변경 시 (시크)
      if (video.paused) {
        renderWatermark();
      }
    };

    const handleSeeked = () => {
      renderWatermark();
    };

    const handleLoadedData = () => {
      renderWatermark();
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('loadeddata', handleLoadedData);

    // 초기 렌더링
    renderWatermark();

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('loadeddata', handleLoadedData);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [settings, videoRef, renderWatermark]);

  // 윈도우 리사이즈 시 재렌더링
  useEffect(() => {
    const handleResize = () => {
      renderWatermark();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderWatermark]);

  return {
    canvasRef,
    settings,
    isLoading,
  };
}
