import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * 표준 API 응답 타입
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
  details?: unknown;
}

/**
 * 페이지네이션 정보 타입
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * 페이지네이션 응답 타입
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}

/**
 * 성공 응답을 생성하는 헬퍼 함수
 *
 * @example
 * ```ts
 * return successResponse({ project }, '프로젝트가 생성되었습니다', 201);
 * ```
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      data,
      ...(message && { message }),
    },
    { status }
  );
}

/**
 * 페이지네이션 응답을 생성하는 헬퍼 함수
 *
 * @example
 * ```ts
 * return paginatedResponse(projects, { page: 1, limit: 10, total: 100, totalPages: 10 });
 * ```
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: Pagination
): NextResponse<PaginatedResponse<T>> {
  return NextResponse.json({
    data,
    pagination,
  });
}

/**
 * 에러 응답을 생성하는 헬퍼 함수
 *
 * @param message - 사용자에게 표시할 에러 메시지
 * @param status - HTTP 상태 코드
 * @param details - 개발 환경에서만 표시할 상세 정보
 *
 * @example
 * ```ts
 * return errorResponse('프로젝트를 찾을 수 없습니다', 404);
 * ```
 */
export function errorResponse(
  message: string,
  status: number,
  details?: unknown
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      error: message,
      ...(process.env.NODE_ENV === 'development' && details && { details }),
    },
    { status }
  );
}

/**
 * API 예외를 처리하는 헬퍼 함수
 *
 * @param error - 발생한 에러
 * @param context - 로깅용 컨텍스트 (예: 'Projects API')
 *
 * @example
 * ```ts
 * catch (error) {
 *   return handleApiError(error, 'Projects API');
 * }
 * ```
 */
export function handleApiError(
  error: unknown,
  context: string
): NextResponse<ApiResponse> {
  console.error(`[${context}] 예외:`, error);

  return errorResponse(
    '서버 오류가 발생했습니다',
    500,
    error instanceof Error ? error.message : 'Unknown error'
  );
}

/**
 * Zod 유효성 검증 에러를 처리하는 헬퍼 함수
 *
 * @example
 * ```ts
 * const result = schema.safeParse(body);
 * if (!result.success) {
 *   return handleZodError(result.error);
 * }
 * ```
 */
export function handleZodError(error: ZodError): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      error: '입력값이 유효하지 않습니다',
      details: error.flatten(),
    },
    { status: 400 }
  );
}

/**
 * API 에러를 처리하는 통합 헬퍼 함수
 * ZodError와 일반 에러를 자동으로 구분하여 처리
 *
 * @example
 * ```ts
 * catch (error) {
 *   return handleError(error, 'Projects API');
 * }
 * ```
 */
export function handleError(
  error: unknown,
  context: string
): NextResponse<ApiResponse> {
  if (error instanceof ZodError) {
    return handleZodError(error);
  }

  return handleApiError(error, context);
}

// 자주 사용하는 에러 응답 상수
export const UNAUTHORIZED = errorResponse('인증이 필요합니다', 401);
export const FORBIDDEN = errorResponse('권한이 없습니다', 403);
export const NOT_FOUND = errorResponse('리소스를 찾을 수 없습니다', 404);
export const INTERNAL_ERROR = errorResponse('서버 오류가 발생했습니다', 500);
