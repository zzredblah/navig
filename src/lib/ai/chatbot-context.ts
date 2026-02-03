/**
 * AI 챗봇 컨텍스트 조회 유틸리티
 * - 계정 전체 정보 기반 (모든 프로젝트, 피드백 등)
 */

import { createAdminClient } from '@/lib/supabase/server';
import type {
  ChatbotContext,
  ChatbotProjectContext,
  ChatbotFeedbackStats,
  ChatbotUserContext,
  FAQPattern,
  ChatbotSource,
} from '@/types/chatbot';

// 프로젝트 요약 정보
interface ProjectSummary {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  memberCount: number;
  feedbackCount: number;
  pendingFeedbackCount: number;
}

// 확장된 계정 컨텍스트
export interface AccountContext {
  user: ChatbotUserContext;
  projects: ProjectSummary[];
  totalStats: {
    projectCount: number;
    totalFeedbacks: number;
    pendingFeedbacks: number;
    urgentFeedbacks: number;
    resolvedFeedbacks: number;
  };
  recentActivity?: string[];
}

/**
 * 프로젝트 정보 조회
 */
export async function getProjectContext(
  projectId: string
): Promise<ChatbotProjectContext | null> {
  const adminClient = createAdminClient();

  // 프로젝트 기본 정보
  const { data: project, error: projectError } = await adminClient
    .from('projects')
    .select('title, status, deadline, description')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    console.error('[Chatbot] 프로젝트 조회 실패:', projectError);
    return null;
  }

  // 프로젝트 멤버 조회
  const { data: members } = await adminClient
    .from('project_members')
    .select(
      `
      role,
      user:profiles!project_members_user_id_fkey(name)
    `
    )
    .eq('project_id', projectId)
    .not('joined_at', 'is', null);

  const memberList =
    members?.map((m) => ({
      name: (m.user as { name: string } | null)?.name || '알 수 없음',
      role: m.role,
    })) || [];

  return {
    title: project.title,
    status: project.status,
    deadline: project.deadline,
    description: project.description,
    members: memberList,
  };
}

/**
 * 피드백 통계 조회
 */
export async function getFeedbackStats(
  projectId: string
): Promise<ChatbotFeedbackStats | null> {
  const adminClient = createAdminClient();

  // 프로젝트의 모든 영상 ID 조회
  const { data: videos } = await adminClient
    .from('video_versions')
    .select('id')
    .eq('project_id', projectId);

  if (!videos || videos.length === 0) {
    return {
      total: 0,
      pending: 0,
      urgent: 0,
      resolved: 0,
    };
  }

  const videoIds = videos.map((v) => v.id);

  // 피드백 통계 조회
  const { data: feedbacks } = await adminClient
    .from('video_feedbacks')
    .select('status, is_urgent')
    .in('video_id', videoIds);

  if (!feedbacks) {
    return {
      total: 0,
      pending: 0,
      urgent: 0,
      resolved: 0,
    };
  }

  return {
    total: feedbacks.length,
    pending: feedbacks.filter((f) => f.status === 'open').length,
    urgent: feedbacks.filter((f) => f.is_urgent === true).length,
    resolved: feedbacks.filter((f) => f.status === 'resolved').length,
  };
}

/**
 * 사용자 정보 조회
 */
export async function getUserContext(
  userId: string
): Promise<ChatbotUserContext | null> {
  const adminClient = createAdminClient();

  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('name, role')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    console.error('[Chatbot] 사용자 조회 실패:', error);
    return null;
  }

  return {
    name: profile.name || '사용자',
    role: profile.role as 'client' | 'worker' | 'admin',
  };
}

/**
 * 전체 컨텍스트 조회
 */
export async function getChatbotContext(
  userId: string,
  projectId?: string
): Promise<ChatbotContext | null> {
  const userContext = await getUserContext(userId);

  if (!userContext) {
    return null;
  }

  const context: ChatbotContext = {
    user: userContext,
  };

  if (projectId) {
    const [projectContext, feedbackStats] = await Promise.all([
      getProjectContext(projectId),
      getFeedbackStats(projectId),
    ]);

    if (projectContext) {
      context.project = projectContext;
    }

    if (feedbackStats) {
      context.feedbackStats = feedbackStats;
    }
  }

  return context;
}

/**
 * 컨텍스트를 프롬프트 문자열로 변환
 */
export function formatContextForPrompt(context: ChatbotContext): string {
  const lines: string[] = [];

  lines.push(`## 현재 사용자`);
  lines.push(`- 이름: ${context.user.name}`);
  lines.push(
    `- 역할: ${context.user.role === 'client' ? '의뢰인' : context.user.role === 'worker' ? '작업자' : '관리자'}`
  );

  if (context.project) {
    lines.push('');
    lines.push(`## 현재 프로젝트`);
    lines.push(`- 제목: ${context.project.title}`);
    lines.push(`- 상태: ${formatStatus(context.project.status)}`);
    lines.push(
      `- 마감일: ${context.project.deadline ? formatDate(context.project.deadline) : '미정'}`
    );

    if (context.project.description) {
      lines.push(`- 설명: ${context.project.description}`);
    }

    if (context.project.members.length > 0) {
      lines.push(`- 팀원:`);
      context.project.members.forEach((m) => {
        lines.push(`  - ${m.name} (${formatRole(m.role)})`);
      });
    }
  }

  if (context.feedbackStats) {
    lines.push('');
    lines.push(`## 피드백 현황`);
    lines.push(`- 전체: ${context.feedbackStats.total}개`);
    lines.push(`- 미해결: ${context.feedbackStats.pending}개`);
    lines.push(`- 긴급: ${context.feedbackStats.urgent}개`);
    lines.push(`- 해결됨: ${context.feedbackStats.resolved}개`);
  }

  return lines.join('\n');
}

// 상태 포맷팅
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    draft: '초안',
    active: '진행중',
    review: '검토중',
    completed: '완료',
    archived: '보관됨',
  };
  return statusMap[status] || status;
}

// 역할 포맷팅
function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    owner: '소유자',
    editor: '편집자',
    reviewer: '리뷰어',
    viewer: '뷰어',
  };
  return roleMap[role] || role;
}

// 날짜 포맷팅
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}월 ${day}일`;
}

/**
 * FAQ 패턴 정의
 */
export const FAQ_PATTERNS: FAQPattern[] = [
  // 피드백 관련
  {
    pattern: /피드백.*(어떻게|방법|남기|작성|달)/i,
    answer:
      '피드백을 남기려면:\n1. 영상 상세 페이지로 이동하세요\n2. 원하는 시점에서 영상을 일시정지하세요\n3. 화면 우측 피드백 패널에서 내용을 입력하세요\n4. 긴급도를 선택하고 "피드백 추가" 버튼을 클릭하세요\n\n타임코드가 자동으로 저장됩니다!',
    source: { type: 'faq', title: '피드백 작성 방법' },
  },
  {
    pattern: /피드백.*(확인|보|조회)/i,
    answer:
      '피드백을 확인하려면:\n1. 프로젝트 > 영상 탭으로 이동하세요\n2. 영상을 클릭하면 우측에 피드백 목록이 표시됩니다\n3. 피드백을 클릭하면 해당 타임코드로 이동합니다\n\n필터를 사용해 미해결/긴급 피드백만 볼 수도 있어요!',
    source: { type: 'faq', title: '피드백 확인 방법' },
  },

  // 영상 관련
  {
    pattern: /영상.*(업로드|올리|추가)/i,
    answer:
      '영상을 업로드하려면:\n1. 프로젝트 > 영상 탭으로 이동하세요\n2. "영상 업로드" 버튼을 클릭하세요\n3. 파일을 선택하거나 드래그 앤 드롭하세요\n4. 제목과 설명을 입력한 후 업로드하세요\n\n지원 형식: MP4, MOV, WebM (최대 5GB)',
    source: { type: 'faq', title: '영상 업로드 방법' },
  },
  {
    pattern: /영상.*(비교|버전)/i,
    answer:
      '영상 버전을 비교하려면:\n1. 영상 상세 페이지에서 "버전 비교" 버튼을 클릭하세요\n2. 비교할 두 버전을 선택하세요\n3. 슬라이더/좌우/오버레이 등 원하는 비교 모드를 선택하세요\n\n이전 버전과 현재 버전의 차이를 한눈에 확인할 수 있어요!',
    source: { type: 'faq', title: '영상 버전 비교' },
  },

  // 멤버 관련
  {
    pattern: /(멤버|팀원).*(초대|추가)/i,
    answer:
      '팀원을 초대하려면:\n1. 프로젝트 설정(톱니바퀴 아이콘)을 클릭하세요\n2. "멤버 관리" 탭으로 이동하세요\n3. "멤버 초대" 버튼을 클릭하세요\n4. 이메일 주소와 역할을 입력하세요\n\n초대받은 사람은 이메일로 초대 링크를 받게 됩니다!',
    source: { type: 'faq', title: '멤버 초대 방법' },
  },

  // 프로젝트 관련
  {
    pattern: /프로젝트.*(만들|생성|새)/i,
    answer:
      '새 프로젝트를 만들려면:\n1. 대시보드에서 "새 프로젝트" 버튼을 클릭하세요\n2. 프로젝트 제목과 설명을 입력하세요\n3. 마감일을 설정하세요 (선택)\n4. "만들기" 버튼을 클릭하세요\n\n바로 영상을 업로드하고 팀원을 초대할 수 있어요!',
    source: { type: 'faq', title: '프로젝트 생성 방법' },
  },

  // 알림 관련
  {
    pattern: /알림.*(설정|켜|끄|받)/i,
    answer:
      '알림 설정을 변경하려면:\n1. 프로필 > 설정으로 이동하세요\n2. "알림 설정" 탭을 클릭하세요\n3. 이메일/푸시 알림을 원하는 대로 설정하세요\n\n프로젝트별로 알림을 다르게 설정할 수도 있어요!',
    source: { type: 'faq', title: '알림 설정' },
  },
];

/**
 * FAQ 패턴 매칭
 */
export function matchFAQ(
  message: string
): { answer: string; source: ChatbotSource } | null {
  for (const faq of FAQ_PATTERNS) {
    if (faq.pattern.test(message)) {
      return {
        answer: faq.answer,
        source: faq.source,
      };
    }
  }
  return null;
}

/**
 * 시스템 프롬프트 생성 (단일 프로젝트용 - 레거시)
 */
export function createSystemPrompt(context: ChatbotContext): string {
  const contextStr = formatContextForPrompt(context);

  return `당신은 NAVIG 영상 제작 협업 플랫폼의 AI 도우미입니다.

## 역할
- 프로젝트 정보 안내 (마감일, 멤버, 상태)
- 피드백 현황 요약
- 플랫폼 사용법 안내
- 영상 제작 관련 일반 조언

${contextStr}

## 지침
- 한국어로 친근하고 자연스럽게 답변하세요
- 간결하게 답변하세요 (2-3문장)
- 위 컨텍스트에 있는 정보만 확실하게 답변하세요
- 모르는 정보는 솔직히 "확인이 어렵습니다"라고 답하세요
- 프로젝트 정보가 없으면 "프로젝트 채팅방에서 질문해주세요"라고 안내하세요
- 이모지는 사용하지 마세요`;
}

/**
 * 계정 전체 컨텍스트 조회 (모든 프로젝트 정보 포함)
 */
export async function getAccountContext(userId: string): Promise<AccountContext | null> {
  const adminClient = createAdminClient();

  // 1. 사용자 정보 조회
  const userContext = await getUserContext(userId);
  if (!userContext) {
    return null;
  }

  // 2. 사용자가 참여한 모든 프로젝트 조회
  const { data: memberProjects } = await adminClient
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null);

  const { data: ownedProjects } = await adminClient
    .from('projects')
    .select('id')
    .eq('client_id', userId);

  const memberProjectIds = memberProjects?.map((m) => m.project_id) || [];
  const ownedProjectIds = ownedProjects?.map((p) => p.id) || [];
  const allProjectIds = [...new Set([...memberProjectIds, ...ownedProjectIds])];

  if (allProjectIds.length === 0) {
    return {
      user: userContext,
      projects: [],
      totalStats: {
        projectCount: 0,
        totalFeedbacks: 0,
        pendingFeedbacks: 0,
        urgentFeedbacks: 0,
        resolvedFeedbacks: 0,
      },
    };
  }

  // 3. 프로젝트 상세 정보 조회
  const { data: projects } = await adminClient
    .from('projects')
    .select('id, title, status, deadline')
    .in('id', allProjectIds)
    .order('created_at', { ascending: false });

  // 4. 각 프로젝트의 멤버 수 조회
  const { data: memberCounts } = await adminClient
    .from('project_members')
    .select('project_id')
    .in('project_id', allProjectIds)
    .not('joined_at', 'is', null);

  const memberCountMap = new Map<string, number>();
  memberCounts?.forEach((m) => {
    const count = memberCountMap.get(m.project_id) || 0;
    memberCountMap.set(m.project_id, count + 1);
  });

  // 5. 모든 피드백 조회
  const { data: allVideos } = await adminClient
    .from('video_versions')
    .select('id, project_id')
    .in('project_id', allProjectIds);

  const videoIds = allVideos?.map((v) => v.id) || [];
  const videoProjectMap = new Map<string, string>();
  allVideos?.forEach((v) => videoProjectMap.set(v.id, v.project_id));

  let allFeedbacks: { video_id: string; status: string; is_urgent: boolean }[] = [];
  if (videoIds.length > 0) {
    const { data: feedbacks } = await adminClient
      .from('video_feedbacks')
      .select('video_id, status, is_urgent')
      .in('video_id', videoIds);
    allFeedbacks = feedbacks || [];
  }

  // 프로젝트별 피드백 수 계산
  const feedbackCountMap = new Map<string, { total: number; pending: number }>();
  allFeedbacks.forEach((f) => {
    const projectId = videoProjectMap.get(f.video_id);
    if (projectId) {
      const current = feedbackCountMap.get(projectId) || { total: 0, pending: 0 };
      current.total++;
      if (f.status === 'open') current.pending++;
      feedbackCountMap.set(projectId, current);
    }
  });

  // 6. 프로젝트 요약 생성
  const projectSummaries: ProjectSummary[] = (projects || []).map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    deadline: p.deadline,
    memberCount: memberCountMap.get(p.id) || 0,
    feedbackCount: feedbackCountMap.get(p.id)?.total || 0,
    pendingFeedbackCount: feedbackCountMap.get(p.id)?.pending || 0,
  }));

  // 7. 전체 통계 계산
  const totalStats = {
    projectCount: projectSummaries.length,
    totalFeedbacks: allFeedbacks.length,
    pendingFeedbacks: allFeedbacks.filter((f) => f.status === 'open').length,
    urgentFeedbacks: allFeedbacks.filter((f) => f.is_urgent).length,
    resolvedFeedbacks: allFeedbacks.filter((f) => f.status === 'resolved').length,
  };

  return {
    user: userContext,
    projects: projectSummaries,
    totalStats,
  };
}

/**
 * 계정 컨텍스트를 프롬프트 문자열로 변환
 */
export function formatAccountContextForPrompt(context: AccountContext): string {
  const lines: string[] = [];

  lines.push(`## 사용자 정보`);
  lines.push(`- 이름: ${context.user.name}`);
  lines.push(
    `- 역할: ${context.user.role === 'client' ? '의뢰인' : context.user.role === 'worker' ? '작업자' : '관리자'}`
  );

  lines.push('');
  lines.push(`## 전체 현황`);
  lines.push(`- 프로젝트: ${context.totalStats.projectCount}개`);
  lines.push(`- 전체 피드백: ${context.totalStats.totalFeedbacks}개`);
  lines.push(`- 미해결 피드백: ${context.totalStats.pendingFeedbacks}개`);
  lines.push(`- 긴급 피드백: ${context.totalStats.urgentFeedbacks}개`);
  lines.push(`- 해결된 피드백: ${context.totalStats.resolvedFeedbacks}개`);

  if (context.projects.length > 0) {
    lines.push('');
    lines.push(`## 프로젝트 목록`);
    context.projects.forEach((p, index) => {
      lines.push(`### ${index + 1}. ${p.title}`);
      lines.push(`   - 상태: ${formatStatus(p.status)}`);
      lines.push(`   - 마감일: ${p.deadline ? formatDate(p.deadline) : '미정'}`);
      lines.push(`   - 멤버: ${p.memberCount}명`);
      lines.push(`   - 피드백: 전체 ${p.feedbackCount}개, 미해결 ${p.pendingFeedbackCount}개`);
    });
  }

  return lines.join('\n');
}

/**
 * 계정 전체 컨텍스트 기반 시스템 프롬프트 생성
 */
export function createAccountSystemPrompt(context: AccountContext): string {
  const contextStr = formatAccountContextForPrompt(context);

  return `당신은 NAVIG 영상 제작 협업 플랫폼의 AI 도우미입니다.
사용자의 모든 프로젝트 정보에 접근할 수 있습니다.

## 역할
- 전체 프로젝트 현황 안내
- 각 프로젝트 정보 안내 (마감일, 멤버, 상태, 피드백)
- 피드백 현황 요약 및 우선순위 제안
- 플랫폼 사용법 안내
- 영상 제작 관련 일반 조언

${contextStr}

## 지침
- 한국어로 친근하고 자연스럽게 답변하세요
- 간결하게 답변하세요 (2-3문장)
- 위 컨텍스트에 있는 정보만 확실하게 답변하세요
- 특정 프로젝트에 대해 물으면 해당 프로젝트 정보를 찾아 답변하세요
- "마감 임박", "미해결 피드백 많음" 등 주의가 필요한 사항을 알려주세요
- 모르는 정보는 솔직히 "확인이 어렵습니다"라고 답하세요
- 이모지는 사용하지 마세요`;
}
