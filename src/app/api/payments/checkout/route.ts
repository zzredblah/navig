/**
 * POST /api/payments/checkout
 * 결제 요청 (토스페이먼츠 위젯용 데이터 생성)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient, createUntypedAdminClient } from '@/lib/supabase/server';
import { checkoutRequestSchema } from '@/lib/validations/subscription';
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
    const result = checkoutRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { plan_id, billing_cycle, success_url, fail_url } = result.data;
    const untypedClient = createUntypedAdminClient();
    const typedClient = createAdminClient();

    // 플랜 조회
    const { data: plan, error: planError } = await untypedClient
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: '유효하지 않은 플랜입니다' },
        { status: 400 }
      );
    }

    const typedPlan = plan as SubscriptionPlan;

    // Free 플랜은 결제 불필요
    if (typedPlan.name === 'free') {
      return NextResponse.json(
        { error: 'Free 플랜은 결제가 필요하지 않습니다' },
        { status: 400 }
      );
    }

    // 이미 같은 플랜을 구독 중인지 확인
    const { data: existingSub } = await untypedClient
      .from('subscriptions')
      .select('*, plan:subscription_plans(*)')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single();

    if (existingSub?.plan_id === plan_id) {
      return NextResponse.json(
        { error: '이미 해당 플랜을 구독 중입니다' },
        { status: 400 }
      );
    }

    // 금액 계산
    const amount = billing_cycle === 'yearly'
      ? typedPlan.price_yearly
      : typedPlan.price_monthly;

    if (amount === 0) {
      return NextResponse.json(
        { error: '결제 금액이 올바르지 않습니다' },
        { status: 400 }
      );
    }

    // 주문 정보 생성
    const orderId = generateOrderId();
    const customerKey = generateCustomerKey(user.id);
    const orderName = `NAVIG ${typedPlan.display_name} ${billing_cycle === 'yearly' ? '연간' : '월간'} 구독`;

    // 결제 대기 레코드 생성
    const { error: paymentError } = await untypedClient
      .from('payments')
      .insert({
        user_id: user.id,
        subscription_id: existingSub?.id || null,
        amount,
        order_id: orderId,
        order_name: orderName,
        status: 'pending',
        metadata: {
          plan_id,
          billing_cycle,
          success_url,
          fail_url,
        },
      });

    if (paymentError) {
      console.error('[POST /api/payments/checkout] 결제 생성 에러:', paymentError);
      return NextResponse.json(
        { error: '결제 정보 생성에 실패했습니다' },
        { status: 500 }
      );
    }

    // 프로필에서 이름, 이메일 조회
    const { data: profile } = await typedClient
      .from('profiles')
      .select('name, email')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      data: {
        order_id: orderId,
        order_name: orderName,
        amount,
        customer_key: customerKey,
        customer_name: profile?.name || '',
        customer_email: profile?.email || user.email || '',
        success_url: `${success_url}?orderId=${orderId}`,
        fail_url,
      },
    });
  } catch (error) {
    console.error('[POST /api/payments/checkout] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
