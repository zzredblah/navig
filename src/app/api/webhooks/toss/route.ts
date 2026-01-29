/**
 * POST /api/webhooks/toss
 * 토스페이먼츠 웹훅 처리
 */

import { NextRequest, NextResponse } from 'next/server';
import { createUntypedAdminClient } from '@/lib/supabase/server';
import { tossWebhookSchema } from '@/lib/validations/subscription';
import type { TossWebhookPayload } from '@/lib/toss/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 웹훅 검증
    const result = tossWebhookSchema.safeParse(body);

    if (!result.success) {
      console.error('[POST /api/webhooks/toss] 유효하지 않은 웹훅:', result.error);
      return NextResponse.json(
        { error: '유효하지 않은 웹훅 페이로드입니다' },
        { status: 400 }
      );
    }

    const payload = body as TossWebhookPayload;
    const adminClient = createUntypedAdminClient();

    console.log('[POST /api/webhooks/toss] 웹훅 수신:', {
      eventType: payload.eventType,
      orderId: payload.data.orderId,
      status: payload.data.status,
    });

    switch (payload.eventType) {
      case 'PAYMENT_STATUS_CHANGED': {
        // 결제 상태 변경
        const { orderId, paymentKey, status } = payload.data;

        // 결제 레코드 조회
        const { data: payment } = await adminClient
          .from('payments')
          .select('id, user_id, subscription_id')
          .eq('order_id', orderId)
          .single();

        if (!payment) {
          console.warn('[POST /api/webhooks/toss] 결제 레코드 없음:', orderId);
          return NextResponse.json({ received: true });
        }

        // 상태 매핑
        let dbStatus: 'pending' | 'completed' | 'failed' | 'refunded' = 'pending';
        if (status === 'DONE') dbStatus = 'completed';
        else if (status === 'CANCELED' || status === 'PARTIAL_CANCELED') dbStatus = 'refunded';
        else if (status === 'ABORTED' || status === 'EXPIRED') dbStatus = 'failed';

        // 결제 상태 업데이트
        await adminClient
          .from('payments')
          .update({
            status: dbStatus,
            payment_key: paymentKey,
          })
          .eq('id', payment.id);

        break;
      }

      case 'PAYMENT_CANCELED': {
        // 결제 취소
        const { orderId } = payload.data;

        await adminClient
          .from('payments')
          .update({
            status: 'refunded',
            refunded_at: new Date().toISOString(),
          })
          .eq('order_id', orderId);

        break;
      }

      case 'BILLING_KEY_DELETED': {
        // 빌링키 삭제됨 (정기결제 해지)
        // 필요시 구독 상태 업데이트
        break;
      }

      case 'VIRTUAL_ACCOUNT_DEPOSIT_CALLBACK': {
        // 가상계좌 입금 완료
        const { orderId, paymentKey } = payload.data;

        // 결제 완료 처리
        const { data: payment } = await adminClient
          .from('payments')
          .select('id, metadata')
          .eq('order_id', orderId)
          .single();

        if (payment) {
          await adminClient
            .from('payments')
            .update({
              status: 'completed',
              payment_key: paymentKey,
              paid_at: new Date().toISOString(),
            })
            .eq('id', payment.id);

          // 구독 활성화 로직 (필요시)
        }

        break;
      }

      default:
        console.log('[POST /api/webhooks/toss] 미처리 이벤트:', payload.eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[POST /api/webhooks/toss] 예외:', error);
    // 웹훅은 항상 200 반환 (재시도 방지)
    return NextResponse.json({ received: true });
  }
}
