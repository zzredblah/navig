/**
 * Google Drive 파일 가져오기 API
 * POST /api/integrations/google-drive/import
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  downloadFile,
  getFileMetadata,
  refreshAccessToken,
  isGoogleDriveConfigured,
  isVideoFile,
} from '@/lib/integrations/google-drive';
import { uploadFile as uploadToR2 } from '@/lib/cloudflare/r2';
import { z } from 'zod';
import { Readable } from 'stream';

// Request schema
const importSchema = z.object({
  file_id: z.string(),
  project_id: z.string().uuid(),
  type: z.enum(['video', 'document']),
});

// Stream을 Buffer로 변환
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

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
    const validationResult = importSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '잘못된 요청입니다', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { file_id, project_id, type } = validationResult.data;

    const adminClient = createAdminClient();

    // 프로젝트 접근 권한 확인
    const { data: accessCheck } = await adminClient
      .from('project_members')
      .select('user_id')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .single();

    const { data: ownerCheck } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', project_id)
      .eq('client_id', user.id)
      .single();

    if (!accessCheck && !ownerCheck) {
      return NextResponse.json(
        { error: '이 프로젝트에 접근할 권한이 없습니다' },
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

    // 파일 메타데이터 조회
    const metadata = await getFileMetadata(accessToken, file_id);

    // 파일 타입 검증
    if (type === 'video' && !isVideoFile(metadata.mimeType)) {
      return NextResponse.json(
        { error: '지원되지 않는 비디오 형식입니다' },
        { status: 400 }
      );
    }

    // 파일 다운로드
    const fileStream = await downloadFile(accessToken, file_id);
    const fileBuffer = await streamToBuffer(fileStream as Readable);

    // R2에 업로드
    const timestamp = Date.now();
    const fileKey = type === 'video'
      ? `projects/${project_id}/videos/${timestamp}-${metadata.name}`
      : `projects/${project_id}/documents/${timestamp}-${metadata.name}`;

    const bucket = type === 'video' ? 'videos' : 'src';
    const { url } = await uploadToR2(bucket, fileKey, fileBuffer, metadata.mimeType);

    // 데이터베이스에 레코드 생성
    if (type === 'video') {
      // video_versions 테이블에 추가
      const { data: existingVersions } = await adminClient
        .from('video_versions')
        .select('version_number')
        .eq('project_id', project_id)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersionNumber = existingVersions && existingVersions.length > 0
        ? existingVersions[0].version_number + 1
        : 1;

      const { data: videoVersion, error: insertError } = await adminClient
        .from('video_versions')
        .insert({
          project_id,
          version_number: nextVersionNumber,
          original_filename: metadata.name,
          file_url: url,
          file_size: fileBuffer.length,
          status: 'ready',
          change_notes: `Google Drive에서 가져옴`,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[Google Drive Import] Insert video error:', insertError);
        return NextResponse.json(
          { error: '영상 저장에 실패했습니다' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        data: {
          id: videoVersion.id,
          name: metadata.name,
          url,
          type: 'video',
        },
      });
    } else {
      // documents 테이블에 추가 (type을 'request'로 저장하고 content에 파일 정보 포함)
      const { data: document, error: insertError } = await adminClient
        .from('documents')
        .insert({
          project_id,
          title: metadata.name.replace(/\.[^/.]+$/, ''), // 확장자 제거
          type: 'request' as const, // 유효한 DocumentType 사용
          file_url: url,
          content: {
            imported_from: 'google_drive',
            original_filename: metadata.name,
            file_size: fileBuffer.length,
          },
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[Google Drive Import] Insert document error:', insertError);
        return NextResponse.json(
          { error: '문서 저장에 실패했습니다' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        data: {
          id: document.id,
          name: metadata.name,
          url,
          type: 'document',
        },
      });
    }
  } catch (error) {
    console.error('[Google Drive Import] Error:', error);
    return NextResponse.json(
      { error: '파일 가져오기에 실패했습니다' },
      { status: 500 }
    );
  }
}
