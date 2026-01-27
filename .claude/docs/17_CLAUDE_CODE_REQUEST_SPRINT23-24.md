# Claude Code 개발 요청서 - Phase 3 Sprint 23-24

## 고급 AI + 글로벌 확장

**기간**: Week 9-16 (Month 11-12)
**목표**: AI 차이점 감지, AI 자막 생성, 포트폴리오, Google Drive 연동, PWA

---

## 작업 1: AI 영상 차이점 감지

### 요청 내용

```
두 영상 버전의 차이점을 AI로 자동 분석하는 기능을 구현해주세요.

분석 방법:

1. 프레임 추출 (FFmpeg)
   - 1초당 1프레임 추출
   - 썸네일 크기로 리사이즈

2. 시각적 차이 분석
   - 픽셀 비교 (SSIM)
   - 장면 전환 감지
   - AWS Rekognition (선택적)

3. 오디오 차이 분석
   - 파형 비교
   - 볼륨 변화 감지

DB 스키마:

-- 00018_video_comparisons.sql

CREATE TABLE video_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_a_id UUID NOT NULL REFERENCES video_versions(id) ON DELETE CASCADE,
  version_b_id UUID NOT NULL REFERENCES video_versions(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  similarity_score FLOAT, -- 0-100
  analysis_result JSONB,
  error_message TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT unique_comparison UNIQUE (version_a_id, version_b_id)
);

CREATE TABLE comparison_differences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id UUID NOT NULL REFERENCES video_comparisons(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'scene', 'visual', 'audio', 'text', 'effect'
  timecode_start FLOAT NOT NULL,
  timecode_end FLOAT NOT NULL,
  description TEXT,
  confidence FLOAT, -- 0-1
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_comparisons_versions ON video_comparisons(version_a_id, version_b_id);
CREATE INDEX idx_differences_comparison ON comparison_differences(comparison_id);

API:

# 비교 분석 요청
POST /api/videos/:videoId/compare
- body: {
    version_a_id: string,
    version_b_id: string
  }
- response: {
    comparison_id: string,
    status: 'processing'
  }

# 비교 결과 조회
GET /api/videos/:videoId/compare/:comparisonId
- response: {
    comparison: {
      id: string,
      status: string,
      similarity_score: number,
      differences: Difference[],
      created_at: Date,
      completed_at: Date
    }
  }

# 비교 내역 목록
GET /api/videos/:videoId/comparisons
- response: { comparisons: Comparison[] }

백그라운드 처리:

// 큐 기반 처리
// lib/jobs/video-comparison.ts

interface ComparisonJob {
  comparison_id: string;
  version_a_url: string;
  version_b_url: string;
}

async function processVideoComparison(job: ComparisonJob) {
  try {
    // 상태 업데이트
    await updateComparisonStatus(job.comparison_id, 'processing');

    // 1. 프레임 추출
    const framesA = await extractFrames(job.version_a_url);
    const framesB = await extractFrames(job.version_b_url);

    // 2. 프레임 비교
    const visualDiffs = await compareFrames(framesA, framesB);

    // 3. 오디오 분석 (선택적)
    const audioDiffs = await compareAudio(job.version_a_url, job.version_b_url);

    // 4. 전체 유사도 계산
    const similarityScore = calculateSimilarity(visualDiffs, audioDiffs);

    // 5. 차이점 저장
    await saveDifferences(job.comparison_id, [...visualDiffs, ...audioDiffs]);

    // 6. 완료
    await updateComparisonStatus(job.comparison_id, 'completed', {
      similarity_score: similarityScore,
      completed_at: new Date(),
    });

  } catch (error) {
    await updateComparisonStatus(job.comparison_id, 'failed', {
      error_message: error.message,
    });
  }
}

// 프레임 추출 (FFmpeg)
async function extractFrames(videoUrl: string): Promise<Frame[]> {
  // FFmpeg로 1fps 프레임 추출
  // 썸네일 크기로 리사이즈
  // R2에 저장
}

// 프레임 비교 (SSIM)
async function compareFrames(framesA: Frame[], framesB: Frame[]): Promise<Difference[]> {
  const differences: Difference[] = [];

  for (let i = 0; i < Math.max(framesA.length, framesB.length); i++) {
    const frameA = framesA[i];
    const frameB = framesB[i];

    if (!frameA || !frameB) {
      // 길이 차이
      differences.push({
        type: 'scene',
        timecode_start: i,
        timecode_end: i + 1,
        description: frameA ? '삭제된 구간' : '추가된 구간',
        confidence: 1,
      });
      continue;
    }

    // SSIM 계산
    const ssim = await calculateSSIM(frameA.buffer, frameB.buffer);

    if (ssim < 0.95) {
      differences.push({
        type: 'visual',
        timecode_start: i,
        timecode_end: i + 1,
        description: getChangeDescription(ssim),
        confidence: 1 - ssim,
        thumbnail_url: await createComparisonThumbnail(frameA, frameB),
      });
    }
  }

  // 연속된 차이점 병합
  return mergeDifferences(differences);
}

UI:

비교 결과 페이지:
┌─────────────────────────────────────────────────────────────┐
│ AI 차이점 분석                                        [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ v2 vs v3                                유사도: 85%         │
│                                                             │
│ 발견된 변경점 (5)                                           │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🎨 00:15 - 00:20  시각적 변경                           │ │
│ │                                                         │ │
│ │    ┌────────┐  →  ┌────────┐                           │ │
│ │    │ 이전   │     │ 이후   │                           │ │
│ │    └────────┘     └────────┘                           │ │
│ │                                                         │ │
│ │    자막 위치가 변경되었습니다 (신뢰도: 92%)             │ │
│ │                                             [이동]      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🎵 00:45 - 01:00  오디오 변경                           │ │
│ │    BGM 볼륨이 낮아졌습니다 (신뢰도: 88%)                │ │
│ │                                             [이동]      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 타임라인 뷰                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 0:00                                              2:30  │ │
│ │ ├────██────────████────────███────────────────────────┤  │ │
│ │      시각       시각        오디오                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘

요구사항:
1. 백그라운드 처리 (큐)
2. 진행 상태 표시
3. 취소 기능
4. Pro 플랜 이상
5. AI 사용량 차감
6. 결과 캐싱
```

---

## 작업 2: AI 자막 생성

### 요청 내용

```
영상 업로드 시 자동으로 자막을 생성하는 기능을 구현해주세요.

DB 스키마:

-- 00019_subtitles.sql

CREATE TABLE subtitles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_version_id UUID NOT NULL REFERENCES video_versions(id) ON DELETE CASCADE,
  language VARCHAR(10) NOT NULL DEFAULT 'ko',
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE subtitle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtitle_id UUID NOT NULL REFERENCES subtitles(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  timecode_start FLOAT NOT NULL, -- 초 단위
  timecode_end FLOAT NOT NULL,
  text TEXT NOT NULL,
  confidence FLOAT,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subtitles_version ON subtitles(video_version_id);
CREATE INDEX idx_subtitle_items_subtitle ON subtitle_items(subtitle_id, sequence);

API:

# 자막 생성 요청
POST /api/videos/:videoId/versions/:versionId/subtitles
- body: { language?: 'ko' | 'en' | 'ja' }
- response: { subtitle_id: string, status: 'processing' }

# 자막 목록
GET /api/videos/:videoId/versions/:versionId/subtitles
- response: { subtitles: Subtitle[] }

# 자막 상세 (아이템 포함)
GET /api/videos/:videoId/versions/:versionId/subtitles/:subtitleId
- response: {
    subtitle: Subtitle,
    items: SubtitleItem[]
  }

# 자막 아이템 수정
PATCH /api/subtitles/:subtitleId/items/:itemId
- body: { text?, timecode_start?, timecode_end? }
- response: { item: SubtitleItem }

# 자막 내보내기
GET /api/subtitles/:subtitleId/export
- query: { format: 'srt' | 'vtt' | 'txt' }
- response: File

자막 생성 처리:

// lib/jobs/subtitle-generation.ts

async function generateSubtitles(
  versionId: string,
  audioUrl: string,
  language: string
) {
  // 1. 오디오 추출 (영상에서)
  const audioBuffer = await extractAudio(audioUrl);

  // 2. Whisper API 호출 (타임스탬프 포함)
  const transcription = await openai.audio.transcriptions.create({
    file: audioBuffer,
    model: 'whisper-1',
    language,
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

  // 3. 자막 아이템 생성
  const items = transcription.segments.map((segment, index) => ({
    sequence: index + 1,
    timecode_start: segment.start,
    timecode_end: segment.end,
    text: segment.text,
    confidence: segment.confidence,
  }));

  // 4. DB 저장
  await supabase.from('subtitle_items').insert(
    items.map((item) => ({
      subtitle_id: subtitleId,
      ...item,
    }))
  );

  return items;
}

SRT 내보내기:

function generateSRT(items: SubtitleItem[]): string {
  return items
    .map((item, index) => {
      const start = formatSRTTime(item.timecode_start);
      const end = formatSRTTime(item.timecode_end);
      return `${index + 1}\n${start} --> ${end}\n${item.text}\n`;
    })
    .join('\n');
}

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

UI:

영상 버전 페이지 > 자막 탭:
┌─────────────────────────────────────────────────────────────┐
│ 자막                                    [✨ AI 자막 생성]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 한국어 자막                              [편집] [내보내기 ▼]│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 1  00:00:01,000 --> 00:00:04,500                        │ │
│ │    안녕하세요, NAVIG 소개 영상입니다.                    │ │
│ │                                                         │ │
│ │ 2  00:00:05,000 --> 00:00:08,200                        │ │
│ │    영상 제작 협업을 더 쉽게 만들어드립니다.              │ │
│ │                                                         │ │
│ │ 3  00:00:09,000 --> 00:00:12,500                        │ │
│ │    프로젝트 관리부터 피드백까지 한 곳에서.               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘

자막 편집 모달:
┌─────────────────────────────────────────────────────────────┐
│ 자막 편집                                             [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 시간: [00:00:01,000] ~ [00:00:04,500]                       │
│                                                             │
│ 텍스트:                                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 안녕하세요, NAVIG 소개 영상입니다.                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [영상에서 확인]                          [취소]  [저장]    │
└─────────────────────────────────────────────────────────────┘

요구사항:
1. Whisper API 연동
2. 타임스탬프 정확도
3. 자막 편집 UI
4. SRT/VTT 내보내기
5. Pro 플랜 이상
6. AI 사용량 차감
```

---

## 작업 3: 포트폴리오 쇼케이스

### 요청 내용

```
작업자의 포트폴리오 페이지를 구현해주세요.

DB 스키마:

-- 00020_portfolios.sql

CREATE TABLE portfolios (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  slug VARCHAR(100) UNIQUE, -- 고유 URL (예: /p/kim-editor)
  display_name VARCHAR(100),
  bio TEXT,
  skills TEXT[],
  website_url TEXT,
  contact_email TEXT,
  social_links JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  theme VARCHAR(50) DEFAULT 'default',
  custom_css TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE portfolio_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES portfolios(user_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  thumbnail_url TEXT,
  video_url TEXT,
  external_url TEXT, -- 외부 링크 (YouTube, Vimeo 등)
  project_id UUID REFERENCES projects(id), -- 링크된 NAVIG 프로젝트
  tags TEXT[],
  is_featured BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_portfolios_slug ON portfolios(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_portfolio_works_user ON portfolio_works(user_id, order_index);

API:

# 내 포트폴리오 조회/생성
GET /api/portfolio/me
POST /api/portfolio/me
PATCH /api/portfolio/me

# 포트폴리오 작품 CRUD
GET /api/portfolio/works
POST /api/portfolio/works
PATCH /api/portfolio/works/:id
DELETE /api/portfolio/works/:id

# 공개 포트폴리오 조회
GET /api/p/:slug
- response: { portfolio: Portfolio, works: PortfolioWork[] }

# 조회수 증가
POST /api/p/:slug/view

URL 구조:
- /p/:slug - 공개 포트폴리오 (예: /p/kim-editor)
- /settings/portfolio - 포트폴리오 편집

UI:

포트폴리오 편집 (/settings/portfolio):
┌─────────────────────────────────────────────────────────────┐
│ 포트폴리오 설정                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 공개 설정                                                   │
│ [✓] 포트폴리오 공개                                         │
│                                                             │
│ URL: navig.app/p/[kim-editor]  [미리보기]                   │
│                                                             │
│ ─────────────────────────────────────────────────────────  │
│                                                             │
│ 프로필                                                      │
│ 이름: [김편집자]                                            │
│ 소개:                                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 5년차 영상 편집자입니다. 브랜드 영상, 유튜브 콘텐츠     │ │
│ │ 전문으로 작업하고 있습니다.                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 스킬: [프리미어] [애프터이펙트] [다빈치] [+ 추가]           │
│                                                             │
│ 웹사이트: [https://kim-editor.com]                          │
│ 연락처: [kim@email.com]                                     │
│                                                             │
│ ─────────────────────────────────────────────────────────  │
│                                                             │
│ 작품                                          [+ 작품 추가] │
│                                                             │
│ ┌─────────────┬─────────────┬─────────────┐                │
│ │ ⭐ Featured │             │             │                │
│ │ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │                │
│ │ │ 썸네일  │ │ │ 썸네일  │ │ │ 썸네일  │ │                │
│ │ └─────────┘ │ └─────────┘ │ └─────────┘ │                │
│ │ 브랜드 영상 │ 제품 소개   │ 유튜브 콘텐츠│                │
│ │ [편집][삭제]│ [편집][삭제]│ [편집][삭제]│                │
│ └─────────────┴─────────────┴─────────────┘                │
│                                                             │
│                                              [저장]         │
└─────────────────────────────────────────────────────────────┘

공개 포트폴리오 (/p/:slug):
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│         ┌───────┐                                           │
│         │ 사진  │                                           │
│         └───────┘                                           │
│         김편집자                                             │
│         영상 편집자                                          │
│                                                             │
│         5년차 영상 편집자입니다. 브랜드 영상, 유튜브        │
│         콘텐츠 전문으로 작업하고 있습니다.                  │
│                                                             │
│         [프리미어] [애프터이펙트] [다빈치]                   │
│                                                             │
│         [🔗 웹사이트]  [✉️ 연락하기]                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 작품                                                        │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │               Featured Work                             │ │
│ │  ┌─────────────────────────────────────────────────┐    │ │
│ │  │                                                 │    │ │
│ │  │              브랜드 홍보영상                    │    │ │
│ │  │                                                 │    │ │
│ │  └─────────────────────────────────────────────────┘    │ │
│ │  스타트업 A사 브랜드 영상 제작                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌───────────────┬───────────────┬───────────────┐          │
│ │   썸네일      │   썸네일      │   썸네일      │          │
│ │   제품 소개   │   유튜브 콘텐츠│   광고 영상   │          │
│ └───────────────┴───────────────┴───────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

요구사항:
1. 고유 URL (slug)
2. 프로필 편집
3. 작품 CRUD
4. 드래그 앤 드롭 정렬
5. Featured 작품 설정
6. 조회수 추적
7. SEO (og:image, meta)
8. 반응형 디자인
```

---

## 작업 4: Google Drive 연동

### 요청 내용

```
Google Drive에서 파일을 가져오고 내보내는 기능을 구현해주세요.

OAuth 설정:

// 환경 변수
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

// Google Cloud Console에서 설정
// OAuth 2.0 클라이언트 ID
// 승인된 리디렉션 URI: /api/auth/google-drive/callback

DB 스키마:

-- 00021_external_integrations.sql

CREATE TABLE external_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'google_drive', 'dropbox', etc.
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  provider_user_id TEXT,
  provider_email TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_provider UNIQUE (user_id, provider)
);

API:

# OAuth 시작
GET /api/integrations/google-drive/auth
- response: { auth_url: string }

# OAuth 콜백
GET /api/integrations/google-drive/callback
- query: { code: string }
- redirect: /settings/integrations

# 연결 상태
GET /api/integrations/google-drive/status
- response: { connected: boolean, email?: string }

# 연결 해제
DELETE /api/integrations/google-drive

# 파일 목록 조회
GET /api/integrations/google-drive/files
- query: { folder_id?, page_token? }
- response: {
    files: GoogleDriveFile[],
    next_page_token?: string
  }

# 파일 가져오기
POST /api/integrations/google-drive/import
- body: { file_id: string, project_id: string, type: 'video' | 'document' }
- response: { job_id: string, status: 'processing' }

# 파일 내보내기
POST /api/integrations/google-drive/export
- body: {
    source_type: 'video' | 'document',
    source_id: string,
    folder_id?: string
  }
- response: { file_id: string, web_view_link: string }

구현:

// lib/integrations/google-drive.ts
import { google } from 'googleapis';

export function createGoogleDriveClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

// 파일 목록
export async function listFiles(accessToken: string, folderId?: string) {
  const drive = createGoogleDriveClient(accessToken);

  const response = await drive.files.list({
    q: folderId
      ? `'${folderId}' in parents and trashed = false`
      : `trashed = false`,
    fields: 'files(id, name, mimeType, size, thumbnailLink, webViewLink)',
    pageSize: 50,
  });

  return response.data.files;
}

// 파일 가져오기
export async function importFile(
  accessToken: string,
  fileId: string,
  destinationPath: string
) {
  const drive = createGoogleDriveClient(accessToken);

  // 파일 메타데이터 조회
  const { data: metadata } = await drive.files.get({
    fileId,
    fields: 'name, mimeType, size',
  });

  // 파일 다운로드
  const { data: fileStream } = await drive.files.get({
    fileId,
    alt: 'media',
  }, { responseType: 'stream' });

  // R2에 업로드
  const uploadResult = await uploadToR2(fileStream, destinationPath);

  return {
    name: metadata.name,
    url: uploadResult.url,
    size: metadata.size,
  };
}

// 파일 내보내기
export async function exportFile(
  accessToken: string,
  fileUrl: string,
  fileName: string,
  folderId?: string
) {
  const drive = createGoogleDriveClient(accessToken);

  // R2에서 파일 다운로드
  const fileStream = await downloadFromR2(fileUrl);

  // Google Drive에 업로드
  const { data } = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: folderId ? [folderId] : undefined,
    },
    media: {
      mimeType: getMimeType(fileName),
      body: fileStream,
    },
    fields: 'id, webViewLink',
  });

  return {
    fileId: data.id,
    webViewLink: data.webViewLink,
  };
}

UI:

설정 > 연동 (/settings/integrations):
┌─────────────────────────────────────────────────────────────┐
│ 외부 서비스 연동                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📁 Google Drive                                         │ │
│ │                                                         │ │
│ │ 연결됨: kim@gmail.com                                   │ │
│ │                                                         │ │
│ │ [파일 가져오기]  [연결 해제]                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📦 Dropbox (출시 예정)                                  │ │
│ │                                                         │ │
│ │ [연결하기] (비활성)                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘

파일 선택 모달:
┌─────────────────────────────────────────────────────────────┐
│ Google Drive에서 가져오기                             [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📁 내 드라이브 / 영상 프로젝트                              │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📁 2024 프로젝트                                        │ │
│ │ 🎬 브랜드영상_최종.mp4              250MB               │ │
│ │ 🎬 제품소개_v2.mp4                   180MB               │ │
│ │ 📄 기획안.docx                        2MB               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 선택됨: 브랜드영상_최종.mp4                                 │
│                                                             │
│                               [취소]  [가져오기]           │
└─────────────────────────────────────────────────────────────┘

요구사항:
1. OAuth 2.0 플로우
2. 토큰 자동 갱신
3. 파일 브라우저 UI
4. 진행률 표시
5. 에러 핸들링
```

---

## 작업 5: 모바일 PWA

### 요청 내용

```
Progressive Web App 기능을 구현해주세요.

패키지 설치:
npm install next-pwa

설정:

// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-images',
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/api\..*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 },
      },
    },
  ],
});

module.exports = withPWA({ ... });

// public/manifest.json
{
  "name": "NAVIG",
  "short_name": "NAVIG",
  "description": "영상 제작 협업 플랫폼",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#7C3AED",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/dashboard.png", "sizes": "1280x720", "type": "image/png" },
    { "src": "/screenshots/mobile.png", "sizes": "750x1334", "type": "image/png" }
  ]
}

Push 알림:

// lib/push-notifications.ts
export async function subscribeToPush(userId: string) {
  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });

  // 서버에 구독 정보 저장
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      subscription: subscription.toJSON(),
    }),
  });
}

// Service Worker에서 푸시 처리
// public/sw.js
self.addEventListener('push', (event) => {
  const data = event.data.json();

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge.png',
    data: { url: data.url },
    actions: data.actions,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.notification.data?.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// 서버에서 푸시 발송
// lib/push.ts
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:support@navig.app',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushNotification(
  userId: string,
  notification: { title: string; body: string; url?: string }
) {
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId);

  for (const { subscription } of subscriptions) {
    try {
      await webpush.sendNotification(
        JSON.parse(subscription),
        JSON.stringify(notification)
      );
    } catch (error) {
      // 만료된 구독 삭제
      if (error.statusCode === 410) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('subscription', subscription);
      }
    }
  }
}

설치 유도 UI:

// components/InstallPrompt.tsx
export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-xl shadow-lg p-4 border border-gray-200 z-50">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
          <Video className="h-6 w-6 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900">NAVIG 앱 설치</p>
          <p className="text-sm text-gray-500">홈 화면에 추가하고 빠르게 접속하세요</p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button variant="ghost" size="sm" onClick={() => setShowPrompt(false)}>
          나중에
        </Button>
        <Button size="sm" onClick={handleInstall}>
          설치하기
        </Button>
      </div>
    </div>
  );
}

요구사항:
1. manifest.json 설정
2. Service Worker 캐싱
3. 오프라인 지원 (기본)
4. Push 알림
5. 설치 유도 UI
6. 앱 아이콘
```

---

## 참조 파일

- `rules/CODING_STANDARDS.md` - 코딩 컨벤션
- `rules/DESIGN_SYSTEM.md` - 디자인 시스템
- `10_NAVIG_PRD_PHASE2-3_UNIFIED.md` - 통합 PRD 섹션 3.3

---

## 완료 기준

### Phase 3 전체 체크리스트

**AI 차이점 감지**
- [ ] 비교 요청 API
- [ ] 백그라운드 처리
- [ ] 결과 UI

**AI 자막 생성**
- [ ] Whisper 연동
- [ ] 자막 편집 UI
- [ ] 내보내기 (SRT/VTT)

**포트폴리오**
- [ ] 프로필 편집
- [ ] 작품 CRUD
- [ ] 공개 페이지
- [ ] SEO

**Google Drive**
- [ ] OAuth 연동
- [ ] 파일 브라우저
- [ ] 가져오기/내보내기

**PWA**
- [ ] manifest.json
- [ ] Service Worker
- [ ] Push 알림
- [ ] 설치 유도

### Phase 3 완료 기준

- [ ] AI 기능 정상 작동
- [ ] 실시간 협업 안정화
- [ ] 커뮤니티 기능 출시
- [ ] 영어/일본어 버전 출시
- [ ] PWA 앱 출시
- [ ] 월 활성 사용자 2,000명 지원 가능
