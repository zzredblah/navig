import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { EditMetadata } from '@/types/editing';

type RouteParams = Promise<{ id: string; editId: string }>;

// 편집 프로젝트 수정 스키마
const updateEditProjectSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  edit_metadata: z.any().optional(), // EditMetadata 타입
  preview_thumbnail_url: z.string().url().optional().nullable(),
});

// 편집 프로젝트 상세 조회
export async function GET(
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

    // 프로젝트 접근 권한 확인
    const { data: member } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .single();

    if (!member) {
      const { data: project } = await adminClient
        .from('projects')
        .select('client_id')
        .eq('id', projectId)
        .single();

      if (!project || project.client_id !== user.id) {
        return NextResponse.json(
          { error: '프로젝트에 접근 권한이 없습니다' },
          { status: 403 }
        );
      }
    }

    // 편집 프로젝트 조회
    const { data: editProject, error: queryError } = await adminClient
      .from('edit_projects')
      .select(`
        *,
        creator:profiles!created_by(id, name, avatar_url),
        source_video:video_versions!source_video_id(
          id, version_name, original_filename, thumbnail_url, hls_url, file_url, duration
        )
      `)
      .eq('id', editId)
      .eq('project_id', projectId)
      .single();

    if (queryError || !editProject) {
      return NextResponse.json(
        { error: '편집 프로젝트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: editProject,
    });
  } catch (error) {
    console.error('[편집 상세] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 편집 프로젝트 수정 (저장)
export async function PATCH(
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

    // 작성자만 수정 가능
    if (editProject.created_by !== user.id) {
      return NextResponse.json(
        { error: '편집 프로젝트 수정 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 등록된 프로젝트는 수정 불가
    if (editProject.status !== 'draft') {
      return NextResponse.json(
        { error: '등록된 편집 프로젝트는 수정할 수 없습니다' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateEditProjectSchema.parse(body);

    // 기존 메타데이터와 병합
    let updateData: Record<string, unknown> = {};

    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title;
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }
    if (validatedData.preview_thumbnail_url !== undefined) {
      updateData.preview_thumbnail_url = validatedData.preview_thumbnail_url;
    }

    // 메타데이터 병합
    if (validatedData.edit_metadata) {
      const { data: currentProject } = await adminClient
        .from('edit_projects')
        .select('edit_metadata')
        .eq('id', editId)
        .single();

      const currentMetadata = (currentProject?.edit_metadata as unknown as EditMetadata) || {};
      updateData.edit_metadata = {
        ...currentMetadata,
        ...validatedData.edit_metadata,
      };
    }

    // 업데이트
    const { data: updated, error: updateError } = await adminClient
      .from('edit_projects')
      .update(updateData)
      .eq('id', editId)
      .select()
      .single();

    if (updateError) {
      console.error('[편집 수정] 업데이트 오류:', updateError);
      return NextResponse.json(
        { error: '편집 프로젝트 수정에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '저장되었습니다',
      data: updated,
    });
  } catch (error) {
    console.error('[편집 수정] 예외:', error);

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

// 편집 프로젝트 삭제
export async function DELETE(
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
      .select('id, created_by, status, source_key')
      .eq('id', editId)
      .eq('project_id', projectId)
      .single();

    if (!editProject) {
      return NextResponse.json(
        { error: '편집 프로젝트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 작성자만 삭제 가능
    if (editProject.created_by !== user.id) {
      return NextResponse.json(
        { error: '편집 프로젝트 삭제 권한이 없습니다' },
        { status: 403 }
      );
    }

    // draft 상태만 삭제 가능
    if (editProject.status !== 'draft') {
      return NextResponse.json(
        { error: '등록된 편집 프로젝트는 삭제할 수 없습니다' },
        { status: 400 }
      );
    }

    // TODO: 업로드된 소스 파일 삭제 (source_key가 있는 경우)

    // 삭제
    const { error: deleteError } = await adminClient
      .from('edit_projects')
      .delete()
      .eq('id', editId);

    if (deleteError) {
      console.error('[편집 삭제] 삭제 오류:', deleteError);
      return NextResponse.json(
        { error: '편집 프로젝트 삭제에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '편집 프로젝트가 삭제되었습니다',
    });
  } catch (error) {
    console.error('[편집 삭제] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
