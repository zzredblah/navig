-- 00032_edit_projects.sql
-- 편집 프로젝트 테이블

-- 편집 프로젝트 상태 ENUM
CREATE TYPE edit_project_status AS ENUM ('draft', 'registered', 'approved', 'rejected');

-- 편집 프로젝트 테이블
CREATE TABLE edit_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- 소스 영상 (기존 영상 또는 새 업로드)
  source_video_id UUID REFERENCES video_versions(id) ON DELETE SET NULL,
  source_url TEXT,
  source_key TEXT,
  original_duration NUMERIC(10, 3),

  -- 기본 정보
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- 상태
  status edit_project_status DEFAULT 'draft',

  -- 편집 메타데이터 (JSONB)
  -- { trim: {startTime, endTime}, speed, textOverlays: [...], filters: {...}, audio: {...}, subtitleId }
  edit_metadata JSONB NOT NULL DEFAULT '{}',

  -- 미리보기 썸네일
  preview_thumbnail_url TEXT,

  -- 등록 정보
  registered_at TIMESTAMPTZ,
  registered_video_id UUID REFERENCES video_versions(id),

  -- 소유권
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_edit_projects_project ON edit_projects(project_id);
CREATE INDEX idx_edit_projects_status ON edit_projects(status);
CREATE INDEX idx_edit_projects_created_by ON edit_projects(created_by);
CREATE INDEX idx_edit_projects_source_video ON edit_projects(source_video_id);

-- updated_at 트리거
CREATE TRIGGER edit_projects_updated_at
BEFORE UPDATE ON edit_projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS 활성화
ALTER TABLE edit_projects ENABLE ROW LEVEL SECURITY;

-- RLS 정책: SELECT - 프로젝트 멤버 (초대 수락한 멤버)
CREATE POLICY "edit_projects_select" ON edit_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = edit_projects.project_id
        AND user_id = auth.uid()
        AND joined_at IS NOT NULL
    ) OR EXISTS (
      SELECT 1 FROM projects
      WHERE id = edit_projects.project_id AND client_id = auth.uid()
    )
  );

-- RLS 정책: INSERT - owner 또는 editor만
CREATE POLICY "edit_projects_insert" ON edit_projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = edit_projects.project_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
        AND joined_at IS NOT NULL
    ) OR EXISTS (
      SELECT 1 FROM projects
      WHERE id = edit_projects.project_id AND client_id = auth.uid()
    )
  );

-- RLS 정책: UPDATE - 작성자만
CREATE POLICY "edit_projects_update" ON edit_projects
  FOR UPDATE USING (created_by = auth.uid());

-- RLS 정책: DELETE - 작성자이고 draft 상태일 때만
CREATE POLICY "edit_projects_delete" ON edit_projects
  FOR DELETE USING (created_by = auth.uid() AND status = 'draft');

-- 코멘트
COMMENT ON TABLE edit_projects IS '편집 프로젝트 - 브라우저 기반 영상 편집';
COMMENT ON COLUMN edit_projects.source_video_id IS '기존 영상 버전 참조 (선택적)';
COMMENT ON COLUMN edit_projects.source_url IS '직접 업로드한 영상 URL';
COMMENT ON COLUMN edit_projects.source_key IS '직접 업로드한 영상 스토리지 키';
COMMENT ON COLUMN edit_projects.edit_metadata IS '편집 메타데이터 JSON (트림, 속도, 필터, 텍스트 등)';
COMMENT ON COLUMN edit_projects.registered_video_id IS '등록 시 생성된 video_versions ID';
