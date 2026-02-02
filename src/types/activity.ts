/**
 * 활동 로그 (타임라인) 타입 정의
 */

// 활동 유형
export type ActivityType =
  | 'project_created'      // 프로젝트 생성
  | 'project_updated'      // 프로젝트 수정
  | 'member_invited'       // 멤버 초대
  | 'member_joined'        // 멤버 참여 (초대 수락)
  | 'member_removed'       // 멤버 제거
  | 'video_uploaded'       // 영상 업로드
  | 'version_uploaded'     // 새 버전 업로드
  | 'feedback_created'     // 피드백 작성
  | 'feedback_resolved'    // 피드백 해결
  | 'feedback_reopened'    // 피드백 재오픈
  | 'document_created'     // 문서 생성
  | 'document_updated'     // 문서 수정
  | 'video_approved'       // 영상 승인
  | 'board_created';       // 보드 생성

// 대상 유형
export type TargetType =
  | 'project'
  | 'member'
  | 'video'
  | 'version'
  | 'feedback'
  | 'document'
  | 'board';

// 활동 로그 인터페이스
export interface ActivityLog {
  id: string;
  project_id: string;
  user_id: string;
  activity_type: ActivityType;
  title: string;
  description?: string | null;
  target_type?: TargetType | null;
  target_id?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// 사용자 정보 포함 활동 로그
export interface ActivityLogWithUser extends ActivityLog {
  user: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
}

// 활동 로그 생성 파라미터
export interface CreateActivityLogParams {
  projectId: string;
  userId: string;
  activityType: ActivityType;
  title: string;
  description?: string;
  targetType?: TargetType;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

// 활동 목록 쿼리 파라미터
export interface ActivityListQuery {
  page?: number;
  limit?: number;
  activity_type?: ActivityType;
}

// 활동 목록 응답
export interface ActivityListResponse {
  data: ActivityLogWithUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 활동 타입별 아이콘/색상 매핑 (UI용)
export const ACTIVITY_TYPE_CONFIG: Record<ActivityType, {
  label: string;
  icon: string;
  color: string;
}> = {
  project_created: {
    label: '프로젝트 생성',
    icon: 'FolderPlus',
    color: 'primary',
  },
  project_updated: {
    label: '프로젝트 수정',
    icon: 'FolderEdit',
    color: 'gray',
  },
  member_invited: {
    label: '멤버 초대',
    icon: 'UserPlus',
    color: 'blue',
  },
  member_joined: {
    label: '멤버 참여',
    icon: 'UserCheck',
    color: 'green',
  },
  member_removed: {
    label: '멤버 제거',
    icon: 'UserMinus',
    color: 'red',
  },
  video_uploaded: {
    label: '영상 업로드',
    icon: 'Video',
    color: 'purple',
  },
  version_uploaded: {
    label: '새 버전 업로드',
    icon: 'Upload',
    color: 'purple',
  },
  feedback_created: {
    label: '피드백 작성',
    icon: 'MessageSquare',
    color: 'orange',
  },
  feedback_resolved: {
    label: '피드백 해결',
    icon: 'CheckCircle',
    color: 'green',
  },
  feedback_reopened: {
    label: '피드백 재오픈',
    icon: 'RotateCcw',
    color: 'yellow',
  },
  document_created: {
    label: '문서 생성',
    icon: 'FileText',
    color: 'blue',
  },
  document_updated: {
    label: '문서 수정',
    icon: 'FileEdit',
    color: 'gray',
  },
  video_approved: {
    label: '영상 승인',
    icon: 'ThumbsUp',
    color: 'green',
  },
  board_created: {
    label: '보드 생성',
    icon: 'LayoutGrid',
    color: 'primary',
  },
};
