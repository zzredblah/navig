import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * 프로젝트 멤버 역할 타입
 */
export type ProjectRole = 'owner' | 'editor' | 'viewer';

/**
 * 프로젝트 접근 확인 결과 타입
 */
interface ProjectAccessResult {
  hasAccess: boolean;
  role: ProjectRole | null;
  isOwner: boolean;
  error: NextResponse | null;
}

/**
 * 사용자의 프로젝트 접근 권한을 확인하는 헬퍼 함수
 *
 * @param projectId - 프로젝트 ID
 * @param userId - 사용자 ID
 * @param requiredRoles - 필요한 역할 목록 (선택적, 미지정 시 접근만 확인)
 *
 * @example
 * ```ts
 * // 단순 접근 확인
 * const { hasAccess, error } = await checkProjectAccess(projectId, user.id);
 * if (error) return error;
 *
 * // 특정 역할 확인
 * const { hasAccess, error } = await checkProjectAccess(projectId, user.id, ['owner', 'editor']);
 * if (error) return error;
 * ```
 */
export async function checkProjectAccess(
  projectId: string,
  userId: string,
  requiredRoles?: ProjectRole[]
): Promise<ProjectAccessResult> {
  const adminClient = createAdminClient();

  // 프로젝트 존재 및 소유자 확인
  const { data: project, error: projectError } = await adminClient
    .from('projects')
    .select('client_id')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return {
      hasAccess: false,
      role: null,
      isOwner: false,
      error: NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다' },
        { status: 404 }
      ),
    };
  }

  const isOwner = project.client_id === userId;

  // 소유자면 즉시 접근 허용
  if (isOwner) {
    // 역할 확인이 필요한데 owner가 포함되지 않은 경우
    if (requiredRoles && !requiredRoles.includes('owner')) {
      return {
        hasAccess: false,
        role: 'owner',
        isOwner: true,
        error: NextResponse.json(
          { error: '해당 작업을 수행할 권한이 없습니다' },
          { status: 403 }
        ),
      };
    }
    return { hasAccess: true, role: 'owner', isOwner: true, error: null };
  }

  // 프로젝트 멤버 확인 (초대 수락한 경우만)
  const { data: member } = await adminClient
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .not('joined_at', 'is', null)
    .single();

  if (!member) {
    return {
      hasAccess: false,
      role: null,
      isOwner: false,
      error: NextResponse.json(
        { error: '프로젝트에 접근 권한이 없습니다' },
        { status: 403 }
      ),
    };
  }

  const memberRole = member.role as ProjectRole;

  // 역할 확인
  if (requiredRoles && !requiredRoles.includes(memberRole)) {
    return {
      hasAccess: false,
      role: memberRole,
      isOwner: false,
      error: NextResponse.json(
        { error: '해당 작업을 수행할 권한이 없습니다' },
        { status: 403 }
      ),
    };
  }

  return { hasAccess: true, role: memberRole, isOwner: false, error: null };
}

/**
 * 사용자가 접근 가능한 모든 프로젝트 ID를 조회하는 헬퍼 함수
 *
 * @param userId - 사용자 ID
 * @returns 프로젝트 ID 배열
 *
 * @example
 * ```ts
 * const projectIds = await getUserAccessibleProjectIds(user.id);
 * if (projectIds.length === 0) {
 *   return NextResponse.json({ data: [] });
 * }
 * ```
 */
export async function getUserAccessibleProjectIds(
  userId: string
): Promise<string[]> {
  const adminClient = createAdminClient();

  // 병렬로 조회
  const [{ data: memberProjects }, { data: ownedProjects }] = await Promise.all(
    [
      adminClient
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId)
        .not('joined_at', 'is', null),
      adminClient.from('projects').select('id').eq('client_id', userId),
    ]
  );

  const memberIds = memberProjects?.map((p) => p.project_id) || [];
  const ownedIds = ownedProjects?.map((p) => p.id) || [];

  // 중복 제거
  return [...new Set([...memberIds, ...ownedIds])];
}

/**
 * 프로젝트 접근 권한 확인 후 에러가 있으면 바로 반환하는 헬퍼
 *
 * @example
 * ```ts
 * const access = await requireProjectAccess(projectId, user.id, ['owner', 'editor']);
 * if (access.error) return access.error;
 *
 * // access.role로 역할 확인 가능
 * ```
 */
export async function requireProjectAccess(
  projectId: string,
  userId: string,
  requiredRoles?: ProjectRole[]
): Promise<ProjectAccessResult> {
  return checkProjectAccess(projectId, userId, requiredRoles);
}
