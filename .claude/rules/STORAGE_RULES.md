# Navig 저장소 규칙 (Storage Rules)

**버전:** 1.0
**최종 수정:** 2026-01-28

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

## 7. 체크리스트

새 파일 업로드 기능 개발 시:

- [ ] 파일 유형 확인 (영상인가? 아바타인가? 기타인가?)
- [ ] 적절한 버킷 선택 (`avatars` / `videos` / `src`)
- [ ] 폴더 구조 결정 (기존 구조 참고)
- [ ] 이 문서에 새 폴더 구조 추가
