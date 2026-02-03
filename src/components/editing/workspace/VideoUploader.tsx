'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, Video, Loader2, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VideoUploaderProps {
  projectId: string;
  editProjectId: string;
  onUploadComplete: (videoUrl: string, duration: number) => void;
}

interface UploadProgress {
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
}

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

// 파일에서 영상 duration 추출
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('영상 메타데이터 로드 실패'));
    };

    video.src = URL.createObjectURL(file);
  });
}

export function VideoUploader({ projectId, editProjectId, onUploadComplete }: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'MP4, MOV, WebM, AVI 형식만 지원됩니다';
    }
    if (file.size > MAX_FILE_SIZE) {
      return '파일 크기는 5GB 이하만 가능합니다';
    }
    return null;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    abortControllerRef.current = new AbortController();
    setUploadProgress({ status: 'uploading', progress: 0, message: '업로드 시작...' });

    try {
      // 1. 업로드 초기화 - 편집 프로젝트에 영상 업로드
      const initResponse = await fetch(`/api/projects/${projectId}/edits/${editProjectId}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          fileSize: selectedFile.size,
          contentType: selectedFile.type,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!initResponse.ok) {
        const error = await initResponse.json();
        throw new Error(error.error || '업로드 초기화 실패');
      }

      const { uploadId, key, parts: partUrls } = await initResponse.json();
      const totalParts = Math.ceil(selectedFile.size / CHUNK_SIZE);
      const uploadedParts: { partNumber: number; etag: string }[] = [];

      // 2. 청크 업로드
      for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
        if (abortControllerRef.current.signal.aborted) {
          throw new Error('업로드가 취소되었습니다');
        }

        const start = (partNumber - 1) * CHUNK_SIZE;
        const end = Math.min(partNumber * CHUNK_SIZE, selectedFile.size);
        const chunk = selectedFile.slice(start, end);

        // Presigned URL 가져오기 (이미 받았거나 새로 요청)
        let presignedUrl = partUrls?.[partNumber - 1];
        if (!presignedUrl) {
          const urlResponse = await fetch(`/api/projects/${projectId}/edits/${editProjectId}/upload/part-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uploadId, key, partNumber }),
            signal: abortControllerRef.current.signal,
          });
          if (!urlResponse.ok) {
            throw new Error('Presigned URL 생성 실패');
          }
          const urlData = await urlResponse.json();
          presignedUrl = urlData.url;
        }

        // 청크 업로드
        const uploadResponse = await fetch(presignedUrl, {
          method: 'PUT',
          body: chunk,
          signal: abortControllerRef.current.signal,
        });

        if (!uploadResponse.ok) {
          throw new Error(`파트 ${partNumber} 업로드 실패`);
        }

        const etag = uploadResponse.headers.get('ETag') || `"${partNumber}"`;
        uploadedParts.push({ partNumber, etag: etag.replace(/"/g, '') });

        const progress = Math.round((partNumber / totalParts) * 80); // 80%까지는 업로드
        setUploadProgress({
          status: 'uploading',
          progress,
          message: `업로드 중... (${partNumber}/${totalParts})`,
        });
      }

      // 3. 영상 duration 추출
      setUploadProgress({ status: 'processing', progress: 85, message: '영상 정보 분석 중...' });

      let videoDuration = 0;
      try {
        // 로컬 파일에서 duration 추출
        videoDuration = await getVideoDuration(selectedFile);
      } catch (e) {
        console.warn('Duration 추출 실패:', e);
      }

      // 4. 업로드 완료
      setUploadProgress({ status: 'processing', progress: 90, message: '처리 중...' });

      const completeResponse = await fetch(`/api/projects/${projectId}/edits/${editProjectId}/upload-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, key, parts: uploadedParts, duration: videoDuration }),
        signal: abortControllerRef.current.signal,
      });

      if (!completeResponse.ok) {
        const error = await completeResponse.json();
        throw new Error(error.error || '업로드 완료 처리 실패');
      }

      const { sourceUrl } = await completeResponse.json();

      setUploadProgress({ status: 'complete', progress: 100, message: '완료!' });
      toast.success('영상 업로드 완료');

      // 부모에게 알림
      setTimeout(() => {
        onUploadComplete(sourceUrl, videoDuration);
      }, 500);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setUploadProgress({ status: 'idle', progress: 0, message: '' });
        return;
      }

      console.error('업로드 실패:', error);
      setUploadProgress({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : '업로드 실패',
      });
      toast.error(error instanceof Error ? error.message : '업로드에 실패했습니다');
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setSelectedFile(null);
    setUploadProgress({ status: 'idle', progress: 0, message: '' });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {!selectedFile ? (
        // 파일 선택 UI
        <div
          className={cn(
            'w-full max-w-lg border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer',
            isDragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            영상 파일을 드래그하거나 클릭하여 선택
          </p>
          <p className="text-sm text-gray-500">
            MP4, MOV, WebM, AVI (최대 5GB)
          </p>
        </div>
      ) : uploadProgress.status === 'idle' ? (
        // 파일 선택됨 - 업로드 전
        <div className="w-full max-w-lg border rounded-xl p-6 bg-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Video className="h-6 w-6 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleUpload} className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            업로드 시작
          </Button>
        </div>
      ) : uploadProgress.status === 'complete' ? (
        // 업로드 완료
        <div className="w-full max-w-lg border rounded-xl p-6 bg-white text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">업로드 완료!</p>
          <p className="text-sm text-gray-500">워크스페이스를 불러오는 중...</p>
        </div>
      ) : uploadProgress.status === 'error' ? (
        // 업로드 오류
        <div className="w-full max-w-lg border border-red-200 rounded-xl p-6 bg-red-50 text-center">
          <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-red-900 mb-2">업로드 실패</p>
          <p className="text-sm text-red-600 mb-4">{uploadProgress.message}</p>
          <Button variant="outline" onClick={handleCancel}>
            다시 시도
          </Button>
        </div>
      ) : (
        // 업로드/처리 중
        <div className="w-full max-w-lg border rounded-xl p-6 bg-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-primary-600 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{uploadProgress.message}</p>
              <p className="text-sm text-gray-500">{uploadProgress.progress}%</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              취소
            </Button>
          </div>
          <Progress value={uploadProgress.progress} className="h-2" />
        </div>
      )}
    </div>
  );
}
