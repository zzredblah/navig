// 알림 타입 정의

/**
 * 알림 타입
 */
export type NotificationType =
  | 'new_feedback' // 새 피드백 등록
  | 'urgent_feedback' // 긴급 피드백 등록
  | 'feedback_status' // 피드백 상태 변경
  | 'feedback_reply' // 피드백 답글
  | 'new_version' // 새 영상 버전 업로드
  | 'document_status' // 문서 상태 변경
  | 'project_invite' // 프로젝트 초대
  | 'deadline_reminder' // 마감 알림
  | 'chat_message'; // 새 채팅 메시지

/**
 * 알림 인터페이스
 */
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  content?: string;
  link?: string;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

/**
 * 알림 설정 인터페이스
 */
export interface NotificationSettings {
  user_id: string;
  email_new_feedback: boolean;
  email_urgent_feedback: boolean;
  email_version_upload: boolean;
  email_document_status: boolean;
  email_deadline_reminder: boolean;
  email_chat_message: boolean;
  inapp_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 알림 생성 파라미터
 */
export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  content?: string;
  link?: string;
  metadata?: Record<string, any>;
}

/**
 * 알림 목록 조회 쿼리 파라미터
 */
export interface NotificationListQuery {
  page?: number;
  limit?: number;
  unread_only?: boolean;
}

/**
 * 알림 목록 응답
 */
export interface NotificationListResponse {
  data: Notification[];
  total: number;
  unread_count: number;
}
