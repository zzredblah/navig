# Supabase 데이터베이스 설정 가이드

## 문제
회원가입 시 "Database error saving new user" 오류 발생

## 원인
Supabase 데이터베이스에 테이블과 트리거가 생성되지 않음

## 해결 방법

### 1단계: Supabase 대시보드 접속
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택: `ccqsbnckjvpixwshryxh`

### 2단계: SQL Editor에서 마이그레이션 실행

#### 2-1. 초기 스키마 생성
1. 왼쪽 메뉴에서 `SQL Editor` 클릭
2. `New Query` 클릭
3. 아래 파일 내용 전체 복사:
   - `supabase/migrations/00001_initial_schema.sql`
4. SQL Editor에 붙여넣기
5. `Run` 버튼 클릭

#### 2-2. RLS 정책 설정
1. `New Query` 클릭
2. 아래 파일 내용 전체 복사:
   - `supabase/migrations/00002_rls_policies.sql`
3. SQL Editor에 붙여넣기
4. `Run` 버튼 클릭

### 3단계: 테이블 확인
1. 왼쪽 메뉴에서 `Table Editor` 클릭
2. 다음 테이블들이 생성되었는지 확인:
   - `profiles` ✓
   - `projects` ✓
   - `project_members` ✓

### 4단계: 트리거 확인
1. 왼쪽 메뉴에서 `Database` > `Triggers` 클릭
2. 다음 트리거가 있는지 확인:
   - `on_auth_user_created` (auth.users 테이블에 연결) ✓

### 5단계: 회원가입 재시도
1. 개발 서버로 돌아가서 회원가입 시도
2. 정상 작동 확인

## 실행 후 확인 사항
- [ ] profiles 테이블 존재
- [ ] projects 테이블 존재
- [ ] project_members 테이블 존재
- [ ] on_auth_user_created 트리거 존재
- [ ] RLS 정책 활성화
- [ ] 회원가입 성공

## 오류가 계속되면
SQL 실행 중 오류 메시지를 복사해서 알려주세요.
