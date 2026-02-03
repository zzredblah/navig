/**
 * Google Drive 연결 상태 조회 API
 * GET /api/integrations/google-drive/status
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isGoogleDriveConfigured, refreshAccessToken } from '@/lib/integrations/google-drive';

export async function GET() {
  try {
    // 환경 설정 확인
    if (!isGoogleDriveConfigured()) {
      return NextResponse.json({
        data: {
          configured: false,
          connected: false,
        },
      });
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

    // 연동 정보 조회
    const adminClient = createAdminClient();
    const { data: integration, error: dbError } = await adminClient
      .from('external_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google_drive')
      .single();

    if (dbError || !integration) {
      return NextResponse.json({
        data: {
          configured: true,
          connected: false,
        },
      });
    }

    // 토큰 만료 확인 및 갱신
    let accessToken = integration.access_token;
    const tokenExpiresAt = integration.token_expires_at
      ? new Date(integration.token_expires_at)
      : null;

    if (tokenExpiresAt && tokenExpiresAt < new Date()) {
      // 토큰 만료됨 - refresh_token으로 갱신 시도
      if (integration.refresh_token) {
        try {
          const newTokens = await refreshAccessToken(integration.refresh_token);
          accessToken = newTokens.accessToken;

          // 새 토큰 저장
          await adminClient
            .from('external_integrations')
            .update({
              access_token: newTokens.accessToken,
              token_expires_at: newTokens.expiresAt?.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', integration.id);
        } catch (refreshError) {
          console.error('[Google Drive Status] Token refresh failed:', refreshError);
          // 갱신 실패 - 연결 해제됨으로 표시
          return NextResponse.json({
            data: {
              configured: true,
              connected: false,
              error: 'token_expired',
            },
          });
        }
      } else {
        return NextResponse.json({
          data: {
            configured: true,
            connected: false,
            error: 'no_refresh_token',
          },
        });
      }
    }

    return NextResponse.json({
      data: {
        configured: true,
        connected: true,
        email: integration.provider_email,
        connectedAt: integration.created_at,
      },
    });
  } catch (error) {
    console.error('[Google Drive Status] Error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
