'use client';

/**
 * 음성 피드백 버튼 컴포넌트
 *
 * 마이크 녹음 → Whisper API로 텍스트 변환 → 피드백 자동 생성
 */

import { useState, useCallback, useEffect } from 'react';
import { Mic, MicOff, Square, Loader2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useVoiceRecorder } from '@/hooks/use-voice-recorder';
import { cn } from '@/lib/utils';
import { formatTimestamp } from '@/types/feedback';

interface VoiceFeedbackButtonProps {
  versionId: string;
  currentTime: number;
  onSuccess?: (feedback: unknown, transcription: { text: string; duration: number }) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  iconOnly?: boolean;
}

type RecordingState = 'idle' | 'recording' | 'processing';

export function VoiceFeedbackButton({
  versionId,
  currentTime,
  onSuccess,
  onError,
  disabled,
  iconOnly = false,
}: VoiceFeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [startTimecode, setStartTimecode] = useState(0);

  const {
    isRecording,
    duration,
    audioBlob,
    error: recorderError,
    startRecording,
    stopRecording,
    resetRecording,
    permissionStatus,
  } = useVoiceRecorder({
    maxDuration: 120, // 최대 2분
    onMaxDurationReached: () => {
      handleStopRecording();
    },
  });

  // 녹음 시작
  const handleStartRecording = useCallback(async () => {
    setError(null);
    setStartTimecode(currentTime);
    await startRecording();
    setState('recording');
  }, [currentTime, startRecording]);

  // 녹음 중지
  const handleStopRecording = useCallback(() => {
    stopRecording();
    setState('idle');
  }, [stopRecording]);

  // 녹음 완료 후 서버 전송
  useEffect(() => {
    if (!audioBlob || isRecording) return;

    const submitVoiceFeedback = async () => {
      setState('processing');
      setError(null);

      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('timecode', String(startTimecode));
        formData.append('language', 'ko');

        const response = await fetch(
          `/api/videos/${versionId}/voice-feedback`,
          {
            method: 'POST',
            body: formData,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '음성 피드백 처리에 실패했습니다.');
        }

        // 성공
        onSuccess?.(data.feedback, data.transcription);
        setIsOpen(false);
        resetRecording();
      } catch (err) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        setError(message);
        onError?.(message);
      } finally {
        setState('idle');
      }
    };

    submitVoiceFeedback();
  }, [audioBlob, isRecording, versionId, startTimecode, onSuccess, onError, resetRecording]);

  // 녹음 오류 처리
  useEffect(() => {
    if (recorderError) {
      setError(recorderError);
      setState('idle');
    }
  }, [recorderError]);

  // 다이얼로그 닫기
  const handleClose = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    resetRecording();
    setState('idle');
    setError(null);
    setIsOpen(false);
  }, [isRecording, stopRecording, resetRecording]);

  // 녹음 시간 포맷
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size={iconOnly ? 'icon' : 'sm'}
              onClick={() => setIsOpen(true)}
              disabled={disabled}
              className={iconOnly
                ? 'h-8 w-8 text-primary-600 border-primary-200 hover:bg-primary-50'
                : 'text-primary-600 border-primary-200 hover:bg-primary-50'
              }
            >
              <Mic className="h-4 w-4" />
              {!iconOnly && <span className="ml-1">음성</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>음성으로 피드백 작성 (Pro)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary-600" />
              음성 피드백
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 권한 거부 상태 */}
            {permissionStatus === 'denied' && (
              <div className="flex items-start gap-3 p-3 bg-red-50 text-red-700 rounded-lg">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">마이크 권한이 거부되었습니다</p>
                  <p className="mt-1 text-red-600">
                    브라우저 설정에서 마이크 권한을 허용해주세요.
                  </p>
                </div>
              </div>
            )}

            {/* 에러 표시 */}
            {error && (
              <div className="flex items-start gap-3 p-3 bg-red-50 text-red-700 rounded-lg">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-sm flex-1">
                  <p>{error}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setError(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* 녹음 UI */}
            <div className="flex flex-col items-center py-6">
              {state === 'processing' ? (
                <>
                  <Loader2 className="h-16 w-16 text-primary-600 animate-spin" />
                  <p className="mt-4 text-gray-600">음성을 텍스트로 변환하고 있습니다...</p>
                </>
              ) : isRecording ? (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-75" />
                    <div className="relative w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
                      <Mic className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <p className="mt-4 text-2xl font-mono font-bold text-gray-900">
                    {formatDuration(duration)}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    타임코드 {formatTimestamp(startTimecode)}에서 녹음 중
                  </p>
                  <p className="text-xs text-gray-400 mt-1">최대 2분</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                    <Mic className="h-8 w-8 text-primary-600" />
                  </div>
                  <p className="mt-4 text-gray-600">
                    버튼을 눌러 음성 녹음을 시작하세요
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    현재 위치: {formatTimestamp(currentTime)}
                  </p>
                </>
              )}
            </div>

            {/* 녹음 컨트롤 버튼 */}
            <div className="flex justify-center gap-3">
              {state === 'processing' ? (
                <Button disabled className="w-32">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  변환 중...
                </Button>
              ) : isRecording ? (
                <Button
                  onClick={handleStopRecording}
                  variant="destructive"
                  className="w-32"
                >
                  <Square className="h-4 w-4 mr-2" />
                  녹음 완료
                </Button>
              ) : (
                <Button
                  onClick={handleStartRecording}
                  disabled={permissionStatus === 'denied'}
                  className={cn(
                    'w-32',
                    permissionStatus === 'denied'
                      ? 'bg-gray-400'
                      : 'bg-primary-600 hover:bg-primary-700'
                  )}
                >
                  <Mic className="h-4 w-4 mr-2" />
                  녹음 시작
                </Button>
              )}

              <Button variant="outline" onClick={handleClose} className="w-24">
                취소
              </Button>
            </div>

            {/* 안내 메시지 */}
            <p className="text-xs text-gray-400 text-center">
              녹음된 음성은 AI를 통해 자동으로 텍스트로 변환됩니다.
              <br />
              Pro 플랜 이상에서 사용 가능합니다.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
