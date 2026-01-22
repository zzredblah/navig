# Claude Code 개발 요청서 - Phase 1 Sprint 9-10

## 대시보드 & 알림 시스템

**기간**: Week 11-12  
**목표**: 통합 대시보드, 알림 시스템 완성, MVP 마무리

---

## 작업 1: 대시보드 API (백엔드)

### 요청 내용

```
대시보드용 집계 API를 구현해주세요.

API 엔드포인트:

# 프로젝트 현황 요약
GET /dashboard/summary
- response: {
    total: number,
    planning: number,
    production: number,
    review: number,
    completed: number
  }

# 내 프로젝트 목록 (대시보드용)
GET /dashboard/projects
- query: { status?, limit? }
- response: {
    data: [{
      id,
      title,
      status,
      stage_status,
      progress,
      deadline,
      pending_feedbacks,
      urgent_feedbacks,
      updated_at
    }]
  }

# 긴급 항목
GET /dashboard/urgent
- response: {
    feedbacks: Feedback[],
    overdue_projects: Project[]
  }

# 최근 활동
GET /dashboard/activities
- query: { limit? }
- response: {
    activities: [{
      type: 'feedback' | 'version' | 'document' | 'project',
      action: 'created' | 'updated' | 'status_changed',
      title: string,
      project_name: string,
      actor_name: string,
      created_at: Date
    }]
  }

요구사항:
1. 효율적인 집계 쿼리
2. 캐싱 (Redis, 1분)
3. 사용자별 필터링
```

---

## 작업 2: 대시보드 UI (프론트엔드)

### 요청 내용

```
통합 대시보드 UI를 구현해주세요.

페이지: /dashboard

레이아웃:
┌────────────────────────────────────────────────────┐
│ 대시보드                              2025.01.22   │
├────────────────────────────────────────────────────┤
│                                                    │
│ ┌──────────┬──────────┬──────────┬──────────┐     │
│ │  전체    │  진행중  │  검토중  │  완료    │     │
│ │   15    │    8     │    2     │    5    │     │
│ └──────────┴──────────┴──────────┴──────────┘     │
│                                                    │
│ ┌─────────────────────────────────────────────┐   │
│ │ 🔥 긴급 (3)                                 │   │
│ ├─────────────────────────────────────────────┤   │
│ │ 브랜드 영상 - 긴급 피드백 3건               │   │
│ │ 제품 소개 - 마감 D-1                        │   │
│ └─────────────────────────────────────────────┘   │
│                                                    │
│ 내 프로젝트                          [+ 새 프로젝트]│
│ ┌─────────────────────────────────────────────┐   │
│ │ 브랜드 홍보영상        제작 70%     D-5     │   │
│ │ ▓▓▓▓▓▓▓░░░             피드백 3건          │   │
│ ├─────────────────────────────────────────────┤   │
│ │ 제품 소개 영상         검토중      D-1 🔥   │   │
│ │ ▓▓▓▓▓▓▓▓▓░             피드백 1건          │   │
│ └─────────────────────────────────────────────┘   │
│                                                    │
│ 최근 활동                                          │
│ ┌─────────────────────────────────────────────┐   │
│ │ 김작업자가 v3 업로드 · 브랜드 영상 · 2시간 전 │   │
│ │ 김의뢰인이 피드백 추가 · 제품 소개 · 5시간 전 │   │
│ │ 계약서 서명 완료 · 신규 프로젝트 · 어제      │   │
│ └─────────────────────────────────────────────┘   │
│                                                    │
└────────────────────────────────────────────────────┘

컴포넌트:
1. StatCard - 상태별 카운터
2. UrgentSection - 긴급 항목 리스트
3. ProjectList - 프로젝트 목록
4. ActivityFeed - 최근 활동

인터랙션:
- 카운터 클릭: 해당 상태 프로젝트 필터
- 프로젝트 클릭: 프로젝트 상세로 이동
- 긴급 항목 클릭: 해당 페이지로 이동

요구사항:
1. 스켈레톤 로딩
2. 자동 새로고침 (30초)
3. 빈 상태 UI
```

---

## 작업 3: 알림 시스템 (백엔드)

### 요청 내용

```
알림 시스템 백엔드를 구현해주세요.

스키마:

notifications
- id: UUID PRIMARY KEY
- user_id: UUID REFERENCES users
- type: VARCHAR(50)
- title: VARCHAR(255)
- content: TEXT
- link: VARCHAR(500)
- metadata: JSONB
- is_read: BOOLEAN DEFAULT FALSE
- created_at: TIMESTAMP

notification_settings
- user_id: UUID PRIMARY KEY REFERENCES users
- email_new_feedback: BOOLEAN DEFAULT TRUE
- email_urgent_feedback: BOOLEAN DEFAULT TRUE
- email_version_upload: BOOLEAN DEFAULT TRUE
- email_document_status: BOOLEAN DEFAULT TRUE
- email_deadline_reminder: BOOLEAN DEFAULT TRUE
- inapp_enabled: BOOLEAN DEFAULT TRUE

API 엔드포인트:

# 알림 목록
GET /notifications
- query: { page?, limit?, unread_only? }
- response: { data: Notification[], total, unread_count }

# 알림 읽음 처리
PATCH /notifications/:id/read
- response: { success }

# 전체 읽음 처리
PATCH /notifications/read-all
- response: { success }

# 알림 설정 조회
GET /notification-settings
- response: { settings }

# 알림 설정 변경
PATCH /notification-settings
- body: { ...settings }
- response: { settings }

알림 생성 서비스:

NotificationService.create({
  userId: string,
  type: NotificationType,
  title: string,
  content: string,
  link: string,
  metadata?: object
})

이메일 발송:
- Resend 또는 SendGrid
- 템플릿 기반 발송
- 설정에 따라 on/off

실시간 알림:
- Supabase Realtime
- 새 알림 시 클라이언트 푸시

요구사항:
1. 알림 생성 → DB 저장 + 이메일 발송 + 실시간 푸시
2. 이메일 템플릿 (한글)
3. 알림 설정 반영
```

---

## 작업 4: 알림 UI (프론트엔드)

### 요청 내용

```
알림 UI를 구현해주세요.

1. 헤더 알림 벨:
┌─────────────────────────────────┐
│             [🔔 3]              │ <- 읽지 않은 알림 수
└─────────────────────────────────┘

2. 알림 드롭다운:
┌─────────────────────────────────┐
│ 알림                 [모두 읽음] │
├─────────────────────────────────┤
│ 🔴 새 피드백                    │
│    브랜드 영상에 피드백이 등록... │
│    5분 전                       │
├─────────────────────────────────┤
│    v3 업로드 완료               │
│    제품 소개 영상에 새 버전...   │
│    1시간 전                     │
├─────────────────────────────────┤
│ 🔴 긴급 피드백                  │
│    브랜드 영상 - 자막 수정 요청  │
│    2시간 전                     │
├─────────────────────────────────┤
│         [모든 알림 보기]         │
└─────────────────────────────────┘

3. 알림 전체 페이지 (/notifications):
┌─────────────────────────────────────────┐
│ 알림                                    │
├─────────────────────────────────────────┤
│ [전체] [읽지 않음]          [설정 ⚙️]   │
├─────────────────────────────────────────┤
│ 오늘                                    │
│ ├ 🔴 새 피드백 · 5분 전                 │
│ ├    v3 업로드 · 1시간 전               │
│ └ 🔴 긴급 피드백 · 2시간 전             │
│                                         │
│ 어제                                    │
│ ├    계약서 서명 완료 · 어제            │
│ └    프로젝트 초대 · 어제               │
└─────────────────────────────────────────┘

4. 알림 설정 모달:
┌─────────────────────────────────────────┐
│ 알림 설정                        [X]    │
├─────────────────────────────────────────┤
│ 이메일 알림                             │
│ ├ [✓] 새 피드백                         │
│ ├ [✓] 긴급 피드백                       │
│ ├ [✓] 새 영상 버전                      │
│ ├ [ ] 문서 상태 변경                    │
│ └ [✓] 마감 알림                         │
│                                         │
│ 인앱 알림                               │
│ └ [✓] 알림 활성화                       │
│                                         │
│                        [취소]  [저장]   │
└─────────────────────────────────────────┘

요구사항:
1. 읽지 않은 알림 표시 (배경색, 점)
2. 클릭 시 해당 링크로 이동 + 읽음 처리
3. 실시간 알림 수신 (Supabase Realtime)
4. 알림 설정 저장
5. 무한 스크롤 (전체 페이지)
```

---

## 작업 5: 실시간 기능 연동

### 요청 내용

```
Supabase Realtime을 활용한 실시간 기능을 구현해주세요.

실시간 구독:

1. 알림
   - 채널: notifications:{userId}
   - 이벤트: INSERT
   - 액션: 알림 벨 업데이트, 토스트 표시

2. 피드백 (선택적)
   - 채널: feedbacks:{videoVersionId}
   - 이벤트: INSERT, UPDATE
   - 액션: 피드백 목록 업데이트

3. 프로젝트 상태 (선택적)
   - 채널: projects:{projectId}
   - 이벤트: UPDATE
   - 액션: 상태 뱃지 업데이트

구현:

// hooks/useRealtimeNotifications.ts
function useRealtimeNotifications(userId: string) {
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        // 알림 추가
        // 토스트 표시
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}

요구사항:
1. 연결 상태 표시 (선택적)
2. 재연결 로직
3. 에러 핸들링
```

---

## 작업 6: 마감 알림 스케줄러

### 요청 내용

```
마감일 기반 자동 알림을 구현해주세요.

스케줄:
- 매일 09:00 (KST) 실행
- D-3, D-1, D-day 알림 발송

로직:

1. 마감 D-3인 프로젝트 조회
2. 프로젝트 멤버에게 알림 발송
3. 마감 D-1인 프로젝트 조회
4. 프로젝트 멤버에게 알림 발송 (강조)
5. 마감 D-day인 프로젝트 조회
6. 프로젝트 멤버에게 알림 발송 (긴급)

알림 내용:
- D-3: "프로젝트 '{title}' 마감이 3일 남았습니다."
- D-1: "⚠️ 프로젝트 '{title}' 마감이 내일입니다."
- D-day: "🔥 프로젝트 '{title}' 오늘 마감입니다!"

기술:
- node-cron 또는 Cloudflare Workers Cron
- 또는 Supabase Edge Functions + pg_cron

요구사항:
1. 중복 알림 방지
2. 이미 완료된 프로젝트 제외
3. 타임존 처리 (KST)
```

---

## 작업 7: MVP 마무리 작업

### 요청 내용

```
MVP 완성을 위한 마무리 작업을 진행해주세요.

1. 에러 바운더리
   - 전역 에러 핸들링
   - 에러 페이지 UI
   - Sentry 연동 (선택적)

2. 404 페이지
   - 존재하지 않는 경로
   - "홈으로 돌아가기" 버튼

3. 로딩 상태 통일
   - 전체 페이지: 스켈레톤
   - 부분: 스피너
   - 버튼: 인라인 스피너

4. 토스트 알림 통일
   - 성공: 초록
   - 에러: 빨강
   - 경고: 노랑
   - 정보: 파랑

5. 빈 상태 UI
   - 프로젝트 없음
   - 피드백 없음
   - 알림 없음
   - 검색 결과 없음

6. 반응형 최종 점검
   - 모바일 레이아웃
   - 태블릿 레이아웃
   - 터치 인터랙션

7. 성능 최적화
   - 이미지 lazy loading
   - 코드 스플리팅
   - React.memo / useMemo 적용

8. SEO 기본
   - 페이지별 title
   - meta description
   - og:image (선택적)

요구사항:
1. 일관된 사용자 경험
2. 에러 상황 graceful handling
3. 성능 기준 충족 (LCP < 2.5s)
```

---

## 참조 파일

- `rules/CODING_STANDARDS.md` - 코딩 컨벤션
- `rules/DESIGN_SYSTEM.md` - 디자인 시스템
- 전체 PRD: `01_TICKY_PRD_FULL.md` 섹션 3.5

---

## 완료 기준 (MVP 전체)

### 기능 체크리스트

**인증**
- [ ] 이메일 회원가입/로그인
- [ ] Google 로그인
- [ ] Kakao 로그인
- [ ] 비밀번호 재설정

**프로젝트**
- [ ] 프로젝트 CRUD
- [ ] 멤버 초대
- [ ] 역할 관리

**문서**
- [ ] 템플릿 기반 생성
- [ ] 상태 워크플로우
- [ ] 전자서명
- [ ] PDF 다운로드

**영상**
- [ ] 청크 업로드
- [ ] 버전 목록
- [ ] 나란히 비교
- [ ] 다운로드

**피드백**
- [ ] 주석 도구
- [ ] 피드백 CRUD
- [ ] 상태 관리
- [ ] 답글

**대시보드**
- [ ] 프로젝트 현황
- [ ] 긴급 항목
- [ ] 최근 활동

**알림**
- [ ] 인앱 알림
- [ ] 이메일 알림
- [ ] 실시간 알림
- [ ] 마감 알림

### 품질 체크리스트

- [ ] 모든 주요 플로우 작동
- [ ] 반응형 디자인 완료
- [ ] 에러 핸들링 완료
- [ ] 로딩 상태 표시
- [ ] 성능 기준 충족
- [ ] 브라우저 호환성 (Chrome, Safari, Firefox)
