/**
 * AI 기능 사용량 추적 및 제한 관리
 */

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth } from 'date-fns';

// AI 기능 유형
export type AIFeature = 'voice_feedback' | 'template_recommend' | 'feedback_summary';

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

  // Note: subscriptions 테이블이 아직 없을 수 있음
  const { data: subscription } = await (adminClient as any)
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!subscription) return 'free';

  // plan_id에서 플랜 이름 추출 (예: 'price_pro_monthly' -> 'pro')
  const planId = subscription.plan_id || '';
  if (planId.includes('team')) return 'team';
  if (planId.includes('enterprise')) return 'enterprise';
  if (planId.includes('pro')) return 'pro';

  return 'free';
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
