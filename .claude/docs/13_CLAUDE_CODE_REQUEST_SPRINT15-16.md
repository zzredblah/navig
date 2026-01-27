# Claude Code 개발 요청서 - Phase 2 Sprint 15-16

## 결제 시스템 + 클라이언트 포털

**기간**: Week 9-12 (Month 5-6)
**목표**: 토스페이먼츠 결제 연동, 구독 관리, 클라이언트 전용 포털

---

## 작업 1: 결제 시스템 DB 스키마

### 요청 내용

```
결제 및 구독 관리를 위한 데이터베이스 스키마를 생성해주세요.

마이그레이션 파일 생성:

-- 00015_subscriptions.sql

-- 구독 플랜 정의
CREATE TABLE subscription_plans (
  id VARCHAR(50) PRIMARY KEY, -- 'free', 'pro', 'team'
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL, -- 원 단위
  price_yearly INTEGER, -- 원 단위 (할인 적용)
  features JSONB NOT NULL DEFAULT '{}',
  limits JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 초기 플랜 데이터
INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, features, limits) VALUES
('free', 'Free', '개인 사용자를 위한 무료 플랜', 0, 0,
  '{"ai_features": false, "priority_support": false, "custom_branding": false}',
  '{"max_projects": 3, "max_storage_gb": 5, "max_members_per_project": 3, "version_retention_days": 30}'
),
('pro', 'Pro', '프리랜서와 소규모 팀을 위한 플랜', 19900, 199000,
  '{"ai_features": true, "priority_support": true, "custom_branding": false}',
  '{"max_projects": -1, "max_storage_gb": 100, "max_members_per_project": 10, "version_retention_days": 365}'
),
('team', 'Team', '에이전시와 대규모 팀을 위한 플랜', 49900, 499000,
  '{"ai_features": true, "priority_support": true, "custom_branding": true}',
  '{"max_projects": -1, "max_storage_gb": 500, "max_members_per_project": -1, "version_retention_days": -1}'
);

-- 사용자 구독 정보
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'trialing'
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly'
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  toss_billing_key TEXT, -- 정기결제용 빌링키
  toss_customer_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- 결제 내역
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  subscription_id UUID REFERENCES subscriptions(id),
  amount INTEGER NOT NULL, -- 원 단위
  currency VARCHAR(10) DEFAULT 'KRW',
  status VARCHAR(50) NOT NULL, -- 'pending', 'completed', 'failed', 'refunded', 'canceled'
  payment_type VARCHAR(50) NOT NULL, -- 'subscription', 'one_time', 'refund'
  toss_payment_key TEXT,
  toss_order_id TEXT UNIQUE,
  receipt_url TEXT,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);

-- 사용량 추적
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  metric VARCHAR(100) NOT NULL, -- 'storage_bytes', 'projects_count', 'ai_requests'
  value BIGINT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_toss_order ON payments(toss_order_id);
CREATE INDEX idx_usage_records_user_metric ON usage_records(user_id, metric);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_own ON subscriptions FOR ALL USING (user_id = auth.uid());
CREATE POLICY payments_own ON payments FOR ALL USING (user_id = auth.uid());
CREATE POLICY usage_records_own ON usage_records FOR ALL USING (user_id = auth.uid());

-- 트리거
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

요구사항:
1. 플랜 데이터 시드
2. 무료 플랜은 구독 레코드 없이 기본 적용
3. 마이너스 1(-1)은 무제한을 의미
4. 빌링키는 암호화 저장 고려
```

---

## 작업 2: 토스페이먼츠 연동 API

### 요청 내용

```
토스페이먼츠 결제 API를 연동해주세요.

환경 변수:
TOSS_CLIENT_KEY=test_ck_...
TOSS_SECRET_KEY=test_sk_...

API 엔드포인트:

# 플랜 목록
GET /api/plans
- response: { plans: SubscriptionPlan[] }

# 결제 요청 (결제창 호출 전)
POST /api/payments/checkout
- body: {
    plan_id: string,
    billing_cycle: 'monthly' | 'yearly',
    success_url: string,
    fail_url: string
  }
- response: {
    order_id: string,
    amount: number,
    order_name: string,
    customer_key: string
  }

# 결제 승인 (결제창 완료 후 콜백)
POST /api/payments/confirm
- body: {
    payment_key: string,
    order_id: string,
    amount: number
  }
- response: {
    success: boolean,
    payment: Payment,
    subscription: Subscription
  }

# 결제 내역
GET /api/payments/history
- query: { page?, limit? }
- response: { data: Payment[], total: number }

# 현재 구독 정보
GET /api/subscriptions/me
- response: {
    subscription: Subscription | null,
    plan: SubscriptionPlan,
    usage: {
      projects: { used: number, limit: number },
      storage: { used_bytes: number, limit_bytes: number },
      members: { limit_per_project: number }
    }
  }

# 구독 취소 (기간 종료 시)
POST /api/subscriptions/cancel
- response: { subscription: Subscription }

# 구독 취소 철회
POST /api/subscriptions/reactivate
- response: { subscription: Subscription }

# 플랜 변경
POST /api/subscriptions/change-plan
- body: { plan_id: string, billing_cycle: 'monthly' | 'yearly' }
- response: {
    subscription: Subscription,
    proration_amount?: number // 비례 청구 금액
  }

# 빌링키 등록 (정기결제용)
POST /api/payments/register-billing
- body: { auth_key: string }
- response: { success: boolean }

# 정기결제 실행 (서버 크론)
POST /api/payments/process-recurring (내부 API)

토스페이먼츠 SDK 사용:

// lib/toss.ts
import { TossPayments } from '@tosspayments/payment-sdk';

const tossPayments = TossPayments(process.env.TOSS_CLIENT_KEY!);

// 결제창 호출
await tossPayments.requestPayment('카드', {
  amount: 19900,
  orderId: orderId,
  orderName: 'Pro 플랜 (월간)',
  customerName: user.name,
  successUrl: `${baseUrl}/payments/success`,
  failUrl: `${baseUrl}/payments/fail`,
});

// 결제 승인 (서버)
const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ paymentKey, orderId, amount }),
});

요구사항:
1. 테스트 모드와 라이브 모드 분리
2. 결제 실패 시 재시도 로직
3. 웹훅 처리 (결제 상태 변경)
4. 영수증 URL 저장
5. 결제 로그 기록
```

---

## 작업 3: 결제 UI

### 요청 내용

```
결제 관련 UI 페이지를 구현해주세요.

1. 플랜 선택 페이지 (/pricing)
┌────────────────────────────────────────────────────────────┐
│                       요금제                               │
│            [월간 결제] [연간 결제 (17% 할인)]              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌─────────────────┐ ┌─────────────────┐ ┌────────────────┐ │
│ │     Free        │ │     Pro ⭐     │ │     Team       │ │
│ │                 │ │    추천         │ │                │ │
│ │    ₩0/월       │ │  ₩19,900/월    │ │  ₩49,900/월   │ │
│ │                 │ │                 │ │                │ │
│ │ ✓ 프로젝트 3개  │ │ ✓ 무제한       │ │ ✓ 무제한       │ │
│ │ ✓ 저장공간 5GB │ │ ✓ 100GB        │ │ ✓ 500GB        │ │
│ │ ✓ 멤버 3명/PJ  │ │ ✓ 10명/PJ      │ │ ✓ 무제한       │ │
│ │ ✓ 30일 보관    │ │ ✓ 1년 보관     │ │ ✓ 무제한       │ │
│ │ ✗ AI 기능      │ │ ✓ AI 기능      │ │ ✓ AI 기능      │ │
│ │ ✗ 우선 지원    │ │ ✓ 우선 지원    │ │ ✓ 우선 지원    │ │
│ │                 │ │                 │ │ ✓ 커스텀 브랜딩│ │
│ │                 │ │                 │ │                │ │
│ │  [현재 플랜]    │ │  [업그레이드]   │ │  [업그레이드]   │ │
│ └─────────────────┘ └─────────────────┘ └────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘

2. 결제 성공 페이지 (/payments/success)
┌─────────────────────────────────────────┐
│                                         │
│             ✓ 결제 완료!                │
│                                         │
│    Pro 플랜이 활성화되었습니다.         │
│                                         │
│    결제 금액: ₩19,900                   │
│    다음 결제일: 2026년 2월 27일         │
│                                         │
│         [대시보드로 이동]               │
│                                         │
└─────────────────────────────────────────┘

3. 결제 실패 페이지 (/payments/fail)
┌─────────────────────────────────────────┐
│                                         │
│             ✗ 결제 실패                 │
│                                         │
│    {에러 메시지}                        │
│                                         │
│    [다시 시도]    [고객센터]            │
│                                         │
└─────────────────────────────────────────┘

4. 설정 > 구독 관리 페이지 (/settings/subscription)
┌─────────────────────────────────────────────────────────────┐
│ 구독 관리                                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 현재 플랜: Pro (월간)                                       │
│ 상태: 활성                                                  │
│ 다음 결제일: 2026년 2월 27일                                │
│ 결제 금액: ₩19,900                                          │
│                                                             │
│ [플랜 변경]  [결제 취소]                                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 사용량                                                      │
│                                                             │
│ 프로젝트:    █████████░░░░░░░░░░░  45%  (45 / 무제한)       │
│ 저장공간:    ███████████░░░░░░░░░  55%  (55GB / 100GB)      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 결제 내역                                                   │
│                                                             │
│ 2026-01-27  Pro (월간)     ₩19,900  완료  [영수증]         │
│ 2025-12-27  Pro (월간)     ₩19,900  완료  [영수증]         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

5. 플랜 변경 모달
┌─────────────────────────────────────────┐
│ 플랜 변경                         [X]   │
├─────────────────────────────────────────┤
│                                         │
│ 현재: Pro (월간) → Team (월간)          │
│                                         │
│ 변경 사항:                              │
│ • 저장공간: 100GB → 500GB               │
│ • 멤버: 10명 → 무제한                   │
│ • 커스텀 브랜딩 추가                    │
│                                         │
│ 추가 결제: ₩30,000 (비례 계산)          │
│                                         │
│              [취소]  [변경하기]          │
└─────────────────────────────────────────┘

요구사항:
1. 토스페이먼츠 SDK 클라이언트 연동
2. 가격 포맷팅 (₩19,900)
3. 연간 할인율 표시
4. 반응형 디자인
5. 로딩/에러 상태
```

---

## 작업 4: 사용량 제한

### 요청 내용

```
플랜별 사용량 제한을 적용해주세요.

체크 포인트:

1. 프로젝트 생성 시
   - 현재 프로젝트 수 확인
   - 플랜 제한 초과 시 업그레이드 유도

2. 파일 업로드 시
   - 현재 저장 용량 확인
   - 플랜 제한 초과 시 업그레이드 유도

3. 멤버 초대 시
   - 현재 프로젝트 멤버 수 확인
   - 플랜 제한 초과 시 업그레이드 유도

4. AI 기능 사용 시
   - Pro 이상 플랜 확인
   - Free는 AI 기능 비활성화

구현:

// lib/usage.ts
interface UsageChecker {
  canCreateProject(): Promise<boolean>;
  canUploadFile(bytes: number): Promise<boolean>;
  canInviteMember(projectId: string): Promise<boolean>;
  canUseAI(): Promise<boolean>;
  getUsageSummary(): Promise<UsageSummary>;
}

// 미들웨어에서 사용
const checkUsage = async (userId: string, action: string): Promise<{
  allowed: boolean;
  reason?: string;
  upgrade_url?: string;
}> => {
  const usage = await getUsage(userId);
  const limits = await getLimits(userId);

  if (action === 'create_project' && usage.projects >= limits.max_projects) {
    return {
      allowed: false,
      reason: '프로젝트 생성 한도에 도달했습니다.',
      upgrade_url: '/pricing',
    };
  }

  // ...
};

// API에서 체크
export async function POST(request: NextRequest) {
  const user = await getUser();
  const usageCheck = await checkUsage(user.id, 'create_project');

  if (!usageCheck.allowed) {
    return NextResponse.json({
      error: usageCheck.reason,
      upgrade_url: usageCheck.upgrade_url,
    }, { status: 403 });
  }

  // 프로젝트 생성 진행
}

업그레이드 유도 모달:
┌─────────────────────────────────────────┐
│ 업그레이드 필요                   [X]   │
├─────────────────────────────────────────┤
│                                         │
│    ⚠️ 프로젝트 생성 한도 도달           │
│                                         │
│    Free 플랜에서는 최대 3개의           │
│    프로젝트만 생성할 수 있습니다.       │
│                                         │
│    Pro 플랜으로 업그레이드하면          │
│    무제한으로 프로젝트를 생성할 수      │
│    있습니다.                            │
│                                         │
│       [나중에]  [플랜 보기]             │
└─────────────────────────────────────────┘

요구사항:
1. 모든 제한 포인트에서 일관된 체크
2. 친절한 에러 메시지
3. 업그레이드 유도 UX
4. 사용량 실시간 계산
5. 캐싱으로 성능 최적화
```

---

## 작업 5: 클라이언트 전용 포털

### 요청 내용

```
의뢰인(client) 역할을 위한 간소화된 뷰를 구현해주세요.

URL: /client/projects/:projectId

기능 범위:
- 영상 미리보기
- 피드백 작성
- 버전 승인
- 진행 상황 확인
- 문서 확인/서명

숨김 기능:
- 프로젝트 설정
- 멤버 관리
- 상세 분석
- 파일 업로드 (영상)
- 기술적 정보

레이아웃:
┌────────────────────────────────────────────────────────────┐
│ NAVIG                              김의뢰 님  [알림] [설정]│
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 브랜드 홍보영상                                            │
│                                                            │
│ 진행 상황: █████████░ 90%                                 │
│ 현재 단계: 최종 검토                                       │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ [영상]  [문서]  [채팅]                                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ v3 - 최종본                           2026-01-27           │
│ ┌─────────────────────────────────────────────────────────┐│
│ │                                                         ││
│ │                    영상 플레이어                         ││
│ │                                                         ││
│ └─────────────────────────────────────────────────────────┘│
│                                                            │
│ 피드백                                                     │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 00:15에 피드백 작성...                        [전송]    ││
│ └─────────────────────────────────────────────────────────┘│
│                                                            │
│ [이전 버전 보기]                    [✓ 이 버전 승인]       │
│                                                            │
│ ─────────────────────────────────────────────────────────  │
│                                                            │
│ 피드백 목록 (5)                                            │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ● 00:15 자막 위치를 조금 더 아래로... [대기중]          ││
│ │ ● 00:45 BGM 볼륨이 너무 큽니다         [해결됨]         ││
│ │ ...                                                     ││
│ └─────────────────────────────────────────────────────────┘│
│                                                            │
└────────────────────────────────────────────────────────────┘

라우팅:

// 역할에 따른 자동 리다이렉트
/projects/:id
  → client 역할이면 → /client/projects/:id
  → 그 외 역할이면 → /projects/:id (기존)

// 또는 동적으로 UI 분기
const ProjectPage = () => {
  const { user, role } = useProjectMember(projectId);

  if (role === 'client') {
    return <ClientProjectView />;
  }

  return <FullProjectView />;
};

컴포넌트:
- ClientProjectView.tsx
- ClientVideoSection.tsx
- ClientFeedbackForm.tsx
- ClientDocumentList.tsx
- ClientProgressBar.tsx

요구사항:
1. 간소화된 네비게이션
2. 핵심 기능만 노출
3. 모바일 최적화
4. 빠른 승인 플로우
5. 문서 서명 기능 유지
```

---

## 작업 6: 결제 웹훅 처리

### 요청 내용

```
토스페이먼츠 웹훅을 처리해주세요.

웹훅 URL: /api/webhooks/toss

이벤트 타입:
1. PAYMENT_STATUS_CHANGED - 결제 상태 변경
2. BILLING_KEY_DELETED - 빌링키 삭제
3. PAYMENT_KEY_REFUNDED - 환불 완료

처리 로직:

// app/api/webhooks/toss/route.ts
export async function POST(request: NextRequest) {
  const payload = await request.json();

  // 서명 검증
  const signature = request.headers.get('X-Toss-Signature');
  if (!verifySignature(payload, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (payload.eventType) {
    case 'PAYMENT_STATUS_CHANGED':
      await handlePaymentStatusChange(payload.data);
      break;
    case 'BILLING_KEY_DELETED':
      await handleBillingKeyDeleted(payload.data);
      break;
    case 'PAYMENT_KEY_REFUNDED':
      await handleRefund(payload.data);
      break;
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentStatusChange(data) {
  const { paymentKey, status, orderId } = data;

  // 결제 상태 업데이트
  await supabase
    .from('payments')
    .update({ status, paid_at: status === 'DONE' ? new Date() : null })
    .eq('toss_payment_key', paymentKey);

  // 상태에 따른 추가 처리
  if (status === 'DONE') {
    // 구독 활성화
  } else if (status === 'CANCELED') {
    // 구독 취소 처리
  }
}

정기결제 크론:

// 매일 자정 실행
// Vercel Cron 또는 Supabase pg_cron

async function processRecurringPayments() {
  // 오늘 결제 예정인 구독 조회
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('status', 'active')
    .lte('current_period_end', new Date().toISOString());

  for (const subscription of subscriptions) {
    try {
      // 빌링키로 결제 실행
      const result = await processPayment(subscription);

      if (result.success) {
        // 기간 연장
        await extendSubscriptionPeriod(subscription.id);
      } else {
        // 결제 실패 처리
        await handlePaymentFailure(subscription);
      }
    } catch (error) {
      console.error('결제 처리 실패:', error);
    }
  }
}

요구사항:
1. 웹훅 서명 검증
2. 멱등성 보장
3. 실패 시 재시도 로직
4. 결제 실패 알림 발송
5. 로그 기록
```

---

## 참조 파일

- `rules/CODING_STANDARDS.md` - 코딩 컨벤션
- `rules/DESIGN_SYSTEM.md` - 디자인 시스템
- `10_NAVIG_PRD_PHASE2-3_UNIFIED.md` - 통합 PRD 섹션 2.3
- 토스페이먼츠 API 문서: https://docs.tosspayments.com/

---

## 완료 기준

### 기능 체크리스트

**결제 시스템**
- [ ] DB 스키마 + 마이그레이션
- [ ] 플랜 데이터 시드
- [ ] 결제 요청 API
- [ ] 결제 승인 API
- [ ] 결제 내역 조회
- [ ] 구독 관리 API
- [ ] 플랜 변경 API
- [ ] 웹훅 처리
- [ ] 정기결제 크론

**결제 UI**
- [ ] 플랜 선택 페이지
- [ ] 결제 성공/실패 페이지
- [ ] 구독 관리 페이지
- [ ] 플랜 변경 모달
- [ ] 결제 내역 표시

**사용량 제한**
- [ ] 사용량 체크 로직
- [ ] 제한 초과 시 에러 처리
- [ ] 업그레이드 유도 UI
- [ ] 사용량 표시

**클라이언트 포털**
- [ ] 간소화 뷰 컴포넌트
- [ ] 역할 기반 라우팅
- [ ] 모바일 최적화

### 품질 체크리스트

- [ ] 결제 테스트 모드 동작
- [ ] 웹훅 검증
- [ ] 에러 핸들링
- [ ] 결제 로그 기록
- [ ] 보안 검토 (PCI DSS 고려)
