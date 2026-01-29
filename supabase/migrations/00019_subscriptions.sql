-- ============================================
-- 00019_subscriptions.sql
-- 결제 및 구독 시스템 스키마
-- ============================================

-- ============================================
-- 1. Enums
-- ============================================

-- 구독 상태
CREATE TYPE subscription_status AS ENUM (
  'active',       -- 활성 구독
  'canceled',     -- 취소됨 (기간 만료 전)
  'past_due',     -- 결제 실패
  'trialing',     -- 체험 기간
  'expired'       -- 만료됨
);

-- 결제 상태
CREATE TYPE payment_status AS ENUM (
  'pending',      -- 결제 대기
  'completed',    -- 결제 완료
  'failed',       -- 결제 실패
  'refunded',     -- 환불됨
  'partial_refund' -- 부분 환불
);

-- 결제 수단
CREATE TYPE payment_method AS ENUM (
  'card',         -- 카드
  'bank_transfer', -- 계좌이체
  'virtual_account', -- 가상계좌
  'kakao_pay',    -- 카카오페이
  'naver_pay',    -- 네이버페이
  'toss_pay'      -- 토스페이
);

-- 빌링 주기
CREATE TYPE billing_cycle AS ENUM (
  'monthly',      -- 월간
  'yearly'        -- 연간
);

-- ============================================
-- 2. 구독 플랜 테이블 (정적 데이터)
-- ============================================

CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,           -- free, pro, team
  display_name VARCHAR(100) NOT NULL,         -- Free, Pro, Team
  description TEXT,

  -- 가격 (원 단위)
  price_monthly INTEGER NOT NULL DEFAULT 0,   -- 월간 가격
  price_yearly INTEGER NOT NULL DEFAULT 0,    -- 연간 가격

  -- 플랜 제한
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- 예: {
  --   "max_projects": 3,
  --   "max_storage_gb": 5,
  --   "max_members_per_project": 5,
  --   "max_video_size_mb": 500
  -- }

  -- 플랜 기능
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- 예: ["unlimited_projects", "priority_support", "custom_branding"]

  -- 표시 순서
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- 추천 플랜 여부
  is_recommended BOOLEAN NOT NULL DEFAULT false,

  -- 활성화 여부
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. 구독 테이블
-- ============================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),

  -- 구독 상태
  status subscription_status NOT NULL DEFAULT 'active',

  -- 빌링 주기
  billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',

  -- 구독 기간
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,

  -- 취소 정보
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,

  -- 토스페이먼츠 정기결제 정보
  billing_key VARCHAR(255),          -- 빌링키
  customer_key VARCHAR(255),         -- 고객 키

  -- 체험 기간
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 유저당 하나의 활성 구독만
  CONSTRAINT unique_active_subscription UNIQUE (user_id)
);

-- ============================================
-- 4. 결제 내역 테이블
-- ============================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 결제 정보
  amount INTEGER NOT NULL,                    -- 결제 금액 (원)
  currency VARCHAR(3) NOT NULL DEFAULT 'KRW',

  -- 결제 상태
  status payment_status NOT NULL DEFAULT 'pending',

  -- 토스페이먼츠 정보
  payment_key VARCHAR(255),                   -- 토스 결제키
  order_id VARCHAR(255) NOT NULL UNIQUE,      -- 주문 ID
  method payment_method,

  -- 결제 상세
  order_name VARCHAR(255) NOT NULL,           -- 주문명 (예: "NAVIG Pro 월간 구독")
  receipt_url TEXT,                           -- 영수증 URL

  -- 환불 정보
  refunded_amount INTEGER DEFAULT 0,
  refund_reason TEXT,
  refunded_at TIMESTAMPTZ,

  -- 실패 정보
  failure_code VARCHAR(100),
  failure_message TEXT,

  -- 메타데이터
  metadata JSONB DEFAULT '{}'::jsonb,

  -- 결제 완료 시간
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 5. 사용량 기록 테이블
-- ============================================

CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 기간 (월 단위)
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- 사용량
  projects_count INTEGER NOT NULL DEFAULT 0,
  storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  members_invited INTEGER NOT NULL DEFAULT 0,
  videos_uploaded INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 기간당 하나의 레코드
  CONSTRAINT unique_user_period UNIQUE (user_id, period_start)
);

-- ============================================
-- 6. 인덱스
-- ============================================

-- subscription_plans
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active) WHERE is_active = true;
CREATE INDEX idx_subscription_plans_name ON subscription_plans(name);

-- subscriptions
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);
CREATE INDEX idx_subscriptions_billing_key ON subscriptions(billing_key) WHERE billing_key IS NOT NULL;

-- payments
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_payment_key ON payments(payment_key) WHERE payment_key IS NOT NULL;
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- usage_records
CREATE INDEX idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX idx_usage_records_period ON usage_records(period_start, period_end);

-- ============================================
-- 7. Triggers
-- ============================================

-- updated_at 자동 갱신
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_usage_records_updated_at
  BEFORE UPDATE ON usage_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 8. RLS 정책
-- ============================================

-- subscription_plans: 누구나 읽기 가능
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage plans"
  ON subscription_plans FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- subscriptions: 본인 또는 관리자
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all subscriptions"
  ON subscriptions FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage subscriptions"
  ON subscriptions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- payments: 본인 또는 관리자
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- usage_records: 본인 또는 관리자
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage"
  ON usage_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage usage"
  ON usage_records FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- 9. 초기 플랜 데이터 시드
-- ============================================

INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, limits, features, sort_order, is_recommended) VALUES
(
  'free',
  'Free',
  '소규모 프로젝트나 개인 사용자를 위한 무료 플랜',
  0,
  0,
  '{
    "max_projects": 3,
    "max_storage_gb": 5,
    "max_members_per_project": 5,
    "max_video_size_mb": 500,
    "max_videos_per_project": 10
  }'::jsonb,
  '["basic_feedback", "basic_chat"]'::jsonb,
  1,
  false
),
(
  'pro',
  'Pro',
  '프리랜서와 소규모 팀을 위한 전문가용 플랜',
  19900,
  199000,
  '{
    "max_projects": 20,
    "max_storage_gb": 100,
    "max_members_per_project": 20,
    "max_video_size_mb": 5000,
    "max_videos_per_project": 100
  }'::jsonb,
  '["basic_feedback", "basic_chat", "priority_support", "advanced_analytics", "custom_branding", "version_compare"]'::jsonb,
  2,
  true
),
(
  'team',
  'Team',
  '대규모 팀과 에이전시를 위한 프리미엄 플랜',
  49900,
  499000,
  '{
    "max_projects": -1,
    "max_storage_gb": 500,
    "max_members_per_project": -1,
    "max_video_size_mb": 10000,
    "max_videos_per_project": -1
  }'::jsonb,
  '["basic_feedback", "basic_chat", "priority_support", "advanced_analytics", "custom_branding", "version_compare", "sso", "audit_log", "dedicated_support", "api_access"]'::jsonb,
  3,
  false
);

-- ============================================
-- 10. 사용량 집계 함수
-- ============================================

-- 현재 월의 사용량 레코드 가져오기 (없으면 생성)
CREATE OR REPLACE FUNCTION get_or_create_current_usage(p_user_id UUID)
RETURNS usage_records AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_record usage_records;
BEGIN
  -- 현재 월의 시작/끝
  v_period_start := date_trunc('month', NOW());
  v_period_end := date_trunc('month', NOW()) + INTERVAL '1 month';

  -- 기존 레코드 조회
  SELECT * INTO v_record
  FROM usage_records
  WHERE user_id = p_user_id
    AND period_start = v_period_start;

  -- 없으면 생성
  IF NOT FOUND THEN
    INSERT INTO usage_records (user_id, period_start, period_end)
    VALUES (p_user_id, v_period_start, v_period_end)
    RETURNING * INTO v_record;
  END IF;

  RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자의 현재 플랜 가져오기 (null이면 free)
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id UUID)
RETURNS subscription_plans AS $$
DECLARE
  v_plan subscription_plans;
BEGIN
  -- 활성 구독이 있는지 확인
  SELECT sp.* INTO v_plan
  FROM subscriptions s
  JOIN subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'trialing')
    AND s.current_period_end > NOW();

  -- 없으면 free 플랜 반환
  IF NOT FOUND THEN
    SELECT * INTO v_plan
    FROM subscription_plans
    WHERE name = 'free';
  END IF;

  RETURN v_plan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
