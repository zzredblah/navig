/**
 * POST /api/subscriptions/cancel
 * 구독 취소
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createUntypedAdminClient } from '@/lib/supabase/server';
import { cancelSubscriptionSchema } from '@/lib/validations/subscription';
import { deleteBillingKey, isTossConfigured } from '@/lib/toss/client';

export async function POST(request: NextRequest) {
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

    // 요청 본문 파싱
    const body = await request.json();
    const result = cancelSubscriptionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { cancel_immediately, reason } = result.data;
    const adminClient = createUntypedAdminClient();

    // 활성 구독 확인
    const { data: subscription, error: subError } = await adminClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: '활성 구독이 없습니다' },
        { status: 404 }
      );
    }

    // 즉시 취소 vs 기간 만료 후 취소
    if (cancel_immediately) {
      // 빌링키 삭제 (토스 연동 시)
      if (subscription.billing_key && isTossConfigured()) {
        try {
          await deleteBillingKey(subscription.billing_key);
        } catch (error) {
          console.error('[POST /api/subscriptions/cancel] 빌링키 삭제 실패:', error);
          // 빌링키 삭제 실패해도 구독 취소는 진행
        }
      }

      // 구독 상태 변경
      const { error: updateError } = await adminClient
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          billing_key: null,
        })
        .eq('id', subscription.id);

      if (updateError) {
        console.error('[POST /api/subscriptions/cancel] 구독 업데이트 에러:', updateError);
        return NextResponse.json(
          { error: '구독 취소에 실패했습니다' },
          { status: 500 }
        );
      }
    } else {
      // 기간 만료 후 취소 예약
      const { error: updateError } = await adminClient
        .from('subscriptions')
        .update({
          cancel_at_period_end: true,
          canceled_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      if (updateError) {
        console.error('[POST /api/subscriptions/cancel] 구독 업데이트 에러:', updateError);
        return NextResponse.json(
          { error: '구독 취소 예약에 실패했습니다' },
          { status: 500 }
        );
      }
    }

    // 취소 사유 기록 (메타데이터로)
    if (reason) {
      await adminClient
        .from('subscriptions')
        .update({
          // 별도 취소 사유 필드가 필요하면 추가
        })
        .eq('id', subscription.id);
    }

    return NextResponse.json({
      data: {
        canceled: true,
        cancel_at_period_end: !cancel_immediately,
        period_end: subscription.current_period_end,
      },
      message: cancel_immediately
        ? '구독이 즉시 취소되었습니다'
        : `구독이 ${new Date(subscription.current_period_end).toLocaleDateString('ko-KR')}에 종료됩니다`,
    });
  } catch (error) {
    console.error('[POST /api/subscriptions/cancel] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
