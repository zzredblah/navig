-- ============================================
-- 영상 피드백 시스템
-- Sprint 5-6: 프레임 단위 피드백
-- ============================================

-- 1. 피드백 상태 ENUM 생성
CREATE TYPE feedback_status AS ENUM ('open', 'resolved', 'wontfix');

-- 2. video_feedbacks 테이블 생성
CREATE TABLE video_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES video_versions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- 피드백 내용
  content TEXT NOT NULL,

  -- 타임스탬프 (초 단위, 소수점 2자리까지)
  timestamp_seconds DECIMAL(10, 2) NOT NULL,

  -- 화면 좌표 (선택적 - 특정 영역 표시용)
  position_x DECIMAL(5, 2), -- 0-100% (화면 가로 위치)
  position_y DECIMAL(5, 2), -- 0-100% (화면 세로 위치)

  -- 그림 주석 (Base64 PNG 이미지)
  drawing_image TEXT,

  -- 긴급 여부
  is_urgent BOOLEAN DEFAULT FALSE,

  -- 상태 및 메타데이터
  status feedback_status DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),

  -- 작성자 정보
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 인덱스를 위한 제약조건
  CONSTRAINT valid_position CHECK (
    (position_x IS NULL AND position_y IS NULL) OR
    (position_x >= 0 AND position_x <= 100 AND position_y >= 0 AND position_y <= 100)
  )
);

-- 3. 피드백 답글 테이블 생성
CREATE TABLE feedback_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES video_feedbacks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 인덱스 생성
-- 영상별 피드백 조회
CREATE INDEX idx_video_feedbacks_video ON video_feedbacks(video_id, timestamp_seconds);

-- 프로젝트별 피드백 조회
CREATE INDEX idx_video_feedbacks_project ON video_feedbacks(project_id, created_at DESC);

-- 상태별 피드백 조회
CREATE INDEX idx_video_feedbacks_status ON video_feedbacks(status);

-- 작성자별 피드백 조회
CREATE INDEX idx_video_feedbacks_creator ON video_feedbacks(created_by);

-- 긴급 피드백 조회
CREATE INDEX idx_video_feedbacks_urgent ON video_feedbacks(is_urgent) WHERE is_urgent = TRUE;

-- 답글 조회
CREATE INDEX idx_feedback_replies_feedback ON feedback_replies(feedback_id, created_at);

-- 5. updated_at 자동 갱신 트리거
CREATE TRIGGER video_feedbacks_updated_at
BEFORE UPDATE ON video_feedbacks
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER feedback_replies_updated_at
BEFORE UPDATE ON feedback_replies
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. RLS 정책 설정
ALTER TABLE video_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_replies ENABLE ROW LEVEL SECURITY;

-- 피드백 조회: 프로젝트 멤버만 조회 가능
CREATE POLICY "video_feedbacks_select" ON video_feedbacks
  FOR SELECT
  USING (is_project_member(project_id));

-- 피드백 작성: 프로젝트 멤버만 작성 가능
CREATE POLICY "video_feedbacks_insert" ON video_feedbacks
  FOR INSERT
  WITH CHECK (is_project_member(project_id));

-- 피드백 수정: 작성자 본인만 수정 가능
CREATE POLICY "video_feedbacks_update" ON video_feedbacks
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- 피드백 삭제: 작성자 본인 또는 프로젝트 관리자만 삭제 가능
CREATE POLICY "video_feedbacks_delete" ON video_feedbacks
  FOR DELETE
  USING (created_by = auth.uid() OR is_project_admin(project_id));

-- 답글 조회: 피드백이 있는 프로젝트의 멤버만
CREATE POLICY "feedback_replies_select" ON feedback_replies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM video_feedbacks vf
      WHERE vf.id = feedback_id
      AND is_project_member(vf.project_id)
    )
  );

-- 답글 작성: 피드백이 있는 프로젝트의 멤버만
CREATE POLICY "feedback_replies_insert" ON feedback_replies
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM video_feedbacks vf
      WHERE vf.id = feedback_id
      AND is_project_member(vf.project_id)
    )
  );

-- 답글 수정: 작성자 본인만
CREATE POLICY "feedback_replies_update" ON feedback_replies
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- 답글 삭제: 작성자 본인 또는 피드백이 있는 프로젝트 관리자
CREATE POLICY "feedback_replies_delete" ON feedback_replies
  FOR DELETE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM video_feedbacks vf
      WHERE vf.id = feedback_id
      AND is_project_admin(vf.project_id)
    )
  );

-- 7. 코멘트 추가
COMMENT ON TABLE video_feedbacks IS '영상 프레임 단위 피드백 테이블';
COMMENT ON COLUMN video_feedbacks.timestamp_seconds IS '피드백이 달린 영상 타임스탬프 (초 단위)';
COMMENT ON COLUMN video_feedbacks.position_x IS '화면 가로 위치 (0-100%)';
COMMENT ON COLUMN video_feedbacks.position_y IS '화면 세로 위치 (0-100%)';
COMMENT ON COLUMN video_feedbacks.drawing_image IS '그림 주석 이미지 (Base64 PNG)';
COMMENT ON COLUMN video_feedbacks.is_urgent IS '긴급 피드백 여부';
COMMENT ON COLUMN video_feedbacks.status IS '피드백 상태 (open: 열림, resolved: 해결됨, wontfix: 수정 안함)';

COMMENT ON TABLE feedback_replies IS '피드백 답글 테이블';
