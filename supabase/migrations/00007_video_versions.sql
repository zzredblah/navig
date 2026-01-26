-- ============================================
-- 영상 버전 관리 시스템
-- Sprint 5-6: 영상 버전 관리
-- ============================================

-- 0. 필요한 헬퍼 함수 생성 (없으면 생성)

-- 프로젝트 멤버 확인 함수
CREATE OR REPLACE FUNCTION is_project_member(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = project_uuid
    AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid
    AND client_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 프로젝트 관리자(소유자) 확인 함수
CREATE OR REPLACE FUNCTION is_project_admin(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid
    AND client_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = project_uuid
    AND user_id = auth.uid()
    AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 1. 영상 상태 ENUM 생성
CREATE TYPE video_status AS ENUM ('uploading', 'processing', 'ready', 'error');

-- 2. video_versions 테이블 생성
CREATE TABLE video_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  version_name VARCHAR(100),
  original_filename VARCHAR(255) NOT NULL,
  file_url VARCHAR(500),
  file_key VARCHAR(500), -- R2 스토리지 키 (삭제 시 사용)
  thumbnail_url VARCHAR(500),
  thumbnail_key VARCHAR(500), -- R2 스토리지 키
  duration INTEGER, -- 초 단위
  resolution VARCHAR(20), -- 예: "1920x1080"
  file_size BIGINT NOT NULL, -- bytes
  codec VARCHAR(50),
  change_notes TEXT NOT NULL,
  status video_status DEFAULT 'uploading',
  -- 멀티파트 업로드 정보 (업로드 완료 전까지 저장)
  upload_id VARCHAR(500), -- R2 멀티파트 업로드 ID (길이가 길 수 있음)
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 프로젝트 내에서 버전 번호 유일성 보장
  CONSTRAINT unique_project_version UNIQUE (project_id, version_number)
);

-- 3. 자동 버전 번호 증가 트리거
CREATE OR REPLACE FUNCTION increment_video_version()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO NEW.version_number
  FROM video_versions
  WHERE project_id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_video_version
BEFORE INSERT ON video_versions
FOR EACH ROW EXECUTE FUNCTION increment_video_version();

-- 4. updated_at 자동 갱신 트리거
CREATE TRIGGER video_versions_updated_at
BEFORE UPDATE ON video_versions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. 인덱스 생성
-- 프로젝트별 버전 조회 (최신순)
CREATE INDEX idx_video_versions_project ON video_versions(project_id, version_number DESC);

-- 상태별 조회
CREATE INDEX idx_video_versions_status ON video_versions(status);

-- 업로더별 조회
CREATE INDEX idx_video_versions_uploader ON video_versions(uploaded_by);

-- 생성일 기준 정렬
CREATE INDEX idx_video_versions_created ON video_versions(created_at DESC);

-- 6. RLS 정책 설정
ALTER TABLE video_versions ENABLE ROW LEVEL SECURITY;

-- 조회: 프로젝트 멤버만 조회 가능
CREATE POLICY "video_versions_select" ON video_versions
  FOR SELECT
  USING (is_project_member(project_id));

-- 삽입: 프로젝트 멤버만 추가 가능
CREATE POLICY "video_versions_insert" ON video_versions
  FOR INSERT
  WITH CHECK (is_project_member(project_id));

-- 수정: 업로더 본인 또는 프로젝트 관리자만 수정 가능
CREATE POLICY "video_versions_update" ON video_versions
  FOR UPDATE
  USING (uploaded_by = auth.uid() OR is_project_admin(project_id))
  WITH CHECK (uploaded_by = auth.uid() OR is_project_admin(project_id));

-- 삭제: 업로더 본인 또는 프로젝트 관리자만 삭제 가능
CREATE POLICY "video_versions_delete" ON video_versions
  FOR DELETE
  USING (uploaded_by = auth.uid() OR is_project_admin(project_id));

-- 7. 프로젝트 테이블에 최신 영상 버전 참조 컬럼 추가 (선택적)
-- 대시보드에서 빠르게 최신 영상을 표시하기 위함
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS latest_video_id UUID REFERENCES video_versions(id) ON DELETE SET NULL;

-- 8. 최신 영상 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_project_latest_video()
RETURNS TRIGGER AS $$
BEGIN
  -- 영상이 'ready' 상태가 되면 프로젝트의 latest_video_id 업데이트
  IF NEW.status = 'ready' THEN
    UPDATE projects
    SET latest_video_id = NEW.id
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_latest_video_on_ready
AFTER UPDATE ON video_versions
FOR EACH ROW
WHEN (OLD.status <> 'ready' AND NEW.status = 'ready')
EXECUTE FUNCTION update_project_latest_video();

-- 9. 영상 삭제 시 최신 영상 재계산 트리거
CREATE OR REPLACE FUNCTION recalculate_latest_video()
RETURNS TRIGGER AS $$
BEGIN
  -- 삭제된 영상이 최신 영상이었으면 재계산
  IF EXISTS (
    SELECT 1 FROM projects
    WHERE id = OLD.project_id AND latest_video_id = OLD.id
  ) THEN
    UPDATE projects
    SET latest_video_id = (
      SELECT id FROM video_versions
      WHERE project_id = OLD.project_id AND status = 'ready'
      ORDER BY version_number DESC
      LIMIT 1
    )
    WHERE id = OLD.project_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_latest_video_on_delete
AFTER DELETE ON video_versions
FOR EACH ROW EXECUTE FUNCTION recalculate_latest_video();

-- 10. 코멘트 추가
COMMENT ON TABLE video_versions IS '영상 버전 관리 테이블 - 프로젝트별 영상 버전 이력을 관리합니다.';
COMMENT ON COLUMN video_versions.version_number IS '버전 번호 (프로젝트 내에서 자동 증가)';
COMMENT ON COLUMN video_versions.version_name IS '버전 이름 (예: "최종본", "수정 v2")';
COMMENT ON COLUMN video_versions.file_key IS 'R2 스토리지 키 (파일 삭제 시 사용)';
COMMENT ON COLUMN video_versions.change_notes IS '변경 사항 설명 (필수)';
COMMENT ON COLUMN video_versions.upload_id IS 'R2 멀티파트 업로드 ID (업로드 완료 전까지 저장)';
