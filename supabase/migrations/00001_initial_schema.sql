-- ============================================
-- Navig Database Schema - Sprint 1-2
-- ============================================
-- Version: 1.0
-- Created: 2025-01-22
-- Description: 인증 및 프로젝트 관리 기본 스키마

-- ============================================
-- 1. Extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. Enums
-- ============================================

-- 사용자 역할
CREATE TYPE user_role AS ENUM ('client', 'worker', 'admin');

-- 프로젝트 상태
CREATE TYPE project_status AS ENUM ('planning', 'production', 'review', 'completed');

-- 프로젝트 멤버 역할
CREATE TYPE member_role AS ENUM ('owner', 'editor', 'viewer');

-- ============================================
-- 3. Tables
-- ============================================

-- 사용자 프로필 (Supabase Auth와 1:1 매핑)
CREATE TABLE profiles (
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
CREATE TABLE projects (
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
CREATE TABLE project_members (
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
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- projects
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- project_members
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

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
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_role_val user_role;
BEGIN
  -- 이름 추출
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- 역할 추출 (기본값: client)
  BEGIN
    user_role_val := (NEW.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN OTHERS THEN
    user_role_val := 'client';
  END;

  INSERT INTO public.profiles (id, email, name, role)
  VALUES (NEW.id, NEW.email, user_name, user_role_val)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Triggers
-- ============================================

-- updated_at 트리거
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 신규 사용자 프로필 생성 트리거
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 7. Comments
-- ============================================

COMMENT ON TABLE profiles IS '사용자 프로필';
COMMENT ON TABLE projects IS '프로젝트';
COMMENT ON TABLE project_members IS '프로젝트 멤버';

COMMENT ON COLUMN profiles.role IS '사용자 역할: client(의뢰인), worker(작업자), admin(관리자)';
COMMENT ON COLUMN projects.status IS '프로젝트 상태: planning(기획), production(제작), review(검수), completed(완료)';
COMMENT ON COLUMN project_members.role IS '멤버 역할: owner(소유자), editor(편집자), viewer(뷰어)';
