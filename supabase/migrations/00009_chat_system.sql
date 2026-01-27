-- ============================================
-- 채팅 시스템
-- 프로젝트 채팅 + 1:1 DM 지원
-- ============================================

-- 1. 채팅방 유형 ENUM
CREATE TYPE chat_room_type AS ENUM ('project', 'direct');

-- 2. 채팅방 테이블
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 채팅방 유형
  type chat_room_type NOT NULL,

  -- 프로젝트 채팅방인 경우 프로젝트 ID
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- 채팅방 이름 (DM은 NULL, 프로젝트는 프로젝트명 사용)
  name VARCHAR(100),

  -- 마지막 메시지 (목록 표시용 캐시)
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 프로젝트 채팅방은 프로젝트당 하나만
  CONSTRAINT unique_project_chat UNIQUE (project_id)
);

-- 3. 채팅방 멤버 테이블
CREATE TABLE chat_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 마지막으로 읽은 시간
  last_read_at TIMESTAMPTZ DEFAULT NOW(),

  -- 알림 설정
  notifications_enabled BOOLEAN DEFAULT TRUE,

  joined_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_room_member UNIQUE (room_id, user_id)
);

-- 4. 메시지 테이블
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),

  -- 메시지 내용
  content TEXT NOT NULL,

  -- 답장 대상 메시지
  reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,

  -- 멘션된 사용자 (UUID 배열)
  mentions UUID[] DEFAULT '{}',

  -- 첨부 파일 (JSON 배열)
  -- [{type: 'image'|'video'|'document', url: string, name: string, size: number}]
  attachments JSONB DEFAULT '[]',

  -- 수정/삭제 상태
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 메시지 리액션 테이블
CREATE TABLE chat_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 이모지 (유니코드)
  emoji VARCHAR(10) NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 같은 메시지에 같은 사용자가 같은 이모지 하나만
  CONSTRAINT unique_message_reaction UNIQUE (message_id, user_id, emoji)
);

-- 6. 인덱스 생성
-- 채팅방 목록 (최근 메시지 순)
CREATE INDEX idx_chat_rooms_last_message ON chat_rooms(last_message_at DESC NULLS LAST);

-- 프로젝트별 채팅방 조회
CREATE INDEX idx_chat_rooms_project ON chat_rooms(project_id) WHERE project_id IS NOT NULL;

-- 사용자별 채팅방 목록
CREATE INDEX idx_chat_room_members_user ON chat_room_members(user_id, last_read_at DESC);

-- 채팅방별 메시지 (최신순)
CREATE INDEX idx_chat_messages_room ON chat_messages(room_id, created_at DESC);

-- 답장 조회
CREATE INDEX idx_chat_messages_reply ON chat_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- 멘션 검색 (GIN 인덱스)
CREATE INDEX idx_chat_messages_mentions ON chat_messages USING GIN (mentions);

-- 리액션 조회
CREATE INDEX idx_chat_reactions_message ON chat_message_reactions(message_id);

-- 7. updated_at 자동 갱신 트리거
CREATE TRIGGER chat_rooms_updated_at
BEFORE UPDATE ON chat_rooms
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER chat_messages_updated_at
BEFORE UPDATE ON chat_messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 8. 메시지 생성 시 채팅방 last_message 업데이트 트리거
CREATE OR REPLACE FUNCTION update_chat_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms
  SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100)
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_message_update_room
AFTER INSERT ON chat_messages
FOR EACH ROW EXECUTE FUNCTION update_chat_room_last_message();

-- 9. RLS 정책 설정
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- 채팅방 조회: 멤버만 조회 가능
CREATE POLICY "chat_rooms_select" ON chat_rooms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_room_members
      WHERE room_id = id AND user_id = auth.uid()
    )
  );

-- 채팅방 멤버 조회: 같은 채팅방 멤버만
CREATE POLICY "chat_room_members_select" ON chat_room_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_room_members crm
      WHERE crm.room_id = room_id AND crm.user_id = auth.uid()
    )
  );

-- 채팅방 멤버 수정 (last_read_at 업데이트): 본인만
CREATE POLICY "chat_room_members_update" ON chat_room_members
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 메시지 조회: 채팅방 멤버만
CREATE POLICY "chat_messages_select" ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_room_members
      WHERE room_id = chat_messages.room_id AND user_id = auth.uid()
    )
  );

-- 메시지 작성: 채팅방 멤버만
CREATE POLICY "chat_messages_insert" ON chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_room_members
      WHERE room_id = chat_messages.room_id AND user_id = auth.uid()
    )
  );

-- 메시지 수정: 본인 메시지만
CREATE POLICY "chat_messages_update" ON chat_messages
  FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- 메시지 삭제: 본인 메시지만
CREATE POLICY "chat_messages_delete" ON chat_messages
  FOR DELETE
  USING (sender_id = auth.uid());

-- 리액션 조회: 채팅방 멤버만
CREATE POLICY "chat_reactions_select" ON chat_message_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_room_members crm ON crm.room_id = cm.room_id
      WHERE cm.id = message_id AND crm.user_id = auth.uid()
    )
  );

-- 리액션 추가: 채팅방 멤버만
CREATE POLICY "chat_reactions_insert" ON chat_message_reactions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_room_members crm ON crm.room_id = cm.room_id
      WHERE cm.id = message_id AND crm.user_id = auth.uid()
    )
  );

-- 리액션 삭제: 본인 리액션만
CREATE POLICY "chat_reactions_delete" ON chat_message_reactions
  FOR DELETE
  USING (user_id = auth.uid());

-- 10. 코멘트 추가
COMMENT ON TABLE chat_rooms IS '채팅방 테이블 (프로젝트 채팅 + DM)';
COMMENT ON COLUMN chat_rooms.type IS '채팅방 유형: project (프로젝트), direct (1:1 DM)';
COMMENT ON COLUMN chat_rooms.project_id IS '프로젝트 채팅방인 경우 연결된 프로젝트 ID';

COMMENT ON TABLE chat_room_members IS '채팅방 멤버 테이블';
COMMENT ON COLUMN chat_room_members.last_read_at IS '마지막으로 읽은 시간 (읽지 않은 메시지 계산용)';

COMMENT ON TABLE chat_messages IS '채팅 메시지 테이블';
COMMENT ON COLUMN chat_messages.mentions IS '멘션된 사용자 UUID 배열';
COMMENT ON COLUMN chat_messages.attachments IS '첨부 파일 JSON 배열';

COMMENT ON TABLE chat_message_reactions IS '메시지 이모지 리액션 테이블';

-- 11. Supabase Realtime 활성화 (실시간 채팅용)
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_room_members;
