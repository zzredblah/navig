# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard)에 접속
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - Name: `navig-dev` (또는 원하는 이름)
   - Database Password: 안전한 비밀번호 생성
   - Region: `Northeast Asia (Seoul)` 권장

## 2. 환경 변수 설정

프로젝트가 생성되면 다음 정보를 확인하세요:

1. Project Settings > API > Project URL
2. Project Settings > API > Project API keys > anon public
3. Project Settings > API > Project API keys > service_role (관리자용)

`.env.local` 파일에 추가:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 3. 데이터베이스 마이그레이션 실행

### 방법 1: SQL Editor 사용 (권장)

1. Supabase Dashboard > SQL Editor
2. `migrations/00001_initial_schema.sql` 파일 내용 복사
3. SQL Editor에 붙여넣고 실행
4. `migrations/00002_rls_policies.sql` 파일 내용 복사
5. SQL Editor에 붙여넣고 실행

### 방법 2: Supabase CLI 사용

```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref your-project-ref

# 마이그레이션 실행
supabase db push
```

## 4. 스토리지 버킷 생성 (영상 파일용)

1. Supabase Dashboard > Storage
2. "New bucket" 클릭
3. 버킷 정보 입력:
   - Name: `videos`
   - Public: `false` (비공개)
4. 버킷 정책 설정:

```sql
-- 영상 업로드 정책
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos');

-- 영상 조회 정책 (프로젝트 멤버만)
CREATE POLICY "Project members can view videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'videos');

-- 영상 삭제 정책 (업로더만)
CREATE POLICY "Uploader can delete videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos'
  AND auth.uid() = owner
);
```

## 5. 인증 설정

### 이메일 인증

1. Authentication > Providers > Email
2. "Enable Email provider" 활성화
3. "Confirm email" 활성화 (선택)

### 소셜 로그인 (카카오)

1. [Kakao Developers](https://developers.kakao.com/)에서 앱 생성
2. 앱 키 > REST API 키 복사
3. 카카오 로그인 > 활성화 설정
4. Redirect URI 추가: `https://your-project.supabase.co/auth/v1/callback`
5. Supabase Dashboard > Authentication > Providers > Kakao
6. REST API 키 입력

`.env.local`에 추가:

```env
KAKAO_CLIENT_ID=your-kakao-rest-api-key
```

## 6. 테스트 데이터 생성

```sql
-- 테스트 사용자 (이미 가입된 경우 프로필만 생성됨)
INSERT INTO profiles (id, email, name, role)
VALUES
  ('user-uuid-1', 'client@test.com', '테스트 의뢰인', 'client'),
  ('user-uuid-2', 'worker@test.com', '테스트 작업자', 'worker');

-- 테스트 프로젝트
INSERT INTO projects (title, description, client_id, worker_id, status, stage)
VALUES (
  '테스트 프로젝트',
  '샘플 프로젝트입니다.',
  'user-uuid-1',
  'user-uuid-2',
  'planning',
  'draft'
);
```

## 7. 타입 자동 생성 (선택)

Supabase CLI를 사용하면 데이터베이스 스키마에서 TypeScript 타입을 자동 생성할 수 있습니다:

```bash
# 타입 생성
supabase gen types typescript --project-id your-project-ref > src/types/database.gen.ts
```

현재는 `src/types/database.ts`에 수동으로 타입을 정의했습니다.

## 8. Realtime 기능 활성화 (선택)

실시간 업데이트가 필요한 테이블에 대해:

1. Database > Replication
2. 원하는 테이블 선택 (예: `feedbacks`, `comments`, `notifications`)
3. "Enable" 클릭

## 9. 트러블슈팅

### 연결 오류

- 환경 변수가 올바르게 설정되었는지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인

### RLS 권한 오류

- SQL Editor에서 RLS 정책이 올바르게 생성되었는지 확인
- `auth.uid()`가 올바른 사용자 ID를 반환하는지 확인

### 마이그레이션 실패

- SQL 문법 오류 확인
- 순서대로 실행했는지 확인 (00001 → 00002)

## 10. 다음 단계

Supabase 연동이 완료되었습니다! 이제 다음 작업을 진행하세요:

- [ ] 인증 페이지 구현 (`/login`, `/signup`)
- [ ] 프로젝트 CRUD 기능 구현
- [ ] 대시보드 페이지 구현
