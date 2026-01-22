-- ============================================
-- Navig Database Setup - 전체 실행용
-- ============================================
-- 이 파일을 Supabase SQL Editor에 복사해서 한 번에 실행하세요
-- https://supabase.com/dashboard -> SQL Editor -> New Query

-- ============================================
-- 1. Extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. Enums
-- ============================================

-- 사용자 역할
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('client', 'worker', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 프로젝트 상태
DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('planning', 'production', 'review', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 프로젝트 멤버 역할
DO $$ BEGIN
  CREATE TYPE member_role AS ENUM ('owner', 'editor', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 3. Tables
-- ============================================

-- 사용자 프로필 (Supabase Auth와 1:1 매핑)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'client',
  phone TEXT,
  company TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 프로젝트
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'planning',
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 프로젝트 멤버
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'viewer',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  UNIQUE(project_id, user_id)
);

-- ============================================
-- 4. Indexes
-- ============================================

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- projects
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- project_members
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- ============================================
-- 5. Functions
-- ============================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 신규 사용자 프로필 자동 생성 함수
-- SECURITY DEFINER: 함수 소유자 권한으로 실행 (RLS 우회)
-- SET search_path: SQL 인젝션 방지 및 스키마 명확화
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_name TEXT;
  user_role_val user_role;
BEGIN
  -- 이름 추출 (메타데이터 > 이메일 앞부분)
  user_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(NEW.email, '@', 1)
  );

  -- 역할 추출 (기본값: client)
  BEGIN
    user_role_val := (NEW.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN OTHERS THEN
    user_role_val := 'client';
  END;

  -- 프로필 생성 (이메일 중복 시에도 처리)
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (NEW.id, NEW.email, user_name, user_role_val)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 에러 로깅 (Supabase 로그에서 확인 가능)
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  -- 트리거 실패해도 사용자 생성은 진행되도록 함
  RETURN NEW;
END;
$$;

-- 관리자 여부 확인
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 프로젝트 접근 권한 확인 (오너 또는 멤버)
CREATE OR REPLACE FUNCTION has_project_access(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid
    AND client_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = project_uuid
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 프로젝트 오너 여부 확인
CREATE OR REPLACE FUNCTION is_project_owner(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid
    AND client_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 6. Triggers
-- ============================================

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 7. Enable RLS
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. RLS Policies
-- ============================================

-- Profiles Policies
DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS profiles_insert ON profiles;
CREATE POLICY profiles_insert
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_delete ON profiles;
CREATE POLICY profiles_delete
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id OR is_admin());

-- Projects Policies
DROP POLICY IF EXISTS projects_select ON projects;
CREATE POLICY projects_select
  ON projects FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = id
      AND user_id = auth.uid()
    )
    OR is_admin()
  );

DROP POLICY IF EXISTS projects_insert ON projects;
CREATE POLICY projects_insert
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS projects_update ON projects;
CREATE POLICY projects_update
  ON projects FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid() OR is_admin())
  WITH CHECK (client_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS projects_delete ON projects;
CREATE POLICY projects_delete
  ON projects FOR DELETE
  TO authenticated
  USING (client_id = auth.uid() OR is_admin());

-- Project Members Policies
DROP POLICY IF EXISTS project_members_select ON project_members;
CREATE POLICY project_members_select
  ON project_members FOR SELECT
  TO authenticated
  USING (
    is_project_owner(project_id)
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS project_members_insert ON project_members;
CREATE POLICY project_members_insert
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (is_project_owner(project_id));

DROP POLICY IF EXISTS project_members_update ON project_members;
CREATE POLICY project_members_update
  ON project_members FOR UPDATE
  TO authenticated
  USING (is_project_owner(project_id))
  WITH CHECK (is_project_owner(project_id));

DROP POLICY IF EXISTS project_members_delete ON project_members;
CREATE POLICY project_members_delete
  ON project_members FOR DELETE
  TO authenticated
  USING (
    is_project_owner(project_id)
    OR user_id = auth.uid()
  );

-- ============================================
-- 9. Comments
-- ============================================

COMMENT ON TABLE profiles IS '사용자 프로필';
COMMENT ON TABLE projects IS '프로젝트';
COMMENT ON TABLE project_members IS '프로젝트 멤버';

COMMENT ON COLUMN profiles.role IS '사용자 역할: client(의뢰인), worker(작업자), admin(관리자)';
COMMENT ON COLUMN projects.status IS '프로젝트 상태: planning(기획), production(제작), review(검수), completed(완료)';
COMMENT ON COLUMN project_members.role IS '멤버 역할: owner(소유자), editor(편집자), viewer(뷰어)';

-- ============================================
-- 완료!
-- ============================================
-- 이제 회원가입을 시도해보세요.
