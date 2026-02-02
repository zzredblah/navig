/**
 * 보드 미디어 업로드 API
 * POST - 이미지/영상 파일을 R2에 업로드하고 영구 URL 반환
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { uploadFile, generateFileKey, getContentType } from '@/lib/cloudflare/r2';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
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

    // 보드 존재 확인
    const adminClient = createAdminClient();
    const { data: board, error: boardError } = await adminClient
      .from('boards')
      .select('id, project_id')
      .eq('id', boardId)
      .single();

    if (boardError || !board) {
      return NextResponse.json(
        { error: '보드를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 프로젝트 멤버 확인
    const { data: memberCheck } = await adminClient
      .from('project_members')
      .select('id')
      .eq('project_id', board.project_id)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .limit(1);

    const { data: ownerCheck } = await adminClient
      .from('projects')
      .select('id')
      .eq('id', board.project_id)
      .eq('client_id', user.id)
      .limit(1);

    if ((!memberCheck || memberCheck.length === 0) && (!ownerCheck || ownerCheck.length === 0)) {
      return NextResponse.json(
        { error: '접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 파일 처리
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as 'image' | 'video' | null;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 필요합니다' },
        { status: 400 }
      );
    }

    // 파일 크기 제한 (이미지: 10MB, 영상: 100MB)
    const maxSize = type === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `파일 크기가 ${type === 'video' ? '100MB' : '10MB'}를 초과합니다` },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const allowedTypes = type === 'video' ? allowedVideoTypes : allowedImageTypes;

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다' },
        { status: 400 }
      );
    }

    // R2에 업로드 (src 버킷의 board-media 폴더)
    const fileKey = generateFileKey(`board-media/${boardId}`, file.name, user.id);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { url } = await uploadFile('src', fileKey, buffer, file.type);

    return NextResponse.json({
      url,
      key: fileKey,
      filename: file.name,
      type: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error('[Board Media Upload] 예외:', error);
    return NextResponse.json(
      { error: '파일 업로드에 실패했습니다' },
      { status: 500 }
    );
  }
}
