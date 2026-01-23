# NAVIG 오류 방지 가이드 (Error Prevention Guide)

**버전:** 2.0
**최종 수정:** 2026-01-23
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

## 6. Supabase Storage 파일 업로드 관련

### 6.1 문제: 서버 API에서 파일 업로드 시 500 에러

**원인:**
- Next.js API Route (서버 환경)에서 `formData.get('file')`로 받은 `File` 객체를 Supabase Storage에 직접 전달
- 서버 환경에서는 `File` 객체가 Supabase SDK와 호환되지 않음 (브라우저 전용 API)
- `createClient()` (anon key)로 Storage 업로드 시 RLS 정책에 막힘

**해결책:**
```typescript
// ❌ Bad: File 객체 직접 전달 + anon 클라이언트
const file = formData.get('avatar') as File;
const { error } = await supabase.storage
  .from('avatars')
  .upload(filePath, file, { upsert: true });

// ✅ Good: Buffer 변환 + Admin 클라이언트
const file = formData.get('avatar') as File;
const arrayBuffer = await file.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);

const adminClient = createAdminClient();
const { error } = await adminClient.storage
  .from('avatars')
  .upload(filePath, buffer, {
    upsert: true,
    contentType: file.type,
  });
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

## 11. 체크리스트

### API 개발 시
- [ ] Admin 클라이언트 필요 여부 확인 (RLS 우회 필요?)
- [ ] 모든 Supabase 쿼리에 error 체크
- [ ] 쿼리 파라미터 `null` → `undefined` 변환
- [ ] console.error로 상세 로깅
- [ ] 에러 응답에 상세 정보 포함 (개발 환경)

### 프로젝트 관련 기능 개발 시
- [ ] `project_members` + `projects.client_id` 모두 조회
- [ ] 프로젝트 생성 시 멤버 추가 에러 처리

### 파일 업로드 시
- [ ] `File` → `Buffer` 변환 (`arrayBuffer()` → `Buffer.from()`) (§6.1)
- [ ] Storage 업로드는 `createAdminClient()` 사용 (§6.1)
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

---

## 12. 관련 파일

| 파일 | 설명 |
|------|------|
| `src/lib/supabase/server.ts` | Supabase 클라이언트 (일반 + Admin) |
| `src/app/api/projects/route.ts` | 프로젝트 API (참고용 패턴) |
| `supabase/migrations/00002_rls_policies.sql` | RLS 정책 정의 |
| `supabase/migrations/00003_fix_project_members_rls.sql` | RLS 수정 마이그레이션 |
