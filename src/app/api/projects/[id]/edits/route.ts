import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DEFAULT_EDIT_METADATA } from '@/types/editing';

type RouteParams = Promise<{ id: string }>;

// 편집 프로젝트 생성 스키마
const createEditProjectSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다').max(255),
  description: z.string().optional(),
  source_video_id: z.string().uuid().optional(),
});

// 편집 프로젝트 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // 프로젝트 멤버 확인 (초대 수락한 멤버만)
    const { data: member } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .single();

    // 멤버가 아니면 소유자인지 확인
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

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 편집 프로젝트 목록 조회
    let query = adminClient
      .from('edit_projects')
      .select(`
        *,
        creator:profiles!created_by(id, name, avatar_url),
        source_video:video_versions!source_video_id(
          id, version_name, original_filename, thumbnail_url, hls_url, duration
        )
      `, { count: 'exact' })
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status as 'draft' | 'registered' | 'approved' | 'rejected');
    }

    const { data: editProjects, error: queryError, count } = await query;

    if (queryError) {
      console.error('[편집 목록] 조회 오류:', queryError);
      return NextResponse.json(
        { error: '편집 프로젝트 목록 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: editProjects,
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('[편집 목록] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 편집 프로젝트 생성
export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // 프로젝트 멤버 확인 (owner 또는 editor만 생성 가능)
    const { data: member } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .single();

    const isOwnerOrEditor = member && (member.role === 'owner' || member.role === 'editor');

    // 멤버가 아니면 프로젝트 소유자인지 확인
    if (!isOwnerOrEditor) {
      const { data: project } = await adminClient
        .from('projects')
        .select('client_id')
        .eq('id', projectId)
        .single();

      if (!project || project.client_id !== user.id) {
        return NextResponse.json(
          { error: '편집 프로젝트 생성 권한이 없습니다' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const validatedData = createEditProjectSchema.parse(body);

    // 소스 비디오 정보 조회 (선택된 경우)
    let originalDuration: number | null = null;
    let sourceUrl: string | null = null;

    if (validatedData.source_video_id) {
      const { data: sourceVideo } = await adminClient
        .from('video_versions')
        .select('duration, hls_url, file_url')
        .eq('id', validatedData.source_video_id)
        .single();

      if (sourceVideo) {
        originalDuration = sourceVideo.duration;
        sourceUrl = sourceVideo.hls_url || sourceVideo.file_url;
      }
    }

    // 기본 편집 메타데이터 설정
    const editMetadata = {
      ...DEFAULT_EDIT_METADATA,
      trim: {
        startTime: 0,
        endTime: originalDuration || 0,
      },
    };

    // 편집 프로젝트 생성
    const { data: editProject, error: insertError } = await adminClient
      .from('edit_projects')
      .insert({
        project_id: projectId,
        title: validatedData.title,
        description: validatedData.description || null,
        source_video_id: validatedData.source_video_id || null,
        source_url: sourceUrl,
        original_duration: originalDuration,
        edit_metadata: editMetadata,
        created_by: user.id,
      })
      .select(`
        *,
        creator:profiles!created_by(id, name, avatar_url)
      `)
      .single();

    if (insertError) {
      console.error('[편집 생성] 삽입 오류:', insertError);
      return NextResponse.json(
        { error: '편집 프로젝트 생성에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '편집 프로젝트가 생성되었습니다',
      data: editProject,
    }, { status: 201 });
  } catch (error) {
    console.error('[편집 생성] 예외:', error);

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
