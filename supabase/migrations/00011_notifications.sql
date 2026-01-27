-- 00011_notifications.sql
-- 알림 시스템 스키마

-- 알림 테이블
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  link VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 알림 유형 enum (참조용 주석)
-- type 값들:
-- 'new_feedback' - 새 피드백 등록
-- 'urgent_feedback' - 긴급 피드백 등록
-- 'feedback_status' - 피드백 상태 변경
-- 'feedback_reply' - 피드백 답글
-- 'new_version' - 새 영상 버전 업로드
-- 'document_status' - 문서 상태 변경
-- 'project_invite' - 프로젝트 초대
-- 'deadline_reminder' - 마감 알림
-- 'chat_message' - 새 채팅 메시지

-- 알림 설정 테이블
CREATE TABLE notification_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email_new_feedback BOOLEAN DEFAULT TRUE,
  email_urgent_feedback BOOLEAN DEFAULT TRUE,
  email_version_upload BOOLEAN DEFAULT TRUE,
  email_document_status BOOLEAN DEFAULT TRUE,
  email_deadline_reminder BOOLEAN DEFAULT TRUE,
  email_chat_message BOOLEAN DEFAULT FALSE,
  inapp_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- RLS 활성화
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS 정책: notifications
-- 자신의 알림만 조회 가능
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- 자신의 알림만 수정 가능 (읽음 처리)
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 자신의 알림만 삭제 가능
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- 서비스 역할만 알림 생성 가능 (API에서 admin client 사용)
CREATE POLICY "Service role can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- RLS 정책: notification_settings
-- 자신의 설정만 조회/수정 가능
CREATE POLICY "Users can view their own settings"
  ON notification_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON notification_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON notification_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_updated_at();

-- 새 사용자 가입 시 기본 알림 설정 생성
CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_notification_settings
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_settings();

-- Supabase Realtime 활성화 (실시간 알림 수신용)
-- 이 테이블에 INSERT/UPDATE/DELETE 이벤트를 실시간으로 구독할 수 있게 함
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
