/**
 * POST /api/payments/confirm
 * 결제 승인 (토스페이먼츠 결제 승인 요청)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createUntypedAdminClient } from '@/lib/supabase/server';
import { confirmPaymentSchema } from '@/lib/validations/subscription';
import { confirmPayment, isTossConfigured, TossPaymentError } from '@/lib/toss/client';
import type { BillingCycle, PaymentMethod } from '@/types/subscription';

// 토스 method를 DB method로 변환
function mapTossMethod(tossMethod: string): PaymentMethod {
  const methodMap: Record<string, PaymentMethod> = {
    '카드': 'card',
    '계좌이체': 'bank_transfer',
    '가상계좌': 'virtual_account',
    '휴대폰': 'card', // 모바일 결제를 카드로 매핑
  };
  return methodMap[tossMethod] || 'card';
}

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
    const result = confirmPaymentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { payment_key, order_id, amount } = result.data;
    const adminClient = createUntypedAdminClient();

    // 결제 대기 레코드 조회
    const { data: payment, error: paymentError } = await adminClient
      .from('payments')
      .select('*')
      .eq('order_id', order_id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: '유효하지 않은 결제입니다' },
        { status: 400 }
      );
    }

    // 금액 검증
    if (payment.amount !== amount) {
      console.error('[POST /api/payments/confirm] 금액 불일치:', {
        expected: payment.amount,
        received: amount,
      });
      return NextResponse.json(
        { error: '결제 금액이 일치하지 않습니다' },
        { status: 400 }
      );
    }

    // 토스페이먼츠 결제 승인
    let tossResult = null;

    if (isTossConfigured()) {
      try {
        tossResult = await confirmPayment(payment_key, order_id, amount);
      } catch (error) {
        if (error instanceof TossPaymentError) {
          console.error('[POST /api/payments/confirm] 토스 결제 에러:', error);

          // 결제 실패 기록
          await adminClient
            .from('payments')
            .update({
              status: 'failed',
              failure_code: error.code,
              failure_message: error.message,
            })
            .eq('id', payment.id);

          return NextResponse.json(
            { error: error.message, code: error.code },
            { status: 400 }
          );
        }
        throw error;
      }
    } else {
      // 테스트 모드 (토스 미연동)
      console.log('[POST /api/payments/confirm] 테스트 모드 - 토스 미연동');
      tossResult = {
        paymentKey: payment_key,
        orderId: order_id,
        status: 'DONE',
        method: '카드',
        approvedAt: new Date().toISOString(),
        receipt: { url: '' },
      };
    }

    // 결제 성공 업데이트
    const { error: updateError } = await adminClient
      .from('payments')
      .update({
        status: 'completed',
        payment_key,
        method: mapTossMethod(tossResult.method),
        receipt_url: tossResult.receipt?.url || null,
        paid_at: tossResult.approvedAt || new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('[POST /api/payments/confirm] 결제 업데이트 에러:', updateError);
    }

    // 구독 생성/업데이트
    const metadata = payment.metadata as {
      plan_id?: string;
      billing_cycle?: BillingCycle;
    } | null;

    if (metadata?.plan_id) {
      const billingCycle = metadata.billing_cycle || 'monthly';
      const periodMonths = billingCycle === 'yearly' ? 12 : 1;
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + periodMonths);

      // 기존 구독 확인
      const { data: existingSub } = await adminClient
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingSub) {
        // 기존 구독 업데이트
        await adminClient
          .from('subscriptions')
          .update({
            plan_id: metadata.plan_id,
            status: 'active',
            billing_cycle: billingCycle,
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
            cancel_at_period_end: false,
            canceled_at: null,
          })
          .eq('id', existingSub.id);
      } else {
        // 새 구독 생성
        await adminClient
          .from('subscriptions')
          .insert({
            user_id: user.id,
            plan_id: metadata.plan_id,
            status: 'active',
            billing_cycle: billingCycle,
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
          });
      }
    }

    return NextResponse.json({
      data: {
        payment_id: payment.id,
        order_id,
        amount,
        status: 'completed',
      },
      message: '결제가 완료되었습니다',
    });
  } catch (error) {
    console.error('[POST /api/payments/confirm] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
