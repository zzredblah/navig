# Claude Code 개발 요청서 - Phase 1 Sprint 7-8

## 피드백 시스템

**기간**: Week 9-10  
**목표**: 프레임 단위 주석, 피드백 CRUD, 상태 관리 구현

---

## 작업 1: 피드백 관련 스키마

### 요청 내용

```
피드백 시스템을 위한 데이터베이스 스키마를 설정해주세요.

테이블:

1. feedbacks
   - id: UUID PRIMARY KEY
   - video_version_id: UUID REFERENCES video_versions
   - parent_id: UUID REFERENCES feedbacks (답글용)
   - timecode_start: INTEGER NOT NULL (초)
   - timecode_end: INTEGER (초, optional)
   - frame_image_url: VARCHAR(500)
   - content: TEXT NOT NULL
   - status: ENUM('pending', 'in_progress', 'review', 'completed')
   - is_urgent: BOOLEAN DEFAULT FALSE
   - created_by: UUID REFERENCES users
   - resolved_by: UUID REFERENCES users
   - resolved_at: TIMESTAMP
   - created_at: TIMESTAMP
   - updated_at: TIMESTAMP

2. annotations
   - id: UUID PRIMARY KEY
   - feedback_id: UUID REFERENCES feedbacks
   - type: ENUM('arrow', 'rect', 'circle', 'freehand', 'text')
   - data: JSONB
   - created_at: TIMESTAMP

annotations.data 구조:
{
  "x": number,
  "y": number,
  "color": string,
  "strokeWidth": number,
  "opacity": number,
  // 타입별 추가 필드
  "endX": number,      // arrow
  "endY": number,
  "width": number,     // rect
  "height": number,
  "radius": number,    // circle
  "points": number[],  // freehand
  "text": string,      // text
  "fontSize": number
}

인덱스:
- feedbacks(video_version_id, timecode_start)
- feedbacks(status)
- feedbacks(parent_id)

RLS:
- 프로젝트 멤버만 접근 가능
```

---

## 작업 2: 피드백 API (백엔드)

### 요청 내용

```
피드백 CRUD API를 구현해주세요.

API 엔드포인트:

# 피드백 목록
GET /videos/:videoId/feedbacks
- query: { status?, page?, limit? }
- response: { data: Feedback[], total }

# 피드백 생성
POST /videos/:videoId/feedbacks
- body: {
    timecode_start,
    timecode_end?,
    frame_image_url,
    content,
    annotations,
    is_urgent?
  }
- response: { feedback }

# 피드백 상세
GET /feedbacks/:id
- response: { feedback, replies }

# 피드백 수정
PATCH /feedbacks/:id
- body: { content?, annotations?, is_urgent? }
- response: { feedback }

# 피드백 삭제
DELETE /feedbacks/:id
- response: { success }

# 상태 변경
PATCH /feedbacks/:id/status
- body: { status }
- 상태 전환 규칙 검증
- response: { feedback }

# 답글 생성
POST /feedbacks/:id/replies
- body: { content }
- response: { reply }

상태 전환 규칙:
- pending → in_progress (작업자)
- in_progress → review, pending (작업자)
- review → completed, in_progress (의뢰인)
- completed → pending (의뢰인, 재오픈)

알림 트리거:
- 새 피드백: 작업자에게 알림
- 긴급 피드백: 이메일 + 인앱
- 상태 변경: 피드백 작성자에게 알림
- 답글: 스레드 참여자에게 알림

요구사항:
1. 상태 전환 권한 검증
2. 답글은 parent_id로 연결
3. 알림 발송 (이메일, 인앱)
```

---

## 작업 3: 주석 도구 컴포넌트

### 요청 내용

```
Canvas 기반 주석 도구를 구현해주세요.

컴포넌트: AnnotationCanvas

도구:
1. 선택 (V) - 주석 선택/이동/크기조절
2. 화살표 (A) - 시작점 → 끝점
3. 사각형 (R) - 드래그로 영역
4. 원 (O) - 중심점 + 드래그
5. 자유 그리기 (P) - 펜 도구
6. 텍스트 (T) - 클릭 후 입력

스타일 옵션:
- 색상: 빨강, 노랑, 초록, 파랑, 보라, 검정
- 두께: 2px, 4px, 6px, 8px
- 투명도: 50%, 75%, 100%

UI 레이아웃:
┌────────────────────────────────────────┐
│ [V] [→] [□] [○] [✏] [T] │ 🔴 🟡 🟢 │ 4px │
├────────────────────────────────────────┤
│                                        │
│         [영상 프레임 이미지]            │
│         [주석 오버레이 캔버스]          │
│                                        │
└────────────────────────────────────────┘

상호작용:
- 도구 선택 후 캔버스에서 그리기
- 기존 주석 클릭으로 선택
- 선택된 주석 드래그로 이동
- 핸들 드래그로 크기 조절
- Delete키로 삭제

기술:
- Fabric.js 또는 Konva
- React 상태와 동기화
- JSON으로 직렬화/역직렬화

요구사항:
1. 실행 취소/다시 실행 (Ctrl+Z/Y)
2. 복사/붙여넣기 (Ctrl+C/V)
3. 키보드 단축키
4. 터치 지원
```

---

## 작업 4: 피드백 작성 UI

### 요청 내용

```
피드백 작성 플로우를 구현해주세요.

플로우:
1. 영상 재생 중 원하는 시점에서 일시정지
2. "피드백 추가" 버튼 클릭
3. 현재 프레임 캡처 → 주석 모드 진입
4. 주석 도구로 수정 사항 표시
5. 피드백 내용 텍스트 입력
6. 긴급 여부 체크 (선택)
7. 저장

피드백 작성 모달:
┌─────────────────────────────────────────┐
│ 피드백 추가                     [X]     │
├─────────────────────────────────────────┤
│ 타임코드: 00:01:30                      │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │    [프레임 캡처 + 주석 캔버스]       │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 피드백 내용 *                           │
│ ┌─────────────────────────────────────┐ │
│ │ 자막 위치를 왼쪽으로 이동해주세요.   │ │
│ │ 현재 화면 하단과 너무 가깝습니다.    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [🔥 긴급]                               │
│                                         │
│              [취소]  [저장]              │
└─────────────────────────────────────────┘

요구사항:
1. 프레임 캡처 (canvas API)
2. 캡처 이미지 R2 저장
3. 주석 데이터 JSON 저장
4. 유효성 검증 (내용 필수)
```

---

## 작업 5: 피드백 목록 및 타임라인 마커

### 요청 내용

```
피드백 목록과 타임라인 마커를 구현해주세요.

사이드 패널 - 피드백 목록:
┌─────────────────────────────┐
│ 피드백 (5)      [필터 ▼]    │
├─────────────────────────────┤
│ 🔴 [00:01:30] 자막 위치     │
│    대기중 · 김의뢰인 · 5분 전 │
│                             │
│ 🟡 [00:02:15] 효과음 추가   │
│    진행중 · 김의뢰인 · 1시간 전│
│                             │
│ 🟢 [00:03:00] 색보정        │
│    완료 · 김의뢰인 · 어제    │
└─────────────────────────────┘

타임라인 마커:
━━━━🔴━━━🟡━━━━━━🟢━━━━━━━━━━━━━━
    ^     ^       ^
  0:01:30 0:02:15 0:03:00

마커 상호작용:
- 호버: 피드백 미리보기 툴팁
- 클릭: 해당 시점으로 이동 + 피드백 선택
- 드래그: 타임라인 스크롤

피드백 카드 액션:
- 클릭: 상세 보기 (프레임 + 주석)
- 상태 변경 드롭다운
- 답글 버튼

필터 옵션:
- 전체
- 대기중 (pending)
- 진행중 (in_progress)
- 검토중 (review)
- 완료 (completed)
- 긴급만

요구사항:
1. 스크롤 동기화 (목록 ↔ 타임라인)
2. 마커 색상 = 상태 색상
3. 긴급 마커 강조 (🔥 아이콘)
```

---

## 작업 6: 피드백 상세 및 답글

### 요청 내용

```
피드백 상세 뷰와 답글 기능을 구현해주세요.

피드백 상세 모달/패널:
┌─────────────────────────────────────────┐
│ 피드백 상세                     [X]     │
├─────────────────────────────────────────┤
│ [00:01:30]              🔴 대기중 ▼     │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │    [프레임 이미지 + 주석 표시]       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 자막 위치를 왼쪽으로 이동해주세요.       │
│ 현재 화면 하단과 너무 가깝습니다.        │
│                                         │
│ 김의뢰인 · 5분 전 · 🔥 긴급             │
├─────────────────────────────────────────┤
│ 답글 (2)                                │
│                                         │
│ 💬 확인했습니다. 수정 진행하겠습니다.    │
│    김작업자 · 3분 전                    │
│                                         │
│ 💬 감사합니다!                          │
│    김의뢰인 · 1분 전                    │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 답글 입력...                        │ │
│ └─────────────────────────────────────┘ │
│                              [답글 작성] │
└─────────────────────────────────────────┘

상태 변경:
- 드롭다운에서 상태 선택
- 권한에 따라 선택 가능 상태 제한
- 변경 시 즉시 반영

답글:
- 텍스트만 (이미지 없음)
- Enter로 전송 (Shift+Enter 줄바꿈)
- 실시간 업데이트 (Supabase Realtime)

요구사항:
1. 주석 읽기 전용 표시
2. 상태 변경 낙관적 업데이트
3. 답글 실시간 표시
4. @멘션 지원 (선택적)
```

---

## 작업 7: 피드백 알림 연동

### 요청 내용

```
피드백 관련 알림을 구현해주세요.

알림 트리거:

1. 새 피드백 등록
   - 수신자: 작업자
   - 채널: 인앱, 이메일
   - 내용: "[프로젝트명] 새 피드백: {내용 요약}"

2. 긴급 피드백 등록
   - 수신자: 작업자
   - 채널: 인앱, 이메일 (즉시)
   - 내용: "🔥 [프로젝트명] 긴급 피드백: {내용 요약}"

3. 피드백 상태 변경
   - 수신자: 피드백 작성자
   - 채널: 인앱
   - 내용: "피드백 상태가 {status}로 변경되었습니다"

4. 답글 등록
   - 수신자: 스레드 참여자 (자신 제외)
   - 채널: 인앱
   - 내용: "{이름}님이 답글을 남겼습니다"

알림 데이터:
{
  type: 'new_feedback' | 'urgent_feedback' | 'feedback_status' | 'feedback_reply',
  title: string,
  content: string,
  link: string, // 피드백으로 이동
  metadata: { feedbackId, projectId, ... }
}

요구사항:
1. 알림 발송 서비스 (NotificationService)
2. 이메일 템플릿
3. 인앱 알림 저장
4. Supabase Realtime 연동
```

---

## 참조 파일

- `rules/CODING_STANDARDS.md` - 코딩 컨벤션
- `rules/DESIGN_SYSTEM.md` - 디자인 시스템
- 전체 PRD: `01_NAVIG_PRD_FULL.md` 섹션 3.3

---

## 완료 기준

1. 주석 도구 (5종) 정상 작동
2. 프레임 캡처 및 저장 가능
3. 피드백 CRUD 가능
4. 피드백 상태 전환 작동
5. 타임라인 마커 표시 및 클릭 이동 작동
6. 답글 작성 및 표시 작동
7. 알림 발송 (인앱, 이메일) 작동
8. 실시간 업데이트 작동
