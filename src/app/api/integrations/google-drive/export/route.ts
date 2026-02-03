/**
 * Google Drive로 파일 내보내기 API
 * POST /api/integrations/google-drive/export
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  uploadFile as uploadToDrive,
  refreshAccessToken,
  isGoogleDriveConfigured,
} from '@/lib/integrations/google-drive';
import { z } from 'zod';

// Request schema
const exportSchema = z.object({
  source_type: z.enum(['video', 'document']),
  source_id: z.string().uuid(),
  folder_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
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

    // 요청 검증
    const body = await request.json();
    const validationResult = exportSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '잘못된 요청입니다', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { source_type, source_id, folder_id } = validationResult.data;

    const adminClient = createAdminClient();

    // 소스 파일 정보 조회
    let fileUrl: string;
    let fileName: string;
    let mimeType: string;
    let projectId: string;

    if (source_type === 'video') {
      const { data: video, error: videoError } = await adminClient
        .from('video_versions')
        .select('file_url, original_filename, project_id')
        .eq('id', source_id)
        .single();

      if (videoError || !video || !video.file_url) {
        return NextResponse.json(
          { error: '영상을 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      fileUrl = video.file_url;
      fileName = video.original_filename;
      projectId = video.project_id;

      // MIME type 추론
      const ext = fileName.split('.').pop()?.toLowerCase();
      mimeType = ext === 'mp4' ? 'video/mp4'
        : ext === 'webm' ? 'video/webm'
        : ext === 'mov' ? 'video/quicktime'
        : 'video/mp4';
    } else {
      const { data: document, error: docError } = await adminClient
        .from('documents')
        .select('file_url, title, project_id, content')
        .eq('id', source_id)
        .single();

      if (docError || !document || !document.file_url) {
        return NextResponse.json(
          { error: '문서를 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      fileUrl = document.file_url;
      // content에서 original_filename을 찾거나, title 또는 file_url에서 파일명 추출
      const content = document.content as Record<string, unknown> | null;
      const originalFilename = content?.original_filename as string | undefined;
      fileName = originalFilename || document.title || document.file_url.split('/').pop() || 'document';
      projectId = document.project_id;

      // MIME type 추론
      const ext = fileName.split('.').pop()?.toLowerCase();
      mimeType = ext === 'pdf' ? 'application/pdf'
        : ext === 'doc' ? 'application/msword'
        : ext === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : ext === 'xls' ? 'application/vnd.ms-excel'
        : ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : ext === 'png' ? 'image/png'
        : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
        : 'application/octet-stream';
    }

    // 프로젝트 접근 권한 확인
    const { data: accessCheck } = await adminClient
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .single();

    const { data: ownerCheck } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', projectId)
      .eq('client_id', user.id)
      .single();

    if (!accessCheck && !ownerCheck) {
      return NextResponse.json(
        { error: '이 파일에 접근할 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 연동 정보 조회
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

    // 토큰 갱신 (필요 시)
    let accessToken = integration.access_token;
    const tokenExpiresAt = integration.token_expires_at
      ? new Date(integration.token_expires_at)
      : null;

    if (tokenExpiresAt && tokenExpiresAt < new Date() && integration.refresh_token) {
      try {
        const newTokens = await refreshAccessToken(integration.refresh_token);
        accessToken = newTokens.accessToken;

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
    }

    // R2에서 파일 다운로드
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: '파일을 다운로드할 수 없습니다' },
        { status: 500 }
      );
    }

    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());

    // Google Drive에 업로드
    const result = await uploadToDrive(
      accessToken,
      fileName,
      mimeType,
      fileBuffer,
      folder_id
    );

    return NextResponse.json({
      data: {
        file_id: result.fileId,
        web_view_link: result.webViewLink,
      },
    });
  } catch (error) {
    console.error('[Google Drive Export] Error:', error);
    return NextResponse.json(
      { error: '파일 내보내기에 실패했습니다' },
      { status: 500 }
    );
  }
}
