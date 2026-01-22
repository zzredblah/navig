# Ticky PRD - Phase 2: 기능 확장 (Month 4-6)

**버전:** 1.0  
**기간:** Month 4 ~ Month 6 (12주)  
**목표:** 차별화 기능, 유료화 준비

---

## 1. Phase 2 개요

### 1.1 목표

- 멀티 캔버스 레퍼런스 보드 구현
- AI 템플릿 추천 기능
- 고급 버전 비교 기능
- 결제 시스템 연동
- 정식 출시 준비

### 1.2 범위 요약

| 기능 영역 | 포함 | 제외 |
|-----------|------|------|
| 캔버스 | 레퍼런스 보드 전체 | 실시간 공동 편집 |
| AI | 템플릿 추천 | 자막 생성, 차이점 감지 |
| 영상 | 슬라이더 비교, 타임라인 오버레이 | AI 차이점 감지 |
| 결제 | 토스페이먼츠, 구독 플랜 | PayPal, Stripe |
| 피드백 | 모자이크, 번호 마커 | 음성 메모 |
| 연동 | Slack 웹훅 | Google Drive, Notion |

### 1.3 마일스톤

| 마일스톤 | 시점 | 내용 |
|----------|------|------|
| M5 | Week 16 | 캔버스 기본 기능 완료 |
| M6 | Week 20 | 고급 비교, AI 추천 완료 |
| M7 | Week 22 | 결제 시스템 완료 |
| M8 | Week 24 | Phase 2 완료, 정식 출시 |

---

## 2. 멀티 캔버스 레퍼런스 보드

### 2.1 캔버스 기본 구조

**캔버스 보드 데이터**:

```typescript
interface CanvasBoard {
  id: string;
  project_id: string;
  title: string;
  content: CanvasContent;
  is_shared: boolean;
  share_link?: string;
  share_password?: string;
  expires_at?: Date;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

interface CanvasContent {
  viewport: { x: number; y: number; zoom: number };
  elements: CanvasElement[];
}

interface CanvasElement {
  id: string;
  type: 'image' | 'video' | 'text' | 'shape' | 'frame' | 'embed';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
  data: ImageData | VideoData | TextData | ShapeData | FrameData | EmbedData;
}
```

### 2.2 소스 가져오기

**외부 소스**:

| 방식 | 구현 |
|------|------|
| 드래그 앤 드롭 | 파일 드롭존 컴포넌트 |
| URL 입력 | OG 이미지/제목 파싱 |
| 클립보드 | onPaste 이벤트 핸들링 |
| 파일 선택 | input[type=file] |

**지원 포맷**:

| 유형 | 포맷 | 처리 |
|------|------|------|
| 이미지 | JPG, PNG, GIF, WebP, SVG | 직접 렌더링 |
| 영상 | MP4, WebM | 썸네일 + 재생 |
| 문서 | PDF | PDF.js 미리보기 |
| 웹페이지 | URL | OG 이미지 카드 |

**내부 소스**:
- 프로젝트 영상 프레임 캡처
- 프로젝트 문서 (견적서 등)
- 다른 보드 요소 복사

### 2.3 캔버스 UI/UX

**무한 캔버스 기능**:

```typescript
// 뷰포트 상태
interface ViewportState {
  x: number;      // 캔버스 X 오프셋
  y: number;      // 캔버스 Y 오프셋
  zoom: number;   // 0.1 ~ 4.0
}

// 조작
- 팬: 스페이스 + 드래그, 휠 클릭 드래그
- 줌: Ctrl + 휠, 핀치
- 줌 프리셋: 50%, 100%, 150%, 200%, Fit
```

**요소 조작**:

| 조작 | 마우스/키보드 | 터치 |
|------|--------------|------|
| 선택 | 클릭 | 탭 |
| 다중 선택 | Shift+클릭, 드래그 선택 | - |
| 이동 | 드래그 | 드래그 |
| 크기 조절 | 코너 핸들 드래그 | 핀치 |
| 회전 | 회전 핸들 드래그 | 두 손가락 회전 |
| 삭제 | Delete, Backspace | - |
| 복사 | Ctrl+C | - |
| 붙여넣기 | Ctrl+V | - |
| 실행 취소 | Ctrl+Z | - |
| 다시 실행 | Ctrl+Shift+Z | - |

**레이어 관리**:

```typescript
interface LayerActions {
  bringToFront: () => void;     // Ctrl+Shift+]
  sendToBack: () => void;       // Ctrl+Shift+[
  bringForward: () => void;     // Ctrl+]
  sendBackward: () => void;     // Ctrl+[
  lock: () => void;
  unlock: () => void;
  group: () => void;            // Ctrl+G
  ungroup: () => void;          // Ctrl+Shift+G
}
```

**정렬/배치**:

- 좌/중앙/우 정렬
- 상/중앙/하 정렬
- 균등 가로 배치
- 균등 세로 배치
- 스마트 가이드 (스냅)

### 2.4 주석 기능

**캔버스 주석**:
- 요소에 메모 추가
- 화살표로 연결
- 스티커 노트
- 댓글 스레드

**주석 데이터**:

```typescript
interface CanvasComment {
  id: string;
  board_id: string;
  element_id?: string; // 특정 요소에 연결
  x: number;
  y: number;
  content: string;
  replies: CommentReply[];
  created_by: string;
  created_at: Date;
}
```

### 2.5 공유 기능

**공유 설정**:

| 옵션 | 설명 |
|------|------|
| 링크 공유 | 고유 URL 생성 |
| 권한 | 보기 전용 / 편집 가능 |
| 비밀번호 | 선택적 비밀번호 보호 |
| 만료일 | 링크 유효 기간 |

**공유 링크 형식**: `https://ticky.app/board/share/{shareCode}`

### 2.6 캔버스 기술 스택

**추천 라이브러리**:

| 라이브러리 | 용도 | 특징 |
|-----------|------|------|
| Fabric.js | 캔버스 렌더링 | 객체 기반, 이벤트 처리 |
| React-Konva | React 통합 | 선언적 API |
| Excalidraw | 참고 | 오픈소스, 협업 |

---

## 3. AI 템플릿 추천

### 3.1 추천 시스템 설계

**입력 데이터**:
- 프로젝트 제목
- 작업 유형 (편집/제작/기타)
- 작업 설명 키워드
- 과거 사용 템플릿

**추천 로직**:

```typescript
interface TemplateRecommendation {
  template_id: string;
  template_name: string;
  match_score: number; // 0-100
  match_reasons: string[];
}

// 추천 알고리즘
1. 키워드 매칭 (TF-IDF)
2. 유사 프로젝트 분석
3. 사용자 선호도 학습
4. 인기도 가중치
```

**추천 UI**:

```
┌─────────────────────────────────────────┐
│ 🤖 AI 추천 템플릿                        │
├─────────────────────────────────────────┤
│ ⭐ 유튜브 편집 요청서 (95% 일치)          │
│    "영상 편집", "유튜브" 키워드 매칭       │
│                              [선택]      │
├─────────────────────────────────────────┤
│ ⭐ 기업 홍보영상 견적서 (82% 일치)        │
│    유사 프로젝트 3건 사용                 │
│                              [선택]      │
├─────────────────────────────────────────┤
│ ⭐ 일반 계약서 (78% 일치)                │
│    기본 추천                            │
│                              [선택]      │
└─────────────────────────────────────────┘
```

### 3.2 구현 방식

**Phase 2에서는 규칙 기반 + 키워드 매칭**:

```typescript
// 키워드 기반 매칭
const keywords = {
  youtube: ['유튜브', '영상', '편집', 'vlog'],
  commercial: ['광고', '홍보', '기업', 'CF'],
  wedding: ['웨딩', '결혼', '스냅'],
  // ...
};

function recommendTemplates(projectDescription: string): TemplateRecommendation[] {
  // 1. 키워드 추출
  // 2. 카테고리 매칭
  // 3. 사용 이력 조회
  // 4. 점수 계산 및 정렬
}
```

**향후 ML 기반 고도화** (Phase 3):
- 임베딩 기반 유사도
- 협업 필터링
- 피드백 학습

---

## 4. 고급 버전 비교

### 4.1 슬라이더 비교

**UI 설계**:

```
┌─────────────────────────────────────────┐
│          [영상 오버레이]                 │
│                                         │
│     v1    │◀━━━━━━━━━━━▶│    v2        │
│ (왼쪽)    │  드래그 슬라이더 │  (오른쪽)   │
│                                         │
├─────────────────────────────────────────┤
│  ▶️ ━━━━━━━━━━━━━━━━━━━━━━━━━━  00:30   │
└─────────────────────────────────────────┘
```

**구현**:
- 두 영상을 같은 컨테이너에 오버레이
- CSS clip-path로 좌우 분할
- 드래그로 분할선 이동

### 4.2 타임라인 오버레이

**변경 구간 시각화**:

```
타임라인:
0:00 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 3:00
     ▓▓▓▓░░░░░▓▓░░░░░░░▓▓▓▓▓▓░░░░░
     ^변경^   ^변경^    ^변경^
```

**구현 방식**:
- 영상 해시 비교 (프레임 단위)
- 씬 체인지 감지
- 오디오 파형 비교

### 4.3 구간 비교

**기능**:
- 시작/종료 타임코드 지정
- 해당 구간만 루프 재생
- 구간별 북마크

---

## 5. 결제 시스템

### 5.1 구독 플랜

| 플랜 | 월 요금 | 프로젝트 | 스토리지 | 팀원 |
|------|---------|---------|---------|------|
| Free | ₩0 | 1개 | 500MB | 1명 |
| Starter | ₩19,900 | 10개 | 10GB | 3명 |
| Pro | ₩49,900 | 무제한 | 50GB | 10명 |
| Enterprise | 협의 | 무제한 | 무제한 | 무제한 |

### 5.2 토스페이먼츠 연동

**결제 플로우**:

```
[플랜 선택] → [토스페이먼츠 결제창] → [결제 완료]
                                         ↓
                              [웹훅 수신] → [구독 활성화]
```

**구현 요소**:
- 결제 위젯 연동
- 정기 결제 (빌링키)
- 웹훅 처리
- 영수증 발급

**데이터 구조**:

```typescript
interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due';
  billing_key?: string;
  current_period_start: Date;
  current_period_end: Date;
  created_at: Date;
}

interface Payment {
  id: string;
  subscription_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_key: string;
  receipt_url?: string;
  paid_at?: Date;
  created_at: Date;
}
```

### 5.3 사용량 추적

**추적 항목**:
- 프로젝트 수
- 스토리지 사용량
- 팀원 수
- AI 기능 사용량

**제한 적용**:
- 소프트 제한: 경고 알림
- 하드 제한: 기능 차단 + 업그레이드 유도

---

## 6. 고급 피드백 도구

### 6.1 추가 주석 도구

**모자이크/블러**:
- 영역 지정
- 블러 강도 조절
- "모자이크 처리 필요" 표시용

**번호 마커**:
- 자동 번호 매김
- 순차적 작업 지시
- 클릭 시 상세 내용

**측정 도구**:
- 거리 측정 (픽셀)
- 영역 측정
- "여기서 10px 위로" 등 정확한 지시

### 6.2 피드백 그룹화

**관련 피드백 묶기**:
- 드래그로 그룹화
- 그룹 일괄 상태 변경
- 그룹 담당자 지정

---

## 7. Slack 연동

### 7.1 웹훅 연동

**알림 전송 이벤트**:
- 새 피드백 등록
- 긴급 피드백
- 버전 업로드
- 마감 임박

**메시지 포맷**:

```
🎬 [Ticky] 새 피드백
━━━━━━━━━━━━━━━━━━━
프로젝트: 브랜드 홍보영상
타임코드: 00:01:30
내용: 자막 위치를 왼쪽으로 이동해주세요
작성자: 김의뢰인
[피드백 확인하기]
```

### 7.2 설정 UI

**Slack 연동 설정**:
- 웹훅 URL 입력
- 채널 선택
- 알림 유형 선택

---

## 8. Phase 2 체크리스트

### Week 13-16 (캔버스)
- [ ] 캔버스 기본 UI
- [ ] 요소 추가/편집/삭제
- [ ] 드래그 앤 드롭 업로드
- [ ] URL 임베드
- [ ] 레이어 관리
- [ ] 공유 기능

### Week 17-20 (비교 & AI)
- [ ] 슬라이더 비교
- [ ] 타임라인 오버레이
- [ ] AI 템플릿 추천
- [ ] 고급 주석 도구

### Week 21-24 (결제 & 마무리)
- [ ] 토스페이먼츠 연동
- [ ] 구독 플랜 시스템
- [ ] Slack 연동
- [ ] 성능 최적화
- [ ] 정식 출시 준비

---

**Phase 2 완료 기준**:
1. 모든 확장 기능 구현 완료
2. 결제 시스템 정상 작동
3. 성능 기준 충족
4. 500명 사용자 지원 가능
5. 정식 출시 준비 완료
