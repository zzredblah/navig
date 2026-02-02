-- 00025_community.sql
-- Q&A 커뮤니티 게시판

-- 1. 태그 테이블
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(20) DEFAULT 'gray',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 태그 삽입
INSERT INTO tags (name, description, color) VALUES
  ('편집', '영상 편집 관련 질문', 'blue'),
  ('피드백', '피드백 관련 질문', 'orange'),
  ('협업', '협업 및 팀 관리', 'green'),
  ('기능요청', '새 기능 요청', 'purple'),
  ('버그', '버그 리포트', 'red'),
  ('팁', '유용한 팁 공유', 'primary'),
  ('기타', '기타 질문', 'gray');

-- 2. 게시글 테이블
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  view_count INTEGER DEFAULT 0,
  vote_count INTEGER DEFAULT 0,
  answer_count INTEGER DEFAULT 0,
  is_solved BOOLEAN DEFAULT FALSE,
  accepted_answer_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 게시글-태그 연결 테이블
CREATE TABLE post_tags (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- 4. 답변 테이블
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  vote_count INTEGER DEFAULT 0,
  is_accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 투표 테이블 (게시글, 답변 모두)
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL, -- 'post' or 'answer'
  target_id UUID NOT NULL,
  vote_type VARCHAR(10) NOT NULL, -- 'up' or 'down'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_vote UNIQUE (user_id, target_type, target_id)
);

-- 6. posts.accepted_answer_id 참조 추가 (테이블 생성 후)
ALTER TABLE posts
  ADD CONSTRAINT fk_accepted_answer
  FOREIGN KEY (accepted_answer_id) REFERENCES answers(id) ON DELETE SET NULL;

-- 7. 인덱스 생성
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_vote ON posts(vote_count DESC);
CREATE INDEX idx_posts_is_solved ON posts(is_solved);

CREATE INDEX idx_answers_post ON answers(post_id);
CREATE INDEX idx_answers_author ON answers(author_id);
CREATE INDEX idx_answers_vote ON answers(vote_count DESC);

CREATE INDEX idx_votes_target ON votes(target_type, target_id);
CREATE INDEX idx_votes_user ON votes(user_id);

CREATE INDEX idx_post_tags_post ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag ON post_tags(tag_id);

-- 8. updated_at 자동 갱신 트리거
CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER answers_updated_at
  BEFORE UPDATE ON answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 9. 투표 시 vote_count 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'post' THEN
      UPDATE posts
      SET vote_count = vote_count + (CASE WHEN NEW.vote_type = 'up' THEN 1 ELSE -1 END)
      WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'answer' THEN
      UPDATE answers
      SET vote_count = vote_count + (CASE WHEN NEW.vote_type = 'up' THEN 1 ELSE -1 END)
      WHERE id = NEW.target_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'post' THEN
      UPDATE posts
      SET vote_count = vote_count - (CASE WHEN OLD.vote_type = 'up' THEN 1 ELSE -1 END)
      WHERE id = OLD.target_id;
    ELSIF OLD.target_type = 'answer' THEN
      UPDATE answers
      SET vote_count = vote_count - (CASE WHEN OLD.vote_type = 'up' THEN 1 ELSE -1 END)
      WHERE id = OLD.target_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- 투표 변경 시 (up -> down 또는 down -> up)
    IF OLD.vote_type <> NEW.vote_type THEN
      IF NEW.target_type = 'post' THEN
        UPDATE posts
        SET vote_count = vote_count + (CASE WHEN NEW.vote_type = 'up' THEN 2 ELSE -2 END)
        WHERE id = NEW.target_id;
      ELSIF NEW.target_type = 'answer' THEN
        UPDATE answers
        SET vote_count = vote_count + (CASE WHEN NEW.vote_type = 'up' THEN 2 ELSE -2 END)
        WHERE id = NEW.target_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER votes_update_count
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_vote_count();

-- 10. 답변 추가/삭제 시 answer_count 업데이트 트리거
CREATE OR REPLACE FUNCTION update_answer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET answer_count = answer_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET answer_count = answer_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER answers_update_count
  AFTER INSERT OR DELETE ON answers
  FOR EACH ROW EXECUTE FUNCTION update_answer_count();

-- 11. 태그 사용량 업데이트 트리거
CREATE OR REPLACE FUNCTION update_tag_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_tags_update_usage
  AFTER INSERT OR DELETE ON post_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_usage();

-- 12. RLS 활성화
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- 13. RLS 정책 - 태그 (모두 조회 가능, 관리자만 관리)
CREATE POLICY "Anyone can view tags"
  ON tags FOR SELECT USING (true);

CREATE POLICY "Service role can manage tags"
  ON tags FOR ALL WITH CHECK (true);

-- 14. RLS 정책 - 게시글
CREATE POLICY "Anyone can view posts"
  ON posts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their posts"
  ON posts FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their posts"
  ON posts FOR DELETE USING (auth.uid() = author_id);

-- 15. RLS 정책 - 게시글-태그
CREATE POLICY "Anyone can view post_tags"
  ON post_tags FOR SELECT USING (true);

CREATE POLICY "Post authors can manage post_tags"
  ON post_tags FOR ALL USING (
    EXISTS (
      SELECT 1 FROM posts WHERE id = post_tags.post_id AND author_id = auth.uid()
    )
  );

-- 16. RLS 정책 - 답변
CREATE POLICY "Anyone can view answers"
  ON answers FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create answers"
  ON answers FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their answers"
  ON answers FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their answers"
  ON answers FOR DELETE USING (auth.uid() = author_id);

-- 17. RLS 정책 - 투표
CREATE POLICY "Users can view their own votes"
  ON votes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create votes"
  ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their votes"
  ON votes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their votes"
  ON votes FOR DELETE USING (auth.uid() = user_id);

-- 18. 코멘트
COMMENT ON TABLE posts IS 'Q&A 게시글';
COMMENT ON TABLE answers IS '게시글 답변';
COMMENT ON TABLE votes IS '게시글/답변 투표';
COMMENT ON TABLE tags IS '게시글 태그';
COMMENT ON TABLE post_tags IS '게시글-태그 연결';
