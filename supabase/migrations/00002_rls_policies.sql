-- ============================================
-- Navig Row Level Security (RLS) Policies
-- ============================================
-- Version: 1.0
-- Created: 2025-01-22
-- Description: Sprint 1-2 테이블 접근 권한 정책

-- ============================================
-- 1. Enable RLS
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. Helper Functions
-- ============================================

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
-- 3. Profiles Policies
-- ============================================

-- 조회: 모든 인증된 사용자
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- 생성: 자신의 프로필만
CREATE POLICY "profiles_insert"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 수정: 자신의 프로필만
CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 삭제: 자신 또는 관리자
CREATE POLICY "profiles_delete"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id OR is_admin());

-- ============================================
-- 4. Projects Policies
-- ============================================

-- 조회: 오너, 멤버, 관리자
CREATE POLICY "projects_select"
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

-- 생성: 모든 인증된 사용자 (자신이 오너)
CREATE POLICY "projects_insert"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

-- 수정: 오너 또는 관리자
CREATE POLICY "projects_update"
  ON projects FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid() OR is_admin())
  WITH CHECK (client_id = auth.uid() OR is_admin());

-- 삭제: 오너 또는 관리자
CREATE POLICY "projects_delete"
  ON projects FOR DELETE
  TO authenticated
  USING (client_id = auth.uid() OR is_admin());

-- ============================================
-- 5. Project Members Policies
-- ============================================

-- 조회: 프로젝트 오너, 해당 멤버
CREATE POLICY "project_members_select"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    is_project_owner(project_id)
    OR user_id = auth.uid()
  );

-- 생성: 프로젝트 오너만
CREATE POLICY "project_members_insert"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (is_project_owner(project_id));

-- 수정: 프로젝트 오너만
CREATE POLICY "project_members_update"
  ON project_members FOR UPDATE
  TO authenticated
  USING (is_project_owner(project_id))
  WITH CHECK (is_project_owner(project_id));

-- 삭제: 프로젝트 오너 또는 본인 (탈퇴)
CREATE POLICY "project_members_delete"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    is_project_owner(project_id)
    OR user_id = auth.uid()
  );
