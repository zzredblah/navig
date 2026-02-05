/**
 * API 헬퍼 함수 모음
 *
 * @example
 * ```ts
 * import { requireAuth, checkProjectAccess, handleError, successResponse } from '@/lib/api';
 *
 * export async function GET(request: NextRequest, { params }) {
 *   try {
 *     const { user, error: authError } = await requireAuth();
 *     if (authError) return authError;
 *
 *     const { hasAccess, error: accessError } = await checkProjectAccess(params.id, user.id);
 *     if (accessError) return accessError;
 *
 *     // 비즈니스 로직...
 *
 *     return successResponse(data, '조회 성공');
 *   } catch (error) {
 *     return handleError(error, 'Example API');
 *   }
 * }
 * ```
 */

// 인증 헬퍼
export { requireAuth, getAuthenticatedUser } from './auth';

// 프로젝트 접근 권한 헬퍼
export {
  checkProjectAccess,
  getUserAccessibleProjectIds,
  requireProjectAccess,
  type ProjectRole,
} from './project-access';

// 응답 헬퍼
export {
  successResponse,
  paginatedResponse,
  errorResponse,
  handleApiError,
  handleZodError,
  handleError,
  UNAUTHORIZED,
  FORBIDDEN,
  NOT_FOUND,
  INTERNAL_ERROR,
  type ApiResponse,
  type Pagination,
  type PaginatedResponse,
} from './responses';
