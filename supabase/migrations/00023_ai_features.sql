-- 00023_ai_features.sql
-- AI 기능 및 알림 다이제스트 스키마

-- AI 사용량 테이블
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature VARCHAR(100) NOT NULL, -- 'voice_feedback', 'template_recommend', 'feedback_summary'
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_ai_usage_user_date ON ai_usage(user_id, created_at);
CREATE INDEX idx_ai_usage_feature ON ai_usage(feature);

-- RLS 활성화
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Users can view their own ai usage"
  ON ai_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert ai usage"
  ON ai_usage
  FOR INSERT
  WITH CHECK (true);

-- 알림 설정에 다이제스트 관련 컬럼 추가
ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS digest_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS digest_time TIME DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS digest_timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
  ADD COLUMN IF NOT EXISTS digest_last_sent_at TIMESTAMPTZ;

-- 다이제스트 발송 기록 테이블
CREATE TABLE digest_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  item_count INTEGER DEFAULT 0,
  email_id TEXT, -- 이메일 서비스의 ID (Resend 등)
  status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'failed', 'skipped'
  error_message TEXT
);

-- 인덱스
CREATE INDEX idx_digest_logs_user_sent ON digest_logs(user_id, sent_at);

-- RLS 활성화
ALTER TABLE digest_logs ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Users can view their own digest logs"
  ON digest_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage digest logs"
  ON digest_logs
  FOR ALL
  WITH CHECK (true);
