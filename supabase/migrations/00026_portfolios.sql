-- updated_at 자동 갱신 함수 (없으면 생성)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 포트폴리오 테이블
CREATE TABLE portfolios (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  slug VARCHAR(100) UNIQUE,
  display_name VARCHAR(100),
  bio TEXT,
  skills TEXT[] DEFAULT '{}',
  website_url TEXT,
  contact_email TEXT,
  social_links JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  theme VARCHAR(50) DEFAULT 'default',
  custom_css TEXT,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 포트폴리오 작품 테이블
CREATE TABLE portfolio_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES portfolios(user_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  thumbnail_url TEXT,
  video_url TEXT,
  external_url TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_portfolios_slug ON portfolios(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_portfolios_is_public ON portfolios(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_portfolio_works_user ON portfolio_works(user_id, order_index);
CREATE INDEX idx_portfolio_works_featured ON portfolio_works(user_id, is_featured) WHERE is_featured = TRUE;

-- RLS 활성화
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_works ENABLE ROW LEVEL SECURITY;

-- 포트폴리오 RLS 정책
-- 공개 포트폴리오는 누구나 조회 가능
CREATE POLICY "Public portfolios are viewable by everyone"
  ON portfolios FOR SELECT
  USING (is_public = TRUE);

-- 본인 포트폴리오는 항상 조회/수정 가능
CREATE POLICY "Users can view own portfolio"
  ON portfolios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolio"
  ON portfolios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio"
  ON portfolios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolio"
  ON portfolios FOR DELETE
  USING (auth.uid() = user_id);

-- 포트폴리오 작품 RLS 정책
-- 공개 포트폴리오의 공개 작품은 누구나 조회 가능
CREATE POLICY "Public works are viewable by everyone"
  ON portfolio_works FOR SELECT
  USING (
    is_public = TRUE AND
    EXISTS (
      SELECT 1 FROM portfolios p
      WHERE p.user_id = portfolio_works.user_id AND p.is_public = TRUE
    )
  );

-- 본인 작품은 항상 조회/수정 가능
CREATE POLICY "Users can view own works"
  ON portfolio_works FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own works"
  ON portfolio_works FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own works"
  ON portfolio_works FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own works"
  ON portfolio_works FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at 트리거
CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON portfolios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_works_updated_at
  BEFORE UPDATE ON portfolio_works
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
