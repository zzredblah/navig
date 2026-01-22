-- ============================================
-- Fix: Project Members RLS Policy
-- ============================================
-- Version: 1.1
-- Created: 2025-01-22
-- Description: 프로젝트 생성 시 멤버 추가 RLS 문제 수정

-- 기존 정책 삭제
DROP POLICY IF EXISTS "project_members_insert" ON project_members;

-- 새로운 정책: 프로젝트 클라이언트(owner)가 멤버 추가 가능
-- is_project_owner 함수 대신 직접 projects 테이블 조회
CREATE POLICY "project_members_insert"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- 프로젝트의 client_id가 현재 사용자인 경우 허용
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.client_id = auth.uid()
    )
  );

-- 조회 정책도 수정 (프로젝트 client_id도 조회 가능하도록)
DROP POLICY IF EXISTS "project_members_select" ON project_members;

CREATE POLICY "project_members_select"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    -- 프로젝트 소유자 (client_id)
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.client_id = auth.uid()
    )
    -- 또는 본인이 멤버인 경우
    OR user_id = auth.uid()
  );

-- 수정 정책도 동일하게 수정
DROP POLICY IF EXISTS "project_members_update" ON project_members;

CREATE POLICY "project_members_update"
  ON project_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.client_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.client_id = auth.uid()
    )
  );

-- 삭제 정책은 그대로 (본인 탈퇴 허용)
DROP POLICY IF EXISTS "project_members_delete" ON project_members;

CREATE POLICY "project_members_delete"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.client_id = auth.uid()
    )
    OR user_id = auth.uid()
  );
