/**
 * Google Drive 파일 목록 조회 API
 * GET /api/integrations/google-drive/files
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  listFiles,
  refreshAccessToken,
  isGoogleDriveConfigured,
} from '@/lib/integrations/google-drive';

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

    // 쿼리 파라미터
    const folderId = request.nextUrl.searchParams.get('folder_id') || undefined;
    const pageToken = request.nextUrl.searchParams.get('page_token') || undefined;

    // 연동 정보 조회
    const adminClient = createAdminClient();
    const { data: integration, error: dbError } = await adminClient
      .from('external_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google_drive')
      .single();

    if (dbError || !integration) {
      return NextResponse.json(
        { error: 'Google Drive가 연결되지 않았습니다' },
        { status: 400 }
      );
    }

    // 토큰 만료 확인 및 갱신
    let accessToken = integration.access_token;
    const tokenExpiresAt = integration.token_expires_at
      ? new Date(integration.token_expires_at)
      : null;

    if (tokenExpiresAt && tokenExpiresAt < new Date()) {
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
        } catch {
          return NextResponse.json(
            { error: '토큰이 만료되었습니다. 다시 연결해주세요.' },
            { status: 401 }
          );
        }
      } else {
        return NextResponse.json(
          { error: '토큰이 만료되었습니다. 다시 연결해주세요.' },
          { status: 401 }
        );
      }
    }

    // 파일 목록 조회
    const result = await listFiles(accessToken, folderId, pageToken);

    return NextResponse.json({
      data: {
        files: result.files,
        next_page_token: result.nextPageToken,
      },
    });
  } catch (error) {
    console.error('[Google Drive Files] Error:', error);
    return NextResponse.json(
      { error: '파일 목록 조회에 실패했습니다' },
      { status: 500 }
    );
  }
}
