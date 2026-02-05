/**
 * 영상 피드백 관련 타입 정의
 */

// 피드백 상태
export type FeedbackStatus = 'open' | 'resolved' | 'wontfix';

// 피드백 기본 타입
export interface VideoFeedback {
  id: string;
  video_id: string;
  project_id: string;
  content: string;
  timestamp_seconds: number;
  position_x: number | null;
  position_y: number | null;
  drawing_image: string | null; // Base64 PNG 이미지
  is_urgent: boolean; // 긴급 피드백 여부
  status: FeedbackStatus;
  resolved_at: string | null;
  resolved_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// 작성자 정보 포함 피드백
export interface FeedbackWithAuthor extends VideoFeedback {
  author: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  resolver?: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
  replies_count?: number;
}

// 피드백 답글
export interface FeedbackReply {
  id: string;
  feedback_id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// 작성자 정보 포함 답글
export interface ReplyWithAuthor extends FeedbackReply {
  author: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

// 피드백 생성 요청
export interface CreateFeedbackRequest {
  content: string;
  timestamp_seconds: number;
  position_x?: number;
  position_y?: number;
  drawing_image?: string;
  is_urgent?: boolean;
}

// 피드백 수정 요청
export interface UpdateFeedbackRequest {
  content?: string;
  status?: FeedbackStatus;
}

// 피드백 목록 응답
export interface FeedbackListResponse {
  feedbacks: FeedbackWithAuthor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 피드백 상세 응답 (답글 포함)
export interface FeedbackDetailResponse {
  feedback: FeedbackWithAuthor;
  replies: ReplyWithAuthor[];
}

// 타임스탬프 포맷 유틸
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

// 상태 라벨
export const feedbackStatusLabels: Record<FeedbackStatus, { label: string; color: string }> = {
  open: { label: '열림', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: '해결됨', color: 'bg-green-100 text-green-700' },
  wontfix: { label: '수정 안함', color: 'bg-gray-100 text-gray-700' },
};
