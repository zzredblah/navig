-- ============================================
-- 채팅 시스템 RLS 정책 수정
-- 무한 재귀 문제 해결 + INSERT 정책 추가
-- ============================================

-- 1. 채팅방 INSERT 정책: 인증된 사용자
DROP POLICY IF EXISTS "chat_rooms_insert" ON chat_rooms;
CREATE POLICY "chat_rooms_insert" ON chat_rooms
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. 채팅방 멤버 정책 수정 (무한 재귀 해결)
-- 기존 자기참조 정책 삭제
DROP POLICY IF EXISTS "chat_room_members_select" ON chat_room_members;
DROP POLICY IF EXISTS "chat_room_members_insert" ON chat_room_members;
DROP POLICY IF EXISTS "chat_room_members_update" ON chat_room_members;

-- SELECT: 본인이 속한 멤버십만 조회 가능
CREATE POLICY "chat_room_members_select" ON chat_room_members
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: 인증된 사용자
CREATE POLICY "chat_room_members_insert" ON chat_room_members
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: 본인 멤버십만 수정 가능
CREATE POLICY "chat_room_members_update" ON chat_room_members
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
