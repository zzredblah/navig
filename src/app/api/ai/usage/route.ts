/**
 * AI 사용량 조회 API
 *
 * GET /api/ai/usage
 * - 현재 사용자의 AI 사용량 통계 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAIUsageStats } from '@/lib/ai/usage';

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 사용량 통계 조회
    const stats = await getAIUsageStats(user.id);

    return NextResponse.json({
      data: {
        plan: stats.plan,
        enabled: stats.enabled,
        monthly_limit: stats.monthlyLimit,
        used_this_month: stats.usedThisMonth,
        remaining: stats.remaining,
        reset_at: stats.resetAt.toISOString(),
        features: {
          voice_feedback: {
            count: stats.features.voice_feedback,
            description: '음성 피드백',
          },
          template_recommend: {
            count: stats.features.template_recommend,
            description: 'AI 템플릿 추천',
          },
          feedback_summary: {
            count: stats.features.feedback_summary,
            description: '피드백 요약',
          },
        },
      },
    });
  } catch (error) {
    console.error('[AIUsage] Error:', error);
    return NextResponse.json(
      { error: 'AI 사용량 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}
