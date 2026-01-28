-- 피드백 템플릿 시스템
-- profiles 테이블에 feedback_templates JSONB 컬럼 추가

-- feedback_templates 컬럼 추가
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS feedback_templates JSONB DEFAULT '[]'::jsonb;

-- 템플릿 최대 개수 제한 (20개)
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS max_feedback_templates;

ALTER TABLE profiles
ADD CONSTRAINT max_feedback_templates
CHECK (jsonb_array_length(COALESCE(feedback_templates, '[]'::jsonb)) <= 20);

-- GIN 인덱스 추가 (JSONB 검색 성능)
CREATE INDEX IF NOT EXISTS idx_profiles_feedback_templates
ON profiles USING GIN (feedback_templates);

-- 템플릿 구조 예시 (참고용 주석):
-- {
--   "id": "uuid",
--   "title": "템플릿 제목",
--   "content": "피드백 내용",
--   "is_urgent": false,
--   "order": 0,
--   "created_at": "2024-01-01T00:00:00Z"
-- }

COMMENT ON COLUMN profiles.feedback_templates IS '피드백 템플릿 목록 (최대 20개)';
