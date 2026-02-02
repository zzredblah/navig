# Navig 저장소 규칙 (Storage Rules)

**버전:** 1.1
**최종 수정:** 2026-01-29

---

## 1. 파일 저장소 개요

Navig은 **Cloudflare R2**를 파일 저장소로 사용합니다. 용도에 따라 세 개의 버킷으로 분리되어 있습니다.

---

## 2. 버킷 구분

| 버킷 | 이름 | 용도 | 환경변수 |
|------|------|------|----------|
| **avatars** | `navig-avatars` | 사용자 프로필 아바타 | `R2_BUCKET_AVATARS`, `R2_PUBLIC_URL_AVATARS` |
| **videos** | `navig-videos` | 영상 파일만 | `R2_BUCKET_VIDEOS`, `R2_PUBLIC_URL_VIDEOS` |
| **src** | `navig-src` | 기타 모든 파일 | `R2_BUCKET_SRC`, `R2_PUBLIC_URL_SRC` |

---

## 3. 파일 유형별 저장 위치

### 3.1 `navig-avatars` (avatars 버킷)
```
avatars/
└── {user_id}.{ext}          # 사용자 아바타
```

### 3.2 `navig-videos` (videos 버킷)
```
videos/
└── {project_id}/
    └── {video_id}/
        ├── original.{ext}   # 원본 영상
        └── v{n}.{ext}       # 버전별 영상
```

**중요:** 영상 파일(.mp4, .mov, .webm 등)만 저장

### 3.3 `navig-src` (src 버킷)
```
src/
├── board-thumbnails/        # 보드 썸네일
│   └── {board_id}.jpg
├── board-media/             # 보드 미디어 (이미지/영상)
│   └── {board_id}/
│       └── {user_id}/
│           └── {timestamp}-{random}-{filename}
├── chat-attachments/        # 채팅 첨부파일
│   └── {user_id}/
│       └── {timestamp}-{filename}
├── documents/               # 문서 첨부파일
│   └── {document_id}/
│       └── {filename}
└── misc/                    # 기타 파일
    └── ...
```

---

## 4. 코드 사용 예시

### R2 클라이언트 import
```typescript
import { uploadFile, deleteFile, getPublicUrl } from '@/lib/cloudflare/r2';
```

### 버킷 선택
```typescript
// 아바타 업로드
await uploadFile('avatars', fileKey, buffer, contentType);

// 영상 업로드
await uploadFile('videos', fileKey, buffer, contentType);

// 기타 파일 업로드 (썸네일, 첨부파일 등)
await uploadFile('src', fileKey, buffer, contentType);
```

---

## 5. 주의사항

### 반드시 지켜야 할 규칙

1. **영상이 아닌 파일은 절대 `videos` 버킷에 넣지 않습니다**
   - 썸네일 → `src`
   - 채팅 첨부파일 → `src`
   - 문서 → `src`

2. **영상 파일은 반드시 `videos` 버킷에 저장합니다**

3. **아바타는 반드시 `avatars` 버킷에 저장합니다**

4. **새로운 파일 유형 추가 시 `src` 버킷 사용**
   - 새 폴더 구조가 필요하면 `src/` 하위에 생성
   - 이 문서에 폴더 구조 업데이트

---

## 6. 환경변수 설정

```bash
# .env.local

# Cloudflare R2 공통
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key

# 버킷별 설정
R2_BUCKET_AVATARS=navig-avatars
R2_PUBLIC_URL_AVATARS=https://pub-xxx.r2.dev

R2_BUCKET_VIDEOS=navig-videos
R2_PUBLIC_URL_VIDEOS=https://pub-yyy.r2.dev

R2_BUCKET_SRC=navig-src
R2_PUBLIC_URL_SRC=https://pub-zzz.r2.dev
```

---

## 7. 스토리지 사용량 계산 (Usage Tracking)

> **중요:** 새로운 파일 업로드 기능을 추가할 때 반드시 사용량 계산에 연동해야 합니다.

### 7.1 현재 스토리지 사용량 계산 소스

| 소스 | 테이블 | 컬럼 | 설명 |
|------|--------|------|------|
| **영상** | `video_versions` | `file_size` (INTEGER, bytes) | 사용자가 업로드한 영상 |
| **채팅 첨부파일** | `chat_messages` | `attachments` (JSONB, `[{size: number}]`) | 채팅에 첨부된 파일 |

### 7.2 사용량 계산 로직

```typescript
// src/lib/usage/checker.ts - getCurrentUsage() 함수

// 1. 영상 파일
const { data: videoStorageData } = await adminClient
  .from('video_versions')
  .select('file_size')
  .eq('uploaded_by', userId);

const videoStorageBytes = videoStorageData?.reduce(
  (sum, v) => sum + (v.file_size || 0), 0
) || 0;

// 2. 채팅 첨부파일 (JSONB 배열에서 size 합산)
const { data: chatMessagesData } = await adminClient
  .from('chat_messages')
  .select('attachments')
  .eq('sender_id', userId)
  .not('attachments', 'eq', '[]');

let chatStorageBytes = 0;
if (chatMessagesData) {
  for (const msg of chatMessagesData) {
    const attachments = msg.attachments as Array<{ size?: number }> | null;
    if (attachments && Array.isArray(attachments)) {
      chatStorageBytes += attachments.reduce((sum, att) => sum + (att.size || 0), 0);
    }
  }
}

// 총 스토리지 = 영상 + 채팅 첨부파일
const totalStorageBytes = videoStorageBytes + chatStorageBytes;
```

### 7.3 새 스토리지 소스 추가 시 수정 필요 파일

새로운 파일 업로드 기능을 추가할 때 **반드시** 다음 파일들을 수정해야 합니다:

| 파일 | 수정 내용 |
|------|----------|
| `src/lib/usage/checker.ts` | `getCurrentUsage()` 함수에 새 소스 쿼리 추가 |
| `src/app/api/subscriptions/usage-details/route.ts` | 상세 사용량 API에 새 소스 항목 추가 |
| 이 문서 (`STORAGE_RULES.md`) | §7.1 테이블에 새 소스 문서화 |

### 7.4 새 스토리지 소스 추가 예시

예: 문서 첨부파일 추가 시

```typescript
// 1. src/lib/usage/checker.ts - getCurrentUsage()에 추가

// 3. 문서 첨부파일
const { data: documentAttachments } = await adminClient
  .from('document_attachments')  // 가상 테이블 예시
  .select('file_size')
  .eq('uploaded_by', userId);

const documentStorageBytes = documentAttachments?.reduce(
  (sum, d) => sum + (d.file_size || 0), 0
) || 0;

// 총 스토리지에 합산
const totalStorageBytes = videoStorageBytes + chatStorageBytes + documentStorageBytes;


// 2. src/app/api/subscriptions/usage-details/route.ts에 추가

// 응답에 document_mb 추가
return NextResponse.json({
  data: {
    storage: {
      total_gb: ...,
      video_mb: ...,
      chat_mb: ...,
      document_mb: Math.round(documentStorageBytes / (1024 * 1024) * 100) / 100,
      items: allStorageItems,  // 문서 항목도 포함
    },
  },
});
```

### 7.5 DB 스키마 요구사항

새 테이블에 파일을 저장할 때:

```sql
-- 옵션 1: 별도 컬럼 (권장)
CREATE TABLE new_table (
  id UUID PRIMARY KEY,
  ...
  file_size INTEGER NOT NULL,      -- 바이트 단위
  uploaded_by UUID REFERENCES profiles(id),  -- 사용자 추적 필수
  ...
);

-- 옵션 2: JSONB 배열 (채팅 첨부파일처럼)
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  ...
  attachments JSONB DEFAULT '[]',  -- [{name, url, size, type}]
  sender_id UUID REFERENCES profiles(id),
  ...
);
```

**핵심 규칙:**
- 파일 크기는 **바이트(INTEGER)** 단위로 저장
- 업로드한 사용자 ID 참조 필수 (`uploaded_by` 또는 `sender_id`)
- JSONB 사용 시 각 항목에 `size` 필드 포함

---

## 8. 체크리스트

새 파일 업로드 기능 개발 시:

- [ ] 파일 유형 확인 (영상인가? 아바타인가? 기타인가?)
- [ ] 적절한 버킷 선택 (`avatars` / `videos` / `src`)
- [ ] 폴더 구조 결정 (기존 구조 참고)
- [ ] 이 문서에 새 폴더 구조 추가
- [ ] **스토리지 사용량 연동** (§7.3 파일들 수정)
- [ ] DB 스키마에 `file_size`, `uploaded_by` 컬럼 확인 (§7.5)
