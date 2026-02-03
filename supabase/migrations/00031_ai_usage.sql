-- =============================================
-- AI Usage Tracking Table
-- =============================================

-- AI 사용량 추적 테이블
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL, -- 'voice_feedback', 'subtitle_generation', 'video_diff', etc.
  tokens_used INTEGER DEFAULT 0, -- API 토큰 사용량 (해당하는 경우)
  cost_usd DECIMAL(10, 6) DEFAULT 0, -- 예상 비용 (USD)
  metadata JSONB DEFAULT '{}', -- 추가 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스 (존재하지 않으면 생성)
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_feature ON ai_usage(user_id, feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_month ON ai_usage(user_id, created_at);

-- RLS 활성화
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- RLS 정책 (존재하지 않으면 생성)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_usage' AND policyname = 'Users can view own AI usage'
  ) THEN
    CREATE POLICY "Users can view own AI usage"
      ON ai_usage FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 사용량 기록은 서버에서만 (service role 사용)
-- INSERT 정책 없음 = 클라이언트에서 직접 삽입 불가
