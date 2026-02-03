/**
 * Google Drive OAuth 인증 시작 API
 * GET /api/integrations/google-drive/auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUrl, isGoogleDriveConfigured } from '@/lib/integrations/google-drive';

export async function GET(request: NextRequest) {
  try {
    // 환경 설정 확인
    if (!isGoogleDriveConfigured()) {
      return NextResponse.json(
        { error: 'Google Drive 연동이 설정되지 않았습니다' },
        { status: 503 }
      );
    }

    // 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 상태 토큰에 사용자 ID 포함 (CSRF 방지 및 사용자 식별)
    const state = Buffer.from(
      JSON.stringify({
        userId: user.id,
        timestamp: Date.now(),
      })
    ).toString('base64');

    // OAuth URL 생성
    const authUrl = getAuthUrl(state);

    return NextResponse.json({ data: { auth_url: authUrl } });
  } catch (error) {
    console.error('[Google Drive Auth] Error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
