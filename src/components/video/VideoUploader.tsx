'use client';

/**
 * 영상 업로드 컴포넌트
 *
 * 기능:
 * - 드래그 앤 드롭 파일 선택
 * - 클릭으로 파일 선택
 * - 업로드 진행률 표시
 * - 변경사항 입력
 */

import { useCallback, useRef, useState } from 'react';
import { Upload, X, Video, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useVideoUpload } from '@/hooks/use-video-upload';
import {
  formatFileSize,
  SUPPORTED_VIDEO_EXTENSIONS,
  MAX_VIDEO_FILE_SIZE,
} from '@/types/video';
import { cn } from '@/lib/utils';

interface VideoUploaderProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function VideoUploader({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: VideoUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');
  const [versionName, setVersionName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { state, selectFile, startUpload, cancelUpload, resetState } =
    useVideoUpload({
      projectId,
      onSuccess: () => {
        onSuccess?.();
        handleClose();
      },
    });

  const handleClose = useCallback(() => {
    if (state.status === 'uploading' || state.status === 'processing') {
      const confirmed = window.confirm(
        '업로드 중입니다. 취소하시겠습니까?'
      );
      if (!confirmed) return;
      cancelUpload();
    }

    resetState();
    setChangeNotes('');
    setVersionName('');
    onOpenChange(false);
  }, [state.status, cancelUpload, resetState, onOpenChange]);

  // 드래그 앤 드롭 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        selectFile(file);
      }
    },
    [selectFile]
  );

  // 파일 선택 핸들러
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        selectFile(file);
      }
    },
    [selectFile]
  );

  // 업로드 시작
  const handleSubmit = useCallback(async () => {
    if (!changeNotes.trim()) {
      return;
    }
    await startUpload(changeNotes.trim(), versionName.trim() || undefined);
  }, [changeNotes, versionName, startUpload]);

  // 파일 선택 취소
  const handleRemoveFile = useCallback(() => {
    resetState();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [resetState]);

  const isUploading =
    state.status === 'uploading' ||
    state.status === 'processing' ||
    state.status === 'preparing';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>새 영상 버전 업로드</DialogTitle>
          <DialogDescription>
            영상 파일을 업로드하고 변경 사항을 입력하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 파일 드롭 영역 */}
          {!state.file && state.status !== 'completed' && (
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragOver
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={SUPPORTED_VIDEO_EXTENSIONS.join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-1">
                영상 파일을 드래그하거나 클릭하여 선택
              </p>
              <p className="text-xs text-gray-400">
                MP4, MOV, WebM (최대 {formatFileSize(MAX_VIDEO_FILE_SIZE)})
              </p>
            </div>
          )}

          {/* 선택된 파일 정보 */}
          {state.file && state.status !== 'completed' && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                <Video className="h-5 w-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {state.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(state.file.size)}
                </p>
              </div>
              {!isUploading && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={handleRemoveFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* 업로드 진행률 */}
          {isUploading && (
            <div className="space-y-2">
              <Progress value={state.progress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {state.status === 'preparing' && '준비 중...'}
                  {state.status === 'uploading' &&
                    `업로드 중... (${state.currentPart}/${state.totalParts})`}
                  {state.status === 'processing' && '처리 중...'}
                </span>
                <span>{state.progress}%</span>
              </div>
            </div>
          )}

          {/* 완료 상태 */}
          {state.status === 'completed' && (
            <div className="flex flex-col items-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
              <p className="text-sm font-medium text-gray-900">
                업로드 완료!
              </p>
            </div>
          )}

          {/* 에러 메시지 */}
          {state.error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          {/* 입력 필드 */}
          {state.file && !isUploading && state.status !== 'completed' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  버전 이름 (선택)
                </label>
                <Input
                  placeholder="예: 최종본, 수정 v2"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  변경 사항 <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="이번 버전에서 변경된 내용을 설명해주세요..."
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            {isUploading ? (
              <Button variant="outline" onClick={cancelUpload}>
                취소
              </Button>
            ) : state.status === 'completed' ? (
              <Button onClick={handleClose}>닫기</Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose}>
                  취소
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!state.file || !changeNotes.trim()}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      업로드 중...
                    </>
                  ) : (
                    '업로드'
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
