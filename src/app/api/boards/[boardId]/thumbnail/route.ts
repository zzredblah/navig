/**
 * 보드 썸네일 업로드 API
 * Cloudflare R2 (navig-src 버킷) 사용
 * R2 미설정 시 Supabase Storage로 폴백
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// R2 설정 확인 (함수 내에서 호출해야 환경변수가 올바르게 로드됨)
function checkR2Config() {
  const configured = !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_PUBLIC_URL_SRC &&
    process.env.R2_BUCKET_SRC
  );
  console.log('[Thumbnail] R2 설정 상태:', {
    configured,
    hasAccountId: !!process.env.R2_ACCOUNT_ID,
    hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
    hasPublicUrl: !!process.env.R2_PUBLIC_URL_SRC,
    hasBucket: !!process.env.R2_BUCKET_SRC,
  });
  return configured;
}

/**
 * POST /api/boards/:boardId/thumbnail
 * 보드 썸네일 업로드 (base64 이미지)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { thumbnail } = body;

    if (!thumbnail || !thumbnail.startsWith('data:image/')) {
      return NextResponse.json({ error: '유효한 이미지 데이터가 필요합니다.' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 보드 및 프로젝트 정보 조회
    const { data: board, error: boardError } = await adminClient
      .from('boards')
      .select('id, project_id, thumbnail_url')
      .eq('id', boardId)
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: '보드를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 편집 권한 확인
    const { data: project } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', board.project_id)
      .single();

    const isOwner = project?.client_id === user.id;
    const { data: member } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', board.project_id)
      .eq('user_id', user.id)
      .single();

    const canEdit = isOwner || (member && ['owner', 'approver', 'editor'].includes(member.role));

    if (!canEdit) {
      return NextResponse.json({ error: '보드 수정 권한이 없습니다.' }, { status: 403 });
    }

    // Base64 데이터 파싱
    const matches = thumbnail.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: '잘못된 이미지 형식입니다.' }, { status: 400 });
    }

    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // 파일 경로 (보드당 하나의 썸네일만 유지)
    const fileKey = `board-thumbnails/${boardId}.${extension}`;
    let thumbnailUrl: string;

    const isR2Configured = checkR2Config();

    if (isR2Configured) {
      // Cloudflare R2 사용
      try {
        const { uploadFile, deleteFile } = await import('@/lib/cloudflare/r2');

        // 기존 썸네일 삭제 (R2에서)
        if (board.thumbnail_url && board.thumbnail_url.includes('navig-src')) {
          try {
            const oldKey = board.thumbnail_url.split('/board-thumbnails/')[1]?.split('?')[0];
            if (oldKey) {
              await deleteFile('src', `board-thumbnails/${oldKey}`);
            }
          } catch {
            // 기존 파일 삭제 실패해도 계속 진행
          }
        }

        // R2에 새 썸네일 업로드
        console.log('[Thumbnail] R2 업로드 시작:', fileKey);
        const { url } = await uploadFile('src', fileKey, buffer, `image/${extension}`);
        console.log('[Thumbnail] R2 업로드 성공:', url);
        thumbnailUrl = `${url}?t=${Date.now()}`;
      } catch (r2Error) {
        console.error('[Thumbnail] R2 업로드 실패:', r2Error);
        return NextResponse.json({
          error: 'R2 썸네일 업로드에 실패했습니다.',
          details: r2Error instanceof Error ? r2Error.message : String(r2Error)
        }, { status: 500 });
      }
    } else {
      // Fallback: Supabase Storage 사용
      console.log('[Thumbnail] R2 미설정, Supabase Storage 사용');

      // 기존 썸네일 삭제
      if (board.thumbnail_url) {
        try {
          await adminClient.storage.from('boards').remove([fileKey]);
        } catch {
          // 삭제 실패 무시
        }
      }

      // Supabase Storage에 업로드
      const { error: uploadError } = await adminClient.storage
        .from('boards')
        .upload(fileKey, buffer, {
          contentType: `image/${extension}`,
          upsert: true,
        });

      if (uploadError) {
        console.error('[Thumbnail] Supabase 업로드 실패:', uploadError);
        return NextResponse.json({ error: '썸네일 업로드에 실패했습니다.' }, { status: 500 });
      }

      const { data: urlData } = adminClient.storage.from('boards').getPublicUrl(fileKey);
      thumbnailUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    }

    // 보드 thumbnail_url 업데이트
    const { error: updateError } = await adminClient
      .from('boards')
      .update({ thumbnail_url: thumbnailUrl })
      .eq('id', boardId);

    if (updateError) {
      console.error('[Thumbnail Upload] DB 업데이트 실패:', updateError);
      return NextResponse.json({ error: '썸네일 저장에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ thumbnail_url: thumbnailUrl });
  } catch (error) {
    console.error('[Thumbnail Upload] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
