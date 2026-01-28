/**
 * 영상 버전 관리 시스템 타입 정의
 */

// 영상 상태
export type VideoStatus = 'uploading' | 'processing' | 'ready' | 'error';

// 영상 버전 DB 레코드
export interface VideoVersion {
  id: string;
  project_id: string;
  version_number: number;
  version_name: string | null;
  original_filename: string;
  file_url: string | null;
  thumbnail_url: string | null;
  duration: number | null; // 초 단위
  resolution: string | null; // 예: "1920x1080"
  file_size: number; // bytes
  codec: string | null;
  change_notes: string;
  status: VideoStatus;
  uploaded_by: string;
  created_at: string;
  // 승인 관련 필드
  approved_at: string | null;
  approved_by: string | null;
}

// 영상 버전 with 업로더 정보
export interface VideoVersionWithUploader extends VideoVersion {
  uploader: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
}

// 영상 업로드 요청
export interface CreateVideoVersionRequest {
  original_filename: string;
  file_size: number;
  content_type: string;
  change_notes: string;
  version_name?: string;
}

// 영상 업로드 응답 (Presigned URL 포함)
export interface CreateVideoVersionResponse {
  video: VideoVersion;
  upload: {
    uploadId: string;
    key: string;
    // 멀티파트 업로드용 URL 목록
    partUrls: string[];
    partSize: number;
    totalParts: number;
  };
}

// 업로드 완료 요청
export interface CompleteVideoUploadRequest {
  parts: {
    partNumber: number;
    etag: string;
  }[];
  // 클라이언트에서 추출한 메타데이터
  metadata?: {
    duration?: number;
    resolution?: string;
    codec?: string;
  };
  // 썸네일 (Base64 또는 별도 업로드)
  thumbnailBase64?: string;
}

// 영상 수정 요청
export interface UpdateVideoVersionRequest {
  version_name?: string;
  change_notes?: string;
}

// 영상 목록 조회 쿼리
export interface VideoListQuery {
  page?: number;
  limit?: number;
  status?: VideoStatus;
}

// 영상 목록 응답
export interface VideoListResponse {
  videos: VideoVersionWithUploader[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 클라이언트 측 업로드 상태
export interface VideoUploadState {
  file: File | null;
  progress: number; // 0-100
  status: 'idle' | 'preparing' | 'uploading' | 'processing' | 'completed' | 'error';
  error: string | null;
  currentPart: number;
  totalParts: number;
}

// 클라이언트 측 영상 메타데이터 (HTML5 Video API로 추출)
export interface VideoMetadata {
  duration: number; // 초
  width: number;
  height: number;
  resolution: string; // "widthxheight"
}

// 지원하는 영상 형식
export const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4',
  'video/quicktime', // .mov
  'video/webm',
] as const;

export const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm'] as const;

// 최대 파일 크기 (2GB)
export const MAX_VIDEO_FILE_SIZE = 2 * 1024 * 1024 * 1024;

// 멀티파트 청크 크기 (10MB)
export const MULTIPART_CHUNK_SIZE = 10 * 1024 * 1024;

// 단일 업로드 최대 크기 (10MB)
export const SINGLE_UPLOAD_MAX_SIZE = 10 * 1024 * 1024;

// 썸네일 설정
export const THUMBNAIL_WIDTH = 640;
export const THUMBNAIL_HEIGHT = 360;
export const THUMBNAIL_QUALITY = 0.8;

/**
 * 파일 크기를 사람이 읽기 쉬운 형식으로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * 영상 길이를 mm:ss 형식으로 변환
 */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '--:--';

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 영상 상태에 따른 한글 텍스트
 */
export function getStatusText(status: VideoStatus): string {
  const statusMap: Record<VideoStatus, string> = {
    uploading: '업로드 중',
    processing: '처리 중',
    ready: '준비 완료',
    error: '오류',
  };
  return statusMap[status];
}

/**
 * 영상 상태에 따른 색상 클래스
 */
export function getStatusColor(status: VideoStatus): string {
  const colorMap: Record<VideoStatus, string> = {
    uploading: 'bg-blue-100 text-blue-700',
    processing: 'bg-yellow-100 text-yellow-700',
    ready: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  };
  return colorMap[status];
}

/**
 * 파일이 지원되는 영상 형식인지 확인
 */
export function isValidVideoFile(file: File): boolean {
  return SUPPORTED_VIDEO_FORMATS.includes(
    file.type as (typeof SUPPORTED_VIDEO_FORMATS)[number]
  );
}

/**
 * 파일 크기가 제한 이내인지 확인
 */
export function isValidVideoSize(file: File): boolean {
  return file.size <= MAX_VIDEO_FILE_SIZE;
}
