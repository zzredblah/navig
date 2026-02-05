import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { completeMultipartUpload, type UploadPartResult } from '@/lib/cloudflare/r2';

type RouteParams = Promise<{ id: string; editId: string }>;

const uploadCompleteSchema = z.object({
  uploadId: z.string().min(1),
  key: z.string().min(1),
  parts: z.array(z.object({
    partNumber: z.number().positive(),
    etag: z.string().min(1),
  })).transform((parts): UploadPartResult[] => parts.map(p => ({
    partNumber: p.partNumber,
    etag: p.etag,
  }))),
  duration: z.number().optional(), // 클라이언트에서 추출한 duration
  thumbnailUrl: z.string().url().optional(), // 썸네일 URL
});

// 업로드 완료
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

    if (editProject.status !== 'draft') {
      return NextResponse.json(
        { error: '등록된 프로젝트는 수정할 수 없습니다' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { uploadId, key, parts, duration, thumbnailUrl } = uploadCompleteSchema.parse(body);

    // 멀티파트 업로드 완료
    const { url } = await completeMultipartUpload('videos', key, uploadId, parts);

    // 편집 프로젝트 업데이트 (duration, thumbnailUrl은 클라이언트에서 제공)
    const updateData: Record<string, unknown> = {
      source_url: url,
      source_key: key,
    };

    if (duration) {
      updateData.original_duration = duration;
    }

    if (thumbnailUrl) {
      updateData.preview_thumbnail_url = thumbnailUrl;
    }

    const { error: updateError } = await adminClient
      .from('edit_projects')
      .update(updateData)
      .eq('id', editId);

    if (updateError) {
      console.error('[업로드 완료] DB 업데이트 오류:', updateError);
      return NextResponse.json(
        { error: '프로젝트 업데이트에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '영상 업로드가 완료되었습니다',
      sourceUrl: url,
      sourceKey: key,
    });
  } catch (error) {
    console.error('[업로드 완료] 예외:', error);

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
