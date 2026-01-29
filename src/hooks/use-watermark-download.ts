'use client';

/**
 * 워터마크가 포함된 영상 다운로드 훅
 *
 * Canvas + MediaRecorder API를 사용하여 클라이언트에서 워터마크를 합성
 * 제한사항:
 * - 처리 시간이 영상 길이와 비슷하게 소요됨
 * - 대용량 파일은 메모리 이슈 가능
 * - 일부 브라우저에서 제한될 수 있음
 */

import { useState, useCallback, useRef } from 'react';

interface WatermarkSettings {
  text?: string;
  logoUrl?: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number;
  size?: 'small' | 'medium' | 'large'; // Optional, defaults to 'medium'
}

interface UseWatermarkDownloadOptions {
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

interface UseWatermarkDownloadReturn {
  isProcessing: boolean;
  progress: number;
  error: string | null;
  downloadWithWatermark: (
    videoUrl: string,
    filename: string,
    watermarkSettings: WatermarkSettings
  ) => Promise<void>;
  cancelDownload: () => void;
}

// 워터마크 크기 설정
const WATERMARK_SIZES = {
  small: { logoSize: 40, fontSize: 14 },
  medium: { logoSize: 60, fontSize: 18 },
  large: { logoSize: 80, fontSize: 24 },
};

export function useWatermarkDownload(
  options: UseWatermarkDownloadOptions = {}
): UseWatermarkDownloadReturn {
  const { onProgress, onError, onComplete } = options;
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const cancelDownload = useCallback(() => {
    abortRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsProcessing(false);
    setProgress(0);
  }, []);

  const downloadWithWatermark = useCallback(
    async (
      videoUrl: string,
      filename: string,
      watermarkSettings: WatermarkSettings
    ) => {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      abortRef.current = false;

      try {
        // 1. 비디오 요소 생성 및 로드
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.playsInline = true;

        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error('영상을 로드할 수 없습니다'));
          video.src = videoUrl;
        });

        // 영상 길이 확인 (10분 이상이면 경고)
        if (video.duration > 600) {
          const confirmed = window.confirm(
            `이 영상은 ${Math.round(video.duration / 60)}분 길이입니다.\n` +
              '워터마크 처리에 비슷한 시간이 소요될 수 있습니다.\n계속하시겠습니까?'
          );
          if (!confirmed) {
            setIsProcessing(false);
            return;
          }
        }

        // 2. 캔버스 설정
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d')!;

        // 3. 워터마크 로고 이미지 로드 (있는 경우)
        let logoImage: HTMLImageElement | null = null;
        if (watermarkSettings.logoUrl) {
          logoImage = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('로고를 로드할 수 없습니다'));
            img.src = watermarkSettings.logoUrl!;
          });
        }

        // 4. 워터마크 그리기 함수
        const sizeConfig = WATERMARK_SIZES[watermarkSettings.size || 'medium'];
        const drawWatermark = () => {
          ctx.globalAlpha = watermarkSettings.opacity;

          // 위치 계산
          const padding = 20;
          let x = padding;
          let y = padding;

          switch (watermarkSettings.position) {
            case 'top-right':
              x = canvas.width - padding - (logoImage ? sizeConfig.logoSize : 0);
              break;
            case 'bottom-left':
              y = canvas.height - padding - sizeConfig.logoSize;
              break;
            case 'bottom-right':
              x = canvas.width - padding - (logoImage ? sizeConfig.logoSize : 0);
              y = canvas.height - padding - sizeConfig.logoSize;
              break;
            case 'center':
              x = (canvas.width - (logoImage ? sizeConfig.logoSize : 0)) / 2;
              y = (canvas.height - sizeConfig.logoSize) / 2;
              break;
          }

          // 로고 이미지 그리기
          if (logoImage) {
            ctx.drawImage(logoImage, x, y, sizeConfig.logoSize, sizeConfig.logoSize);
          }

          // 텍스트 그리기 (로고 없거나 추가 텍스트 있는 경우)
          if (watermarkSettings.text && !logoImage) {
            ctx.font = `bold ${sizeConfig.fontSize}px sans-serif`;
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 2;
            ctx.strokeText(watermarkSettings.text, x, y + sizeConfig.fontSize);
            ctx.fillText(watermarkSettings.text, x, y + sizeConfig.fontSize);
          }

          ctx.globalAlpha = 1;
        };

        // 5. MediaRecorder로 캔버스 녹화
        const stream = canvas.captureStream(30);
        const chunks: Blob[] = [];

        // 지원되는 MIME 타입 확인
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 5000000, // 5 Mbps
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        const processingPromise = new Promise<Blob>((resolve, reject) => {
          mediaRecorder.onstop = () => {
            if (abortRef.current) {
              reject(new Error('처리가 취소되었습니다'));
              return;
            }
            const blob = new Blob(chunks, { type: mimeType });
            resolve(blob);
          };
          mediaRecorder.onerror = (e) => reject(e);
        });

        // 6. 프레임별 처리
        mediaRecorder.start(100); // 100ms 청크
        video.currentTime = 0;

        const processFrame = () => {
          if (abortRef.current) {
            mediaRecorder.stop();
            return;
          }

          // 현재 프레임을 캔버스에 그리기
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          drawWatermark();

          // 진행률 업데이트
          const currentProgress = Math.round((video.currentTime / video.duration) * 100);
          setProgress(currentProgress);
          onProgress?.(currentProgress);

          // 다음 프레임으로 이동
          if (video.currentTime < video.duration - 0.1) {
            video.currentTime += 1 / 30; // 30fps
            requestAnimationFrame(() => {
              setTimeout(processFrame, 10); // 약간의 지연으로 안정화
            });
          } else {
            // 완료
            mediaRecorder.stop();
          }
        };

        // 시작
        await video.play();
        video.pause();
        video.currentTime = 0;

        // 프레임 처리 시작
        setTimeout(processFrame, 100);

        // 처리 완료 대기
        const blob = await processingPromise;

        // 7. 다운로드
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // 파일 확장자 조정
        const outputFilename = filename.replace(/\.[^.]+$/, '') +
          (mimeType.includes('webm') ? '.webm' : '.mp4');
        a.download = outputFilename;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setProgress(100);
        onComplete?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '처리 중 오류가 발생했습니다';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    },
    [onProgress, onError, onComplete]
  );

  return {
    isProcessing,
    progress,
    error,
    downloadWithWatermark,
    cancelDownload,
  };
}
