# Sprint 5-6 개발 완료 요약

**작성일**: 2026-01-26
**범위**: 영상 버전 관리 + 프레임 단위 피드백 시스템

---

## 1. 완료된 기능

### 1.1 영상 버전 관리 시스템

| 기능 | 설명 | 경로 |
|------|------|------|
| 영상 업로드 | 드래그앤드롭, 멀티파트 업로드 (최대 2GB) | `/projects/[id]/videos` |
| 버전 관리 | 자동 버전 번호 증가, 변경사항 기록 | `/projects/[id]/videos` |
| 영상 재생 | HTML5 비디오 플레이어 | 모달 또는 리뷰 페이지 |
| 버전 비교 | 두 버전 나란히 재생 | 버전 목록에서 선택 |
| 전체 영상 목록 | 모든 프로젝트의 영상 한눈에 보기 | `/videos` |

### 1.2 프레임 단위 피드백 시스템

| 기능 | 설명 | 경로 |
|------|------|------|
| 피드백 작성 | 현재 재생 시점에 피드백 추가 | `/projects/[id]/videos/[videoId]` |
| 타임라인 마커 | 피드백 위치를 타임라인에 표시 | 리뷰 페이지 피드백 패널 |
| 피드백 상태 | 열림/해결됨/수정안함 상태 관리 | 피드백 아이템 메뉴 |
| 답글 기능 | 피드백에 답글 작성 | 피드백 아이템 확장 |
| 타임스탬프 이동 | 피드백 클릭 시 해당 시점으로 이동 | 피드백 아이템 |

### 1.3 UI/UX 개선

| 개선 항목 | 내용 |
|----------|------|
| 사이드바 | "영상" 메뉴 추가 |
| Breadcrumb | "video" → "영상" 한글화 |
| Breadcrumb | "상세" 링크 연결 수정 |

---

## 2. 페이지 경로

### 메인 페이지
- `/videos` - 전체 영상 목록 (사이드바에서 접근)
- `/projects/[id]/videos` - 프로젝트 영상 목록
- `/projects/[id]/videos/[videoId]` - 영상 리뷰 (피드백 포함)

### API 엔드포인트
```
GET    /api/videos                    - 전체 영상 목록
GET    /api/videos/[id]               - 영상 상세
PATCH  /api/videos/[id]               - 영상 수정
DELETE /api/videos/[id]               - 영상 삭제
POST   /api/videos/[id]/complete      - 업로드 완료 처리

GET    /api/projects/[id]/videos      - 프로젝트 영상 목록
POST   /api/projects/[id]/videos      - 새 영상 업로드 시작

GET    /api/videos/[id]/feedbacks     - 피드백 목록
POST   /api/videos/[id]/feedbacks     - 피드백 작성

GET    /api/feedbacks/[id]            - 피드백 상세
PATCH  /api/feedbacks/[id]            - 피드백 수정
DELETE /api/feedbacks/[id]            - 피드백 삭제

GET    /api/feedbacks/[id]/replies    - 답글 목록
POST   /api/feedbacks/[id]/replies    - 답글 작성
```

---

## 3. 사용자 작업 필요

### 3.1 Supabase 마이그레이션 실행

```bash
# Supabase CLI 사용 시
npx supabase db push

# 또는 Supabase 대시보드에서 직접 실행
# 파일: supabase/migrations/00007_video_versions.sql
# 파일: supabase/migrations/00008_video_feedbacks.sql
```

### 3.2 환경 변수 확인 (.env.local)

```env
# Cloudflare R2 (영상/아바타 스토리지)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_AVATARS=navig-avatars
R2_BUCKET_VIDEOS=navig-videos
R2_PUBLIC_URL_AVATARS=https://pub-xxx.r2.dev
R2_PUBLIC_URL_VIDEOS=https://pub-yyy.r2.dev
```

### 3.3 R2 CORS 설정 (영상 업로드용)

Cloudflare 대시보드 → R2 → 버킷 설정에서:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 4. 파일 구조

### 새로 생성된 파일

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── videos/
│   │   │   └── page.tsx              # 전체 영상 목록
│   │   └── projects/[id]/videos/
│   │       ├── page.tsx              # 프로젝트 영상 목록
│   │       └── [videoId]/
│   │           └── page.tsx          # 영상 리뷰 (피드백)
│   └── api/
│       ├── videos/
│       │   ├── route.ts              # 전체 영상 API
│       │   └── [id]/
│       │       ├── route.ts          # 영상 CRUD
│       │       ├── complete/route.ts # 업로드 완료
│       │       └── feedbacks/route.ts# 피드백 목록/생성
│       └── feedbacks/[id]/
│           ├── route.ts              # 피드백 CRUD
│           └── replies/route.ts      # 답글 API
├── components/video/
│   ├── VideoUploader.tsx             # 업로드 모달
│   ├── VideoPlayer.tsx               # 비디오 플레이어
│   ├── VideoVersionList.tsx          # 버전 목록
│   ├── VideoCompareModal.tsx         # 버전 비교
│   ├── FeedbackPanel.tsx             # 피드백 패널
│   ├── FeedbackForm.tsx              # 피드백 작성 폼
│   ├── FeedbackItem.tsx              # 피드백 아이템
│   └── FeedbackMarker.tsx            # 타임라인 마커
├── hooks/
│   └── use-video-upload.ts           # 업로드 훅
├── lib/cloudflare/
│   └── r2.ts                         # R2 클라이언트
└── types/
    ├── video.ts                      # 영상 타입
    └── feedback.ts                   # 피드백 타입

supabase/migrations/
├── 00007_video_versions.sql          # 영상 버전 테이블
└── 00008_video_feedbacks.sql         # 피드백 테이블
```

### 수정된 파일

```
src/
├── components/
│   ├── layout/Sidebar.tsx            # "영상" 메뉴 추가
│   └── ui/breadcrumb.tsx             # 한글화 + 링크 수정
├── app/api/profile/avatar/route.ts   # R2 마이그레이션
└── types/database.ts                 # 피드백 타입 추가

.env.example                          # R2 환경 변수 추가
```

---

## 5. 테스트 방법

### 영상 업로드 테스트
1. 로그인 후 프로젝트 상세 페이지로 이동
2. "영상 버전 관리" 카드 클릭
3. "업로드" 버튼 클릭
4. 영상 파일 드래그앤드롭 또는 선택
5. 변경사항 입력 후 업로드

### 피드백 테스트
1. 영상 목록에서 "피드백 보기" 클릭
2. 영상 재생 중 원하는 시점에서 일시정지
3. 피드백 패널에서 내용 입력 후 "피드백 추가"
4. 타임라인 마커 클릭으로 해당 시점 이동
5. 상태 변경, 답글 작성 테스트

### 전체 영상 목록 테스트
1. 사이드바에서 "영상" 메뉴 클릭
2. 모든 프로젝트의 영상이 표시되는지 확인
3. 상태 필터 테스트
4. 프로젝트 링크 클릭으로 해당 프로젝트 이동

---

## 6. 알려진 제한사항

1. **영상 메타데이터**: 클라이언트에서 HTML5 Video API로 추출 (서버 FFmpeg 미사용)
2. **썸네일 생성**: 클라이언트 Canvas API 사용 (첫 프레임 캡처)
3. **모바일 피드백**: 현재 데스크톱 사이드바만 지원 (모바일 모달 추후 구현)
4. **실시간 동기화**: Supabase Realtime 미연동 (새로고침 필요)

---

## 7. 향후 개선 계획

- [ ] 피드백 실시간 동기화 (Supabase Realtime)
- [ ] 모바일 피드백 UI (바텀 시트)
- [ ] 화면 영역 마킹 (position_x, position_y 활용)
- [ ] 피드백 알림 (이메일/푸시)
- [ ] 영상 트랜스코딩 (Cloudflare Workers + FFmpeg WASM)
