/**
 * AI 기능 사용량 추적 및 제한 관리
 */

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth } from 'date-fns';

// AI 기능 유형
export type AIFeature =
  | 'voice_feedback'
  | 'template_recommend'
  | 'feedback_summary'
  | 'chatbot'
  | 'subtitle_generation'
  | 'video_diff';

// 플랜별 AI 기능 제한
const AI_LIMITS: Record<string, { enabled: boolean; monthlyRequests: number }> = {
  free: {
    enabled: false,
    monthlyRequests: 0,
  },
  pro: {
    enabled: true,
    monthlyRequests: 100, // 월 100회
  },
  team: {
    enabled: true,
    monthlyRequests: -1, // 무제한
  },
  enterprise: {
    enabled: true,
    monthlyRequests: -1, // 무제한
  },
};

// 기능별 예상 비용 (USD per request)
const FEATURE_COSTS: Record<AIFeature, number> = {
  voice_feedback: 0.006, // Whisper API 약 $0.006/minute
  template_recommend: 0.002, // GPT-4o-mini 약 $0.002/request
  feedback_summary: 0.003, // GPT-4o-mini 약 $0.003/request
  chatbot: 0.0004, // GPT-4o-mini 약 $0.0004/request (짧은 대화)
  subtitle_generation: 0.006, // Whisper API 약 $0.006/minute
  video_diff: 0.005, // GPT-4o-mini vision 약 $0.005/request
};

interface AIUsageCheckResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  reason?: string;
}

/**
 * 사용자의 현재 플랜 조회
 */
async function getUserPlan(userId: string): Promise<string> {
  const adminClient = createAdminClient();

  try {
    // subscriptions 테이블과 subscription_plans 조인하여 플랜 이름 조회
    const { data: subscription, error } = await (adminClient as any)
      .from('subscriptions')
      .select(`
        status,
        current_period_end,
        plan:subscription_plans(name)
      `)
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .gt('current_period_end', new Date().toISOString())
      .single();

    if (error || !subscription) {
      console.log('[AI Usage] 구독 정보 없음, free 플랜 반환');
      return 'free';
    }

    // plan.name에서 플랜 이름 추출
    const planName = subscription.plan?.name || 'free';
    console.log('[AI Usage] 사용자 플랜:', planName);
    return planName;
  } catch (error) {
    console.error('[AI Usage] 플랜 조회 실패:', error);
    return 'free';
  }
}

/**
 * AI 기능 사용 가능 여부 확인
 */
export async function checkAIUsage(
  userId: string,
  feature: AIFeature
): Promise<AIUsageCheckResult> {
  const plan = await getUserPlan(userId);
  const limits = AI_LIMITS[plan] || AI_LIMITS.free;

  // 기능 비활성화된 플랜
  if (!limits.enabled) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: endOfMonth(new Date()),
      reason: 'AI 기능은 Pro 플랜 이상에서 사용할 수 있습니다.',
    };
  }

  // 무제한 플랜
  if (limits.monthlyRequests === -1) {
    return {
      allowed: true,
      remaining: -1,
      resetAt: endOfMonth(new Date()),
    };
  }

  // 월간 사용량 조회
  const adminClient = createAdminClient();
  const monthStart = startOfMonth(new Date());

  // Note: ai_usage 테이블이 아직 없을 수 있음
  const { count } = await (adminClient as any)
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthStart.toISOString());

  const usedCount = count || 0;
  const remaining = limits.monthlyRequests - usedCount;

  return {
    allowed: remaining > 0,
    remaining,
    resetAt: endOfMonth(new Date()),
    reason: remaining <= 0
      ? `이번 달 AI 사용량(${limits.monthlyRequests}회)을 모두 사용했습니다.`
      : undefined,
  };
}

/**
 * AI 사용량 기록
 */
export async function recordAIUsage(
  userId: string,
  feature: AIFeature,
  metadata?: Record<string, unknown>
): Promise<void> {
  const adminClient = createAdminClient();
  const cost = FEATURE_COSTS[feature] || 0;

  // Note: ai_usage 테이블이 아직 없을 수 있음
  await (adminClient as any).from('ai_usage').insert({
    user_id: userId,
    feature,
    tokens_used: 0, // Whisper는 토큰 단위가 아님
    cost_usd: cost,
    metadata: metadata || {},
  });
}

/**
 * 사용자의 AI 사용량 통계 조회
 */
export async function getAIUsageStats(userId: string): Promise<{
  plan: string;
  enabled: boolean;
  monthlyLimit: number;
  usedThisMonth: number;
  remaining: number;
  resetAt: Date;
  features: Record<AIFeature, number>;
}> {
  const plan = await getUserPlan(userId);
  const limits = AI_LIMITS[plan] || AI_LIMITS.free;
  const monthStart = startOfMonth(new Date());

  const adminClient = createAdminClient();

  // 총 사용량 (ai_usage 테이블이 아직 없을 수 있음)
  const { count: totalCount } = await (adminClient as any)
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthStart.toISOString());

  // 기능별 사용량 (ai_usage 테이블이 아직 없을 수 있음)
  const { data: featureData } = await (adminClient as any)
    .from('ai_usage')
    .select('feature')
    .eq('user_id', userId)
    .gte('created_at', monthStart.toISOString());

  const features: Record<AIFeature, number> = {
    voice_feedback: 0,
    template_recommend: 0,
    feedback_summary: 0,
    chatbot: 0,
    subtitle_generation: 0,
    video_diff: 0,
  };

  if (featureData) {
    for (const row of featureData) {
      const f = row.feature as AIFeature;
      if (f in features) {
        features[f]++;
      }
    }
  }

  const usedThisMonth = totalCount || 0;
  const remaining = limits.monthlyRequests === -1 ? -1 : Math.max(0, limits.monthlyRequests - usedThisMonth);

  return {
    plan,
    enabled: limits.enabled,
    monthlyLimit: limits.monthlyRequests,
    usedThisMonth,
    remaining,
    resetAt: endOfMonth(new Date()),
    features,
  };
}

/**
 * AI 사용 가능 여부를 클라이언트에서 확인하기 위한 API 응답 타입
 */
export interface AIUsageResponse {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  reason?: string;
}
