-- =============================================
-- 편집 프로젝트에서 자막 생성 지원
-- video_subtitles 테이블에 edit_project_id 컬럼 추가
-- =============================================

-- 1. edit_project_id 컬럼 추가
ALTER TABLE video_subtitles
ADD COLUMN edit_project_id UUID REFERENCES edit_projects(id) ON DELETE CASCADE;

-- 2. video_version_id를 nullable로 변경
ALTER TABLE video_subtitles
ALTER COLUMN video_version_id DROP NOT NULL;

-- 3. video_version_id 또는 edit_project_id 중 하나는 필수인 제약 조건
ALTER TABLE video_subtitles
ADD CONSTRAINT chk_subtitle_source
CHECK (video_version_id IS NOT NULL OR edit_project_id IS NOT NULL);

-- 4. edit_project_id + language 유니크 제약 (기존 video_version_id + language 유니크와 별도)
CREATE UNIQUE INDEX idx_video_subtitles_edit_project_language
ON video_subtitles(edit_project_id, language)
WHERE edit_project_id IS NOT NULL;

-- 5. 인덱스
CREATE INDEX idx_video_subtitles_edit_project ON video_subtitles(edit_project_id)
WHERE edit_project_id IS NOT NULL;

-- 6. RLS 정책 업데이트 - 편집 프로젝트 생성자도 자막에 접근 가능

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Project members can view subtitles" ON video_subtitles;
DROP POLICY IF EXISTS "Project members can create subtitles" ON video_subtitles;
DROP POLICY IF EXISTS "Project members can update subtitles" ON video_subtitles;
DROP POLICY IF EXISTS "Project members can delete subtitles" ON video_subtitles;

-- 새 정책: 조회
CREATE POLICY "Users can view subtitles"
  ON video_subtitles FOR SELECT
  USING (
    -- video_version 기반
    (
      video_version_id IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM video_versions vv
          JOIN project_members pm ON vv.project_id = pm.project_id
          WHERE vv.id = video_subtitles.video_version_id
          AND pm.user_id = auth.uid()
          AND pm.joined_at IS NOT NULL
        )
        OR
        EXISTS (
          SELECT 1 FROM video_versions vv
          JOIN projects p ON vv.project_id = p.id
          WHERE vv.id = video_subtitles.video_version_id
          AND p.client_id = auth.uid()
        )
      )
    )
    OR
    -- edit_project 기반
    (
      edit_project_id IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM edit_projects ep
          WHERE ep.id = video_subtitles.edit_project_id
          AND ep.created_by = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM edit_projects ep
          JOIN project_members pm ON ep.project_id = pm.project_id
          WHERE ep.id = video_subtitles.edit_project_id
          AND pm.user_id = auth.uid()
          AND pm.joined_at IS NOT NULL
        )
        OR
        EXISTS (
          SELECT 1 FROM edit_projects ep
          JOIN projects p ON ep.project_id = p.id
          WHERE ep.id = video_subtitles.edit_project_id
          AND p.client_id = auth.uid()
        )
      )
    )
  );

-- 새 정책: 생성
CREATE POLICY "Users can create subtitles"
  ON video_subtitles FOR INSERT
  WITH CHECK (
    -- video_version 기반
    (
      video_version_id IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM video_versions vv
          JOIN project_members pm ON vv.project_id = pm.project_id
          WHERE vv.id = video_subtitles.video_version_id
          AND pm.user_id = auth.uid()
          AND pm.joined_at IS NOT NULL
        )
        OR
        EXISTS (
          SELECT 1 FROM video_versions vv
          JOIN projects p ON vv.project_id = p.id
          WHERE vv.id = video_subtitles.video_version_id
          AND p.client_id = auth.uid()
        )
      )
    )
    OR
    -- edit_project 기반
    (
      edit_project_id IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM edit_projects ep
          WHERE ep.id = video_subtitles.edit_project_id
          AND ep.created_by = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM edit_projects ep
          JOIN project_members pm ON ep.project_id = pm.project_id
          WHERE ep.id = video_subtitles.edit_project_id
          AND pm.user_id = auth.uid()
          AND pm.joined_at IS NOT NULL
        )
        OR
        EXISTS (
          SELECT 1 FROM edit_projects ep
          JOIN projects p ON ep.project_id = p.id
          WHERE ep.id = video_subtitles.edit_project_id
          AND p.client_id = auth.uid()
        )
      )
    )
  );

-- 새 정책: 수정
CREATE POLICY "Users can update subtitles"
  ON video_subtitles FOR UPDATE
  USING (
    -- video_version 기반
    (
      video_version_id IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM video_versions vv
          JOIN project_members pm ON vv.project_id = pm.project_id
          WHERE vv.id = video_subtitles.video_version_id
          AND pm.user_id = auth.uid()
          AND pm.joined_at IS NOT NULL
        )
        OR
        EXISTS (
          SELECT 1 FROM video_versions vv
          JOIN projects p ON vv.project_id = p.id
          WHERE vv.id = video_subtitles.video_version_id
          AND p.client_id = auth.uid()
        )
      )
    )
    OR
    -- edit_project 기반
    (
      edit_project_id IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM edit_projects ep
          WHERE ep.id = video_subtitles.edit_project_id
          AND ep.created_by = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM edit_projects ep
          JOIN project_members pm ON ep.project_id = pm.project_id
          WHERE ep.id = video_subtitles.edit_project_id
          AND pm.user_id = auth.uid()
          AND pm.joined_at IS NOT NULL
        )
        OR
        EXISTS (
          SELECT 1 FROM edit_projects ep
          JOIN projects p ON ep.project_id = p.id
          WHERE ep.id = video_subtitles.edit_project_id
          AND p.client_id = auth.uid()
        )
      )
    )
  );

-- 새 정책: 삭제
CREATE POLICY "Users can delete subtitles"
  ON video_subtitles FOR DELETE
  USING (
    -- video_version 기반
    (
      video_version_id IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM video_versions vv
          JOIN project_members pm ON vv.project_id = pm.project_id
          WHERE vv.id = video_subtitles.video_version_id
          AND pm.user_id = auth.uid()
          AND pm.joined_at IS NOT NULL
        )
        OR
        EXISTS (
          SELECT 1 FROM video_versions vv
          JOIN projects p ON vv.project_id = p.id
          WHERE vv.id = video_subtitles.video_version_id
          AND p.client_id = auth.uid()
        )
      )
    )
    OR
    -- edit_project 기반
    (
      edit_project_id IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM edit_projects ep
          WHERE ep.id = video_subtitles.edit_project_id
          AND ep.created_by = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM edit_projects ep
          JOIN project_members pm ON ep.project_id = pm.project_id
          WHERE ep.id = video_subtitles.edit_project_id
          AND pm.user_id = auth.uid()
          AND pm.joined_at IS NOT NULL
        )
        OR
        EXISTS (
          SELECT 1 FROM edit_projects ep
          JOIN projects p ON ep.project_id = p.id
          WHERE ep.id = video_subtitles.edit_project_id
          AND p.client_id = auth.uid()
        )
      )
    )
  );
