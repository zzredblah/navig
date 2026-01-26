/**
 * 사용자 검색 API
 * GET - 이메일로 사용자 검색 (자동완성용)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  console.log('[User Search] API 호출됨');

  try {
    const supabase = await createClient();
    console.log('[User Search] Supabase 클라이언트 생성됨');

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log('[User Search] 인증 확인:', { userId: user?.id, authError });

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim();
    console.log('[User Search] 검색어:', query);

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    // 이메일로 검색 (인증된 사용자 클라이언트 사용)
    console.log('[User Search] 이메일 검색 시작...');
    const { data: emailUsers, error: emailError } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url')
      .neq('id', user.id)
      .ilike('email', `%${query}%`)
      .limit(5);

    console.log('[User Search] 이메일 검색 결과:', { count: emailUsers?.length, error: emailError });

    if (emailError) {
      console.error('[User Search] 이메일 검색 오류:', emailError);
    }

    // 이름으로 검색
    console.log('[User Search] 이름 검색 시작...');
    const { data: nameUsers, error: nameError } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url')
      .neq('id', user.id)
      .ilike('name', `%${query}%`)
      .limit(5);

    console.log('[User Search] 이름 검색 결과:', { count: nameUsers?.length, error: nameError });

    if (nameError) {
      console.error('[User Search] 이름 검색 오류:', nameError);
    }

    // 둘 다 실패한 경우만 에러
    if (emailError && nameError) {
      return NextResponse.json(
        { error: '사용자 검색에 실패했습니다', details: { emailError, nameError } },
        { status: 500 }
      );
    }

    // 결과 합치기 (중복 제거)
    type UserResult = { id: string; name: string; email: string; avatar_url: string | null };
    const userMap = new Map<string, UserResult>();
    [...(emailUsers || []), ...(nameUsers || [])].forEach((u: UserResult) => {
      if (!userMap.has(u.id)) {
        userMap.set(u.id, u);
      }
    });

    const users = Array.from(userMap.values()).slice(0, 10);
    console.log('[User Search] 최종 결과:', { count: users.length });
    return NextResponse.json({ users });
  } catch (error) {
    console.error('[User Search] 예외 발생:', error);
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
