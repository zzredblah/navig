import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// 인증이 필요없는 공개 경로
const publicPaths = [
  '/',              // 랜딩 페이지
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/pricing',       // 요금제 페이지
  '/api/auth',
  '/api/plans',     // 플랜 목록 API
  '/api/webhooks',  // 웹훅
];

// 정확히 일치해야 하는 경로
const exactPublicPaths = ['/'];

function isPublicPath(pathname: string): boolean {
  // 정확히 일치하는 경로 확인
  if (exactPublicPaths.includes(pathname)) {
    return true;
  }
  // prefix로 시작하는 경로 확인 (/ 제외)
  return publicPaths
    .filter(path => path !== '/')
    .some(path => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  // 공개 경로는 세션 갱신만 하고 빠르게 통과
  if (isPublicPath(pathname)) {
    // getSession은 getUser보다 빠름 (서버 검증 없이 토큰만 확인)
    const { data: { session } } = await supabase.auth.getSession();

    // 로그인된 사용자가 랜딩/로그인/회원가입 페이지 접근 시 대시보드로 리다이렉트
    if (session && (pathname === '/' || pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return response;
  }

  // 보호된 경로: getSession으로 빠르게 확인 (Layout에서 getUser로 검증)
  const { data: { session } } = await supabase.auth.getSession();

  // 세션이 없으면 로그인 페이지로 리다이렉트
  if (!session) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 경로에 미들웨어 적용:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public 폴더
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
