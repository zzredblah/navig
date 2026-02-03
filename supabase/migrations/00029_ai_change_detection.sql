-- AI 영상 차이점 감지 기능 추가
-- video_change_markers 테이블에 AI 생성 여부 필드 추가

-- AI 생성 마커 플래그
ALTER TABLE video_change_markers
ADD COLUMN is_ai_generated BOOLEAN DEFAULT FALSE;

-- AI 분석 신뢰도 점수
ALTER TABLE video_change_markers
ADD COLUMN confidence FLOAT;

-- AI 분석 메타데이터 (모델 정보, 분석 파라미터 등)
ALTER TABLE video_change_markers
ADD COLUMN ai_metadata JSONB;

-- AI 분석 요청 로그 테이블
CREATE TABLE video_diff_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES video_versions(id) ON DELETE CASCADE,
  compared_version_id UUID NOT NULL REFERENCES video_versions(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  markers_count INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  model VARCHAR(50),
  metadata JSONB,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX idx_diff_analyses_versions ON video_diff_analyses(version_id, compared_version_id);
CREATE INDEX idx_diff_analyses_status ON video_diff_analyses(status);
CREATE INDEX idx_diff_analyses_created_by ON video_diff_analyses(created_by);

-- AI 생성 마커용 인덱스
CREATE INDEX idx_change_markers_ai ON video_change_markers(version_id)
WHERE is_ai_generated = TRUE;

-- RLS 활성화
ALTER TABLE video_diff_analyses ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 프로젝트 멤버만 조회 가능
CREATE POLICY video_diff_analyses_select ON video_diff_analyses
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM video_versions vv
    JOIN project_members pm ON pm.project_id = vv.project_id
    WHERE vv.id = video_diff_analyses.version_id
    AND pm.user_id = auth.uid()
    AND pm.joined_at IS NOT NULL
  )
);

-- RLS 정책: 프로젝트 멤버만 생성 가능
CREATE POLICY video_diff_analyses_insert ON video_diff_analyses
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM video_versions vv
    JOIN project_members pm ON pm.project_id = vv.project_id
    WHERE vv.id = video_diff_analyses.version_id
    AND pm.user_id = auth.uid()
    AND pm.joined_at IS NOT NULL
  )
);

-- RLS 정책: 작성자만 수정 가능
CREATE POLICY video_diff_analyses_update ON video_diff_analyses
FOR UPDATE USING (created_by = auth.uid());

-- 상태 검증
ALTER TABLE video_diff_analyses
ADD CONSTRAINT check_diff_analysis_status
CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- 자기 자신과 비교 방지
ALTER TABLE video_diff_analyses
ADD CONSTRAINT check_different_versions
CHECK (version_id != compared_version_id);
