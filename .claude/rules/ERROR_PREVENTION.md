# NAVIG 오류 방지 가이드 (Error Prevention Guide)

**버전:** 1.0
**최종 수정:** 2025-01-22
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

## 6. 대시보드/UI 데이터 연동

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

## 7. 체크리스트

### API 개발 시
- [ ] Admin 클라이언트 필요 여부 확인 (RLS 우회 필요?)
- [ ] 모든 Supabase 쿼리에 error 체크
- [ ] 쿼리 파라미터 `null` → `undefined` 변환
- [ ] console.error로 상세 로깅
- [ ] 에러 응답에 상세 정보 포함 (개발 환경)

### 프로젝트 관련 기능 개발 시
- [ ] `project_members` + `projects.client_id` 모두 조회
- [ ] 프로젝트 생성 시 멤버 추가 에러 처리

### UI 개발 시
- [ ] Image 컴포넌트에 `unoptimized` 속성 고려
- [ ] 대시보드 통계는 실제 데이터 연동
- [ ] 로딩/에러 상태 UI 구현

---

## 8. 관련 파일

| 파일 | 설명 |
|------|------|
| `src/lib/supabase/server.ts` | Supabase 클라이언트 (일반 + Admin) |
| `src/app/api/projects/route.ts` | 프로젝트 API (참고용 패턴) |
| `supabase/migrations/00002_rls_policies.sql` | RLS 정책 정의 |
| `supabase/migrations/00003_fix_project_members_rls.sql` | RLS 수정 마이그레이션 |
