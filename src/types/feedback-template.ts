/**
 * 피드백 템플릿 타입 정의
 */

// 피드백 템플릿
export interface FeedbackTemplate {
  id: string;
  title: string;
  content: string;
  is_urgent: boolean;
  order: number;
  created_at: string;
}

// 템플릿 생성 요청
export interface CreateTemplateRequest {
  title: string;
  content: string;
  is_urgent?: boolean;
}

// 템플릿 수정 요청
export interface UpdateTemplateRequest {
  title?: string;
  content?: string;
  is_urgent?: boolean;
  order?: number;
}

// 템플릿 순서 변경 요청
export interface ReorderTemplatesRequest {
  templateIds: string[];
}

// 템플릿 최대 개수
export const MAX_TEMPLATES = 20;

// 빈 템플릿 생성
export function createEmptyTemplate(): Omit<FeedbackTemplate, 'id' | 'created_at'> {
  return {
    title: '',
    content: '',
    is_urgent: false,
    order: 0,
  };
}

// 기본 템플릿 (영상 피드백에 자주 사용되는 템플릿)
export const DEFAULT_TEMPLATES: Omit<FeedbackTemplate, 'id' | 'created_at' | 'order'>[] = [
  {
    title: '컷 길이 조절',
    content: '이 부분 컷이 너무 깁니다. 좀 더 짧게 편집해주세요.',
    is_urgent: false,
  },
  {
    title: '색보정 필요',
    content: '색감이 다른 장면과 맞지 않습니다. 색보정 부탁드립니다.',
    is_urgent: false,
  },
  {
    title: '자막 오타',
    content: '자막에 오타가 있습니다. 수정 부탁드립니다.',
    is_urgent: false,
  },
  {
    title: '자막 타이밍',
    content: '자막 타이밍이 맞지 않습니다. 조정 부탁드립니다.',
    is_urgent: false,
  },
  {
    title: 'BGM 볼륨',
    content: '배경음악 볼륨이 너무 큽니다. 낮춰주세요.',
    is_urgent: false,
  },
  {
    title: '효과음 추가',
    content: '이 부분에 효과음을 추가해주세요.',
    is_urgent: false,
  },
  {
    title: '트랜지션 수정',
    content: '장면 전환이 어색합니다. 다른 트랜지션으로 변경해주세요.',
    is_urgent: false,
  },
  {
    title: '좋습니다',
    content: '이 부분 좋습니다! 그대로 유지해주세요.',
    is_urgent: false,
  },
  {
    title: '삭제 요청',
    content: '이 부분은 삭제해주세요.',
    is_urgent: false,
  },
  {
    title: '긴급 수정',
    content: '급하게 수정이 필요합니다. 우선 처리 부탁드립니다.',
    is_urgent: true,
  },
];
