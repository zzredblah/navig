# NAVIG 오류 방지 가이드 (Error Prevention Guide)

**버전:** 2.2
**최종 수정:** 2026-01-26
**목적:** 개발 중 발생한 오류와 해결책을 문서화하여 재발 방지

---

## 1. Supabase RLS (Row Level Security) 관련

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

## 13. 체크리스트

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

---

## 14. 관련 파일

| 파일 | 설명 |
|------|------|
| `src/lib/supabase/server.ts` | Supabase 클라이언트 (일반 + Admin) |
| `src/lib/cloudflare/r2.ts` | R2 스토리지 클라이언트 |
| `src/app/api/projects/route.ts` | 프로젝트 API (참고용 패턴) |
| `src/app/api/chat/messages/[id]/reactions/route.ts` | 리액션 API (멱등성 패턴) |
| `src/app/api/chat/rooms/[id]/messages/route.ts` | 채팅 메시지 API (별도 쿼리 패턴) |
| `src/app/api/chat/attachments/route.ts` | 채팅 첨부파일 R2 업로드 |
| `src/components/chat/ChatRoom.tsx` | 채팅방 (Optimistic Update 패턴) |
| `src/components/chat/ChatMessage.tsx` | 채팅 메시지 (그룹화 패턴) |
| `src/components/chat/ChatInput.tsx` | 채팅 입력 (비차단 전송 패턴) |
| `supabase/migrations/00002_rls_policies.sql` | RLS 정책 정의 |
| `supabase/migrations/00003_fix_project_members_rls.sql` | RLS 수정 마이그레이션 |
