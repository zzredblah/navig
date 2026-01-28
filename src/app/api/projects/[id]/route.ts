import { createClient, createAdminClient } from '@/lib/supabase/server';
import { updateProjectSchema } from '@/lib/validations/project';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = Promise<{ id: string }>;

// 프로젝트 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // Admin 클라이언트 사용 (RLS 우회)
    const adminClient = createAdminClient();

    // 프로젝트 멤버인지 확인 (멤버 또는 클라이언트)
    const { data: member } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .single();

    // 멤버가 아니면 프로젝트 소유자인지 확인
    if (!member) {
      const { data: project } = await adminClient
        .from('projects')
        .select('client_id')
        .eq('id', id)
        .single();

      if (!project || project.client_id !== user.id) {
        return NextResponse.json(
          { error: '프로젝트에 접근 권한이 없습니다' },
          { status: 403 }
        );
      }
    }

    const userRole = member?.role || 'owner';

    // 프로젝트 상세 조회
    const { data: project, error: queryError } = await adminClient
      .from('projects')
      .select(`
        *,
        project_members(
          id,
          user_id,
          role,
          invited_at,
          profiles(id, name, email, avatar_url)
        )
      `)
      .eq('id', id)
      .single();

    if (queryError || !project) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: { project, userRole },
    });
  } catch {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 프로젝트 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // 프로젝트 수정 권한 확인 (owner 또는 editor만)
    const { data: member } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .single();

    if (!member || (member.role !== 'owner' && member.role !== 'editor')) {
      return NextResponse.json(
        { error: '프로젝트 수정 권한이 없습니다' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateProjectSchema.parse(body);

    const { data: project, error: updateError } = await adminClient
      .from('projects')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: '프로젝트 수정에 실패했습니다' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: '프로젝트가 수정되었습니다',
      data: { project },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
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

// 프로젝트 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // 프로젝트 삭제 권한 확인 (owner만)
    const { data: member } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .single();

    if (!member || member.role !== 'owner') {
      return NextResponse.json(
        { error: '프로젝트 삭제 권한이 없습니다' },
        { status: 403 }
      );
    }

    const { error: deleteError } = await adminClient
      .from('projects')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { error: '프로젝트 삭제에 실패했습니다' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: '프로젝트가 삭제되었습니다',
    });
  } catch {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
