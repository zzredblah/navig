-- ============================================
-- NAVIG Database Schema - Sprint 13-14
-- ============================================
-- Version: 1.0
-- Created: 2026-01-28
-- Description: 멀티 캔버스(레퍼런스 보드) 기능 스키마

-- ============================================
-- 1. 보드 테이블
-- ============================================

CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT '새 보드',
  description TEXT,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(64) UNIQUE,
  background_color VARCHAR(7) DEFAULT '#FFFFFF',
  grid_enabled BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. 보드 요소 테이블
-- ============================================

CREATE TABLE board_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'image', 'video', 'text', 'shape', 'sticky', 'frame'
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  width FLOAT NOT NULL DEFAULT 200,
  height FLOAT NOT NULL DEFAULT 200,
  rotation FLOAT DEFAULT 0,
  z_index INTEGER DEFAULT 0,
  locked BOOLEAN DEFAULT FALSE,
  content JSONB NOT NULL DEFAULT '{}',
  style JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. 인덱스
-- ============================================

CREATE INDEX idx_boards_project ON boards(project_id);
CREATE INDEX idx_boards_share_token ON boards(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_boards_created_by ON boards(created_by);
CREATE INDEX idx_board_elements_board ON board_elements(board_id);
CREATE INDEX idx_board_elements_type ON board_elements(board_id, type);
CREATE INDEX idx_board_elements_z_index ON board_elements(board_id, z_index);

-- ============================================
-- 4. RLS 활성화
-- ============================================

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_elements ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS 정책 - boards
-- ============================================

-- SELECT: 프로젝트 멤버 또는 공개 보드는 누구나
CREATE POLICY boards_select ON boards FOR SELECT USING (
  is_public = TRUE OR
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = boards.project_id
    AND pm.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = boards.project_id
    AND p.client_id = auth.uid()
  )
);

-- INSERT: 프로젝트 멤버만 (viewer 제외)
CREATE POLICY boards_insert ON boards FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = boards.project_id
    AND pm.user_id = auth.uid()
    AND pm.role IN ('owner', 'approver', 'editor')
  ) OR
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = boards.project_id
    AND p.client_id = auth.uid()
  )
);

-- UPDATE: 프로젝트 멤버만 (viewer 제외)
CREATE POLICY boards_update ON boards FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = boards.project_id
    AND pm.user_id = auth.uid()
    AND pm.role IN ('owner', 'approver', 'editor')
  ) OR
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = boards.project_id
    AND p.client_id = auth.uid()
  )
);

-- DELETE: 생성자 또는 프로젝트 소유자만
CREATE POLICY boards_delete ON boards FOR DELETE USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = boards.project_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'owner'
  ) OR
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = boards.project_id
    AND p.client_id = auth.uid()
  )
);

-- ============================================
-- 6. RLS 정책 - board_elements
-- ============================================

-- SELECT: 보드 접근 가능자
CREATE POLICY board_elements_select ON board_elements FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM boards b
    WHERE b.id = board_elements.board_id
    AND (
      b.is_public = TRUE OR
      EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = b.project_id
        AND pm.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = b.project_id
        AND p.client_id = auth.uid()
      )
    )
  )
);

-- INSERT: 보드 편집 가능자
CREATE POLICY board_elements_insert ON board_elements FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM boards b
    JOIN project_members pm ON pm.project_id = b.project_id
    WHERE b.id = board_elements.board_id
    AND pm.user_id = auth.uid()
    AND pm.role IN ('owner', 'approver', 'editor')
  ) OR
  EXISTS (
    SELECT 1 FROM boards b
    JOIN projects p ON p.id = b.project_id
    WHERE b.id = board_elements.board_id
    AND p.client_id = auth.uid()
  )
);

-- UPDATE: 보드 편집 가능자
CREATE POLICY board_elements_update ON board_elements FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM boards b
    JOIN project_members pm ON pm.project_id = b.project_id
    WHERE b.id = board_elements.board_id
    AND pm.user_id = auth.uid()
    AND pm.role IN ('owner', 'approver', 'editor')
  ) OR
  EXISTS (
    SELECT 1 FROM boards b
    JOIN projects p ON p.id = b.project_id
    WHERE b.id = board_elements.board_id
    AND p.client_id = auth.uid()
  )
);

-- DELETE: 요소 생성자 또는 보드 편집 가능자
CREATE POLICY board_elements_delete ON board_elements FOR DELETE USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM boards b
    JOIN project_members pm ON pm.project_id = b.project_id
    WHERE b.id = board_elements.board_id
    AND pm.user_id = auth.uid()
    AND pm.role IN ('owner', 'approver', 'editor')
  ) OR
  EXISTS (
    SELECT 1 FROM boards b
    JOIN projects p ON p.id = b.project_id
    WHERE b.id = board_elements.board_id
    AND p.client_id = auth.uid()
  )
);

-- ============================================
-- 7. 업데이트 트리거
-- ============================================

CREATE TRIGGER boards_updated_at
  BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER board_elements_updated_at
  BEFORE UPDATE ON board_elements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 8. Realtime 활성화 (선택적)
-- ============================================
-- 실시간 협업이 필요한 경우 활성화
-- ALTER PUBLICATION supabase_realtime ADD TABLE boards;
-- ALTER PUBLICATION supabase_realtime ADD TABLE board_elements;

-- ============================================
-- JSONB 구조 참고
-- ============================================
/*
content JSONB 구조:

-- image/video
{
  "url": "https://...",
  "thumbnail_url": "https://...",
  "original_filename": "image.png"
}

-- text/sticky
{
  "text": "메모 내용"
}

-- shape
{
  "shape_type": "rectangle" | "circle" | "triangle" | "arrow"
}

-- frame
{
  "children": ["element-uuid-1", "element-uuid-2"]
}

style JSONB 구조:
{
  "background_color": "#FFFFFF",
  "border_color": "#000000",
  "border_width": 1,
  "border_radius": 8,
  "font_size": 14,
  "font_weight": "normal",
  "text_align": "left" | "center" | "right",
  "text_color": "#000000",
  "opacity": 1,
  "shadow": false
}
*/
