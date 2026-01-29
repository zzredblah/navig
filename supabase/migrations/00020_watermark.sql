-- 00020_watermark.sql
-- 프로젝트 워터마크 설정 기능

-- ============================================
-- 프로젝트 테이블에 워터마크 설정 컬럼 추가
-- ============================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS watermark_settings JSONB DEFAULT '{
  "enabled": false,
  "type": "text",
  "position": "bottom-right",
  "opacity": 0.5,
  "text": "NAVIG Corp",
  "show_timecode": false
}'::jsonb;

-- 코멘트 추가
COMMENT ON COLUMN projects.watermark_settings IS '워터마크 설정 (enabled, type, position, opacity, text, logo_url, show_timecode)';

-- ============================================
-- 인덱스 (워터마크 활성화된 프로젝트 조회용)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_watermark_enabled
ON projects ((watermark_settings->>'enabled'))
WHERE watermark_settings->>'enabled' = 'true';
