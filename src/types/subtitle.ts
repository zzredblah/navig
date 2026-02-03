// Video Subtitle Types

export interface VideoSubtitle {
  id: string;
  video_version_id: string;
  language: string;
  format: 'srt' | 'vtt' | 'json';
  content: string;
  duration_seconds: number | null;
  word_count: number | null;
  confidence_score: number | null;
  is_auto_generated: boolean;
  status: 'processing' | 'completed' | 'failed';
  error_message: string | null;
  metadata: SubtitleMetadata;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubtitleMetadata {
  model?: string;
  processing_time_ms?: number;
  source_audio_url?: string;
  [key: string]: unknown;
}

export interface SubtitleSegment {
  id: string;
  subtitle_id: string;
  segment_index: number;
  start_time: number;
  end_time: number;
  text: string;
  confidence: number | null;
  speaker?: string | null;
  created_at: string;
}

// Whisper API response types
export interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

export interface WhisperResponse {
  task: string;
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
}

// SRT format helpers
export interface SRTEntry {
  index: number;
  startTime: string; // "00:00:00,000" format
  endTime: string;
  text: string;
}

// VTT format helpers
export interface VTTEntry {
  startTime: string; // "00:00:00.000" format
  endTime: string;
  text: string;
  settings?: string; // Optional VTT cue settings
}

// API request/response types
export interface GenerateSubtitleRequest {
  video_version_id: string;
  language?: string;
  format?: 'srt' | 'vtt' | 'json';
}

export interface GenerateSubtitleResponse {
  data: VideoSubtitle;
  remaining: number;
}

export interface SubtitleListResponse {
  data: VideoSubtitle[];
}

// Language options for subtitle generation
export const SUBTITLE_LANGUAGES = [
  { code: 'ko', name: '한국어', nativeName: '한국어' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
] as const;

export type SupportedSubtitleLanguage = typeof SUBTITLE_LANGUAGES[number]['code'];

// Subtitle Editor types
export interface SubtitleEditorState {
  segments: SubtitleSegment[];
  editedSegments: Map<string, Partial<SubtitleSegment>>;
  currentTime: number;
  isPlaying: boolean;
  isDirty: boolean;
  selectedSegmentId: string | null;
  qualityIssues: QualityIssue[];
}

export interface QualityIssue {
  segmentId: string;
  type: 'low_confidence' | 'overlap' | 'empty' | 'too_long' | 'too_short';
  message: string;
  severity: 'warning' | 'error';
}

export interface SubtitleOverlayStyle {
  fontSize: 'small' | 'medium' | 'large';
  position: 'bottom' | 'top';
  backgroundColor: string;
  textColor: string;
}

export interface SegmentUpdateRequest {
  id: string;
  text?: string;
  start_time?: number;
  end_time?: number;
}

export interface SegmentsUpdateResponse {
  data: SubtitleSegment[];
  content: string; // Updated full subtitle content
}

// Helper function to format time for display (mm:ss.ms)
export function formatSubtitleTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

// Helper function to parse time from display format
export function parseSubtitleTime(timeStr: string): number {
  const match = timeStr.match(/^(\d+):(\d{2})\.(\d{2})$/);
  if (!match) return 0;
  const [, mins, secs, ms] = match;
  return parseInt(mins) * 60 + parseInt(secs) + parseInt(ms) / 100;
}

// Quality check thresholds
export const QUALITY_THRESHOLDS = {
  MIN_CONFIDENCE: 0.7, // 70%
  MAX_SEGMENT_DURATION: 7, // 7 seconds
  MIN_SEGMENT_DURATION: 0.5, // 0.5 seconds
} as const;
