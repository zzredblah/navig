-- ============================================
-- 문서 소프트 삭제 (Soft Delete) 마이그레이션
-- ============================================

-- deleted_at 컬럼 추가
ALTER TABLE documents ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 삭제된 문서 인덱스
CREATE INDEX idx_documents_deleted_at ON documents(deleted_at);

-- 기존 정책은 admin client를 사용하므로 RLS 변경 불필요
-- (API에서 deleted_at IS NULL 조건으로 필터링)

COMMENT ON COLUMN documents.deleted_at IS '소프트 삭제 시각 (NULL이면 미삭제)';
