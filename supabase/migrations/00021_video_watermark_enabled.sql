-- 00021_video_watermark_enabled.sql
-- 영상별 워터마크 표시 여부 컬럼 추가

-- ============================================
-- video_versions 테이블에 워터마크 활성화 컬럼 추가
-- ============================================

ALTER TABLE video_versions
ADD COLUMN IF NOT EXISTS watermark_enabled BOOLEAN DEFAULT true;

-- 코멘트 추가
COMMENT ON COLUMN video_versions.watermark_enabled IS '워터마크 표시 여부 (기본값: true)';

-- 인덱스 (워터마크 활성화된 영상 조회용 - 선택적)
CREATE INDEX IF NOT EXISTS idx_video_versions_watermark
ON video_versions(watermark_enabled)
WHERE watermark_enabled = true;
