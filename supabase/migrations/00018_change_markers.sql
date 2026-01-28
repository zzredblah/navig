-- 영상 버전 변경 마커 테이블
-- 사용자가 수동으로 변경 구간을 마킹하여 타임라인에 표시

CREATE TABLE video_change_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES video_versions(id) ON DELETE CASCADE,
  compared_version_id UUID REFERENCES video_versions(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL, -- 'visual', 'audio', 'text', 'effect', 'other'
  start_time FLOAT NOT NULL, -- 초 단위
  end_time FLOAT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_change_markers_version ON video_change_markers(version_id);
CREATE INDEX idx_change_markers_compared ON video_change_markers(compared_version_id) WHERE compared_version_id IS NOT NULL;
CREATE INDEX idx_change_markers_type ON video_change_markers(version_id, type);

-- RLS 활성화
ALTER TABLE video_change_markers ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 프로젝트 멤버만 조회 가능
CREATE POLICY video_change_markers_select ON video_change_markers
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM video_versions vv
    JOIN project_members pm ON pm.project_id = vv.project_id
    WHERE vv.id = video_change_markers.version_id
    AND pm.user_id = auth.uid()
  )
);

-- RLS 정책: 프로젝트 멤버만 생성 가능
CREATE POLICY video_change_markers_insert ON video_change_markers
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM video_versions vv
    JOIN project_members pm ON pm.project_id = vv.project_id
    WHERE vv.id = video_change_markers.version_id
    AND pm.user_id = auth.uid()
  )
);

-- RLS 정책: 작성자 또는 관리자만 수정/삭제 가능
CREATE POLICY video_change_markers_update ON video_change_markers
FOR UPDATE USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM video_versions vv
    JOIN project_members pm ON pm.project_id = vv.project_id
    WHERE vv.id = video_change_markers.version_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'owner'
  )
);

CREATE POLICY video_change_markers_delete ON video_change_markers
FOR DELETE USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM video_versions vv
    JOIN project_members pm ON pm.project_id = vv.project_id
    WHERE vv.id = video_change_markers.version_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'owner'
  )
);

-- 마커 유형 검증
ALTER TABLE video_change_markers
ADD CONSTRAINT check_marker_type
CHECK (type IN ('visual', 'audio', 'text', 'effect', 'other'));

-- 시간 범위 검증
ALTER TABLE video_change_markers
ADD CONSTRAINT check_time_range
CHECK (start_time >= 0 AND end_time >= start_time);
