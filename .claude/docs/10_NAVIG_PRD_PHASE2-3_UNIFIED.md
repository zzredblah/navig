# NAVIG PRD - Phase 2-3 통합 로드맵

**버전:** 1.0
**기간:** Month 4 ~ Month 12 (36주)
**목표:** 기능 확장, AI 고도화, 글로벌 진출

---

## 1. 개요

### 1.1 Phase 2-3 목표

**Phase 2 (Month 4-6): 기능 확장**
- Quick Wins + UX 개선
- 멀티 캔버스 레퍼런스 보드
- 결제 시스템 (유료화)
- 기본 AI 기능

**Phase 3 (Month 7-12): 고도화**
- 커뮤니티 + 고급 분석
- 실시간 공동 편집
- 고급 AI 기능
- 글로벌 확장 (다국어)

### 1.2 전체 기능 맵

```
Phase 2 (Month 4-6)
├── Sprint 11-12: Quick Wins + UX 개선
│   ├── 피드백 템플릿
│   ├── 빠른 승인 버튼
│   ├── 키보드 단축키
│   ├── QR 코드 공유
│   └── 피드백 통계
│
├── Sprint 13-14: 멀티 캔버스 + 버전 비교
│   ├── 무한 캔버스 레퍼런스 보드
│   ├── 슬라이더 버전 비교
│   └── 변경 구간 하이라이트
│
├── Sprint 15-16: 결제 + 클라이언트 포털
│   ├── 토스페이먼츠 연동
│   ├── 구독 플랜 관리
│   ├── 사용량 제한
│   └── 클라이언트 전용 포털
│
└── Sprint 17-18: AI 기능 + 워터마크
    ├── 음성 피드백 (Whisper)
    ├── AI 템플릿 추천
    ├── 워터마크 자동 적용
    └── 스마트 알림 다이제스트

Phase 3 (Month 7-12)
├── Sprint 19-20: 커뮤니티 + 분석
│   ├── 협업 타임라인
│   ├── AI 피드백 요약
│   ├── Q&A 게시판
│   └── 고급 분석 대시보드
│
├── Sprint 21-22: 실시간 협업 + 다국어
│   ├── 캔버스 공동 편집 (CRDT)
│   ├── 실시간 커서 표시
│   ├── 다국어 (영어)
│   └── 다국어 (일본어)
│
└── Sprint 23-24: 고급 AI + 글로벌
    ├── AI 차이점 감지
    ├── AI 자막 생성
    ├── 포트폴리오 쇼케이스
    ├── Google Drive 연동
    └── 모바일 PWA
```

---

## 2. Phase 2: 기능 확장 (Month 4-6)

### 2.1 Sprint 11-12: Quick Wins + UX 개선

#### 2.1.1 피드백 템플릿 시스템

**기능 설명:**
- 자주 사용하는 피드백을 템플릿으로 저장
- 클릭 한 번으로 피드백 삽입
- 사용자별 템플릿 관리

**데이터 구조:**

```typescript
interface FeedbackTemplate {
  id: string;
  user_id: string;
  title: string;
  content: string;
  icon?: string;
  order: number;
  created_at: Date;
}
```

**DB 변경:**

```sql
-- profiles 테이블에 JSONB 컬럼 추가 또는 별도 테이블
ALTER TABLE profiles
ADD COLUMN feedback_templates JSONB DEFAULT '[]';
```

---

#### 2.1.2 빠른 승인 버튼

**기능 설명:**
- 영상 버전 페이지에 "이 버전 승인" 버튼 추가
- 확인 다이얼로그 후 버전 상태를 'approved'로 변경
- 모바일 친화적 원터치 UI

**구현:**

```typescript
// API: PATCH /api/videos/:id/versions/:versionId/approve
interface ApproveVersionRequest {
  comment?: string; // 선택적 승인 코멘트
}

interface ApproveVersionResponse {
  success: boolean;
  version: VideoVersion;
}
```

---

#### 2.1.3 키보드 단축키 시스템

**기능 설명:**
- 전역 단축키 지원
- 단축키 목록 모달 (Cmd+/)
- 사용자 커스터마이징 (향후)

**단축키 목록:**

| 단축키 | 기능 |
|--------|------|
| `Cmd+K` | 글로벌 검색 |
| `Cmd+N` | 새 프로젝트 |
| `Cmd+/` | 단축키 목록 |
| `J` / `K` | 피드백 이동 (상/하) |
| `R` | 피드백 답글 |
| `E` | 피드백 수정 |
| `Esc` | 모달/패널 닫기 |

**구현:**

```typescript
// hooks/useHotkeys.ts
import { useHotkeys } from 'react-hotkeys-hook';

function useGlobalHotkeys() {
  useHotkeys('mod+k', () => openSearchModal());
  useHotkeys('mod+n', () => openNewProjectModal());
  useHotkeys('mod+/', () => openHotkeysModal());
}
```

---

#### 2.1.4 QR 코드 공유

**기능 설명:**
- 프로젝트 상세 페이지에서 QR 코드 생성
- 스캔 시 프로젝트 페이지로 이동
- 다운로드/공유 기능

**구현:**

```typescript
import QRCode from 'qrcode';

const generateProjectQR = async (projectId: string): Promise<string> => {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/projects/${projectId}`;
  return await QRCode.toDataURL(url);
};
```

---

#### 2.1.5 피드백 통계 대시보드

**기능 설명:**
- 프로젝트별 피드백 해결률
- 평균 응답 시간
- 수정 횟수 추이

**데이터:**

```typescript
interface FeedbackStats {
  project_id: string;
  total_feedbacks: number;
  resolved_feedbacks: number;
  resolution_rate: number; // 0-100
  avg_response_time_hours: number;
  revision_count: number;
}
```

**API:**

```
GET /api/projects/:id/feedback-stats
```

---

### 2.2 Sprint 13-14: 멀티 캔버스 + 버전 비교

#### 2.2.1 멀티 캔버스 레퍼런스 보드

**기능 설명:**
- 무한 캔버스 기반 레퍼런스 보드
- 이미지, 영상, 텍스트 요소 추가
- 드래그 앤 드롭 배치
- 줌/팬 네비게이션
- 공유 링크 생성

**데이터 구조:**

```typescript
interface Board {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  is_public: boolean;
  share_token?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

interface BoardElement {
  id: string;
  board_id: string;
  type: 'image' | 'video' | 'text' | 'shape' | 'sticky';
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
  z_index: number;
  content: {
    url?: string;        // 이미지/영상
    text?: string;       // 텍스트
    color?: string;      // 배경색
    font_size?: number;
  };
  created_at: Date;
  updated_at: Date;
}
```

**DB 스키마:**

```sql
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(64) UNIQUE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE board_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}',
  size JSONB NOT NULL DEFAULT '{"width": 200, "height": 200}',
  rotation FLOAT DEFAULT 0,
  z_index INTEGER DEFAULT 0,
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_board_elements_board ON board_elements(board_id);
```

**기술 스택:**
- Canvas: Konva.js 또는 Fabric.js
- 줌/팬: @use-gesture/react
- 상태 관리: Zustand

---

#### 2.2.2 슬라이더 버전 비교

**기능 설명:**
- 두 영상 버전을 좌우로 나란히 배치
- 슬라이더로 비교 영역 조절
- 동기화 재생

**UI:**

```
┌─────────────────────────────────────────┐
│         슬라이더 비교 모드              │
├────────────────┬────────────────────────┤
│                │                        │
│    v1 영상     │        v2 영상         │
│                │                        │
│       ←───┼───→        (슬라이더)       │
│                │                        │
└────────────────┴────────────────────────┘
```

**구현:**

```typescript
interface SliderCompareProps {
  leftVideoUrl: string;
  rightVideoUrl: string;
  leftLabel: string;
  rightLabel: string;
}

// CSS clip-path 또는 Canvas 기반 구현
```

---

#### 2.2.3 변경 구간 하이라이트

**기능 설명:**
- 타임라인에 변경된 구간 표시
- 변경 유형별 색상 구분
- 클릭 시 해당 시점으로 이동

**데이터:**

```typescript
interface ChangeMarker {
  id: string;
  version_id: string;
  type: 'visual' | 'audio' | 'text';
  start_time: number;
  end_time: number;
  description?: string;
}
```

---

### 2.3 Sprint 15-16: 결제 + 클라이언트 포털

#### 2.3.1 토스페이먼츠 연동

**기능 설명:**
- 카드 결제
- 구독 결제 (정기 결제)
- 결제 내역 관리
- 영수증 발급

**데이터 구조:**

```typescript
interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'pro' | 'team';
  status: 'active' | 'canceled' | 'past_due';
  current_period_start: Date;
  current_period_end: Date;
  toss_subscription_id?: string;
  created_at: Date;
}

interface Payment {
  id: string;
  user_id: string;
  subscription_id?: string;
  amount: number;
  currency: 'KRW';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  toss_payment_key?: string;
  receipt_url?: string;
  created_at: Date;
}
```

**API:**

```
POST /api/payments/checkout      # 결제 시작
POST /api/payments/confirm       # 결제 확인
GET /api/payments/history        # 결제 내역
POST /api/subscriptions          # 구독 시작
DELETE /api/subscriptions/:id    # 구독 취소
```

---

#### 2.3.2 구독 플랜 관리

**플랜 구조:**

| 기능 | Free | Pro (₩19,900/월) | Team (₩49,900/월) |
|------|------|------------------|-------------------|
| 프로젝트 | 3개 | 무제한 | 무제한 |
| 저장공간 | 5GB | 100GB | 500GB |
| 멤버 | 3명/프로젝트 | 10명/프로젝트 | 무제한 |
| 버전 보관 | 30일 | 1년 | 무제한 |
| AI 기능 | ❌ | ✅ | ✅ |
| 우선 지원 | ❌ | ✅ | ✅ |
| 커스텀 브랜딩 | ❌ | ❌ | ✅ |

---

#### 2.3.3 사용량 제한

**기능 설명:**
- 플랜별 기능 제한 적용
- 사용량 초과 시 업그레이드 안내
- 사용량 대시보드

**구현:**

```typescript
interface UsageLimits {
  plan: 'free' | 'pro' | 'team';
  limits: {
    max_projects: number;
    max_storage_gb: number;
    max_members_per_project: number;
    version_retention_days: number;
    ai_features_enabled: boolean;
  };
}

// 미들웨어에서 사용량 체크
async function checkUsageLimit(userId: string, feature: string): Promise<boolean> {
  const usage = await getUserUsage(userId);
  const limits = await getUserLimits(userId);
  return usage[feature] < limits[feature];
}
```

---

#### 2.3.4 클라이언트 전용 포털

**기능 설명:**
- 의뢰인(client) 역할 전용 간소화 뷰
- 불필요한 기능 숨김
- 핵심 기능만 노출

**클라이언트 뷰:**

```
┌─────────────────────────────────────────┐
│ 브랜드 홍보영상                  [승인] │
├─────────────────────────────────────────┤
│                                         │
│           [영상 플레이어]               │
│                                         │
├─────────────────────────────────────────┤
│ 진행 상황: █████████░ 90%              │
│ 현재 단계: 최종 검토                    │
├─────────────────────────────────────────┤
│ 피드백 작성                             │
│ ┌─────────────────────────────────────┐ │
│ │ 00:15 위치에 피드백 작성...         │ │
│ └─────────────────────────────────────┘ │
│                               [전송]    │
└─────────────────────────────────────────┘
```

---

### 2.4 Sprint 17-18: AI 기능 + 워터마크

#### 2.4.1 음성 피드백 (Whisper API)

**기능 설명:**
- 영상 재생 중 음성으로 피드백 녹음
- 자동 텍스트 변환
- 타임코드 자동 연결

**플로우:**

```
[영상 재생] → [🎤 녹음 버튼] → [음성 녹음]
                                    ↓
                          [Whisper API 변환]
                                    ↓
                    [텍스트 + 타임코드로 피드백 생성]
```

**API:**

```typescript
// POST /api/transcribe
interface TranscribeRequest {
  audio: File;
  language?: 'ko' | 'en' | 'ja';
}

interface TranscribeResponse {
  text: string;
  duration: number;
  confidence: number;
}
```

---

#### 2.4.2 AI 템플릿 추천

**기능 설명:**
- 프로젝트 키워드 분석
- 적합한 문서 템플릿 추천
- 자동 필드 채우기 제안

**구현:**

```typescript
interface TemplateRecommendation {
  template_id: string;
  template_name: string;
  match_score: number;
  suggested_fields: Record<string, string>;
}

// POST /api/ai/recommend-template
async function recommendTemplate(projectDescription: string): Promise<TemplateRecommendation[]>;
```

---

#### 2.4.3 워터마크 자동 적용

**기능 설명:**
- 업로드 시 워터마크 옵션
- 워터마크 유형 선택 (로고, 텍스트, 타임코드)
- 원본은 별도 보관

**워터마크 옵션:**

```typescript
interface WatermarkOptions {
  enabled: boolean;
  type: 'logo' | 'text' | 'timecode' | 'all';
  logo_url?: string;
  text?: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number; // 0-1
}
```

**기술:**
- FFmpeg WASM (브라우저) 또는
- Cloudflare Workers + FFmpeg (서버)

---

#### 2.4.4 스마트 알림 다이제스트

**기능 설명:**
- 매일 09:00 요약 이메일 발송
- 중요 항목 우선 표시
- 원클릭 액션 링크

**이메일 템플릿:**

```
📬 NAVIG 일일 요약 - 2026년 1월 27일

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 긴급
• "브랜드 영상" - 긴급 피드백 2건 대기 중 [확인하기]
• "제품 소개" - 마감 D-1 [확인하기]

📹 새 버전
• "브랜드 영상" v3 업로드됨 [검토하기]

💬 새 피드백
• "제품 소개"에 3건의 새 피드백 [확인하기]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

이 이메일 설정 변경: [알림 설정]
```

---

## 3. Phase 3: 고도화 (Month 7-12)

### 3.1 Sprint 19-20: 커뮤니티 + 분석

#### 3.1.1 협업 타임라인

**기능 설명:**
- 프로젝트별 모든 활동 기록
- 시간순 타임라인 표시
- 필터링 (유형, 사용자)

**데이터:**

```typescript
interface ActivityLog {
  id: string;
  project_id: string;
  user_id: string;
  type: 'feedback' | 'version' | 'document' | 'member' | 'status';
  action: 'created' | 'updated' | 'deleted' | 'resolved';
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: Date;
}
```

---

#### 3.1.2 AI 피드백 요약

**기능 설명:**
- 긴 피드백 스레드 자동 요약
- 핵심 포인트 추출
- 액션 아이템 생성

**API:**

```typescript
// POST /api/ai/summarize-feedback
interface SummarizeRequest {
  feedback_ids: string[];
}

interface SummarizeResponse {
  summary: string;
  key_points: string[];
  action_items: string[];
}
```

---

#### 3.1.3 Q&A 게시판

**기능 설명:**
- 영상 제작 관련 Q&A 커뮤니티
- 카테고리/태그 시스템
- 채택/추천 기능

**데이터:**

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL, -- 'question', 'discussion'
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  author_id UUID NOT NULL REFERENCES profiles(id),
  votes INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_solved BOOLEAN DEFAULT FALSE,
  accepted_answer_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag VARCHAR(50),
  PRIMARY KEY (post_id, tag)
);

CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES profiles(id),
  votes INTEGER DEFAULT 0,
  is_accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 3.1.4 고급 분석 대시보드

**분석 지표:**

**프로젝트 분석:**
- 평균 완료 소요일
- 평균 수정 횟수
- 단계별 소요 시간
- 병목 구간 분석

**작업자 분석:**
- 평균 피드백 응답 시간
- 완료율
- 활동 패턴

**수익 분석 (Pro/Team):**
- 월별 매출
- 프로젝트당 평균 금액
- 고객별 매출

---

### 3.2 Sprint 21-22: 실시간 협업 + 다국어

#### 3.2.1 캔버스 공동 편집

**기능 설명:**
- 다중 사용자 동시 편집
- 실시간 변경사항 동기화
- 충돌 해결 (CRDT)

**기술:**

```typescript
// Yjs + Supabase Realtime
import * as Y from 'yjs';
import { SupabaseProvider } from 'y-supabase';

const ydoc = new Y.Doc();
const provider = new SupabaseProvider(supabase, {
  name: `board:${boardId}`,
  document: ydoc,
});

const elements = ydoc.getArray<BoardElement>('elements');
```

---

#### 3.2.2 실시간 커서 표시

**기능 설명:**
- 다른 사용자의 커서 위치 표시
- 사용자별 색상 구분
- 선택 영역 표시

**데이터:**

```typescript
interface UserPresence {
  user_id: string;
  name: string;
  avatar_url?: string;
  color: string;
  cursor: { x: number; y: number };
  selected_elements: string[];
  last_active: Date;
}
```

---

#### 3.2.3 다국어 지원 (영어, 일본어)

**구현:**

```typescript
// next-i18next 또는 next-intl
// locales/en.json, locales/ja.json

const translations = {
  en: {
    dashboard: 'Dashboard',
    projects: 'Projects',
    feedback: 'Feedback',
    // ...
  },
  ja: {
    dashboard: 'ダッシュボード',
    projects: 'プロジェクト',
    feedback: 'フィードバック',
    // ...
  }
};
```

---

### 3.3 Sprint 23-24: 고급 AI + 글로벌

#### 3.3.1 AI 차이점 감지

**기능 설명:**
- 두 영상 버전 자동 비교
- 변경점 타임라인 표시
- 변경 유형 분류

**데이터:**

```typescript
interface VideoComparison {
  id: string;
  version_a_id: string;
  version_b_id: string;
  similarity_score: number;
  differences: Difference[];
  analyzed_at: Date;
}

interface Difference {
  type: 'scene' | 'effect' | 'color' | 'audio' | 'text';
  timecode_start: number;
  timecode_end: number;
  description: string;
  confidence: number;
  thumbnail_url?: string;
}
```

---

#### 3.3.2 AI 자막 생성

**기능 설명:**
- 영상 업로드 시 자동 자막 생성
- 타임코드별 자막
- 자막 편집 UI

**데이터:**

```sql
CREATE TABLE subtitles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_version_id UUID NOT NULL REFERENCES video_versions(id) ON DELETE CASCADE,
  language VARCHAR(10) DEFAULT 'ko',
  timecode_start FLOAT NOT NULL,
  timecode_end FLOAT NOT NULL,
  text TEXT NOT NULL,
  confidence FLOAT,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 3.3.3 포트폴리오 쇼케이스

**기능 설명:**
- 작업자 포트폴리오 페이지
- 완료 프로젝트 공개 (동의 시)
- 공개 프로필

**데이터:**

```sql
CREATE TABLE portfolios (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  display_name VARCHAR(100),
  bio TEXT,
  skills TEXT[],
  website_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE portfolio_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES portfolios(user_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  project_id UUID REFERENCES projects(id), -- 링크된 프로젝트
  tags TEXT[],
  is_featured BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 3.3.4 Google Drive 연동

**기능 설명:**
- 파일 가져오기
- 파일 내보내기
- 자동 백업 (선택적)

**OAuth 플로우:**

```
[연결하기] → [Google 로그인] → [권한 승인] → [토큰 저장]
```

---

#### 3.3.5 모바일 PWA

**기능:**
- 홈 화면 설치
- 푸시 알림
- 오프라인 지원 (캐싱)
- 영상 미리보기
- 빠른 승인

**구현:**

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  // ...
});
```

---

## 4. 데이터베이스 스키마 변경 요약

### 4.1 Phase 2 테이블

```sql
-- 피드백 템플릿 (profiles에 JSONB 추가)
-- 보드 + 보드 요소
-- 구독 + 결제
-- 사용량 추적
```

### 4.2 Phase 3 테이블

```sql
-- 활동 로그
-- Q&A (posts, answers, post_tags)
-- 자막
-- 포트폴리오 (portfolios, portfolio_works)
-- 외부 연동 토큰
```

---

## 5. 마일스톤 체크리스트

### Phase 2 완료 기준 (Month 6)

- [ ] Quick Wins 4개 기능 배포
- [ ] 멀티 캔버스 MVP 배포
- [ ] 결제 시스템 작동
- [ ] 유료 구독자 확보
- [ ] 기본 AI 기능 작동

### Phase 3 완료 기준 (Month 12)

- [ ] Q&A 커뮤니티 활성화
- [ ] 실시간 협업 안정화
- [ ] 영어 버전 출시
- [ ] AI 기능 고도화
- [ ] 월 활성 사용자 2,000명

---

## 6. 관련 문서

| 문서 | 설명 |
|------|------|
| `01_NAVIG_PRD_FULL.md` | 전체 PRD |
| `02_NAVIG_PRD_PHASE1_MVP.md` | Phase 1 MVP |
| `03_NAVIG_PRD_PHASE2_EXPANSION.md` | Phase 2 확장 상세 |
| `04_NAVIG_PRD_PHASE3_ADVANCED.md` | Phase 3 고도화 상세 |
| `NEXT_STEPS_AND_IDEAS.md` | 혁신 아이디어 |
| `11~17_CLAUDE_CODE_REQUEST_*.md` | 스프린트별 개발 요청서 |
