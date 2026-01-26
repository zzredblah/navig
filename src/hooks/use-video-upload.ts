'use client';

/**
 * 영상 업로드 훅
 *
 * 기능:
 * - 멀티파트 업로드 (청크 단위)
 * - 진행률 추적
 * - 클라이언트 측 메타데이터 추출
 * - 클라이언트 측 썸네일 생성
 */

import { useState, useCallback, useRef } from 'react';
import {
  VideoUploadState,
  VideoMetadata,
  CreateVideoVersionResponse,
  MULTIPART_CHUNK_SIZE,
  THUMBNAIL_WIDTH,
  THUMBNAIL_HEIGHT,
  THUMBNAIL_QUALITY,
  isValidVideoFile,
  isValidVideoSize,
} from '@/types/video';

interface UseVideoUploadOptions {
  projectId: string;
  onSuccess?: (videoId: string) => void;
  onError?: (error: string) => void;
}

interface UseVideoUploadReturn {
  state: VideoUploadState;
  selectFile: (file: File) => void;
  startUpload: (changeNotes: string, versionName?: string) => Promise<void>;
  cancelUpload: () => void;
  resetState: () => void;
}

const initialState: VideoUploadState = {
  file: null,
  progress: 0,
  status: 'idle',
  error: null,
  currentPart: 0,
  totalParts: 0,
};

export function useVideoUpload({
  projectId,
  onSuccess,
  onError,
}: UseVideoUploadOptions): UseVideoUploadReturn {
  const [state, setState] = useState<VideoUploadState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 파일 선택
   */
  const selectFile = useCallback((file: File) => {
    // 유효성 검사
    if (!isValidVideoFile(file)) {
      setState((prev) => ({
        ...prev,
        error: '지원하지 않는 영상 형식입니다 (MP4, MOV, WebM만 가능)',
        status: 'error',
      }));
      return;
    }

    if (!isValidVideoSize(file)) {
      setState((prev) => ({
        ...prev,
        error: '파일 크기가 2GB를 초과합니다',
        status: 'error',
      }));
      return;
    }

    setState({
      ...initialState,
      file,
      status: 'idle',
    });
  }, []);

  /**
   * HTML5 Video API로 메타데이터 추출
   */
  const extractMetadata = async (file: File): Promise<VideoMetadata> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          resolution: `${video.videoWidth}x${video.videoHeight}`,
        });
        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('영상 메타데이터를 읽을 수 없습니다'));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  /**
   * Canvas API로 썸네일 생성
   */
  const generateThumbnail = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadeddata = () => {
        // 영상의 25% 지점으로 이동 (보통 인트로가 끝난 후)
        video.currentTime = video.duration * 0.25;
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = THUMBNAIL_WIDTH;
        canvas.height = THUMBNAIL_HEIGHT;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(video.src);
          reject(new Error('Canvas 컨텍스트를 생성할 수 없습니다'));
          return;
        }

        // 비율 유지하면서 중앙 크롭
        const videoRatio = video.videoWidth / video.videoHeight;
        const canvasRatio = THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT;

        let sx = 0,
          sy = 0,
          sw = video.videoWidth,
          sh = video.videoHeight;

        if (videoRatio > canvasRatio) {
          // 영상이 더 넓으면 좌우 크롭
          sw = video.videoHeight * canvasRatio;
          sx = (video.videoWidth - sw) / 2;
        } else {
          // 영상이 더 높으면 상하 크롭
          sh = video.videoWidth / canvasRatio;
          sy = (video.videoHeight - sh) / 2;
        }

        ctx.drawImage(
          video,
          sx,
          sy,
          sw,
          sh,
          0,
          0,
          THUMBNAIL_WIDTH,
          THUMBNAIL_HEIGHT
        );

        URL.revokeObjectURL(video.src);
        resolve(canvas.toDataURL('image/jpeg', THUMBNAIL_QUALITY));
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('썸네일을 생성할 수 없습니다'));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  /**
   * 단일 파트 업로드
   */
  const uploadPart = async (
    url: string,
    chunk: Blob,
    signal: AbortSignal
  ): Promise<string> => {
    const response = await fetch(url, {
      method: 'PUT',
      body: chunk,
      signal,
    });

    if (!response.ok) {
      throw new Error(`파트 업로드 실패: ${response.status}`);
    }

    // ETag 헤더에서 반환된 값 추출
    const etag = response.headers.get('ETag');
    if (!etag) {
      throw new Error('ETag를 받지 못했습니다');
    }

    return etag;
  };

  /**
   * 업로드 시작
   */
  const startUpload = useCallback(
    async (changeNotes: string, versionName?: string) => {
      if (!state.file) {
        setState((prev) => ({
          ...prev,
          error: '파일을 먼저 선택하세요',
          status: 'error',
        }));
        return;
      }

      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      try {
        setState((prev) => ({
          ...prev,
          status: 'preparing',
          progress: 0,
          error: null,
        }));

        // 1. 메타데이터 추출
        let metadata: VideoMetadata | null = null;
        try {
          metadata = await extractMetadata(state.file);
        } catch {
          console.warn('메타데이터 추출 실패, 계속 진행');
        }

        // 2. 썸네일 생성
        let thumbnailBase64: string | null = null;
        try {
          thumbnailBase64 = await generateThumbnail(state.file);
        } catch {
          console.warn('썸네일 생성 실패, 계속 진행');
        }

        // 3. 업로드 시작 API 호출
        const initResponse = await fetch(`/api/projects/${projectId}/videos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            original_filename: state.file.name,
            file_size: state.file.size,
            content_type: state.file.type,
            change_notes: changeNotes,
            version_name: versionName,
          }),
          signal,
        });

        if (!initResponse.ok) {
          const errorData = await initResponse.json();
          throw new Error(errorData.error || '업로드 시작에 실패했습니다');
        }

        const { video, upload }: CreateVideoVersionResponse =
          await initResponse.json();

        setState((prev) => ({
          ...prev,
          status: 'uploading',
          totalParts: upload.totalParts,
        }));

        // 4. 청크별 업로드
        const parts: { partNumber: number; etag: string }[] = [];

        for (let i = 0; i < upload.totalParts; i++) {
          if (signal.aborted) {
            throw new Error('업로드가 취소되었습니다');
          }

          const start = i * MULTIPART_CHUNK_SIZE;
          const end = Math.min(start + MULTIPART_CHUNK_SIZE, state.file.size);
          const chunk = state.file.slice(start, end);

          const etag = await uploadPart(upload.partUrls[i], chunk, signal);

          parts.push({
            partNumber: i + 1,
            etag: etag.replace(/"/g, ''), // 따옴표 제거
          });

          setState((prev) => ({
            ...prev,
            currentPart: i + 1,
            progress: Math.round(((i + 1) / upload.totalParts) * 100),
          }));
        }

        // 5. 업로드 완료 API 호출
        setState((prev) => ({
          ...prev,
          status: 'processing',
        }));

        const completeResponse = await fetch(
          `/api/videos/${video.id}/complete`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parts,
              metadata: metadata
                ? {
                    duration: Math.round(metadata.duration),
                    resolution: metadata.resolution,
                  }
                : undefined,
              thumbnailBase64,
            }),
            signal,
          }
        );

        if (!completeResponse.ok) {
          const errorData = await completeResponse.json();
          throw new Error(errorData.error || '업로드 완료 처리에 실패했습니다');
        }

        setState((prev) => ({
          ...prev,
          status: 'completed',
          progress: 100,
        }));

        onSuccess?.(video.id);
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          setState((prev) => ({
            ...prev,
            status: 'idle',
            error: '업로드가 취소되었습니다',
          }));
        } else {
          const errorMessage =
            error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다';
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: errorMessage,
          }));
          onError?.(errorMessage);
        }
      }
    },
    [state.file, projectId, onSuccess, onError]
  );

  /**
   * 업로드 취소
   */
  const cancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
    setState((prev) => ({
      ...prev,
      status: 'idle',
      progress: 0,
      currentPart: 0,
    }));
  }, []);

  /**
   * 상태 초기화
   */
  const resetState = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(initialState);
  }, []);

  return {
    state,
    selectFile,
    startUpload,
    cancelUpload,
    resetState,
  };
}
