# NAVIG 오류 방지 가이드 (Error Prevention Guide)

**버전:** 2.6
**최종 수정:** 2026-01-29
**목적:** 개발 중 발생한 오류와 해결책을 문서화하여 재발 방지

---

## 0. Skeleton/Loading UI 동기화 (필수)

### 0.1 문제: 레이아웃 변경 후 스켈레톤과 불일치

**원인:**
- 실제 컴포넌트 레이아웃 변경 후 스켈레톤 컴포넌트 업데이트 누락
- Suspense fallback으로 구버전 UI가 잠깐 표시됨

**해결책:**
```tsx
// 레이아웃 변경 시 반드시 스켈레톤도 함께 변경

// ❌ Bad: 레이아웃만 변경
// StatCards: 7열 그리드로 변경
<div className="grid grid-cols-7 ...">

// DashboardSkeleton: 여전히 4열
<div className="grid grid-cols-4 ...">  // 불일치!

// ✅ Good: 레이아웃과 스켈레톤 동시 변경
// StatCards: 7열 그리드
<div className="grid grid-cols-4 sm:grid-cols-7 ...">

// DashboardSkeleton: 동일한 7열
<div className="grid grid-cols-4 sm:grid-cols-7 ...">
```

**체크 포인트:**
1. 그리드 열 수 (grid-cols-*)
2. 간격 (gap-*, space-y-*)
3. 카드/섹션 구조 (Card wrapper 유무)
4. 반응형 브레이크포인트 (sm:, md:, lg:)
5. 섹션 순서

**관련 파일 매핑:**

| 실제 컴포넌트 | 스켈레톤 파일 |
|--------------|--------------|
| `StatCards.tsx` | `DashboardSkeleton.tsx` |
| `ActivityFeed.tsx` | `DashboardSkeleton.tsx` |
| `UrgentSection.tsx` | `DashboardSkeleton.tsx` |
| `RecentProjects.tsx` | `DashboardSkeleton.tsx` |

**규칙:**
- 레이아웃 변경 시 반드시 관련 스켈레톤 검토
- Suspense fallback이 있는 페이지는 스켈레톤 구조 확인 필수
- 스켈레톤이 실제 컴포넌트와 동일한 공간을 차지하도록 유지

---

## 1. Supabase 마이그레이션 체크리스트 (필수)

### 1.0 문제: 마이그레이션 누락으로 런타임 에러

**원인:**
- 테이블 생성 후 Realtime, RLS, 트리거 등 관련 설정 누락
- 코드에서 사용하는 기능이 DB에 설정되지 않음

**마이그레이션 작성 시 체크리스트:**

```sql
-- 1. 테이블 생성
CREATE TABLE table_name (...);

-- 2. 인덱스 (쿼리 성능)
CREATE INDEX idx_table_column ON table_name(column);

-- 3. RLS 활성화
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 (SELECT, INSERT, UPDATE, DELETE 각각)
CREATE POLICY "..." ON table_name FOR SELECT USING (...);

-- 5. 트리거 (updated_at 자동 갱신 등)
CREATE TRIGGER ... BEFORE UPDATE ON table_name ...;

-- 6. ⚠️ Realtime 필요 시 (실시간 구독 사용하는 테이블)
ALTER PUBLICATION supabase_realtime ADD TABLE table_name;
```

**Realtime 필수 대상 테이블:**
- `notifications` - 실시간 알림
- `chat_messages` - 실시간 채팅
- `chat_room_members` - 채팅 읽음 상태
- `video_feedbacks` - 실시간 피드백
- 기타 실시간 구독이 필요한 테이블

**Realtime이 필요한 기능 판단 기준:**
- 사용자 A의 행동이 사용자 B 화면에 **즉시** 반영되어야 하는 경우
- 채팅, 알림, 협업 편집, 실시간 피드백 등

**규칙:**
- 코드에서 `supabase.channel().on('postgres_changes', ...)` 사용 시 해당 테이블에 Realtime 활성화 필수
- 마이그레이션 작성 시 해당 테이블이 실시간 기능에 사용되는지 확인
- 실시간 기능 구현 시 마이그레이션에 `ALTER PUBLICATION supabase_realtime ADD TABLE` 자동 포함
- 마이그레이션 PR 전 체크리스트 확인

---

## 2. Supabase RLS (Row Level Security) 관련

### 1.1 문제: 프로젝트 생성 시 "서버 오류가 발생했습니다"

**원인:**
- `project_members` 테이블의 RLS INSERT 정책이 `is_project_owner(project_id)` 함수 사용
- 프로젝트 생성 직후 해당 함수가 새 프로젝트를 인식하지 못함

**해결책:**
```typescript
// ❌ Bad: 일반 클라이언트로 RLS가 적용된 테이블 접근
const { data } = await supabase.from('project_members').insert({...});

// ✅ Good: Admin 클라이언트로 RLS 우회 (서버 사이드에서만)
const adminClient = createAdminClient();
const { data } = await adminClient.from('project_members').insert({...});
```

**규칙:**
- 서버 API에서 데이터 생성/수정 시 `createAdminClient()` 사용 고려
- 인증은 일반 클라이언트로, 데이터 조작은 Admin 클라이언트로 분리
- `.env`에 `SUPABASE_SERVICE_ROLE_KEY` 필수 설정

---

### 1.2 문제: 사용자의 프로젝트가 목록에 표시되지 않음

**원인:**
- API가 `project_members` 테이블만 조회
- RLS로 인해 `project_members` INSERT가 실패하면 프로젝트 조회 불가

**해결책:**
```typescript
// ❌ Bad: project_members만 조회
const { data: memberProjects } = await supabase
  .from('project_members')
  .select('project_id')
  .eq('user_id', user.id);

// ✅ Good: project_members + projects.client_id 모두 조회
const { data: memberProjects } = await adminClient
  .from('project_members')
  .select('project_id')
  .eq('user_id', user.id);

const { data: ownedProjects } = await adminClient
  .from('projects')
  .select('id')
  .eq('client_id', user.id);

// 중복 제거하여 합침
const allProjectIds = [...new Set([...memberProjectIds, ...ownedProjectIds])];
```

**규칙:**
- 프로젝트 조회 시 항상 두 가지 경로 확인:
  1. `projects.client_id` (소유자)
  2. `project_members.user_id` (멤버)

---

## 2. Zod 유효성 검사 관련

### 2.1 문제: API 쿼리 파라미터 파싱 오류

**원인:**
- `searchParams.get()`은 값이 없으면 `null` 반환
- Zod의 `.optional()`은 `undefined`를 기대

**해결책:**
```typescript
// ❌ Bad: null이 그대로 전달됨
const queryResult = schema.safeParse({
  page: searchParams.get('page'),      // null
  status: searchParams.get('status'),  // null
});

// ✅ Good: null을 undefined로 변환
const queryResult = schema.safeParse({
  page: searchParams.get('page') || undefined,
  status: searchParams.get('status') || undefined,
});
```

**규칙:**
- `searchParams.get()` 사용 시 항상 `|| undefined` 추가
- 또는 Zod 스키마에서 `.nullable()` 사용

---

## 3. Next.js Image 컴포넌트 관련

### 3.1 문제: 로고/이미지가 표시되지 않음

**원인:**
- Next.js Image 최적화가 로컬 이미지에서 문제 발생
- 특히 PNG 파일에서 자주 발생

**해결책:**
```tsx
// ❌ Bad: 기본 최적화 사용
<Image
  src="/images/logo.png"
  alt="Logo"
  width={120}
  height={40}
/>

// ✅ Good: unoptimized 속성 추가
<Image
  src="/images/logo.png"
  alt="Logo"
  width={120}
  height={40}
  className="h-8 w-auto object-contain"
  priority
  unoptimized
/>
```

**규칙:**
- 로컬 이미지(public 폴더)에는 `unoptimized` 속성 사용
- 로고 등 중요 이미지에는 `priority` 속성 추가
- `object-contain` 클래스로 비율 유지

---

## 4. API 에러 핸들링

### 4.1 문제: "서버 오류가 발생했습니다" 같은 모호한 에러

**원인:**
- catch 블록에서 상세 에러 정보 미포함
- 디버깅 로그 부재

**해결책:**
```typescript
// ❌ Bad: 모호한 에러 메시지
catch (error) {
  return NextResponse.json(
    { error: '서버 오류가 발생했습니다' },
    { status: 500 }
  );
}

// ✅ Good: 상세 로깅 + 에러 정보 포함
catch (error) {
  console.error('[API Name] 예외:', error);
  return NextResponse.json(
    {
      error: '서버 오류가 발생했습니다',
      details: error instanceof Error ? error.message : 'Unknown error'
    },
    { status: 500 }
  );
}
```

**규칙:**
- 모든 API에 `console.error`로 상세 로깅
- 개발 환경에서는 에러 상세 정보 응답에 포함
- 프로덕션에서는 상세 정보 숨김 (보안)

---

## 5. 데이터베이스 쿼리 관련

### 5.1 문제: Supabase 쿼리 에러가 무시됨

**원인:**
- Supabase 클라이언트는 에러를 throw하지 않고 `{ data, error }` 반환
- error 체크 없이 data만 사용

**해결책:**
```typescript
// ❌ Bad: 에러 체크 없음
const { data } = await supabase.from('projects').insert({...});

// ✅ Good: 에러 체크 필수
const { data, error } = await supabase.from('projects').insert({...});
if (error) {
  console.error('[Context] 작업 실패:', error);
  // 적절한 에러 처리
}
```

**규칙:**
- 모든 Supabase 쿼리에서 `error` 체크 필수
- 에러 발생 시 로깅 후 적절한 응답 반환

---

## 6. 파일 스토리지 (Cloudflare R2 / Supabase Storage)

> **참고:** 2026-01-26부터 Cloudflare R2를 기본 스토리지로 사용합니다.
> R2 환경 변수가 없으면 자동으로 Supabase Storage로 폴백합니다.

### 6.1 R2 환경 변수 설정

```env
# 필수 환경 변수 (4개 모두 설정해야 R2 사용)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# 버킷 이름 (선택, 기본값 있음)
R2_BUCKET_AVATARS=navig-avatars
R2_BUCKET_VIDEOS=navig-videos
```

### 6.2 R2 업로드 패턴

**단일 파일 업로드 (10MB 미만):**
```typescript
import { uploadFile } from '@/lib/cloudflare/r2';

// File → Buffer 변환 후 업로드
const arrayBuffer = await file.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);

const { url, key } = await uploadFile('avatars', fileKey, buffer, file.type);
```

**멀티파트 업로드 (10MB 이상, 영상):**
```typescript
import {
  initiateMultipartUpload,
  createPresignedPartUrl,
  completeMultipartUpload,
} from '@/lib/cloudflare/r2';

// 1. 업로드 시작
const { uploadId, key } = await initiateMultipartUpload('videos', fileKey, contentType);

// 2. 각 파트의 Presigned URL 생성 (클라이언트가 직접 업로드)
const partUrl = await createPresignedPartUrl('videos', key, uploadId, partNumber);

// 3. 업로드 완료
const { url } = await completeMultipartUpload('videos', key, uploadId, parts);
```

### 6.3 Supabase Storage 폴백 패턴

R2가 설정되지 않은 경우 기존 Supabase Storage 사용:

```typescript
// R2 환경 변수 확인
const isR2Configured = !!(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_PUBLIC_URL
);

if (isR2Configured) {
  // R2 업로드
  const { url } = await uploadFile('avatars', fileKey, buffer, file.type);
} else {
  // Supabase Storage 폴백
  const adminClient = createAdminClient();
  await adminClient.storage.from('avatars').upload(fileKey, buffer, {...});
}
```

### 6.4 서버 API에서 File → Buffer 변환 (필수)

**원인:**
- Next.js API Route (서버 환경)에서 `File` 객체를 직접 사용 불가
- 서버 환경에서는 브라우저 전용 `File` API가 SDK와 호환되지 않음

**해결책:**
```typescript
// ❌ Bad: File 객체 직접 전달
const file = formData.get('avatar') as File;
await uploadFile('avatars', key, file, file.type); // 에러!

// ✅ Good: Buffer 변환 필수
const file = formData.get('avatar') as File;
const arrayBuffer = await file.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);
await uploadFile('avatars', key, buffer, file.type);
```

**규칙:**
- 서버 API에서 파일 업로드 시 반드시 `File` → `Buffer` 변환:
  ```typescript
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  ```
- Storage 업로드/삭제는 `createAdminClient()` 사용 (RLS 우회)
- 인증 확인은 `createClient()`로 먼저 수행, 실제 업로드는 Admin으로 분리
- `contentType` 명시 필수 (미지정 시 `application/octet-stream`으로 저장됨)

---

## 7. 대시보드/UI 데이터 연동

### 6.1 문제: 대시보드에 하드코딩된 데이터 표시

**원인:**
- 서버 컴포넌트에서 실제 데이터 조회 없이 정적 값 사용

**해결책:**
```tsx
// ❌ Bad: 하드코딩
<div className="text-2xl font-bold">0</div>

// ✅ Good: 실제 데이터 조회
const { data: projects } = await supabase
  .from('projects')
  .select('id')
  .eq('client_id', user.id);

<div className="text-2xl font-bold">{projects?.length || 0}</div>
```

**규칙:**
- 대시보드 통계는 항상 실제 데이터에서 계산
- 로딩 상태 처리 필수

---

## 8. 모바일 반응형 관련

### 7.1 문제: 페이지 헤더에서 버튼이 넘침 (overflow)

**원인:**
- `flex items-center justify-between`만 사용
- 모바일에서 제목 + 3개 이상 버튼이 한 줄에 배치되면 넘침

**해결책:**
```tsx
// ❌ Bad: 강제 가로 배치
<div className="flex items-center justify-between">
  <h1>제목</h1>
  <div className="flex gap-2">
    <Button>PDF</Button>
    <Button>인쇄</Button>
    <Button>편집</Button>
  </div>
</div>

// ✅ Good: 모바일 세로, 데스크톱 가로
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
  <div className="flex items-center gap-3 min-w-0">
    <h1 className="text-xl font-bold truncate">{title}</h1>
  </div>
  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
    <Button variant="outline" size="sm">PDF</Button>
    <Button variant="outline" size="sm">인쇄</Button>
    <Button size="sm">편집</Button>
  </div>
</div>
```

**규칙:**
- 페이지 헤더는 반드시 `flex-col sm:flex-row` 패턴 사용
- 버튼 영역에 `flex-wrap` 필수
- 모든 액션 버튼은 `size="sm"` 사용
- 제목에 `min-w-0` + `truncate` 적용

---

### 7.2 문제: 메타데이터(여러 항목) 한 줄 넘침

**원인:**
- 멤버 수, 문서 수, 생성일, 수정일 등 4개 이상 항목을 `flex gap-4`로 나열
- 모바일에서 공간 부족으로 넘침

**해결책:**
```tsx
// ❌ Bad: wrap 없는 flex
<div className="flex items-center gap-4 text-xs">
  <span>멤버 3</span>
  <span>문서 5</span>
  <span>생성 1/15</span>
  <span>수정 1/20</span>
</div>

// ✅ Good: wrap + 모바일 숨김
<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
  <span>멤버 3</span>
  <span>문서 5</span>
  <span className="hidden sm:inline-flex">생성 1/15</span>
  <span className="hidden sm:inline-flex">수정 1/20</span>
</div>
```

**규칙:**
- 3개 이상 항목 나열 시 `flex-wrap` 필수
- 날짜 등 부가 정보는 `hidden sm:inline-flex`로 모바일 숨김
- `gap-4` 대신 `gap-x-3 gap-y-1` 사용 (더 좁은 간격)

---

### 7.3 문제: 카드 내 가로 레이아웃 모바일 깨짐

**원인:**
- 아이콘 + 제목/메타 + 뱃지/버튼을 `flex justify-between`으로 배치
- 모바일에서 텍스트가 잘리거나 뱃지가 겹침

**해결책:**
```tsx
// ❌ Bad
<CardContent className="flex items-center justify-between p-4">

// ✅ Good
<CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
  <div className="flex items-center gap-3 min-w-0">
    <div className="w-10 h-10 shrink-0 ..." />
    <div className="min-w-0">
      <div className="truncate">{title}</div>
      <div className="text-sm truncate">{meta}</div>
    </div>
  </div>
  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
    <Badge />
  </div>
</CardContent>
```

---

## 9. Input/Form UI 관련

### 8.1 문제: raw HTML input이 검은색/어두운 배경으로 표시됨

**원인:**
- `globals.css`에서 `body`에 `text-foreground` 적용
- CSS 변수 `--foreground: 240 10% 3.9%` (거의 검정)
- raw `<input>`에 명시적 `bg-white`, `text-gray-900` 없으면 상속받아 의도치 않은 색상

**해결책:**
```tsx
// ❌ Bad: 배경/텍스트 색상 미지정
<input className="border border-gray-200 px-3 py-2 text-sm" />

// ✅ Good: 명시적 색상 지정
<input className="border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm
  placeholder:text-gray-400 focus:outline-none focus:border-primary-500
  focus:ring-1 focus:ring-primary-500" />
```

**규칙:**
- raw `<input>`, `<select>`, `<textarea>` 사용 시 반드시:
  - `bg-white` (배경)
  - `text-gray-900` (텍스트)
  - `placeholder:text-gray-400` (placeholder)
  - `focus:outline-none` (기본 아웃라인 제거)
- 가능하면 shadcn `<Input>`, `<Textarea>` 컴포넌트 사용 우선

---

## 10. 빈 상태/피드백 관련

### 9.1 문제: 클릭 가능한 버튼이 반응 없음

**원인:**
- 알림 벨 등 인터랙티브 요소가 Dropdown/Popover 없이 버튼만 존재
- 클릭해도 아무 피드백 없어 사용자가 버그로 인식

**해결책:**
```tsx
// ❌ Bad: 기능 없는 버튼
<Button variant="ghost" size="icon">
  <Bell className="h-5 w-5" />
</Button>

// ✅ Good: 빈 상태라도 드롭다운 표시
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <Bell className="h-5 w-5" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <div className="py-8 text-center">
      <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-gray-500">알림이 없습니다</p>
    </div>
  </DropdownMenuContent>
</DropdownMenu>
```

**규칙:**
- 모든 클릭 가능한 요소는 반드시 피드백 제공
- 데이터가 없어도 빈 상태 UI 표시 (아이콘 + 메시지)
- "아직 ~가 없습니다" + "~하면 여기에 표시됩니다" 패턴 사용

---

## 11. Supabase 쿼리 패턴 관련

### 11.1 문제: Nested Foreign Key Join이 작동하지 않음

**원인:**
- Supabase의 중첩 조인 (예: `reply_to:chat_messages!reply_to_id(sender:profiles!sender_id(...))`)
- 복잡한 중첩 구조에서 데이터가 null로 반환됨

**해결책:**
```typescript
// ❌ Bad: 중첩 조인 시도 (작동 안 함)
const { data } = await supabase
  .from('chat_messages')
  .select(`
    *,
    reply_to:chat_messages!reply_to_id(
      id, content,
      sender:profiles!sender_id(id, name, avatar_url)
    )
  `)
  .single();

// ✅ Good: 별도 쿼리로 분리
const { data: message } = await supabase
  .from('chat_messages')
  .select('*, sender:profiles!sender_id(id, name, avatar_url)')
  .eq('id', messageId)
  .single();

// reply_to 정보는 별도 조회
let replyTo = null;
if (message.reply_to_id) {
  const { data: replyMessage } = await supabase
    .from('chat_messages')
    .select('id, content, sender:profiles!sender_id(id, name, avatar_url)')
    .eq('id', message.reply_to_id)
    .single();
  replyTo = replyMessage;
}
```

**규칙:**
- 2단계 이상의 중첩 조인은 피하고 별도 쿼리로 분리
- 복잡한 관계 데이터는 순차적으로 조회

---

### 11.2 문제: upsert + ignoreDuplicates + single()로 500 에러

**원인:**
- `upsert({ ignoreDuplicates: true })`는 중복 시 아무 행도 반환하지 않음
- `.single()`은 정확히 1행을 기대하므로 에러 발생

**해결책:**
```typescript
// ❌ Bad: upsert + single() 조합 (중복 시 에러)
const { data, error } = await supabase
  .from('chat_message_reactions')
  .upsert(
    { message_id, user_id, emoji },
    { ignoreDuplicates: true }
  )
  .select()
  .single(); // 중복 시 "No rows found" 에러

// ✅ Good: 존재 여부 먼저 확인
const { data: existing } = await supabase
  .from('chat_message_reactions')
  .select('id')
  .eq('message_id', messageId)
  .eq('user_id', userId)
  .eq('emoji', emoji)
  .limit(1);

if (existing && existing.length > 0) {
  // 이미 존재 - 성공 응답 (멱등성)
  return { data: existing[0], existing: true };
}

// 존재하지 않으면 새로 생성
const { data: created } = await supabase
  .from('chat_message_reactions')
  .insert({ message_id, user_id, emoji })
  .select()
  .single();
```

**규칙:**
- `upsert + ignoreDuplicates`와 `.single()` 절대 함께 사용 금지
- 멱등성이 필요한 경우 존재 여부 먼저 확인 후 조건부 삽입
- `.limit(1)` 또는 `.maybeSingle()` 사용 권장

---

## 12. 실시간 채팅 UX 패턴

### 12.1 문제: 메시지 전송 후 즉시 표시되지 않음

**원인:**
- 서버 응답을 기다린 후 UI 업데이트
- 네트워크 지연으로 사용자가 전송 실패로 오인

**해결책 (Optimistic Update):**
```typescript
// ✅ Good: 낙관적 업데이트 패턴
const handleSend = async (content: string) => {
  // 1. 임시 ID로 즉시 UI에 추가
  const tempId = `temp-${Date.now()}`;
  const optimisticMessage = {
    id: tempId,
    content,
    sender_id: currentUserId,
    sender: currentUserProfile,
    created_at: new Date().toISOString(),
    // ...기타 필드
  };

  setMessages(prev => [...prev, optimisticMessage]);
  scrollToBottom();

  try {
    // 2. 서버에 전송
    const response = await fetch('/api/chat/messages', { ... });
    const { message: serverMessage } = await response.json();

    // 3. 임시 메시지를 실제 메시지로 교체
    setMessages(prev =>
      prev.map(m => m.id === tempId ? serverMessage : m)
    );
  } catch (error) {
    // 4. 실패 시 임시 메시지 제거
    setMessages(prev => prev.filter(m => m.id !== tempId));
    toast.error('메시지 전송 실패');
  }
};
```

**규칙:**
- 채팅/댓글 등 실시간 기능은 항상 Optimistic Update 적용
- 임시 ID는 `temp-` 접두사 + 타임스탬프로 구분
- 실패 시 반드시 롤백 처리

---

### 12.2 문제: 메시지 전송 후 입력창 포커스 사라짐

**원인:**
- 상태 업데이트(setContent(''))로 인한 리렌더링
- 포커스가 다른 곳으로 이동

**해결책:**
```typescript
// ✅ Good: setTimeout으로 리렌더 후 포커스
const handleSend = async () => {
  const messageContent = content.trim();

  // 상태 초기화
  setContent('');
  setAttachments([]);

  // 리렌더 후 포커스 복원
  setTimeout(() => {
    textareaRef.current?.focus();
  }, 0);

  // 백그라운드로 전송
  await sendMessage(messageContent);
};
```

**규칙:**
- 입력 완료 후 `setTimeout(..., 0)`으로 포커스 복원
- ref를 사용해 직접 DOM 요소에 포커스

---

### 12.3 문제: 메시지 연속 전송 시 지연/블로킹

**원인:**
- `isSending` 상태로 버튼 비활성화
- 서버 응답까지 다음 입력 불가

**해결책:**
```typescript
// ❌ Bad: 전송 완료까지 블로킹
const [isSending, setIsSending] = useState(false);

const handleSend = async () => {
  setIsSending(true);
  await sendMessage(content);
  setContent('');
  setIsSending(false); // 여기까지 입력 불가
};

<Button disabled={isSending}>전송</Button>

// ✅ Good: 비차단 전송
const handleSend = async () => {
  if (!content.trim()) return;

  // 즉시 입력 초기화 (블로킹 없음)
  const messageToSend = content.trim();
  setContent('');
  setTimeout(() => textareaRef.current?.focus(), 0);

  // 백그라운드 전송 (UI 블로킹 없음)
  try {
    await sendMessage(messageToSend);
  } catch (error) {
    setContent(messageToSend); // 실패 시 복원
  }
};

<Button disabled={!content.trim()}>전송</Button>
```

**규칙:**
- 채팅 입력은 `isSending` 상태로 블로킹하지 않음
- 입력값은 즉시 초기화, 전송은 백그라운드
- 실패 시에만 입력값 복원

---

### 12.4 메시지 그룹화 패턴 (연속 메시지)

**문제:** 같은 사람이 연속으로 보낸 메시지에 매번 프로필 표시

**해결책:**
```typescript
// ✅ Good: 5분 이내 연속 메시지는 프로필 생략
{messages.map((message, index) => {
  const prevMessage = index > 0 ? messages[index - 1] : null;
  const isSameSender = prevMessage?.sender_id === message.sender_id;
  const timeDiff = prevMessage
    ? new Date(message.created_at).getTime() -
      new Date(prevMessage.created_at).getTime()
    : Infinity;
  const isWithinTimeWindow = timeDiff < 5 * 60 * 1000; // 5분

  // 같은 사람이 5분 이내에 보낸 메시지면 프로필 숨김
  const showProfile = !isSameSender || !isWithinTimeWindow;

  return (
    <ChatMessage
      key={message.id}
      message={message}
      showProfile={showProfile}
    />
  );
})}
```

**컴포넌트 측:**
```typescript
interface ChatMessageProps {
  message: ChatMessageWithDetails;
  showProfile?: boolean; // 기본값 true
}

// 아바타 영역 - 공간만 확보하고 조건부 렌더링
{!isOwnMessage && (
  <div className="w-8 shrink-0">
    {showProfile && <Avatar>...</Avatar>}
  </div>
)}
```

**규칙:**
- 같은 발신자 + 5분 이내 = 프로필 생략
- 프로필 생략 시에도 레이아웃용 공간 유지 (정렬 깨짐 방지)
- 내 메시지는 항상 프로필 표시 안 함

---

## 13. API 응답 구조 관련

### 13.1 문제: API 응답 데이터 접근 실패

**원인:**
- NAVIG API는 `{ data: 실제데이터 }` 형태로 응답을 래핑함
- 클라이언트에서 `response.json()` 후 바로 `data.id` 접근 시 `undefined`

**해결책:**
```typescript
// ❌ Bad: 응답 구조 무시하고 직접 접근
const response = await fetch('/api/profile');
const data = await response.json();
console.log(data.id);        // undefined!
console.log(data.name);      // undefined!

// ✅ Good: 응답 구조에 맞게 접근
const response = await fetch('/api/profile');
const json = await response.json();
const profile = json.data;   // API 응답은 { data: profile } 형태
console.log(profile.id);     // 실제 ID
console.log(profile.name);   // 실제 이름
```

**NAVIG API 응답 패턴:**
```typescript
// 단일 데이터
{ data: { id, name, ... } }

// 목록 데이터
{ data: [...], pagination: { ... } }

// 에러
{ error: '에러 메시지' }
```

**규칙:**
- API 호출 후 반드시 응답 구조 확인
- `json.data`로 실제 데이터 접근
- 새 API 작성 시에도 동일한 `{ data: ... }` 패턴 유지

---

### 13.2 문제: React state 업데이트 타이밍 이슈

**원인:**
- `setState`는 비동기이므로 호출 직후 값이 반영되지 않음
- API 응답 후 state 설정하고 바로 해당 값을 사용하면 이전 값 참조

**해결책:**
```typescript
// ❌ Bad: setState 직후 state 값 사용
const [userId, setUserId] = useState('');

const fetchUser = async () => {
  const json = await fetch('/api/profile').then(r => r.json());
  setUserId(json.data.id);

  // userId는 아직 '' (빈 문자열)!
  console.log(userId);
  fetchMessages(userId); // 빈 문자열로 호출됨
};

// ✅ Good: 로컬 변수 사용 또는 별도 상태로 로딩 제어
const [userId, setUserId] = useState('');
const [isUserLoaded, setIsUserLoaded] = useState(false);

const fetchUser = async () => {
  const json = await fetch('/api/profile').then(r => r.json());
  const id = json.data.id;  // 로컬 변수에 저장

  setUserId(id);
  setIsUserLoaded(true);

  // 로컬 변수 사용
  fetchMessages(id);
};

// 렌더링 시 로딩 체크
if (!isUserLoaded) return <Loading />;
```

**규칙:**
- `setState` 직후 해당 state 값에 의존하지 않기
- 연속 작업 시 로컬 변수 사용
- 의존성 있는 데이터는 별도 로딩 상태로 제어

---

## 14. React Hydration 에러

### 14.1 문제: Radix UI 컴포넌트 Hydration 불일치

**원인:**
- Radix UI (DropdownMenu, Collapsible 등)가 내부적으로 ID 생성
- 서버와 클라이언트에서 생성된 ID가 다름
- React hydration 시 DOM 불일치 에러 발생

**에러 메시지:**
```
Hydration failed because the server rendered HTML didn't match the client.
- Server: id="radix-:r1:"
- Client: id="radix-:r5:"
```

**해결책:**
```typescript
// ✅ Good: mounted 상태로 클라이언트 렌더링만 허용
'use client';

import { useState, useEffect } from 'react';

export function NotificationBell() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 서버에서는 단순 버튼만 렌더링
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  // 클라이언트에서만 Radix UI 컴포넌트 렌더링
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {/* ... */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**적용 대상 컴포넌트:**
- `DropdownMenu` (알림, 프로필 드롭다운)
- `Collapsible` (접을 수 있는 섹션)
- `Dialog` / `AlertDialog`
- `Popover`
- `Tooltip`

**규칙:**
- Radix UI 컴포넌트 사용 시 `mounted` 패턴 적용
- 서버 렌더링 시에는 정적 대체 UI 표시
- `useEffect`로 클라이언트 마운트 후에만 인터랙티브 UI 렌더링

---

## 15. 한글 IME (Input Method Editor) 관련

### 15.1 문제: 한글 입력 시 마지막 글자 중복

**원인:**
- 한글 IME는 글자 조합 중 여러 이벤트 발생 (compositionstart, compositionupdate, compositionend)
- `onKeyDown`에서 Enter 처리 시 조합 중인 글자가 중복 입력됨
- 특히 Windows에서 자주 발생

**해결책:**
```typescript
// ✅ Good: 조합 상태 추적
const [isComposing, setIsComposing] = useState(false);

const handleKeyDown = (e: React.KeyboardEvent) => {
  // 한글 조합 중에는 Enter 처리하지 않음
  if (isComposing) return;

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

<Textarea
  onCompositionStart={() => setIsComposing(true)}
  onCompositionEnd={() => setIsComposing(false)}
  onKeyDown={handleKeyDown}
/>
```

**규칙:**
- 채팅, 검색, 폼 입력 등 Enter로 제출하는 모든 입력 필드에 적용
- `onCompositionStart`, `onCompositionEnd` 핸들러 필수
- `isComposing` 상태 체크 후 키 이벤트 처리

---

## 16. 체크리스트

### 레이아웃 변경 시 (§0)
- [ ] 관련 스켈레톤 컴포넌트가 있는지 확인
- [ ] 스켈레톤의 그리드 열 수, 간격, 구조가 동일한지 확인
- [ ] Suspense fallback이 새 레이아웃과 일치하는지 확인
- [ ] 반응형 브레이크포인트가 동일한지 확인

### API 개발 시
- [ ] Admin 클라이언트 필요 여부 확인 (RLS 우회 필요?)
- [ ] 모든 Supabase 쿼리에 error 체크
- [ ] 쿼리 파라미터 `null` → `undefined` 변환
- [ ] console.error로 상세 로깅
- [ ] 에러 응답에 상세 정보 포함 (개발 환경)

### Supabase 쿼리 시 (§11)
- [ ] 2단계 이상 중첩 조인 금지 → 별도 쿼리로 분리 (§11.1)
- [ ] `upsert({ ignoreDuplicates })` + `.single()` 함께 사용 금지 (§11.2)
- [ ] 멱등성 필요 시 존재 여부 먼저 확인 후 조건부 삽입

### 프로젝트 관련 기능 개발 시
- [ ] `project_members` + `projects.client_id` 모두 조회
- [ ] 프로젝트 생성 시 멤버 추가 에러 처리

### 파일 업로드 시
- [ ] `File` → `Buffer` 변환 (`arrayBuffer()` → `Buffer.from()`) (§6.4)
- [ ] Storage 업로드는 `createAdminClient()` 사용 (§6.4)
- [ ] `contentType` 명시
- [ ] 인증은 `createClient()`로 먼저 확인

### UI 개발 시 (반응형)
- [ ] 페이지 헤더: `flex-col sm:flex-row` + `flex-wrap` (§8.1)
- [ ] 메타데이터: `flex-wrap` + 모바일 숨김 (§8.2)
- [ ] 카드 레이아웃: `flex-col sm:flex-row` (§8.3)
- [ ] 긴 텍스트에 `min-w-0` + `truncate`
- [ ] 아이콘/이미지에 `shrink-0`

### UI 개발 시 (스타일링)
- [ ] raw input에 `bg-white text-gray-900` 명시 (§9.1)
- [ ] `focus:outline-none` + `focus:ring` 포함
- [ ] Image 컴포넌트에 `unoptimized` 속성 고려
- [ ] 대시보드 통계는 실제 데이터 연동

### UI 개발 시 (인터랙션)
- [ ] 모든 버튼/클릭요소에 피드백 존재 (§10.1)
- [ ] 빈 상태 UI 구현 (드롭다운, 리스트, 페이지)
- [ ] 로딩/에러 상태 UI 구현

### 실시간 채팅 개발 시 (§12)
- [ ] Optimistic Update 패턴 적용 (§12.1)
- [ ] 메시지 전송 후 `setTimeout(..., 0)`으로 입력창 포커스 (§12.2)
- [ ] 전송 중 입력 블로킹 금지 - 비차단 패턴 사용 (§12.3)
- [ ] 연속 메시지 그룹화 (5분 이내, 같은 발신자) (§12.4)
- [ ] 내 메시지는 프로필 표시 안 함

### API 응답 처리 시 (§13)
- [ ] API 응답 구조 확인: `json.data`로 실제 데이터 접근 (§13.1)
- [ ] `setState` 직후 해당 state 값에 의존하지 않기 (§13.2)
- [ ] 연속 작업 시 로컬 변수 사용

### Radix UI 사용 시 (§14)
- [ ] Hydration 에러 방지: `mounted` 상태 패턴 적용 (§14.1)
- [ ] DropdownMenu, Collapsible, Dialog 등에 필수 적용
- [ ] 서버 렌더링 시 정적 대체 UI 표시

### 프로젝트 멤버 권한 확인 시 (§17)
- [ ] `project_members` 쿼리에 `.not('joined_at', 'is', null)` 추가 필수 (§17.1)
- [ ] 초대 대기 중인 멤버는 프로젝트 접근 불가하도록 처리
- [ ] 모든 프로젝트 관련 API (목록, 상세, 멤버, 비디오, 문서, 보드)에 적용

### 로그아웃 처리 시 (§18)
- [ ] `clearAllAppData()` 호출하여 로컬 데이터 삭제 (§18.1)
- [ ] Zustand persist store 초기화
- [ ] localStorage의 `navig-*`, `sb-*` 키 삭제

### API 응답 처리 시 (추가) (§19)
- [ ] `fetch` 후 `response.ok` 체크 필수 (§19.1)
- [ ] `response.ok`가 `false`면 `response.json()` 호출 금지
- [ ] HTML 응답 시 JSON 파싱 에러 방지

### 액션 버튼 상태 관리 시 (§20)
- [ ] 마운트 시 실제 DB 상태 확인 (§20.1)
- [ ] 로컬 상태만 의존하지 않기
- [ ] 상태 확인 중 로딩 UI 표시
- [ ] 에러 시 안전한 방향으로 처리 (버튼 숨김 등)

---

## 17. 프로젝트 멤버 권한 확인 (joined_at 필터)

### 17.1 문제: 초대 수락 전 프로젝트 접근 가능

**원인:**
- `project_members` 테이블에서 `joined_at` 필터 없이 조회
- 초대만 받고 수락하지 않은 사용자도 프로젝트에 접근 가능
- 프로젝트 목록, 상세, 멤버, 비디오, 문서, 보드 등 모든 API 영향

**해결책:**
```typescript
// ❌ Bad: joined_at 필터 없음 (초대 대기 중인 멤버도 포함됨)
const { data: memberProjects } = await adminClient
  .from('project_members')
  .select('project_id')
  .eq('user_id', user.id);

// ✅ Good: joined_at이 있는 멤버만 조회 (실제로 수락한 멤버만)
const { data: memberProjects } = await adminClient
  .from('project_members')
  .select('project_id')
  .eq('user_id', user.id)
  .not('joined_at', 'is', null);  // 초대 수락한 멤버만
```

**적용 대상 API:**
- `GET /api/projects` - 프로젝트 목록
- `GET/PATCH/DELETE /api/projects/[id]` - 프로젝트 상세
- `GET/POST /api/projects/[id]/members` - 멤버 관리
- `PATCH/DELETE /api/projects/[id]/members/[memberId]` - 멤버 수정/삭제
- `GET/POST /api/projects/[id]/videos` - 비디오
- `GET/POST /api/projects/[id]/documents` - 문서
- `GET/POST /api/projects/[id]/boards` - 레퍼런스 보드
- `GET /api/projects/[id]/feedback-stats` - 피드백 통계

**규칙:**
- 프로젝트 접근 권한 확인 시 **반드시** `.not('joined_at', 'is', null)` 추가
- 새 프로젝트 관련 API 작성 시 체크리스트에 포함

---

## 18. 로그아웃 시 로컬 데이터 정리

### 18.1 문제: 로그아웃 후 다른 계정 로그인 시 이전 데이터 표시

**원인:**
- Zustand의 `persist` 미들웨어가 localStorage에 상태 저장
- 로그아웃 시 서버 세션만 종료하고 localStorage 데이터 미삭제
- 다른 계정 로그인 시 이전 계정의 선택된 프로젝트 등이 표시됨

**해결책:**
```typescript
// ❌ Bad: 서버 로그아웃만 수행
const handleLogout = async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  router.push('/login');
};

// ✅ Good: 로컬 데이터도 함께 삭제
import { clearAllAppData } from '@/stores/project-context-store';

const handleLogout = async () => {
  // 1. 먼저 로컬 데이터 클리어
  clearAllAppData();

  // 2. 서버에 로그아웃 요청
  await fetch('/api/auth/logout', { method: 'POST' });

  // 3. 로그인 페이지로 이동
  router.push('/login');
  router.refresh();
};

// clearAllAppData 구현 예시
export function clearAllAppData() {
  // Zustand 상태 초기화
  useProjectContextStore.getState().clearSelectedProject();

  // localStorage 정리 (navig-, sb- 접두사)
  if (typeof window !== 'undefined') {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('navig-') || key.startsWith('sb-'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
}
```

**규칙:**
- 로그아웃 시 `clearAllAppData()` 호출 필수
- 새 persist store 추가 시 `clearAllAppData()`에 해당 store 초기화 로직 추가
- localStorage 키 네이밍: `navig-` 접두사 사용 (일괄 삭제 용이)

---

## 19. API 응답 JSON 파싱 에러 방지

### 19.1 문제: API 응답이 HTML일 때 JSON 파싱 에러

**원인:**
- 인증 실패, 서버 에러 등으로 API가 HTML 에러 페이지 반환
- `response.json()` 호출 시 `Unexpected token '<'` 에러 발생
- 에러 메시지: `"Unexpected token '<', "<!DOCTYPE "... is not valid JSON"`

**해결책:**
```typescript
// ❌ Bad: response.ok 체크 없이 바로 json() 호출
const response = await fetch('/api/projects');
const data = await response.json();  // HTML 반환 시 에러!

// ✅ Good: response.ok 체크 후 json() 호출
const response = await fetch('/api/projects');
if (!response.ok) {
  // 에러 처리 (JSON 파싱 시도하지 않음)
  console.error('API 에러:', response.status);
  return null;
}
const data = await response.json();
```

**Promise 체인 사용 시:**
```typescript
// ✅ Good: then 체인에서 ok 체크
fetch(`/api/projects/${projectId}`)
  .then((res) => {
    if (!res.ok) return null;  // 에러 시 null 반환
    return res.json();
  })
  .then((data) => {
    if (data?.data?.project) {
      // 정상 처리
    }
  })
  .catch(() => {
    // 네트워크 에러 등 처리
  });
```

**규칙:**
- 모든 `fetch` 후 `response.ok` 체크 필수
- `response.ok`가 `false`면 `response.json()` 호출 금지
- try-catch와 함께 사용하여 파싱 에러도 대비

---

## 20. 컴포넌트 상태 vs 데이터베이스 상태 동기화

### 20.1 문제: 이미 처리된 초대에 수락/거절 버튼 표시

**원인:**
- 초대 수락/거절 후 `inviteHandled` 상태를 로컬에서만 관리
- 페이지 새로고침 시 상태 초기화되어 버튼이 다시 표시됨
- 컴포넌트 로컬 상태와 실제 DB 상태 불일치

**해결책:**
```typescript
// ❌ Bad: 로컬 상태만 의존
const [inviteHandled, setInviteHandled] = useState(false);

// 수락 시
const handleAccept = () => {
  // API 호출...
  setInviteHandled(true);  // 새로고침하면 다시 false
};

// ✅ Good: 마운트 시 실제 상태 확인
const [inviteHandled, setInviteHandled] = useState(false);
const [isCheckingStatus, setIsCheckingStatus] = useState(false);

useEffect(() => {
  if (!isProjectInvite) return;

  async function checkInvitationStatus() {
    setIsCheckingStatus(true);
    try {
      // 실제 초대 상태 조회 API 호출
      const response = await fetch(`/api/invitations/${memberId}/status`);
      if (response.ok) {
        const data = await response.json();
        // pending이 아니면 이미 처리된 것
        if (data.status !== 'pending') {
          setInviteHandled(true);
        }
      } else if (response.status === 404) {
        // 멤버가 존재하지 않음 (거절됨)
        setInviteHandled(true);
      }
    } catch {
      setInviteHandled(true);  // 에러 시 버튼 숨김 (안전하게)
    } finally {
      setIsCheckingStatus(false);
    }
  }

  checkInvitationStatus();
}, [isProjectInvite, memberId]);

// UI에서 로딩 상태 표시
{isCheckingStatus && <Loader2 className="animate-spin" />}
{!isCheckingStatus && !inviteHandled && (
  <Button onClick={handleAccept}>수락</Button>
)}
```

**규칙:**
- 액션 버튼(수락/거절/삭제 등)은 마운트 시 실제 상태 확인
- 로컬 상태만 의존하지 말고 DB 상태와 동기화
- 상태 확인 중 로딩 UI 표시
- 에러 발생 시 안전한 방향으로 처리 (버튼 숨김 등)

---

## 21. 관련 파일

| 파일 | 설명 |
|------|------|
| `src/lib/supabase/server.ts` | Supabase 클라이언트 (일반 + Admin) |
| `src/lib/cloudflare/r2.ts` | R2 스토리지 클라이언트 |
| `src/app/api/projects/route.ts` | 프로젝트 API (joined_at 필터 패턴) |
| `src/app/api/projects/[id]/route.ts` | 프로젝트 상세 API (joined_at 필터 패턴) |
| `src/app/api/invitations/[memberId]/status/route.ts` | 초대 상태 확인 API (§20 패턴) |
| `src/app/api/chat/messages/[id]/reactions/route.ts` | 리액션 API (멱등성 패턴) |
| `src/app/api/chat/rooms/[id]/messages/route.ts` | 채팅 메시지 API (별도 쿼리 패턴) |
| `src/app/api/chat/attachments/route.ts` | 채팅 첨부파일 R2 업로드 |
| `src/stores/project-context-store.ts` | 프로젝트 컨텍스트 (clearAllAppData 패턴) |
| `src/components/layout/Header.tsx` | 헤더 (로그아웃 데이터 정리 패턴) |
| `src/components/layout/Sidebar.tsx` | 사이드바 (response.ok 체크 패턴) |
| `src/components/notifications/NotificationItem.tsx` | 알림 아이템 (DB 상태 동기화 패턴) |
| `src/components/chat/ChatRoom.tsx` | 채팅방 (Optimistic Update 패턴) |
| `src/components/chat/ChatMessage.tsx` | 채팅 메시지 (그룹화 패턴) |
| `src/components/chat/ChatInput.tsx` | 채팅 입력 (비차단 전송 패턴) |
| `supabase/migrations/00002_rls_policies.sql` | RLS 정책 정의 |
| `supabase/migrations/00003_fix_project_members_rls.sql` | RLS 수정 마이그레이션 |
| `src/lib/cloudflare/stream.ts` | Cloudflare Stream API 클라이언트 |
| `src/lib/toss/client.ts` | Toss Payments API 클라이언트 |
| `src/lib/usage/checker.ts` | 사용량 계산 유틸리티 |

---

## 22. 외부 API 연동 관련

### 22.1 문제: 외부 API 응답 형식 불일치

**원인:**
- 외부 API(Cloudflare, Toss 등)는 내부 API와 다른 응답 구조 사용
- 내부 API는 `{ data: ... }` 래핑, 외부 API는 직접 데이터 반환
- 응답 구조를 잘못 가정하면 `undefined` 접근 에러

**해결책:**
```typescript
// ❌ Bad: 내부 API 패턴으로 외부 API 응답 접근
const response = await fetch('https://api.cloudflare.com/...');
const json = await response.json();
const data = json.data;  // Cloudflare는 { result: ... } 형태!

// ✅ Good: 외부 API별 응답 구조 확인
// Cloudflare Stream API
const cfResponse = await fetch('https://api.cloudflare.com/...');
const cfJson = await cfResponse.json();
const video = cfJson.result;  // Cloudflare는 result 키 사용

// Toss Payments API
const tossResponse = await fetch('https://api.tosspayments.com/...');
const payment = await tossResponse.json();  // 직접 데이터 반환
```

**주요 외부 API 응답 패턴:**

| API | 성공 응답 | 에러 응답 |
|-----|----------|----------|
| Cloudflare | `{ result: data, success: true }` | `{ success: false, errors: [...] }` |
| Toss Payments | `{ ...data }` (직접) | `{ code: "...", message: "..." }` |
| Supabase (내부) | `{ data, error }` | `{ data: null, error: {...} }` |

**규칙:**
- 외부 API 연동 전 공식 문서에서 응답 형식 확인
- 응답 타입을 명시적으로 정의
- 에러 응답도 별도로 타입 정의

---

### 22.2 문제: 외부 API 인증 헤더 누락

**원인:**
- 환경 변수 미설정 또는 오타
- Bearer 토큰 형식 오류
- API 키 위치 오류 (Header vs Query)

**해결책:**
```typescript
// ❌ Bad: 하드코딩 또는 검증 없이 사용
const response = await fetch(url, {
  headers: { 'Authorization': process.env.API_KEY }  // Bearer 누락!
});

// ✅ Good: 환경 변수 검증 + 올바른 형식
const apiKey = process.env.CLOUDFLARE_API_TOKEN;
if (!apiKey) {
  throw new Error('CLOUDFLARE_API_TOKEN 환경 변수가 설정되지 않았습니다');
}

const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
});
```

**규칙:**
- 환경 변수 존재 여부 반드시 체크
- Bearer 토큰은 `Bearer ` 접두사 필수
- 개발 환경에서 누락된 환경 변수 명확히 로깅

---

## 23. 영상 스트리밍 관련

### 23.1 문제: Cloudflare Stream 영상 상태 미확인

**원인:**
- 업로드 직후 영상이 아직 처리 중(processing)
- 처리 완료 전 재생 시도 시 에러
- 상태 확인 없이 playback URL 사용

**해결책:**
```typescript
// ❌ Bad: 상태 확인 없이 바로 재생
const streamUrl = `https://customer-xxx.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
<video src={streamUrl} />  // 처리 중이면 에러!

// ✅ Good: 상태 확인 후 조건부 렌더링
interface StreamStatus {
  state: 'pendingupload' | 'uploading' | 'queued' | 'inprogress' | 'ready' | 'error';
  pctComplete?: number;
}

const [status, setStatus] = useState<StreamStatus | null>(null);

useEffect(() => {
  async function checkStatus() {
    const res = await fetch(`/api/videos/${videoId}/stream-status`);
    const data = await res.json();
    setStatus(data.status);
  }

  const interval = setInterval(checkStatus, 5000);  // 5초마다 폴링
  return () => clearInterval(interval);
}, [videoId]);

// 상태에 따른 UI
{status?.state === 'ready' ? (
  <video src={streamUrl} />
) : status?.state === 'inprogress' ? (
  <div>인코딩 중... {status.pctComplete}%</div>
) : (
  <div>영상 처리 대기 중...</div>
)}
```

**Cloudflare Stream 상태값:**
- `pendingupload`: 업로드 대기
- `uploading`: 업로드 중
- `queued`: 인코딩 대기
- `inprogress`: 인코딩 중 (pctComplete로 진행률)
- `ready`: 재생 가능
- `error`: 에러 발생

**규칙:**
- 업로드 후 반드시 상태 폴링 구현
- `ready` 상태에서만 재생 URL 사용
- 에러 상태 별도 처리 (재업로드 유도)

---

### 23.2 문제: HLS/DASH 스트리밍 브라우저 호환성

**원인:**
- Safari는 HLS(.m3u8) 네이티브 지원
- Chrome/Firefox는 HLS 네이티브 미지원, 라이브러리 필요
- DASH는 별도 플레이어 필요

**해결책:**
```typescript
// ✅ Good: hls.js 사용하여 크로스 브라우저 지원
import Hls from 'hls.js';

function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Safari는 네이티브 HLS 지원
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    }
    // 기타 브라우저는 hls.js 사용
    else if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
      };
    }
  }, [src]);

  return <video ref={videoRef} controls />;
}
```

**규칙:**
- HLS 스트리밍 시 hls.js 라이브러리 사용
- Safari 네이티브 지원 먼저 체크
- cleanup 시 hls.destroy() 필수 호출

---

## 24. 결제/구독 관련

### 24.1 문제: 사용량 계산 시 JSONB 필드 처리 오류

**원인:**
- PostgreSQL JSONB 배열에서 숫자 합산 시 타입 처리 필요
- Supabase 쿼리 결과의 JSONB는 JavaScript 배열로 자동 변환
- 하지만 내부 필드 타입은 보장되지 않음

**해결책:**
```typescript
// ❌ Bad: 타입 검증 없이 직접 합산
const { data } = await supabase.from('chat_messages').select('attachments');
const totalSize = data.reduce((sum, msg) => {
  return sum + msg.attachments.reduce((s, a) => s + a.size, 0);  // 타입 에러 가능!
}, 0);

// ✅ Good: 타입 검증 + null 체크
interface Attachment {
  name: string;
  url: string;
  size?: number;  // optional
  type: string;
}

const { data } = await supabase.from('chat_messages').select('attachments');

let totalSize = 0;
if (data) {
  for (const msg of data) {
    const attachments = msg.attachments as Attachment[] | null;
    if (attachments && Array.isArray(attachments)) {
      totalSize += attachments.reduce((sum, att) => sum + (att.size || 0), 0);
    }
  }
}
```

**규칙:**
- JSONB 필드는 항상 타입 단언 후 사용
- 배열 여부 `Array.isArray()` 체크
- 숫자 필드는 `|| 0` 또는 `?? 0`로 기본값 설정
- null/undefined 방어 코드 필수

---

### 24.2 문제: 구독 상태 확인 로직 오류

**원인:**
- 구독 상태가 여러 필드에 분산 (status, ends_at, canceled_at 등)
- 만료/취소/활성 상태 판단 로직 복잡
- 시간대(timezone) 처리 오류

**해결책:**
```typescript
// ❌ Bad: 단순 status만 체크
const isActive = subscription.status === 'active';

// ✅ Good: 모든 조건 종합 체크
function isSubscriptionActive(subscription: Subscription): boolean {
  if (!subscription) return false;

  const now = new Date();

  // 1. 기본 상태 체크
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    return false;
  }

  // 2. 만료일 체크 (ends_at이 있고 지났으면 비활성)
  if (subscription.ends_at) {
    const endsAt = new Date(subscription.ends_at);
    if (endsAt < now) return false;
  }

  // 3. 취소 예정이지만 아직 유효기간 내
  if (subscription.canceled_at && subscription.ends_at) {
    const endsAt = new Date(subscription.ends_at);
    return endsAt > now;  // 아직 유효기간 내면 활성
  }

  return true;
}

// 사용
const canUseFeature = isSubscriptionActive(subscription) &&
  subscription.plan.features.includes(featureName);
```

**규칙:**
- 구독 상태는 전용 유틸리티 함수로 판단
- status, ends_at, canceled_at 모두 고려
- 시간 비교는 항상 UTC 기준
- 플랜별 기능 제한은 별도 체크

---

## 25. 체크리스트 (추가)

### 외부 API 연동 시 (§22)
- [ ] 공식 문서에서 응답 형식 확인 (§22.1)
- [ ] 응답 타입 명시적으로 정의
- [ ] 에러 응답 타입도 정의
- [ ] 환경 변수 존재 여부 체크 (§22.2)
- [ ] 인증 헤더 형식 확인 (Bearer 등)

### 영상 스트리밍 시 (§23)
- [ ] 업로드 후 상태 폴링 구현 (§23.1)
- [ ] `ready` 상태에서만 재생
- [ ] 처리 중/에러 상태 UI 구현
- [ ] hls.js 사용하여 크로스 브라우저 지원 (§23.2)
- [ ] cleanup 시 hls.destroy() 호출

### 결제/구독 시스템 (§24)
- [ ] JSONB 필드 타입 검증 (§24.1)
- [ ] Array.isArray() 체크
- [ ] 숫자 필드 기본값 설정
- [ ] 구독 상태 종합 판단 함수 사용 (§24.2)
- [ ] 시간 비교는 UTC 기준
