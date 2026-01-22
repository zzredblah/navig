# Claude Code 개발 요청서 - Phase 1 Sprint 5-6

## 영상 버전 관리 시스템

**기간**: Week 5-8 (문서 관리와 병렬)  
**목표**: 영상 업로드, 버전 관리, 비교 기능 구현

---

## 작업 1: 영상 관련 스키마

### 요청 내용

```
영상 버전 관리를 위한 데이터베이스 스키마를 설정해주세요.

테이블:

1. video_versions
   - id: UUID PRIMARY KEY
   - project_id: UUID REFERENCES projects
   - version_number: INTEGER
   - version_name: VARCHAR(100)
   - original_filename: VARCHAR(255)
   - file_url: VARCHAR(500)
   - preview_url: VARCHAR(500)
   - thumbnail_url: VARCHAR(500)
   - duration: INTEGER (초)
   - resolution: VARCHAR(20)
   - file_size: BIGINT
   - codec: VARCHAR(50)
   - change_notes: TEXT NOT NULL
   - status: ENUM('uploading', 'processing', 'ready', 'error')
   - uploaded_by: UUID REFERENCES users
   - created_at: TIMESTAMP

2. upload_chunks
   - id: UUID PRIMARY KEY
   - video_version_id: UUID REFERENCES video_versions
   - chunk_index: INTEGER
   - chunk_size: BIGINT
   - uploaded: BOOLEAN DEFAULT FALSE
   - created_at: TIMESTAMP

인덱스:
- video_versions(project_id, version_number)
- video_versions(status)

RLS:
- 프로젝트 멤버만 접근 가능
```

---

## 작업 2: 청크 업로드 시스템 (백엔드)

### 요청 내용

```
대용량 영상 청크 업로드 시스템을 구현해주세요.

API 엔드포인트:

# 업로드 시작
POST /projects/:projectId/videos/upload/init
- body: { filename, fileSize, contentType }
- response: { videoVersionId, uploadId, chunkSize }

# 청크 업로드
PUT /videos/:id/chunk/:index
- body: binary chunk data
- headers: Content-Type, Content-Length
- response: { uploaded: true }

# 업로드 완료
POST /videos/:id/upload/complete
- body: { changeNotes }
- response: { videoVersion }

# 업로드 취소
DELETE /videos/:id/upload
- response: { success }

# 버전 목록
GET /projects/:projectId/videos
- query: { page?, limit? }
- response: { data: VideoVersion[], total }

# 버전 상세
GET /videos/:id
- response: { videoVersion }

# 버전 삭제
DELETE /videos/:id
- response: { success }

업로드 플로우:
1. init: 영상 버전 레코드 생성, 청크 정보 계산
2. chunk: 각 청크를 R2에 업로드
3. complete: 청크 병합, 메타데이터 추출, 썸네일 생성

요구사항:
1. 10MB 청크 크기
2. 병렬 청크 업로드 지원
3. 재시도 로직
4. 업로드 진행률 추적
5. Cloudflare R2 multipart upload
```

---

## 작업 3: 영상 처리 파이프라인

### 요청 내용

```
영상 처리 파이프라인을 구현해주세요.

처리 단계:

1. 메타데이터 추출 (FFprobe)
   - duration (초)
   - resolution (width x height)
   - codec
   - bitrate

2. 썸네일 생성 (FFmpeg)
   - 10% 지점 프레임 캡처
   - 리사이즈 (320x180)
   - WebP 포맷

3. 프리뷰 생성 (선택적, Phase 2)
   - 720p 트랜스코딩
   - HLS 스트리밍

처리 플로우:
[업로드 완료]
      ↓
[BullMQ 작업 큐에 추가]
      ↓
[Worker: 메타데이터 추출]
      ↓
[Worker: 썸네일 생성]
      ↓
[상태 업데이트: ready]
      ↓
[알림 발송]

요구사항:
1. BullMQ + Redis 작업 큐
2. FFmpeg 컨테이너 또는 Lambda
3. 에러 핸들링 및 재시도 (최대 3회)
4. 진행 상태 업데이트
5. 처리 실패 시 알림
```

---

## 작업 4: 영상 업로드 UI (프론트엔드)

### 요청 내용

```
영상 업로드 UI를 구현해주세요.

컴포넌트: VideoUploader

기능:
1. 드래그 앤 드롭 영역
2. 파일 선택 버튼
3. 파일 유효성 검증
   - 포맷: MP4, MOV, WebM
   - 크기: 최대 2GB
4. 업로드 진행률 표시
5. 청크별 진행 상태
6. 취소 버튼
7. 업로드 완료 후 변경 내용 입력

UI:
┌─────────────────────────────────┐
│                                 │
│     📁 영상 파일을 끌어다 놓거나  │
│        클릭하여 선택하세요        │
│                                 │
│        [파일 선택]               │
│                                 │
└─────────────────────────────────┘

업로드 중:
┌─────────────────────────────────┐
│ video_v2.mp4                    │
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░  45%      │
│ 청크 5/11 업로드 중...           │
│                      [취소]     │
└─────────────────────────────────┘

완료 후:
┌─────────────────────────────────┐
│ ✓ 업로드 완료                   │
│                                 │
│ 변경 내용 *                     │
│ ┌─────────────────────────────┐ │
│ │ 1차 수정: 자막 위치 변경...   │ │
│ └─────────────────────────────┘ │
│                                 │
│              [버전 등록]         │
└─────────────────────────────────┘

요구사항:
1. axios + onUploadProgress
2. 청크 단위 상태 관리
3. 재시도 로직
4. 브라우저 닫기 경고
```

---

## 작업 5: 영상 플레이어 컴포넌트

### 요청 내용

```
커스텀 영상 플레이어를 구현해주세요.

컴포넌트: VideoPlayer

기능:
1. 기본 컨트롤
   - 재생/일시정지 (스페이스바)
   - 시크바 (클릭, 드래그)
   - 볼륨 조절 (휠)
   - 전체화면
   
2. 고급 컨트롤
   - 재생 속도 (0.5x, 1x, 1.5x, 2x)
   - 프레임 단위 이동 (←, →)
   - 10초 뒤로/앞으로 (J, L)

3. 타임코드 표시
   - 현재 시간 / 전체 시간
   - HH:MM:SS 포맷

4. 피드백 마커 (연동)
   - 타임라인에 마커 표시
   - 마커 클릭 시 해당 시점 이동
   - 마커 호버 시 미리보기

5. 현재 프레임 캡처
   - 캡처 버튼
   - Canvas API로 프레임 추출
   - base64/Blob 반환

라이브러리: video.js 또는 Plyr

요구사항:
1. 반응형 비디오 컨테이너
2. 키보드 단축키
3. 터치 제스처 (모바일)
4. 로딩 스피너
5. 에러 상태 처리
```

---

## 작업 6: 버전 목록 UI

### 요청 내용

```
버전 목록 및 상세 UI를 구현해주세요.

페이지: /projects/:id/videos

레이아웃:
┌─────────────────────────────────────────┐
│ 영상 버전                 [+ 새 버전]    │
├─────────────────────────────────────────┤
│ ┌─────┐ v3 (최신)            2시간 전   │
│ │ 썸네일│ 3차 수정: 색보정 적용          │
│ └─────┘ 김작업자 · 1920x1080 · 2:30     │
│         [재생] [비교] [다운로드]         │
├─────────────────────────────────────────┤
│ ┌─────┐ v2                  어제        │
│ │ 썸네일│ 2차 수정: 자막 위치 변경        │
│ └─────┘ 김작업자 · 1920x1080 · 2:30     │
│         [재생] [비교] [다운로드]         │
├─────────────────────────────────────────┤
│ ┌─────┐ v1                  3일 전      │
│ │ 썸네일│ 최초 버전                      │
│ └─────┘ 김작업자 · 1920x1080 · 2:30     │
│         [재생] [비교] [다운로드]         │
└─────────────────────────────────────────┘

버전 카드 정보:
- 썸네일
- 버전 번호 + 이름
- 변경 내용
- 업로더
- 메타데이터 (해상도, 길이)
- 업로드 시간 (relative)
- 상태 뱃지 (처리중/완료/오류)

액션:
- 재생: 플레이어 모달
- 비교: 비교 모드로 이동
- 다운로드: 원본 파일 다운로드
```

---

## 작업 7: 버전 비교 (나란히 재생)

### 요청 내용

```
두 버전을 나란히 비교하는 기능을 구현해주세요.

페이지: /projects/:id/videos/compare

UI:
┌────────────────────┬────────────────────┐
│      v1 영상       │      v2 영상       │
│                    │                    │
│   [플레이어]       │   [플레이어]       │
│                    │                    │
├────────────────────┴────────────────────┤
│         [동기화 재생 컨트롤]             │
│  ▶️ ━━━━━━━━━━━━━━━━━━━━━━━━  00:00/02:30 │
│  [동기화 ON] 재생속도: 1x               │
└─────────────────────────────────────────┘

버전 선택:
- 드롭다운으로 버전 선택
- 기본: 최신 2개 버전

동기화 모드:
- ON: 두 영상 동시 재생/일시정지/시크
- OFF: 각각 독립 제어

컨트롤:
- 통합 재생/일시정지
- 통합 시크바
- 통합 재생 속도

요구사항:
1. 두 플레이어 동기화
2. 버전 스왑 버튼
3. URL 쿼리로 버전 지정 (?v1=xxx&v2=yyy)
4. 반응형 (세로 배치 on 모바일)
```

---

## 참조 파일

- `rules/CODING_STANDARDS.md` - 코딩 컨벤션
- `rules/DESIGN_SYSTEM.md` - 디자인 시스템
- 전체 PRD: `01_TICKY_PRD_FULL.md` 섹션 3.2

---

## 완료 기준

1. 청크 업로드로 2GB 영상 업로드 가능
2. 업로드 진행률 표시 작동
3. 메타데이터 자동 추출 작동
4. 썸네일 자동 생성 작동
5. 영상 플레이어 정상 작동
6. 버전 목록 표시 및 정렬 작동
7. 두 버전 나란히 비교 가능
8. 영상 다운로드 가능
