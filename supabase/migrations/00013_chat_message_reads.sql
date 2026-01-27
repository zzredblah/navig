-- ============================================
-- 채팅 메시지 읽음 확인 시스템
-- KakaoTalk 스타일: 메시지별 읽지 않은 사람 수 표시
-- ============================================

-- 1. 메시지 읽음 상태 테이블
CREATE TABLE chat_message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),

  -- 같은 메시지를 같은 사용자가 중복 읽음 처리 방지
  CONSTRAINT unique_message_read UNIQUE (message_id, user_id)
);

-- 2. 인덱스 생성
-- 메시지별 읽은 사용자 조회
CREATE INDEX idx_chat_message_reads_message ON chat_message_reads(message_id);

-- 사용자별 읽은 메시지 조회
CREATE INDEX idx_chat_message_reads_user ON chat_message_reads(user_id);

-- 메시지 + 사용자 복합 인덱스 (빠른 존재 여부 확인)
CREATE INDEX idx_chat_message_reads_message_user ON chat_message_reads(message_id, user_id);

-- 3. RLS 정책 설정
ALTER TABLE chat_message_reads ENABLE ROW LEVEL SECURITY;

-- 읽음 상태 조회: 채팅방 멤버만
CREATE POLICY "chat_message_reads_select" ON chat_message_reads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_room_members crm ON crm.room_id = cm.room_id
      WHERE cm.id = message_id AND crm.user_id = auth.uid()
    )
  );

-- 읽음 상태 추가: 본인만 (채팅방 멤버여야 함)
CREATE POLICY "chat_message_reads_insert" ON chat_message_reads
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_room_members crm ON crm.room_id = cm.room_id
      WHERE cm.id = message_id AND crm.user_id = auth.uid()
    )
  );

-- 읽음 상태 삭제: 본인만
CREATE POLICY "chat_message_reads_delete" ON chat_message_reads
  FOR DELETE
  USING (user_id = auth.uid());

-- 4. 코멘트 추가
COMMENT ON TABLE chat_message_reads IS '채팅 메시지 읽음 상태 테이블 (KakaoTalk 스타일)';
COMMENT ON COLUMN chat_message_reads.message_id IS '읽은 메시지 ID';
COMMENT ON COLUMN chat_message_reads.user_id IS '읽은 사용자 ID';
COMMENT ON COLUMN chat_message_reads.read_at IS '읽은 시간';

-- 5. Supabase Realtime 활성화 (실시간 읽음 상태 업데이트)
ALTER PUBLICATION supabase_realtime ADD TABLE chat_message_reads;

