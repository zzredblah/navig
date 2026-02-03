-- 외부 서비스 연동 테이블
-- Google Drive, Dropbox 등 외부 서비스 OAuth 토큰 저장

CREATE TABLE external_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'google_drive', 'dropbox', 'notion', etc.
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  provider_user_id TEXT,
  provider_email TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_provider UNIQUE (user_id, provider)
);

-- 인덱스
CREATE INDEX idx_external_integrations_user_id ON external_integrations(user_id);
CREATE INDEX idx_external_integrations_provider ON external_integrations(provider);

-- RLS 활성화
ALTER TABLE external_integrations ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 데이터만 조회/수정/삭제 가능
CREATE POLICY "Users can view their own integrations"
  ON external_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own integrations"
  ON external_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
  ON external_integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations"
  ON external_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_external_integrations_updated_at
  BEFORE UPDATE ON external_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
