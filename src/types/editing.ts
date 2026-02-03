/**
 * NAVIG Editing Types
 * 편집 워크스페이스 관련 타입 정의
 */

// ============================================
// Enums
// ============================================

export type EditProjectStatus = 'draft' | 'registered' | 'approved' | 'rejected';

// ============================================
// Edit Metadata
// ============================================

/** 트림 설정 */
export interface TrimSettings {
  startTime: number;
  endTime: number;
}

/** 텍스트 오버레이 스타일 */
export interface TextOverlayStyle {
  fontSize: number;
  color: string;
  backgroundColor?: string;
  fontWeight?: 'normal' | 'bold';
  fontFamily?: string;
}

/** 텍스트 오버레이 위치 (0-100 퍼센트) */
export interface TextOverlayPosition {
  x: number;
  y: number;
}

/** 텍스트 오버레이 */
export interface TextOverlay {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  position: TextOverlayPosition;
  style: TextOverlayStyle;
}

/** CSS 필터 설정 */
export interface FilterSettings {
  brightness: number;   // 0-200, 기본 100
  contrast: number;     // 0-200, 기본 100
  saturation: number;   // 0-200, 기본 100
  grayscale: number;    // 0-100, 기본 0
}

/** 오디오 설정 */
export interface AudioSettings {
  volume: number;       // 0-100
  muted: boolean;
}

/** 편집 메타데이터 전체 */
export interface EditMetadata {
  // 트림 (자르기)
  trim: TrimSettings;

  // 재생 속도 (0.25 ~ 4.0)
  speed: number;

  // 텍스트 오버레이
  textOverlays: TextOverlay[];

  // CSS 필터 (미리보기 전용)
  filters: FilterSettings;

  // 오디오
  audio: AudioSettings;

  // 자막 참조 ID
  subtitleId?: string;
}

/** 기본 편집 메타데이터 */
export const DEFAULT_EDIT_METADATA: EditMetadata = {
  trim: {
    startTime: 0,
    endTime: 0,
  },
  speed: 1,
  textOverlays: [],
  filters: {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
  },
  audio: {
    volume: 100,
    muted: false,
  },
};

/** 기본 필터 설정 */
export const DEFAULT_FILTERS: FilterSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
};

// ============================================
// Edit Project
// ============================================

/** 편집 프로젝트 DB Row */
export interface EditProject {
  id: string;
  project_id: string;
  source_video_id: string | null;
  source_url: string | null;
  source_key: string | null;
  original_duration: number | null;
  title: string;
  description: string | null;
  status: EditProjectStatus;
  edit_metadata: EditMetadata;
  preview_thumbnail_url: string | null;
  registered_at: string | null;
  registered_video_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** 편집 프로젝트 생성 입력 */
export interface CreateEditProjectInput {
  project_id: string;
  title: string;
  description?: string;
  source_video_id?: string;
}

/** 편집 프로젝트 수정 입력 */
export interface UpdateEditProjectInput {
  title?: string;
  description?: string;
  edit_metadata?: Partial<EditMetadata>;
  preview_thumbnail_url?: string;
}

/** 편집 프로젝트 (조인된 데이터) */
export interface EditProjectWithDetails extends EditProject {
  creator?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  source_video?: {
    id: string;
    version_name: string | null;
    original_filename: string;
    thumbnail_url: string | null;
    hls_url: string | null;
    duration: number | null;
  } | null;
}

// ============================================
// Workspace State
// ============================================

/** 워크스페이스 도구 타입 */
export type EditTool = 'trim' | 'text' | 'filter' | 'speed' | 'audio' | 'subtitle';

/** 필터 프리셋 */
export interface FilterPreset {
  name: string;
  label: string;
  filters: FilterSettings;
}

/** 필터 프리셋 목록 */
export const FILTER_PRESETS: FilterPreset[] = [
  {
    name: 'normal',
    label: '일반',
    filters: { brightness: 100, contrast: 100, saturation: 100, grayscale: 0 },
  },
  {
    name: 'warm',
    label: '따뜻한',
    filters: { brightness: 105, contrast: 105, saturation: 120, grayscale: 0 },
  },
  {
    name: 'cool',
    label: '차가운',
    filters: { brightness: 100, contrast: 110, saturation: 80, grayscale: 0 },
  },
  {
    name: 'vintage',
    label: '빈티지',
    filters: { brightness: 95, contrast: 120, saturation: 70, grayscale: 20 },
  },
  {
    name: 'bw',
    label: '흑백',
    filters: { brightness: 100, contrast: 110, saturation: 0, grayscale: 100 },
  },
];

/** 속도 프리셋 */
export const SPEED_PRESETS = [
  { value: 0.25, label: '0.25x' },
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
  { value: 4, label: '4x' },
];

// ============================================
// API Types
// ============================================

/** 업로드 시작 응답 */
export interface StartUploadResponse {
  uploadId: string;
  key: string;
  presignedUrls: string[];
}

/** 업로드 완료 요청 */
export interface CompleteUploadRequest {
  uploadId: string;
  key: string;
  parts: Array<{
    PartNumber: number;
    ETag: string;
  }>;
  originalFilename: string;
  fileSize: number;
  contentType: string;
}

/** 등록 요청 */
export interface RegisterEditRequest {
  versionName?: string;
  changeNotes?: string;
}

/** 등록 응답 */
export interface RegisterEditResponse {
  videoVersionId: string;
  message: string;
}
