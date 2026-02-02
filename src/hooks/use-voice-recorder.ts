/**
 * 음성 녹음 훅
 *
 * 마이크로 음성을 녹음하고 Blob으로 반환합니다.
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVoiceRecorderOptions {
  maxDuration?: number; // 최대 녹음 시간 (초), 기본 120초
  onMaxDurationReached?: () => void;
}

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // 녹음 시간 (초)
  audioBlob: Blob | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'checking';
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const { maxDuration = 120, onMaxDurationReached } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<
    'granted' | 'denied' | 'prompt' | 'checking'
  >('checking');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  // 권한 상태 확인
  useEffect(() => {
    async function checkPermission() {
      try {
        // Check if navigator.permissions is available
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');

          result.addEventListener('change', () => {
            setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
          });
        } else {
          // Safari doesn't support permissions.query for microphone
          setPermissionStatus('prompt');
        }
      } catch {
        // Fallback for browsers that don't support permissions API
        setPermissionStatus('prompt');
      }
    }

    checkPermission();
  }, []);

  // 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      chunksRef.current = [];

      // 마이크 접근 요청
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;
      setPermissionStatus('granted');

      // MediaRecorder 생성
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setIsRecording(false);
        setIsPaused(false);

        // 스트림 정리
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // 타이머 정리
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // 1초마다 데이터 수집

      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;

      // 타이머 시작
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000);
        setDuration(elapsed);

        // 최대 녹음 시간 체크
        if (elapsed >= maxDuration) {
          stopRecording();
          onMaxDurationReached?.();
        }
      }, 100);
    } catch (err) {
      console.error('[VoiceRecorder] 녹음 시작 실패:', err);

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('마이크 사용 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
          setPermissionStatus('denied');
        } else if (err.name === 'NotFoundError') {
          setError('마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.');
        } else {
          setError('마이크 접근에 실패했습니다.');
        }
      } else {
        setError('녹음을 시작할 수 없습니다.');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxDuration, onMaxDurationReached]);

  // 녹음 중지
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // 녹음 일시정지
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);

      // 일시정지 시작 시간 기록
      pausedDurationRef.current = Date.now() - startTimeRef.current - duration * 1000;
    }
  }, [duration]);

  // 녹음 재개
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      // 일시정지 시간 누적
      startTimeRef.current = Date.now() - duration * 1000;
    }
  }, [duration]);

  // 녹음 리셋
  const resetRecording = useCallback(() => {
    // 진행 중인 녹음 중지
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // 스트림 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // 타이머 정리
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 상태 초기화
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setAudioBlob(null);
    setError(null);
    chunksRef.current = [];
  }, []);

  return {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    permissionStatus,
  };
}
