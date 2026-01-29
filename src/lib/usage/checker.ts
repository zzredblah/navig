/**
 * Usage Checker
 * 사용량 제한 확인 유틸리티
 */

import { createAdminClient, createUntypedAdminClient } from '@/lib/supabase/server';
import type {
  PlanLimits,
  UsageAction,
  UsageCheckContext,
  UsageCheckResult,
  UsageSummary,
  SubscriptionPlan,
} from '@/types/subscription';

// ============================================
// 기본 Free 플랜 제한 (DB 조회 실패 시 폴백)
// ============================================

const DEFAULT_FREE_LIMITS: PlanLimits = {
  max_projects: 3,
  max_storage_gb: 5,
  max_members_per_project: 5,
  max_video_size_mb: 500,
  max_videos_per_project: 10,
};

// ============================================
// 사용자 플랜 제한 가져오기
// ============================================

export async function getUserPlanLimits(userId: string): Promise<PlanLimits> {
  const untypedClient = createUntypedAdminClient();

  // 활성 구독 확인
  const { data: subscription } = await untypedClient
    .from('subscriptions')
    .select(`
      id,
      status,
      current_period_end,
      plan:subscription_plans(*)
    `)
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .gt('current_period_end', new Date().toISOString())
    .single();

  if (subscription?.plan) {
    const plan = subscription.plan as unknown as SubscriptionPlan;
    return plan.limits;
  }

  // 구독이 없으면 Free 플랜
  const { data: freePlan } = await untypedClient
    .from('subscription_plans')
    .select('limits')
    .eq('name', 'free')
    .single();

  if (freePlan) {
    return freePlan.limits as PlanLimits;
  }

  return DEFAULT_FREE_LIMITS;
}

// ============================================
// 현재 사용량 가져오기
// ============================================

export async function getCurrentUsage(userId: string): Promise<UsageSummary> {
  const adminClient = createAdminClient();
  const limits = await getUserPlanLimits(userId);

  // 프로젝트 수 (소유자 또는 멤버, 중복 제거)
  const [ownedProjects, memberProjects] = await Promise.all([
    adminClient
      .from('projects')
      .select('id')
      .eq('client_id', userId),
    adminClient
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId)
      .not('joined_at', 'is', null),
  ]);

  // 중복 제거 (소유자는 member에도 추가되므로)
  const ownedIds = new Set((ownedProjects.data || []).map(p => p.id));
  const memberIds = (memberProjects.data || []).map(p => p.project_id);
  const uniqueMemberIds = memberIds.filter(id => !ownedIds.has(id));

  const projectsCount = ownedIds.size + uniqueMemberIds.length;

  // 스토리지 사용량 계산
  // 1. 영상 파일 (video_versions)
  const { data: videoStorageData } = await adminClient
    .from('video_versions')
    .select('file_size')
    .eq('uploaded_by', userId);

  const videoStorageBytes = videoStorageData?.reduce((sum, v) => sum + (v.file_size || 0), 0) || 0;

  // 2. 채팅 첨부파일 (chat_messages.attachments JSON 배열에서 size 필드 합산)
  const untypedClient = createUntypedAdminClient();
  const { data: chatMessagesData } = await untypedClient
    .from('chat_messages')
    .select('attachments')
    .eq('sender_id', userId)
    .not('attachments', 'eq', '[]');

  let chatStorageBytes = 0;
  if (chatMessagesData) {
    for (const msg of chatMessagesData) {
      const attachments = msg.attachments as Array<{ size?: number }> | null;
      if (attachments && Array.isArray(attachments)) {
        chatStorageBytes += attachments.reduce((sum, att) => sum + (att.size || 0), 0);
      }
    }
  }

  // 총 스토리지 사용량
  const storageUsedBytes = videoStorageBytes + chatStorageBytes;
  const storageUsedGb = storageUsedBytes / (1024 * 1024 * 1024);

  // 멤버 수는 프로젝트별로 다르므로 여기서는 전체 초대 수
  const { count: membersCount } = await adminClient
    .from('project_members')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const projectsLimit = limits.max_projects === -1 ? Infinity : limits.max_projects;
  const storageLimit = limits.max_storage_gb === -1 ? Infinity : limits.max_storage_gb;
  const membersLimit = limits.max_members_per_project === -1 ? Infinity : limits.max_members_per_project;

  return {
    projects_count: projectsCount,
    projects_limit: projectsLimit,
    projects_percentage: projectsLimit === Infinity ? 0 : Math.round((projectsCount / projectsLimit) * 100),
    storage_used_gb: Math.round(storageUsedGb * 100) / 100,
    storage_limit_gb: storageLimit,
    storage_percentage: storageLimit === Infinity ? 0 : Math.round((storageUsedGb / storageLimit) * 100),
    members_count: membersCount || 0,
    members_limit: membersLimit,
  };
}

// ============================================
// 사용량 체크
// ============================================

export async function checkUsage(
  userId: string,
  action: UsageAction,
  context?: UsageCheckContext
): Promise<UsageCheckResult> {
  const typedClient = createAdminClient();
  const limits = await getUserPlanLimits(userId);

  switch (action) {
    case 'create_project': {
      // 프로젝트 수 확인 (소유 + 멤버 참여, 중복 제거)
      const [ownedProjects, memberProjects] = await Promise.all([
        typedClient
          .from('projects')
          .select('id')
          .eq('client_id', userId),
        typedClient
          .from('project_members')
          .select('project_id')
          .eq('user_id', userId)
          .not('joined_at', 'is', null),
      ]);

      // 중복 제거 (소유자는 member에도 추가되므로)
      const ownedIds = new Set((ownedProjects.data || []).map(p => p.id));
      const memberIds = (memberProjects.data || []).map(p => p.project_id);
      const uniqueMemberIds = memberIds.filter(id => !ownedIds.has(id));

      const currentCount = ownedIds.size + uniqueMemberIds.length;
      const limit = limits.max_projects;

      if (limit === -1) {
        return { allowed: true, current: currentCount, limit: -1 };
      }

      if (currentCount >= limit) {
        return {
          allowed: false,
          current: currentCount,
          limit,
          message: `프로젝트 최대 개수(${limit}개)에 도달했습니다. 플랜을 업그레이드하세요.`,
          upgrade_required: true,
        };
      }

      return { allowed: true, current: currentCount, limit };
    }

    case 'upload_video': {
      // 파일 크기 확인
      if (context?.file_size_bytes) {
        const fileSizeMb = context.file_size_bytes / (1024 * 1024);
        const maxSizeMb = limits.max_video_size_mb;

        if (maxSizeMb !== -1 && fileSizeMb > maxSizeMb) {
          return {
            allowed: false,
            current: Math.round(fileSizeMb),
            limit: maxSizeMb,
            message: `영상 파일 크기가 제한(${maxSizeMb}MB)을 초과합니다.`,
            upgrade_required: true,
          };
        }
      }

      // 프로젝트당 영상 수 확인
      if (context?.project_id) {
        const { count } = await typedClient
          .from('video_versions')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', context.project_id);

        const currentCount = count || 0;
        const limit = limits.max_videos_per_project;

        if (limit !== -1 && currentCount >= limit) {
          return {
            allowed: false,
            current: currentCount,
            limit,
            message: `프로젝트당 영상 최대 개수(${limit}개)에 도달했습니다.`,
            upgrade_required: true,
          };
        }
      }

      // 전체 스토리지 확인
      const { data: storageData } = await typedClient
        .from('video_versions')
        .select('file_size')
        .eq('uploaded_by', userId);

      const currentStorageBytes = storageData?.reduce((sum, v) => sum + (v.file_size || 0), 0) || 0;
      const newStorageBytes = currentStorageBytes + (context?.file_size_bytes || 0);
      const newStorageGb = newStorageBytes / (1024 * 1024 * 1024);
      const storageLimit = limits.max_storage_gb;

      if (storageLimit !== -1 && newStorageGb > storageLimit) {
        return {
          allowed: false,
          current: Math.round(newStorageGb * 100) / 100,
          limit: storageLimit,
          message: `스토리지 제한(${storageLimit}GB)을 초과합니다.`,
          upgrade_required: true,
        };
      }

      return { allowed: true, current: 0, limit: -1 };
    }

    case 'invite_member': {
      if (!context?.project_id) {
        return { allowed: true, current: 0, limit: -1 };
      }

      // 프로젝트당 멤버 수 확인
      const { count } = await typedClient
        .from('project_members')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', context.project_id);

      const currentCount = count || 0;
      const limit = limits.max_members_per_project;

      if (limit === -1) {
        return { allowed: true, current: currentCount, limit: -1 };
      }

      if (currentCount >= limit) {
        return {
          allowed: false,
          current: currentCount,
          limit,
          message: `프로젝트당 멤버 최대 인원(${limit}명)에 도달했습니다.`,
          upgrade_required: true,
        };
      }

      return { allowed: true, current: currentCount, limit };
    }

    case 'add_storage': {
      const { data: storageData } = await typedClient
        .from('video_versions')
        .select('file_size')
        .eq('uploaded_by', userId);

      const currentBytes = storageData?.reduce((sum, v) => sum + (v.file_size || 0), 0) || 0;
      const additionalBytes = context?.file_size_bytes || 0;
      const totalGb = (currentBytes + additionalBytes) / (1024 * 1024 * 1024);
      const storageLimit = limits.max_storage_gb;

      if (storageLimit !== -1 && totalGb > storageLimit) {
        return {
          allowed: false,
          current: Math.round(totalGb * 100) / 100,
          limit: storageLimit,
          message: `스토리지 제한(${storageLimit}GB)을 초과합니다.`,
          upgrade_required: true,
        };
      }

      return { allowed: true, current: Math.round(totalGb * 100) / 100, limit: storageLimit };
    }

    default:
      return { allowed: true, current: 0, limit: -1 };
  }
}

// ============================================
// 업그레이드 필요 여부 확인
// ============================================

export async function isUpgradeRecommended(userId: string): Promise<{
  recommended: boolean;
  reasons: string[];
}> {
  const usage = await getCurrentUsage(userId);
  const reasons: string[] = [];

  // 프로젝트 80% 이상 사용
  if (usage.projects_percentage >= 80) {
    reasons.push('프로젝트 개수가 제한에 가까워지고 있습니다.');
  }

  // 스토리지 80% 이상 사용
  if (usage.storage_percentage >= 80) {
    reasons.push('스토리지 용량이 제한에 가까워지고 있습니다.');
  }

  return {
    recommended: reasons.length > 0,
    reasons,
  };
}
