-- ============================================
-- 채팅 메시지 개인 삭제 기능
-- "나에게만 삭제" 기능 지원
-- ============================================

-- 1. 사용자별 메시지 삭제 기록 테이블
-- 사용자가 "나에게만 삭제"한 메시지를 기록
CREATE TABLE chat_message_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),

  -- 같은 메시지를 같은 사용자가 중복 삭제 방지
  CONSTRAINT unique_message_deletion UNIQUE (message_id, user_id)
);

-- 2. 사용자별 채팅방 대화 전체 삭제 시간 기록
-- 이 시간 이전의 메시지는 해당 사용자에게 표시되지 않음
ALTER TABLE chat_room_members
ADD COLUMN cleared_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN chat_room_members.cleared_at IS '대화 내용 전체 삭제 시간 (이 시간 이전 메시지는 표시 안 함)';

-- 3. 인덱스
CREATE INDEX idx_chat_message_deletions_user ON chat_message_deletions(user_id);
CREATE INDEX idx_chat_message_deletions_message ON chat_message_deletions(message_id);

-- 4. RLS 정책
ALTER TABLE chat_message_deletions ENABLE ROW LEVEL SECURITY;

-- 조회: 본인 삭제 기록만
CREATE POLICY "chat_message_deletions_select" ON chat_message_deletions
  FOR SELECT
  USING (user_id = auth.uid());

-- 삽입: 본인만
CREATE POLICY "chat_message_deletions_insert" ON chat_message_deletions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 삭제: 본인만 (복구 기능용)
CREATE POLICY "chat_message_deletions_delete" ON chat_message_deletions
  FOR DELETE
  USING (user_id = auth.uid());

-- 5. 코멘트
COMMENT ON TABLE chat_message_deletions IS '사용자별 메시지 삭제 기록 (나에게만 삭제)';
