import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

/**
 * API 인증 헬퍼 결과 타입
 */
interface AuthResult {
  user: User | null;
  error: NextResponse | null;
}

/**
 * API 라우트에서 인증된 사용자를 확인하는 헬퍼 함수
 *
 * @example
 * ```ts
 * export async function GET() {
 *   const { user, error } = await requireAuth();
 *   if (error) return error;
 *
 *   // user를 사용한 비즈니스 로직
 * }
 * ```
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 }),
    };
  }

  return { user, error: null };
}

/**
 * 인증된 사용자를 반환하거나, 인증 실패 시 에러 응답을 throw
 *
 * @throws NextResponse - 인증 실패 시
 *
 * @example
 * ```ts
 * export async function GET() {
 *   try {
 *     const user = await getAuthenticatedUser();
 *     // user를 사용한 비즈니스 로직
 *   } catch (response) {
 *     if (response instanceof NextResponse) return response;
 *     throw response;
 *   }
 * }
 * ```
 */
export async function getAuthenticatedUser(): Promise<User> {
  const { user, error } = await requireAuth();
  if (error) {
    throw error;
  }
  return user!;
}
