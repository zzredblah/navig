import { createAdminClient } from '@/lib/supabase/server';
import { updateProjectSchema } from '@/lib/validations/project';
import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  checkProjectAccess,
  handleError,
} from '@/lib/api';

type RouteParams = Promise<{ id: string }>;

// 프로젝트 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id } = await params;

    // 인증 확인
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    // 프로젝트 접근 권한 확인
    const { role, error: accessError } = await checkProjectAccess(id, user!.id);
    if (accessError) return accessError;

    const userRole = role || 'owner';

    // 프로젝트 상세 조회
    const adminClient = createAdminClient();
    const { data: project, error: queryError } = await adminClient
      .from('projects')
      .select(`
        *,
        project_members(
          id,
          user_id,
          role,
          invited_at,
          joined_at,
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
  } catch (error) {
    return handleError(error, 'Projects API GET');
  }
}

// 프로젝트 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id } = await params;

    // 인증 확인
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    // 프로젝트 수정 권한 확인 (owner 또는 editor만)
    const { error: accessError } = await checkProjectAccess(id, user!.id, [
      'owner',
      'editor',
    ]);
    if (accessError) return accessError;

    const adminClient = createAdminClient();
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
    return handleError(error, 'Projects API PATCH');
  }
}

// 프로젝트 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id } = await params;

    // 인증 확인
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    // 프로젝트 삭제 권한 확인 (owner만)
    const { error: accessError } = await checkProjectAccess(id, user!.id, [
      'owner',
    ]);
    if (accessError) return accessError;

    const adminClient = createAdminClient();
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
  } catch (error) {
    return handleError(error, 'Projects API DELETE');
  }
}
