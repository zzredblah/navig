/**
 * GET /api/subscriptions/me
 * 현재 사용자의 구독 정보 및 사용량 조회
 */

import { NextResponse } from 'next/server';
import { createClient, createUntypedAdminClient } from '@/lib/supabase/server';
import { getCurrentUsage, getUserPlanLimits } from '@/lib/usage/checker';

export async function GET() {
  try {
    // 인증 확인
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const adminClient = createUntypedAdminClient();

    // 구독 정보 조회 (플랜 정보 포함)
    const { data: subscription, error: subError } = await adminClient
      .from('subscriptions')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'canceled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      // PGRST116은 "no rows found" 에러
      console.error('[GET /api/subscriptions/me] 구독 조회 에러:', subError);
    }

    // 사용량 조회
    const usage = await getCurrentUsage(user.id);
    const limits = await getUserPlanLimits(user.id);

    return NextResponse.json({
      data: {
        subscription: subscription || null,
        usage,
        limits,
      },
    });
  } catch (error) {
    console.error('[GET /api/subscriptions/me] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
