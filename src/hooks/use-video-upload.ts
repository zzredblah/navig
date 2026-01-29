'use client';

/**
 * 영상 업로드 훅
 *
 * 기능:
 * - Cloudflare Stream 직접 업로드 (기본)
 * - R2 멀티파트 업로드 (폴백)
 * - 진행률 추적
 * - 클라이언트 측 메타데이터 추출
 * - 인코딩 상태 폴링
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  VideoUploadState,
  VideoMetadata,
  MULTIPART_CHUNK_SIZE,
  isValidVideoFile,
  isValidVideoSize,
} from '@/types/video';

// 업로드 응답 타입 (Stream 또는 R2)
interface StreamUploadResponse {
  video: { id: string };
  upload: {
    type: 'stream';
    uploadURL: string;
    streamVideoId: string;
  };
}

interface R2UploadResponse {
  video: { id: string };
  upload: {
    type: 'r2';
    uploadId: string;
    key: string;
    partUrls: string[];
    partSize: number;
    totalParts: number;
  };
}

type UploadResponse = StreamUploadResponse | R2UploadResponse;

interface UseVideoUploadOptions {
  projectId: string;
  onSuccess?: (videoId: string) => void;
  onError?: (error: string) => void;
}

interface StartUploadOptions {
  changeNotes: string;
  versionName?: string;
  watermarkEnabled?: boolean;
}

interface UseVideoUploadReturn {
  state: VideoUploadState;
  selectFile: (file: File) => void;
  startUpload: (options: StartUploadOptions) => Promise<void>;
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

// 인코딩 폴링 간격 (5초)
const ENCODING_POLL_INTERVAL = 5000;
// 최대 폴링 시간 (30분)
const MAX_ENCODING_WAIT_TIME = 30 * 60 * 1000;

export function useVideoUpload({
  projectId,
  onSuccess,
  onError,
}: UseVideoUploadOptions): UseVideoUploadReturn {
  const [state, setState] = useState<VideoUploadState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number>(0);

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
   * 폴링 정리
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

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
   * Stream 업로드 (FormData 방식)
   *
   * Cloudflare Stream Direct Creator Upload는 FormData를 사용합니다.
   */
  const uploadToStream = async (
    uploadURL: string,
    file: File,
    signal: AbortSignal
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setState((prev) => ({
            ...prev,
            progress,
          }));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          console.error('[Stream Upload] 실패:', xhr.status, xhr.responseText);
          reject(new Error(`Stream 업로드 실패: ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        console.error('[Stream Upload] 네트워크 오류');
        reject(new Error('네트워크 오류'));
      };

      xhr.onabort = () => {
        reject(new Error('업로드가 취소되었습니다'));
      };

      // AbortSignal 연결
      signal.addEventListener('abort', () => {
        xhr.abort();
      });

      // FormData로 파일 업로드
      const formData = new FormData();
      formData.append('file', file);

      xhr.open('POST', uploadURL, true);
      // Content-Type은 자동 설정됨 (multipart/form-data with boundary)
      xhr.send(formData);
    });
  };

  /**
   * Stream 인코딩 상태 폴링
   */
  const pollEncodingStatus = async (
    videoId: string,
    onReady: () => void,
    onError: (error: string) => void
  ): Promise<void> => {
    pollingStartTimeRef.current = Date.now();

    pollingIntervalRef.current = setInterval(async () => {
      // 최대 대기 시간 초과 확인
      if (Date.now() - pollingStartTimeRef.current > MAX_ENCODING_WAIT_TIME) {
        stopPolling();
        onError('인코딩 시간 초과 (30분)');
        return;
      }

      try {
        const response = await fetch(`/api/videos/${videoId}/stream-status`);
        if (!response.ok) {
          console.warn('[Polling] 상태 확인 실패:', response.status);
          return;
        }

        const data = await response.json();

        if (data.ready) {
          stopPolling();
          onReady();
        } else if (data.status === 'error') {
          stopPolling();
          onError(data.errorMessage || '인코딩 중 오류 발생');
        }
        // 그 외의 경우 계속 폴링
      } catch (error) {
        console.warn('[Polling] 에러:', error);
        // 일시적 에러는 무시하고 계속 폴링
      }
    }, ENCODING_POLL_INTERVAL);
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
    async ({ changeNotes, versionName, watermarkEnabled = true }: StartUploadOptions) => {
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

        // 1. 메타데이터 추출 (R2용, Stream은 자동 추출)
        let metadata: VideoMetadata | null = null;
        try {
          metadata = await extractMetadata(state.file);
        } catch {
          console.warn('메타데이터 추출 실패, 계속 진행');
        }

        // 2. 업로드 시작 API 호출
        const initResponse = await fetch(`/api/projects/${projectId}/videos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            original_filename: state.file.name,
            file_size: state.file.size,
            content_type: state.file.type,
            change_notes: changeNotes,
            version_name: versionName,
            watermark_enabled: watermarkEnabled,
          }),
          signal,
        });

        if (!initResponse.ok) {
          const errorData = await initResponse.json();
          throw new Error(errorData.error || '업로드 시작에 실패했습니다');
        }

        const response: UploadResponse = await initResponse.json();
        const { video, upload } = response;

        setState((prev) => ({
          ...prev,
          status: 'uploading',
        }));

        // 3. 업로드 유형에 따라 분기
        if (upload.type === 'stream') {
          // ============================================
          // Cloudflare Stream 직접 업로드
          // ============================================
          await uploadToStream(upload.uploadURL, state.file, signal);

          // 업로드 완료 후 인코딩 상태로 전환
          setState((prev) => ({
            ...prev,
            status: 'processing', // UI에서는 '처리 중'으로 표시
            progress: 100,
          }));

          // 인코딩 완료 폴링 시작
          await new Promise<void>((resolve, reject) => {
            pollEncodingStatus(
              video.id,
              () => {
                setState((prev) => ({
                  ...prev,
                  status: 'completed',
                }));
                onSuccess?.(video.id);
                resolve();
              },
              (error) => {
                setState((prev) => ({
                  ...prev,
                  status: 'error',
                  error,
                }));
                onError?.(error);
                reject(new Error(error));
              }
            );
          });
        } else {
          // ============================================
          // R2 멀티파트 업로드 (폴백)
          // ============================================
          setState((prev) => ({
            ...prev,
            totalParts: upload.totalParts,
          }));

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

          // R2 업로드 완료 API 호출
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
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError' || (error as Error).message === '업로드가 취소되었습니다') {
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
    [state.file, projectId, onSuccess, onError, stopPolling]
  );

  /**
   * 업로드 취소
   */
  const cancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
    xhrRef.current?.abort();
    stopPolling();
    setState((prev) => ({
      ...prev,
      status: 'idle',
      progress: 0,
      currentPart: 0,
    }));
  }, [stopPolling]);

  /**
   * 상태 초기화
   */
  const resetState = useCallback(() => {
    abortControllerRef.current?.abort();
    xhrRef.current?.abort();
    stopPolling();
    setState(initialState);
  }, [stopPolling]);

  return {
    state,
    selectFile,
    startUpload,
    cancelUpload,
    resetState,
  };
}
