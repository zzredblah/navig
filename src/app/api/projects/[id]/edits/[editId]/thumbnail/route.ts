import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/cloudflare/r2';

type RouteParams = Promise<{ id: string; editId: string }>;

// 편집 프로젝트 썸네일 업로드
export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id: projectId, editId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // 편집 프로젝트 권한 확인
    const { data: editProject } = await adminClient
      .from('edit_projects')
      .select('id, created_by, status')
      .eq('id', editId)
      .eq('project_id', projectId)
      .single();

    if (!editProject) {
      return NextResponse.json(
        { error: '편집 프로젝트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (editProject.created_by !== user.id) {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      );
    }

    // FormData에서 파일 추출
    const formData = await request.formData();
    const thumbnailFile = formData.get('thumbnail') as File | null;

    if (!thumbnailFile) {
      return NextResponse.json(
        { error: '썸네일 파일이 없습니다' },
        { status: 400 }
      );
    }

    // 파일 크기 제한 (5MB)
    if (thumbnailFile.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: '썸네일은 5MB 이하만 가능합니다' },
        { status: 400 }
      );
    }

    // 파일 타입 확인
    if (!thumbnailFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '이미지 파일만 업로드 가능합니다' },
        { status: 400 }
      );
    }

    // Buffer로 변환
    const arrayBuffer = await thumbnailFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // R2에 업로드 (src 버킷의 edit-thumbnails 폴더)
    const fileKey = `edit-thumbnails/${projectId}/${editId}.jpg`;
    const { url } = await uploadFile('src', fileKey, buffer, 'image/jpeg');

    // DB 업데이트
    const { error: updateError } = await adminClient
      .from('edit_projects')
      .update({ preview_thumbnail_url: url })
      .eq('id', editId);

    if (updateError) {
      console.error('[썸네일 업로드] DB 업데이트 오류:', updateError);
    }

    return NextResponse.json({
      url,
      message: '썸네일이 업로드되었습니다',
    });
  } catch (error) {
    console.error('[썸네일 업로드] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
