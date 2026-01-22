import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const type = requestUrl.searchParams.get('type');
  const error_description = requestUrl.searchParams.get('error_description');

  // OAuth 에러 처리
  if (error_description) {
    console.error('[Auth Callback] OAuth 에러:', error_description);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error_description)}`, request.url)
    );
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      console.log('[Auth Callback] 인증 성공:', data.user?.email);

      // OAuth 로그인 시 provider 정보 확인
      const provider = data.user?.app_metadata?.provider;
      if (provider && provider !== 'email') {
        console.log('[Auth Callback] OAuth 로그인:', provider);
        // OAuth 로그인은 바로 대시보드로
        return NextResponse.redirect(new URL(next, request.url));
      }

      // 이메일 인증 완료 시 로그인 페이지로 (성공 메시지 표시)
      if (type === 'signup' || type === 'email') {
        return NextResponse.redirect(
          new URL('/login?verified=true', request.url)
        );
      }

      // 비밀번호 재설정 시 비밀번호 변경 페이지로
      if (type === 'recovery') {
        return NextResponse.redirect(
          new URL('/reset-password', request.url)
        );
      }

      // 일반적인 경우 next 파라미터로 리다이렉트
      return NextResponse.redirect(new URL(next, request.url));
    }

    console.error('[Auth Callback] 인증 실패:', error?.message);
  }

  // 에러 발생 시 로그인 페이지로 리다이렉트
  return NextResponse.redirect(new URL('/login?error=auth', request.url));
}
