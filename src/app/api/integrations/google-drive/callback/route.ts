/**
 * Google Drive OAuth 콜백 API
 * GET /api/integrations/google-drive/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens, isGoogleDriveConfigured } from '@/lib/integrations/google-drive';

export async function GET(request: NextRequest) {
  try {
    // 환경 설정 확인
    if (!isGoogleDriveConfigured()) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=not_configured', request.url)
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // 사용자가 취소한 경우
    if (error) {
      console.log('[Google Drive Callback] User denied access:', error);
      return NextResponse.redirect(
        new URL('/settings/integrations?error=access_denied', request.url)
      );
    }

    // 인증 코드 확인
    if (!code) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=no_code', request.url)
      );
    }

    // 현재 로그인한 사용자 확인
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(
        new URL('/login?redirect=/settings/integrations', request.url)
      );
    }

    // state 검증 (CSRF 방지)
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        if (stateData.userId !== user.id) {
          console.error('[Google Drive Callback] State user mismatch');
          return NextResponse.redirect(
            new URL('/settings/integrations?error=invalid_state', request.url)
          );
        }
        // 타임스탬프 검증 (10분 이내)
        if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
          return NextResponse.redirect(
            new URL('/settings/integrations?error=expired', request.url)
          );
        }
      } catch {
        console.error('[Google Drive Callback] Invalid state format');
      }
    }

    // 토큰 교환
    const tokens = await exchangeCodeForTokens(code);

    // 데이터베이스에 저장 (upsert)
    const adminClient = createAdminClient();
    const { error: upsertError } = await adminClient
      .from('external_integrations')
      .upsert(
        {
          user_id: user.id,
          provider: 'google_drive',
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          token_expires_at: tokens.expiresAt?.toISOString(),
          provider_user_id: tokens.userId,
          provider_email: tokens.email,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,provider',
        }
      );

    if (upsertError) {
      console.error('[Google Drive Callback] DB error:', upsertError);
      return NextResponse.redirect(
        new URL('/settings/integrations?error=db_error', request.url)
      );
    }

    // 성공 - 설정 페이지로 리다이렉트
    return NextResponse.redirect(
      new URL('/settings/integrations?success=google_drive', request.url)
    );
  } catch (error) {
    console.error('[Google Drive Callback] Error:', error);
    return NextResponse.redirect(
      new URL('/settings/integrations?error=unknown', request.url)
    );
  }
}
