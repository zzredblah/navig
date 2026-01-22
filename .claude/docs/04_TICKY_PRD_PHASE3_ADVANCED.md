# Ticky PRD - Phase 3: 고도화 (Month 7-12)

**버전:** 1.0  
**기간:** Month 7 ~ Month 12 (24주)  
**목표:** AI 기능, 글로벌 확장, 고급 분석

---

## 1. Phase 3 개요

### 1.1 목표

- AI 기반 고급 기능 (차이점 감지, 자막 생성)
- 실시간 공동 편집
- 커뮤니티 기능
- 글로벌 서비스 확장 (다국어)
- 고급 분석 대시보드

### 1.2 범위 요약

| 기능 영역 | 포함 |
|-----------|------|
| AI | 차이점 자동 감지, 자막 생성, 피드백 요약 |
| 협업 | 실시간 공동 편집, 커서 표시 |
| 커뮤니티 | Q&A 게시판, 포트폴리오 |
| 연동 | Google Drive |
| 분석 | 고급 대시보드, 리포트 |
| 글로벌 | 다국어 (영어, 일본어), 리전 서버 |

---

## 2. AI 기능

### 2.1 차이점 자동 감지

**기능 설명**:
- 두 영상 버전의 차이점 자동 분석
- 변경된 구간 타임라인에 표시
- 변경 유형 분류 (장면, 효과, 색보정, 오디오)

**구현 방식**:

```typescript
interface VideoComparison {
  version_a_id: string;
  version_b_id: string;
  differences: Difference[];
  similarity_score: number; // 0-100
  analyzed_at: Date;
}

interface Difference {
  type: 'scene' | 'effect' | 'color' | 'audio' | 'text';
  timecode_start: number;
  timecode_end: number;
  description: string;
  confidence: number; // 0-1
}
```

**기술 스택**:
- AWS Rekognition (씬 감지)
- FFmpeg (프레임 추출)
- 오디오 파형 분석
- 자체 ML 모델 (향후)

### 2.2 자동 자막 생성

**기능 설명**:
- 영상 업로드 시 자동 STT
- 타임코드별 자막 생성
- 자막 편집 UI

**구현**:

```typescript
interface Subtitle {
  id: string;
  video_version_id: string;
  timecode_start: number;
  timecode_end: number;
  text: string;
  confidence: number;
  is_edited: boolean;
}
```

**기술 스택**:
- OpenAI Whisper API
- 또는 Google Speech-to-Text

### 2.3 AI 피드백 요약

**기능 설명**:
- 긴 피드백 스레드 자동 요약
- 핵심 포인트 추출
- 액션 아이템 생성

**구현**:

```typescript
interface FeedbackSummary {
  thread_id: string;
  summary: string;
  key_points: string[];
  action_items: string[];
  generated_at: Date;
}
```

**기술 스택**:
- OpenAI GPT API
- Claude API (대안)

---

## 3. 실시간 공동 편집

### 3.1 캔버스 공동 편집

**기능**:
- 다중 사용자 동시 편집
- 실시간 커서 표시
- 편집 충돌 해결
- 변경사항 실시간 동기화

**기술 구현**:

```typescript
// CRDT 또는 OT 기반 동기화
// Yjs + Supabase Realtime 권장

interface CollaborationState {
  board_id: string;
  active_users: ActiveUser[];
  operations: Operation[];
}

interface ActiveUser {
  user_id: string;
  name: string;
  cursor: { x: number; y: number };
  color: string;
  selected_elements: string[];
}
```

**라이브러리**:
- Yjs (CRDT)
- Supabase Realtime (WebSocket)

### 3.2 문서 공동 편집

**기능**:
- 문서 실시간 편집
- 변경사항 하이라이트
- 충돌 해결 UI

---

## 4. 커뮤니티 기능

### 4.1 Q&A 게시판

**기능**:
- 질문/답변 포럼
- 카테고리 분류
- 태그 시스템
- 추천/비추천
- 채택 기능

**데이터 구조**:

```typescript
interface Post {
  id: string;
  type: 'question' | 'discussion';
  title: string;
  content: string;
  category: string;
  tags: string[];
  author_id: string;
  votes: number;
  view_count: number;
  is_solved: boolean;
  accepted_answer_id?: string;
  created_at: Date;
}

interface Answer {
  id: string;
  post_id: string;
  content: string;
  author_id: string;
  votes: number;
  is_accepted: boolean;
  created_at: Date;
}
```

### 4.2 포트폴리오 쇼케이스

**기능**:
- 작업자 포트폴리오 페이지
- 완료 프로젝트 공개 (동의 시)
- 썸네일 갤러리
- 프로필 정보

**데이터 구조**:

```typescript
interface Portfolio {
  user_id: string;
  display_name: string;
  bio: string;
  skills: string[];
  works: PortfolioWork[];
  contact_info?: ContactInfo;
}

interface PortfolioWork {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  video_url?: string;
  tags: string[];
  created_at: Date;
}
```

---

## 5. 외부 연동

### 5.1 Google Drive 연동

**기능**:
- 파일 가져오기
- 파일 내보내기
- 자동 백업

**OAuth 플로우**:

```
[연결하기] → [Google 로그인] → [권한 승인]
                                    ↓
                           [액세스 토큰 저장]
```

**API 사용**:
- Files: list, get, create, update
- 폴더 구조 동기화

---

## 6. 고급 분석 대시보드

### 6.1 분석 지표

**프로젝트 분석**:
- 평균 완료 소요일
- 평균 수정 횟수
- 단계별 평균 소요 시간
- 병목 구간 분석

**작업자 분석**:
- 평균 피드백 응답 시간
- 완료율
- 고객 만족도

**수익 분석**:
- 월별 매출
- 프로젝트당 평균 금액
- 고객별 매출

### 6.2 시각화

**차트 유형**:
- 꺾은선 그래프 (추이)
- 막대 그래프 (비교)
- 파이 차트 (비율)
- 히트맵 (밀도)
- 펀넬 차트 (전환율)

**대시보드 위젯**:
- 드래그 앤 드롭 배치
- 기간 필터
- 내보내기 (PDF, Excel)

---

## 7. 글로벌 확장

### 7.1 다국어 지원

**지원 언어**:
- 한국어 (기본)
- 영어
- 일본어

**구현**:
- i18next 라이브러리
- 번역 JSON 파일
- 언어 자동 감지
- 수동 전환

**번역 범위**:
- UI 텍스트
- 에러 메시지
- 이메일 템플릿
- 도움말 문서

### 7.2 리전 서버

**리전 구성**:
- Asia (서울) - 기본
- US (버지니아) - 향후
- EU (프랑크푸르트) - 향후

**데이터 로컬리티**:
- 사용자 선택 리전에 데이터 저장
- GDPR 준수

---

## 8. Phase 3 체크리스트

### Month 7-8
- [ ] AI 차이점 감지 설계
- [ ] 자동 자막 생성
- [ ] 실시간 협업 기반 구축

### Month 9-10
- [ ] AI 피드백 요약
- [ ] 캔버스 공동 편집
- [ ] Q&A 게시판

### Month 11-12
- [ ] 포트폴리오 기능
- [ ] Google Drive 연동
- [ ] 고급 분석 대시보드
- [ ] 다국어 (영어)
- [ ] 성능 최적화

---

**Phase 3 완료 기준**:
1. AI 기능 정상 작동
2. 실시간 협업 안정화
3. 커뮤니티 기능 출시
4. 영어 버전 출시
5. 2,000명 사용자 지원 가능
