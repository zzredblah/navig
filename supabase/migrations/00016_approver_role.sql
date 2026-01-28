-- 프로젝트 멤버 역할에 '승인자(approver)' 추가
-- 승인자는 영상 승인 권한을 가진 역할

-- member_role enum에 'approver' 추가
ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'approver' AFTER 'owner';

-- 기존 데이터에 영향 없음 (새 값 추가만)
