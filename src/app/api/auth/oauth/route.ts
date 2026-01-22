import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type OAuthProvider = 'google' | 'kakao';

const VALID_PROVIDERS: OAuthProvider[] = ['google', 'kakao'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, redirectTo } = body;

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: '유효하지 않은 OAuth 제공자입니다' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Supabase OAuth 로그인 URL 생성
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?next=${redirectTo || '/dashboard'}`,
        queryParams: provider === 'kakao' ? {
          // 카카오는 추가 scope 요청 가능
        } : undefined,
      },
    });

    if (error) {
      console.error('[OAuth] 오류:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      url: data.url,
    });
  } catch (error) {
    console.error('[OAuth] 서버 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
