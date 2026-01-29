/**
 * NAVIG Subscription Types - Sprint 15-16
 * 구독 및 결제 관련 타입 정의
 */

// ============================================
// Enums
// ============================================

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'expired';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'partial_refund';

export type PaymentMethod =
  | 'card'
  | 'bank_transfer'
  | 'virtual_account'
  | 'kakao_pay'
  | 'naver_pay'
  | 'toss_pay';

export type BillingCycle = 'monthly' | 'yearly';

export type PlanName = 'free' | 'pro' | 'team';

// ============================================
// Plan Limits & Features
// ============================================

export interface PlanLimits {
  max_projects: number; // -1 = 무제한
  max_storage_gb: number;
  max_members_per_project: number; // -1 = 무제한
  max_video_size_mb: number;
  max_videos_per_project: number; // -1 = 무제한
}

export type PlanFeature =
  | 'basic_feedback'
  | 'basic_chat'
  | 'priority_support'
  | 'advanced_analytics'
  | 'custom_branding'
  | 'version_compare'
  | 'sso'
  | 'audit_log'
  | 'dedicated_support'
  | 'api_access';

// ============================================
// Database Row Types
// ============================================

export interface SubscriptionPlan {
  id: string;
  name: PlanName;
  display_name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  limits: PlanLimits;
  features: PlanFeature[];
  sort_order: number;
  is_recommended: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  billing_key: string | null;
  customer_key: string | null;
  trial_start: string | null;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  subscription_id: string | null;
  user_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_key: string | null;
  order_id: string;
  method: PaymentMethod | null;
  order_name: string;
  receipt_url: string | null;
  refunded_amount: number;
  refund_reason: string | null;
  refunded_at: string | null;
  failure_code: string | null;
  failure_message: string | null;
  metadata: Record<string, unknown>;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageRecord {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  projects_count: number;
  storage_used_bytes: number;
  members_invited: number;
  videos_uploaded: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// Extended Types (with joins)
// ============================================

export interface SubscriptionWithPlan extends Subscription {
  plan: SubscriptionPlan;
}

export interface PaymentWithSubscription extends Payment {
  subscription: Subscription | null;
}

// ============================================
// API Request/Response Types
// ============================================

// 플랜 목록 응답
export interface PlansResponse {
  plans: SubscriptionPlan[];
}

// 현재 구독 정보 응답
export interface CurrentSubscriptionResponse {
  subscription: SubscriptionWithPlan | null;
  usage: UsageSummary;
  limits: PlanLimits;
}

// 사용량 요약
export interface UsageSummary {
  projects_count: number;
  projects_limit: number;
  projects_percentage: number;
  storage_used_gb: number;
  storage_limit_gb: number;
  storage_percentage: number;
  members_count: number;
  members_limit: number;
}

// 결제 요청
export interface CheckoutRequest {
  plan_id: string;
  billing_cycle: BillingCycle;
  success_url: string;
  fail_url: string;
}

// 결제 요청 응답
export interface CheckoutResponse {
  order_id: string;
  order_name: string;
  amount: number;
  customer_key: string;
  success_url: string;
  fail_url: string;
}

// 결제 승인 요청
export interface ConfirmPaymentRequest {
  payment_key: string;
  order_id: string;
  amount: number;
}

// 구독 취소 요청
export interface CancelSubscriptionRequest {
  cancel_immediately?: boolean;
  reason?: string;
}

// 플랜 변경 요청
export interface ChangePlanRequest {
  new_plan_id: string;
  billing_cycle: BillingCycle;
}

// 결제 내역 응답
export interface PaymentHistoryResponse {
  payments: Payment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// ============================================
// Usage Check Types
// ============================================

export type UsageAction =
  | 'create_project'
  | 'upload_video'
  | 'invite_member'
  | 'add_storage';

export interface UsageCheckContext {
  project_id?: string;
  file_size_bytes?: number;
}

export interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  message?: string;
  upgrade_required?: boolean;
}

// ============================================
// Toss Payments Types (external)
// ============================================

export interface TossPaymentConfirmResponse {
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: string;
  requestedAt: string;
  approvedAt: string;
  method: string;
  totalAmount: number;
  balanceAmount: number;
  suppliedAmount: number;
  vat: number;
  receipt: {
    url: string;
  };
  card?: {
    company: string;
    number: string;
    installmentPlanMonths: number;
    isInterestFree: boolean;
    approveNo: string;
    cardType: string;
    ownerType: string;
  };
}

export interface TossBillingKeyResponse {
  billingKey: string;
  customerKey: string;
  cardCompany: string;
  cardNumber: string;
  authenticatedAt: string;
}

export interface TossPaymentError {
  code: string;
  message: string;
}
