-- ============================================
-- 트리거 비활성화 및 수정
-- ============================================
-- Supabase SQL Editor에서 이 코드를 실행하세요

-- 1. 기존 트리거 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 완료! 이제 API에서 수동으로 profile을 생성합니다.
