/**
 * Subscription Validation Schemas
 * 구독/결제 관련 Zod 스키마
 */

import { z } from 'zod';

// ============================================
// 결제 요청
// ============================================

export const checkoutRequestSchema = z.object({
  plan_id: z.string().uuid('유효한 플랜 ID가 아닙니다'),
  billing_cycle: z.enum(['monthly', 'yearly'], {
    errorMap: () => ({ message: '빌링 주기는 monthly 또는 yearly여야 합니다' }),
  }),
  success_url: z.string().url('유효한 URL이 아닙니다'),
  fail_url: z.string().url('유효한 URL이 아닙니다'),
});

export type CheckoutRequestInput = z.infer<typeof checkoutRequestSchema>;

// ============================================
// 결제 승인
// ============================================

export const confirmPaymentSchema = z.object({
  payment_key: z.string().min(1, '결제 키가 필요합니다'),
  order_id: z.string().min(1, '주문 ID가 필요합니다'),
  amount: z.number().int().positive('결제 금액은 양수여야 합니다'),
});

export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;

// ============================================
// 구독 취소
// ============================================

export const cancelSubscriptionSchema = z.object({
  cancel_immediately: z.boolean().optional().default(false),
  reason: z.string().max(500, '취소 사유는 500자 이내여야 합니다').optional(),
});

export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;

// ============================================
// 플랜 변경
// ============================================

export const changePlanSchema = z.object({
  new_plan_id: z.string().uuid('유효한 플랜 ID가 아닙니다'),
  billing_cycle: z.enum(['monthly', 'yearly'], {
    errorMap: () => ({ message: '빌링 주기는 monthly 또는 yearly여야 합니다' }),
  }),
});

export type ChangePlanInput = z.infer<typeof changePlanSchema>;

// ============================================
// 결제 내역 조회
// ============================================

export const paymentHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'completed', 'failed', 'refunded', 'partial_refund']).optional(),
});

export type PaymentHistoryQueryInput = z.infer<typeof paymentHistoryQuerySchema>;

// ============================================
// 웹훅 검증
// ============================================

export const tossWebhookSchema = z.object({
  eventType: z.enum([
    'PAYMENT_STATUS_CHANGED',
    'BILLING_KEY_DELETED',
    'PAYMENT_CANCELED',
    'VIRTUAL_ACCOUNT_DEPOSIT_CALLBACK',
  ]),
  createdAt: z.string(),
  data: z.object({
    paymentKey: z.string(),
    orderId: z.string(),
    status: z.string(),
  }).passthrough(),
});

export type TossWebhookInput = z.infer<typeof tossWebhookSchema>;
