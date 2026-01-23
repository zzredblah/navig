-- ============================================
-- NAVIG Database Schema - Sprint 3-4
-- ============================================
-- Version: 1.0
-- Created: 2025-01-23
-- Description: 문서 관리 시스템 스키마 (템플릿, 문서, 버전, 서명)

-- ============================================
-- 1. Enums
-- ============================================

-- 문서 템플릿 유형
CREATE TYPE document_type AS ENUM ('request', 'estimate', 'contract');

-- 문서 상태
CREATE TYPE document_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'signed');

-- ============================================
-- 2. Tables
-- ============================================

-- 문서 템플릿
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type document_type NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 문서
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
  type document_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  status document_status NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  file_url VARCHAR(500),
  reject_reason TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 문서 버전 히스토리
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 전자서명
CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL,
  ip_address VARCHAR(50),
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. Indexes
-- ============================================

-- document_templates
CREATE INDEX idx_document_templates_type ON document_templates(type);
CREATE INDEX idx_document_templates_is_default ON document_templates(is_default);
CREATE INDEX idx_document_templates_created_by ON document_templates(created_by);

-- documents
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_template_id ON documents(template_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- document_versions
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_version ON document_versions(document_id, version);

-- signatures
CREATE INDEX idx_signatures_document_id ON signatures(document_id);
CREATE INDEX idx_signatures_user_id ON signatures(user_id);

-- ============================================
-- 4. Triggers
-- ============================================

CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 5. RLS Policies
-- ============================================

ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

-- document_templates: 모든 인증 사용자 조회 가능, admin만 생성/수정/삭제
CREATE POLICY "document_templates_select"
  ON document_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "document_templates_insert"
  ON document_templates FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "document_templates_update"
  ON document_templates FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "document_templates_delete"
  ON document_templates FOR DELETE
  TO authenticated
  USING (is_admin());

-- documents: 프로젝트 멤버만 접근 가능
CREATE POLICY "documents_select"
  ON documents FOR SELECT
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "documents_insert"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "documents_update"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    has_project_access(project_id)
    AND (created_by = auth.uid() OR is_admin())
  );

CREATE POLICY "documents_delete"
  ON documents FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR is_project_owner(project_id) OR is_admin()
  );

-- document_versions: 프로젝트 멤버만 접근 가능
CREATE POLICY "document_versions_select"
  ON document_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_versions.document_id
      AND has_project_access(d.project_id)
    )
  );

CREATE POLICY "document_versions_insert"
  ON document_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_versions.document_id
      AND has_project_access(d.project_id)
    )
  );

-- signatures: 프로젝트 멤버만 조회, 본인만 생성
CREATE POLICY "signatures_select"
  ON signatures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = signatures.document_id
      AND has_project_access(d.project_id)
    )
  );

CREATE POLICY "signatures_insert"
  ON signatures FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 6. Default Templates
-- ============================================

INSERT INTO document_templates (type, name, description, fields, is_default) VALUES
(
  'request',
  '기본 작업 요청서',
  '영상 편집 작업 요청을 위한 기본 템플릿',
  '[
    {"name": "project_name", "label": "프로젝트명", "type": "text", "required": true},
    {"name": "work_scope", "label": "작업 범위", "type": "textarea", "required": true},
    {"name": "deadline", "label": "납품 기한", "type": "date", "required": true},
    {"name": "video_length", "label": "영상 길이(분)", "type": "number", "required": false},
    {"name": "resolution", "label": "해상도", "type": "select", "options": ["1080p", "4K"], "required": true},
    {"name": "reference_url", "label": "레퍼런스 URL", "type": "text", "required": false},
    {"name": "notes", "label": "비고", "type": "textarea", "required": false}
  ]'::jsonb,
  true
),
(
  'estimate',
  '기본 견적서',
  '영상 제작 견적서 기본 템플릿',
  '[
    {"name": "project_name", "label": "프로젝트명", "type": "text", "required": true},
    {"name": "work_scope", "label": "작업 내용", "type": "textarea", "required": true},
    {"name": "deadline", "label": "납품 기한", "type": "date", "required": true},
    {"name": "total_amount", "label": "총 금액(원)", "type": "number", "required": true},
    {"name": "payment_terms", "label": "결제 조건", "type": "select", "options": ["선불 100%", "착수 50% + 완료 50%", "완료 후 100%"], "required": true},
    {"name": "revision_count", "label": "수정 횟수", "type": "number", "required": true},
    {"name": "notes", "label": "비고", "type": "textarea", "required": false}
  ]'::jsonb,
  true
),
(
  'contract',
  '기본 계약서',
  '영상 제작 계약서 기본 템플릿',
  '[
    {"name": "project_name", "label": "프로젝트명", "type": "text", "required": true},
    {"name": "work_scope", "label": "작업 범위/내용", "type": "textarea", "required": true},
    {"name": "deadline", "label": "납품 기한", "type": "date", "required": true},
    {"name": "total_amount", "label": "계약 금액(원)", "type": "number", "required": true},
    {"name": "payment_terms", "label": "결제 조건", "type": "select", "options": ["선불 100%", "착수 50% + 완료 50%", "완료 후 100%"], "required": true},
    {"name": "revision_count", "label": "수정 횟수", "type": "number", "required": true},
    {"name": "copyright", "label": "저작권 조항", "type": "textarea", "required": true},
    {"name": "client_name", "label": "의뢰인 성명/회사명", "type": "text", "required": true},
    {"name": "worker_name", "label": "작업자 성명/회사명", "type": "text", "required": true},
    {"name": "notes", "label": "특약 사항", "type": "textarea", "required": false}
  ]'::jsonb,
  true
);

-- ============================================
-- 7. Unique Constraints
-- ============================================

-- 동일 문서 내 버전 중복 방지
ALTER TABLE document_versions ADD CONSTRAINT uq_document_versions_doc_version UNIQUE (document_id, version);

-- 동일 문서에 동일 사용자 중복 서명 방지
ALTER TABLE signatures ADD CONSTRAINT uq_signatures_doc_user UNIQUE (document_id, user_id);

-- ============================================
-- 8. Comments
-- ============================================

COMMENT ON TABLE document_templates IS '문서 템플릿';
COMMENT ON TABLE documents IS '문서 (요청서, 견적서, 계약서)';
COMMENT ON TABLE document_versions IS '문서 버전 히스토리';
COMMENT ON TABLE signatures IS '전자서명';

COMMENT ON COLUMN documents.status IS '문서 상태: draft(작성중), pending(검토대기), approved(승인), rejected(반려), signed(서명완료)';
COMMENT ON COLUMN documents.content IS '문서 내용 (JSONB 형태, 템플릿 필드 값 저장)';
COMMENT ON COLUMN signatures.signature_data IS '서명 이미지 (base64 인코딩)';
