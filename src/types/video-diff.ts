/**
 * AI 영상 차이점 감지 타입 정의
 */

export type DiffAnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ChangeMarkerType = 'visual' | 'audio' | 'text' | 'effect' | 'other';

export interface VideoDiffAnalysis {
  id: string;
  version_id: string;
  compared_version_id: string;
  status: DiffAnalysisStatus;
  error_message: string | null;
  markers_count: number;
  processing_time_ms: number | null;
  model: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
}

export interface ChangeMarker {
  id: string;
  version_id: string;
  compared_version_id: string | null;
  type: ChangeMarkerType;
  start_time: number;
  end_time: number;
  description: string | null;
  is_ai_generated: boolean;
  confidence: number | null;
  ai_metadata: Record<string, unknown> | null;
  created_by: string;
  created_at: string;
  creator?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

export interface AnalyzeVideoDiffRequest {
  version_id: string;
  compared_version_id: string;
}

export interface AnalyzeVideoDiffResponse {
  analysis: VideoDiffAnalysis;
  markers: ChangeMarker[];
}

export interface AIDetectedChange {
  type: ChangeMarkerType;
  start_time: number;
  end_time: number;
  description: string;
  confidence: number;
}

export const CHANGE_TYPE_LABELS: Record<ChangeMarkerType, string> = {
  visual: '영상',
  audio: '오디오',
  text: '텍스트/자막',
  effect: '효과/트랜지션',
  other: '기타',
};

export const CHANGE_TYPE_COLORS: Record<ChangeMarkerType, string> = {
  visual: 'bg-blue-100 text-blue-700 border-blue-200',
  audio: 'bg-green-100 text-green-700 border-green-200',
  text: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  effect: 'bg-purple-100 text-purple-700 border-purple-200',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
};
