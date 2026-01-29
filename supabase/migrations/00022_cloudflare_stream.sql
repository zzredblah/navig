-- 00022_cloudflare_stream.sql
-- Cloudflare Stream 통합을 위한 스키마 변경
-- Sprint 17-18: 영상 처리 고도화

-- ============================================
-- 1. video_versions 테이블에 Stream 관련 컬럼 추가
-- ============================================

-- Stream 영상 ID (uid)
ALTER TABLE video_versions
ADD COLUMN IF NOT EXISTS stream_video_id VARCHAR(100);

-- Stream 준비 상태
ALTER TABLE video_versions
ADD COLUMN IF NOT EXISTS stream_ready BOOLEAN DEFAULT false;

-- HLS 스트리밍 URL (캐시용)
ALTER TABLE video_versions
ADD COLUMN IF NOT EXISTS hls_url VARCHAR(500);

-- 다운로드 URL (워터마크 포함)
ALTER TABLE video_versions
ADD COLUMN IF NOT EXISTS download_url VARCHAR(500);

-- 코멘트 추가
COMMENT ON COLUMN video_versions.stream_video_id IS 'Cloudflare Stream 영상 UID';
COMMENT ON COLUMN video_versions.stream_ready IS 'Stream 인코딩 완료 여부';
COMMENT ON COLUMN video_versions.hls_url IS 'HLS 스트리밍 URL (적응형 비트레이트)';
COMMENT ON COLUMN video_versions.download_url IS '워터마크 포함 다운로드 URL';

-- Stream 영상 ID 인덱스
CREATE INDEX IF NOT EXISTS idx_video_versions_stream_id
ON video_versions(stream_video_id)
WHERE stream_video_id IS NOT NULL;

-- ============================================
-- 2. projects 테이블에 워터마크 프로필 ID 추가
-- ============================================

-- Stream 워터마크 프로필 ID
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS stream_watermark_profile_id VARCHAR(100);

COMMENT ON COLUMN projects.stream_watermark_profile_id IS 'Cloudflare Stream 워터마크 프로필 UID';

-- ============================================
-- 3. video_status ENUM에 'encoding' 상태 추가
-- ============================================

-- PostgreSQL에서 ENUM에 값 추가
DO $$
BEGIN
  -- 'encoding' 값이 없으면 추가
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'encoding'
    AND enumtypid = 'video_status'::regtype
  ) THEN
    ALTER TYPE video_status ADD VALUE IF NOT EXISTS 'encoding' AFTER 'uploading';
  END IF;
END
$$;

-- ============================================
-- 4. Stream 상태 업데이트 함수
-- ============================================

-- Stream 영상이 준비되면 상태 업데이트
CREATE OR REPLACE FUNCTION update_video_stream_ready()
RETURNS TRIGGER AS $$
BEGIN
  -- stream_ready가 true로 변경되면 status도 'ready'로 변경
  IF NEW.stream_ready = true AND OLD.stream_ready = false THEN
    NEW.status = 'ready';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (이미 존재하면 대체)
DROP TRIGGER IF EXISTS video_stream_ready_trigger ON video_versions;
CREATE TRIGGER video_stream_ready_trigger
BEFORE UPDATE ON video_versions
FOR EACH ROW
WHEN (NEW.stream_ready IS DISTINCT FROM OLD.stream_ready)
EXECUTE FUNCTION update_video_stream_ready();

-- ============================================
-- 5. 기존 video_versions 마이그레이션 노트
-- ============================================

-- 기존 R2에 저장된 영상은 그대로 유지됩니다.
-- stream_video_id가 NULL인 영상은 기존 file_url을 사용합니다.
-- 새로 업로드되는 영상만 Stream을 통해 처리됩니다.

-- 기존 영상을 Stream으로 마이그레이션하려면:
-- 1. uploadFromUrl() 함수로 R2 URL을 Stream에 업로드
-- 2. stream_video_id, hls_url 등을 업데이트
-- 3. 선택적으로 R2 원본 삭제
