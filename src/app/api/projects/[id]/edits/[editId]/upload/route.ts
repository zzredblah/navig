import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { initiateMultipartUpload, createPresignedPartUrl } from '@/lib/cloudflare/r2';

type RouteParams = Promise<{ id: string; editId: string }>;

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

const uploadInitSchema = z.object({
  filename: z.string().min(1),
  fileSize: z.number().positive(),
  contentType: z.string().min(1),
});

// 업로드 시작
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

    // 편집 프로젝트 조회 및 권한 확인
    const { data: editProject } = await adminClient
      .from('edit_projects')
      .select('id, created_by, status, source_url')
      .eq('id', editId)
      .eq('project_id', projectId)
      .single();

    if (!editProject) {
      return NextResponse.json(
        { error: '편집 프로젝트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 작성자만 업로드 가능
    if (editProject.created_by !== user.id) {
      return NextResponse.json(
        { error: '업로드 권한이 없습니다' },
        { status: 403 }
      );
    }

    // draft 상태만 업로드 가능
    if (editProject.status !== 'draft') {
      return NextResponse.json(
        { error: '등록된 편집 프로젝트에는 영상을 업로드할 수 없습니다' },
        { status: 400 }
      );
    }

    // 이미 영상이 있는 경우
    if (editProject.source_url) {
      return NextResponse.json(
        { error: '이미 영상이 있습니다. 기존 영상을 삭제 후 업로드해주세요' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = uploadInitSchema.parse(body);

    // 파일 키 생성
    const timestamp = Date.now();
    const sanitizedFilename = validatedData.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileKey = `edits/${projectId}/${editId}/${timestamp}-${sanitizedFilename}`;

    // 멀티파트 업로드 시작
    const { uploadId, key } = await initiateMultipartUpload(
      'videos',
      fileKey,
      validatedData.contentType
    );

    // 파트 수 계산 및 Presigned URL 생성 (최대 10개까지 미리 생성)
    const totalParts = Math.ceil(validatedData.fileSize / CHUNK_SIZE);
    const preGenerateParts = Math.min(totalParts, 10);
    const parts: string[] = [];

    for (let i = 1; i <= preGenerateParts; i++) {
      const url = await createPresignedPartUrl('videos', key, uploadId, i);
      parts.push(url);
    }

    return NextResponse.json({
      uploadId,
      key,
      parts,
      totalParts,
    });
  } catch (error) {
    console.error('[편집 업로드] 예외:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '입력값이 유효하지 않습니다', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
