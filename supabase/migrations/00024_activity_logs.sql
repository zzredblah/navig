-- 00024_activity_logs.sql
-- 협업 타임라인: 프로젝트 활동 로그

-- activity_logs 테이블
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  activity_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_type VARCHAR(50), -- 'video', 'feedback', 'document', 'member', 'project'
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_project_created ON activity_logs(project_id, created_at DESC);

-- RLS 활성화
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 프로젝트 멤버만 조회 가능
CREATE POLICY "Project members can view activity logs"
  ON activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = activity_logs.project_id
        AND pm.user_id = auth.uid()
        AND pm.joined_at IS NOT NULL
    )
    OR
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = activity_logs.project_id
        AND p.client_id = auth.uid()
    )
  );

-- RLS 정책: Service role만 삽입 가능
CREATE POLICY "Service role can insert activity logs"
  ON activity_logs
  FOR INSERT
  WITH CHECK (true);

-- 코멘트
COMMENT ON TABLE activity_logs IS '프로젝트 활동 로그 (타임라인)';
COMMENT ON COLUMN activity_logs.activity_type IS '활동 유형: project_created, member_invited, member_joined, video_uploaded, feedback_created, feedback_resolved, document_created, document_updated, version_uploaded, video_approved';
COMMENT ON COLUMN activity_logs.target_type IS '대상 유형: project, member, video, feedback, document, version';
COMMENT ON COLUMN activity_logs.target_id IS '대상 ID (해당 유형의 레코드 ID)';
