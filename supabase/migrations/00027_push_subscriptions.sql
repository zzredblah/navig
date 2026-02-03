-- =============================================
-- Push Subscriptions for PWA
-- =============================================

-- Push 구독 정보 테이블
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,  -- Public key
  auth TEXT NOT NULL,     -- Auth secret
  device_name TEXT,       -- Device/Browser info
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,

  -- 같은 사용자의 같은 endpoint는 하나만 허용
  UNIQUE(user_id, endpoint)
);

-- Push 알림 로그 테이블 (발송 기록)
CREATE TABLE push_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'feedback', 'chat', 'project', 'system'
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'clicked'
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 사용자별 Push 알림 설정
CREATE TABLE push_notification_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  -- 알림 유형별 설정
  feedback_enabled BOOLEAN NOT NULL DEFAULT true,
  chat_enabled BOOLEAN NOT NULL DEFAULT true,
  project_enabled BOOLEAN NOT NULL DEFAULT true,
  system_enabled BOOLEAN NOT NULL DEFAULT true,
  -- 방해 금지 시간대 (선택적)
  quiet_hours_start TIME,  -- e.g., '22:00'
  quiet_hours_end TIME,    -- e.g., '08:00'
  timezone TEXT DEFAULT 'Asia/Seoul',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_push_notification_logs_user ON push_notification_logs(user_id);
CREATE INDEX idx_push_notification_logs_created ON push_notification_logs(created_at);
CREATE INDEX idx_push_notification_logs_status ON push_notification_logs(status);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_notification_settings_updated_at
  BEFORE UPDATE ON push_notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS 정책: push_subscriptions
CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS 정책: push_notification_logs
CREATE POLICY "Users can view own notification logs"
  ON push_notification_logs FOR SELECT
  USING (auth.uid() = user_id);

-- RLS 정책: push_notification_settings
CREATE POLICY "Users can view own notification settings"
  ON push_notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON push_notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON push_notification_settings FOR UPDATE
  USING (auth.uid() = user_id);
