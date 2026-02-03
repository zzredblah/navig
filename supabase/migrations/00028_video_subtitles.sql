-- =============================================
-- Video Subtitles (AI-generated captions)
-- =============================================

-- 자막 테이블
CREATE TABLE video_subtitles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_version_id UUID NOT NULL REFERENCES video_versions(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'ko', -- ISO 639-1 language code
  format TEXT NOT NULL DEFAULT 'srt', -- 'srt', 'vtt', 'json'
  content TEXT NOT NULL, -- Subtitle content (SRT/VTT format or JSON)
  duration_seconds INTEGER, -- Video duration in seconds
  word_count INTEGER, -- Number of words transcribed
  confidence_score REAL, -- Average confidence score (0-1)
  is_auto_generated BOOLEAN NOT NULL DEFAULT true, -- AI vs manual
  status TEXT NOT NULL DEFAULT 'completed', -- 'processing', 'completed', 'failed'
  error_message TEXT, -- Error message if failed
  metadata JSONB DEFAULT '{}', -- Additional metadata (model used, etc.)
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 같은 버전에 같은 언어의 자막은 하나만 허용
  UNIQUE(video_version_id, language)
);

-- 자막 세그먼트 테이블 (개별 자막 항목, 선택적)
CREATE TABLE subtitle_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtitle_id UUID NOT NULL REFERENCES video_subtitles(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL, -- 순서
  start_time REAL NOT NULL, -- 시작 시간 (초)
  end_time REAL NOT NULL, -- 종료 시간 (초)
  text TEXT NOT NULL, -- 자막 텍스트
  confidence REAL, -- 이 세그먼트의 신뢰도
  speaker TEXT, -- 화자 식별 (선택)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(subtitle_id, segment_index)
);

-- 인덱스
CREATE INDEX idx_video_subtitles_video_version ON video_subtitles(video_version_id);
CREATE INDEX idx_video_subtitles_language ON video_subtitles(video_version_id, language);
CREATE INDEX idx_video_subtitles_status ON video_subtitles(status);
CREATE INDEX idx_subtitle_segments_subtitle ON subtitle_segments(subtitle_id);
CREATE INDEX idx_subtitle_segments_time ON subtitle_segments(subtitle_id, start_time);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_video_subtitles_updated_at
  BEFORE UPDATE ON video_subtitles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE video_subtitles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtitle_segments ENABLE ROW LEVEL SECURITY;

-- RLS 정책: video_subtitles
-- 프로젝트 멤버는 자막 조회 가능
CREATE POLICY "Project members can view subtitles"
  ON video_subtitles FOR SELECT
  USING (
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
  );

-- 프로젝트 멤버는 자막 생성 가능
CREATE POLICY "Project members can create subtitles"
  ON video_subtitles FOR INSERT
  WITH CHECK (
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
  );

-- 프로젝트 멤버는 자막 수정 가능
CREATE POLICY "Project members can update subtitles"
  ON video_subtitles FOR UPDATE
  USING (
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
  );

-- 프로젝트 멤버는 자막 삭제 가능
CREATE POLICY "Project members can delete subtitles"
  ON video_subtitles FOR DELETE
  USING (
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
  );

-- RLS 정책: subtitle_segments
CREATE POLICY "Segments inherit subtitle access"
  ON subtitle_segments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM video_subtitles vs
      WHERE vs.id = subtitle_segments.subtitle_id
    )
  );
