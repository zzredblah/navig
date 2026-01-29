/**
 * POST /api/subscriptions/change-plan
 * 플랜 변경 (업그레이드/다운그레이드)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createUntypedAdminClient } from '@/lib/supabase/server';
import { changePlanSchema } from '@/lib/validations/subscription';
import { generateOrderId, generateCustomerKey } from '@/lib/toss/client';
import type { SubscriptionPlan } from '@/types/subscription';

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
    const result = changePlanSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { new_plan_id, billing_cycle } = result.data;
    const adminClient = createUntypedAdminClient();

    // 새 플랜 조회
    const { data: newPlan, error: planError } = await adminClient
      .from('subscription_plans')
      .select('*')
      .eq('id', new_plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !newPlan) {
      return NextResponse.json(
        { error: '유효하지 않은 플랜입니다' },
        { status: 400 }
      );
    }

    const typedPlan = newPlan as SubscriptionPlan;

    // Free 플랜으로 다운그레이드
    if (typedPlan.name === 'free') {
      // 기존 구독 취소
      const { error: cancelError } = await adminClient
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          cancel_at_period_end: false,
        })
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing']);

      if (cancelError) {
        console.error('[POST /api/subscriptions/change-plan] 구독 취소 에러:', cancelError);
      }

      return NextResponse.json({
        data: { changed: true, plan: typedPlan },
        message: 'Free 플랜으로 변경되었습니다',
      });
    }

    // 유료 플랜으로 변경 - 결제 필요
    const amount = billing_cycle === 'yearly'
      ? typedPlan.price_yearly
      : typedPlan.price_monthly;

    if (amount === 0) {
      return NextResponse.json(
        { error: '결제 금액이 올바르지 않습니다' },
        { status: 400 }
      );
    }

    // 현재 구독 확인
    const { data: currentSub } = await adminClient
      .from('subscriptions')
      .select('*, plan:subscription_plans(*)')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single();

    // 업그레이드/다운그레이드 판단
    const currentPlan = currentSub?.plan as SubscriptionPlan | null;
    const isUpgrade = !currentPlan ||
      typedPlan.sort_order > (currentPlan?.sort_order || 0);

    // 결제 정보 생성
    const orderId = generateOrderId();
    const customerKey = generateCustomerKey(user.id);
    const orderName = `NAVIG ${typedPlan.display_name} ${billing_cycle === 'yearly' ? '연간' : '월간'} 구독`;

    // 결제 대기 레코드 생성
    const { error: paymentError } = await adminClient
      .from('payments')
      .insert({
        user_id: user.id,
        subscription_id: currentSub?.id || null,
        amount,
        order_id: orderId,
        order_name: orderName,
        status: 'pending',
        metadata: {
          plan_id: new_plan_id,
          billing_cycle,
          is_upgrade: isUpgrade,
        },
      });

    if (paymentError) {
      console.error('[POST /api/subscriptions/change-plan] 결제 생성 에러:', paymentError);
      return NextResponse.json(
        { error: '결제 정보 생성에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        requires_payment: true,
        order_id: orderId,
        order_name: orderName,
        amount,
        customer_key: customerKey,
        plan: typedPlan,
        is_upgrade: isUpgrade,
      },
      message: '결제를 진행해주세요',
    });
  } catch (error) {
    console.error('[POST /api/subscriptions/change-plan] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
