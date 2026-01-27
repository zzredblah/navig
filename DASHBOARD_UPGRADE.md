# 대시보드 페이지 고도화 완료

## 작업 개요

대시보드 페이지를 새로 생성된 API와 연동하여 고도화했습니다.

## 새로 생성된 컴포넌트

### 1. StatCards
**파일:** `src/components/dashboard/StatCards.tsx`

- 프로젝트 상태별 통계 카드 (기획, 제작, 검수, 완료)
- 클릭 시 해당 상태의 프로젝트 목록으로 이동
- 그라데이션 배경 및 아이콘 적용

**Props:**
```typescript
interface StatCardsProps {
  total: number;
  planning: number;
  production: number;
  review: number;
  completed: number;
}
```

### 2. UrgentSection
**파일:** `src/components/dashboard/UrgentSection.tsx`

- 긴급 피드백 (최근 24시간 이내 생성된 open 피드백)
- 기한 초과 프로젝트 (마감일 지난 프로젝트)
- 빨간색/오렌지색 강조 디자인
- 클릭 시 해당 프로젝트/영상으로 이동

**Props:**
```typescript
interface UrgentSectionProps {
  urgentFeedbacks: Array<{
    id: string;
    content: string;
    project_title: string;
    video_title: string;
    created_at: string;
  }>;
  overdueProjects: Array<{
    id: string;
    title: string;
    deadline: string;
    days_overdue: number;
  }>;
}
```

### 3. ActivityFeed
**파일:** `src/components/dashboard/ActivityFeed.tsx`

- 최근 활동 목록 (피드백, 영상 업로드, 문서 생성, 프로젝트 생성)
- 아바타 + 활동 타입 아이콘 + 내용
- 상대 시간 표시 (방금, N분 전, N시간 전, N일 전)
- 클릭 시 해당 리소스로 이동

**Props:**
```typescript
interface ActivityFeedProps {
  activities: Array<{
    type: 'feedback' | 'version' | 'document' | 'project';
    action: 'created' | 'updated' | 'status_changed';
    title: string;
    project_name: string;
    actor_name: string;
    actor_avatar: string | null;
    created_at: string;
    link: string;
  }>;
}
```

### 4. DashboardSkeleton
**파일:** `src/components/dashboard/DashboardSkeleton.tsx`

- 대시보드 로딩 중 표시되는 스켈레톤 UI
- 모든 섹션의 구조 반영

## 수정된 페이지

### src/app/(dashboard)/dashboard/page.tsx

**주요 변경사항:**

1. **Server Component 패턴 적용**
   - API fetch 대신 Supabase 직접 조회
   - 불필요한 네트워크 호출 제거

2. **새 컴포넌트 통합**
   - StatCards: 상태별 프로젝트 통계 (클릭 가능)
   - UrgentSection: 긴급 피드백 + 기한 초과 프로젝트
   - ActivityFeed: 최근 활동 타임라인

3. **Suspense 적용**
   - 로딩 상태 처리
   - DashboardSkeleton 스켈레톤 UI

4. **데이터 조회 최적화**
   - 소유 프로젝트 + 멤버 프로젝트 통합 조회
   - 중복 쿼리 제거

## 디자인 시스템 준수

- Primary 색상 (Violet/Purple) 사용
- 그라데이션 배경 적용
- 카드 호버 효과
- 반응형 그리드 레이아웃
- Lucide React 아이콘

## 기술 스택

- Next.js 15 (App Router, Server Component)
- React 19 + TypeScript
- Supabase (데이터 조회)
- shadcn/ui 컴포넌트
- TailwindCSS

## 주요 기능

### 1. 프로젝트 현황 요약
- 전체 프로젝트 수
- 상태별 분류 (기획, 제작, 검수, 완료)
- 클릭 시 필터링된 프로젝트 목록으로 이동

### 2. 긴급 알림
- 최근 24시간 이내 생성된 긴급 피드백
- 기한 초과 프로젝트 (초과 일수 표시)
- 빨간색/오렌지색 강조

### 3. 최근 활동
- 피드백, 영상 업로드, 문서, 프로젝트 생성 활동
- 아바타 + 아이콘으로 시각화
- 시간순 정렬
- 상대 시간 표시

### 4. 추가 통계
- 협업 멤버 수
- 전체 문서 수
- 최근 활동 시간

### 5. 차트
- 프로젝트 상태 분포 (기존 유지)
- 문서 상태 분포 (기존 유지)

### 6. 최근 프로젝트
- 최근 5개 프로젝트
- 멤버 수, 문서 수 표시
- 클릭 시 프로젝트 상세로 이동

## 빈 상태 처리

- 프로젝트 없음: 새 프로젝트 생성 버튼
- 활동 없음: 안내 메시지
- 긴급 항목 없음: 섹션 자체 숨김

## 반응형 디자인

- 모바일: 1열 그리드
- 태블릿: 2열 그리드
- 데스크톱: 3-4열 그리드
- 메타데이터: 모바일에서 덜 중요한 정보 숨김

## 체크리스트

- [x] TypeScript 에러 없음 (notification 관련 에러는 기존)
- [x] ESLint 경고 없음
- [x] 반응형 패턴 준수
- [x] 로딩 상태 처리 (Suspense + Skeleton)
- [x] 빈 상태 UI 구현
- [x] shadcn/ui 컴포넌트 우선 사용
- [x] Primary 색상 사용
- [x] 클릭 가능한 요소에 피드백 존재

## 관련 API

대시보드 페이지는 다음 API를 **직접 조회**로 대체했습니다:

- `GET /api/dashboard/summary` → Supabase 직접 조회
- `GET /api/dashboard/urgent` → Supabase 직접 조회
- `GET /api/dashboard/activities` → Supabase 직접 조회

## 파일 목록

### 생성된 파일
- `src/components/dashboard/StatCards.tsx`
- `src/components/dashboard/UrgentSection.tsx`
- `src/components/dashboard/ActivityFeed.tsx`
- `src/components/dashboard/DashboardSkeleton.tsx`

### 수정된 파일
- `src/app/(dashboard)/dashboard/page.tsx`

## 다음 단계

1. 알림 기능 구현 시 긴급 알림과 연동
2. 프로젝트 필터링 페이지 고도화
3. 실시간 업데이트 (Supabase Realtime) 적용 고려
4. 성능 최적화 (데이터 캐싱)

## 참고 문서

- `.claude/rules/DESIGN_SYSTEM.md` - UI 디자인 시스템
- `.claude/rules/CODING_STANDARDS.md` - 코딩 표준
- `.claude/rules/ERROR_PREVENTION.md` - 오류 방지 패턴
