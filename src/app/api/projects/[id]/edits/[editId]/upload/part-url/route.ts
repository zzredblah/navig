import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPresignedPartUrl } from '@/lib/cloudflare/r2';

type RouteParams = Promise<{ id: string; editId: string }>;

const partUrlSchema = z.object({
  uploadId: z.string().min(1),
  key: z.string().min(1),
  partNumber: z.number().positive(),
});

// 파트 업로드 URL 생성
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
      .select('id, created_by')
      .eq('id', editId)
      .eq('project_id', projectId)
      .single();

    if (!editProject || editProject.created_by !== user.id) {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { uploadId, key, partNumber } = partUrlSchema.parse(body);

    // Presigned URL 생성
    const url = await createPresignedPartUrl('videos', key, uploadId, partNumber);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[파트 URL] 예외:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '입력값이 유효하지 않습니다' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
