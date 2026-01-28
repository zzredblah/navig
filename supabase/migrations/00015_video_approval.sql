-- 영상 승인 시스템
-- video_versions 테이블에 승인 관련 컬럼 추가

-- 승인 관련 컬럼 추가
ALTER TABLE video_versions
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);

-- 승인된 영상 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_video_versions_approved
ON video_versions(approved_at)
WHERE approved_at IS NOT NULL;

-- 승인자 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_video_versions_approved_by
ON video_versions(approved_by)
WHERE approved_by IS NOT NULL;

COMMENT ON COLUMN video_versions.approved_at IS '영상 승인 일시';
COMMENT ON COLUMN video_versions.approved_by IS '승인한 사용자 ID (클라이언트)';
