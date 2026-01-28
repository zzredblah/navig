import { createClient, createAdminClient } from '@/lib/supabase/server';
import { updateMemberSchema } from '@/lib/validations/project';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = Promise<{ id: string; memberId: string }>;

// 멤버 역할 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id, memberId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 현재 사용자의 권한 확인 (초대 수락한 owner만 역할 변경 가능)
    const { data: currentMember } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null) // 초대 수락한 멤버만
      .single();

    if (!currentMember || currentMember.role !== 'owner') {
      return NextResponse.json(
        { error: '멤버 역할 수정 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 대상 멤버 확인
    const { data: targetMember } = await adminClient
      .from('project_members')
      .select('user_id, role')
      .eq('id', memberId)
      .eq('project_id', id)
      .single();

    if (!targetMember) {
      return NextResponse.json(
        { error: '멤버를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 자기 자신의 역할은 변경 불가
    if (targetMember.user_id === user.id) {
      return NextResponse.json(
        { error: '자신의 역할은 변경할 수 없습니다' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateMemberSchema.parse(body);

    // 멤버 역할 업데이트
    const { data: updatedMember, error: updateError } = await adminClient
      .from('project_members')
      .update({ role: validatedData.role })
      .eq('id', memberId)
      .select(`
        id,
        user_id,
        role,
        invited_at,
        profiles(id, name, email, avatar_url)
      `)
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: '멤버 역할 수정에 실패했습니다' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: '멤버 역할이 수정되었습니다',
      data: { member: updatedMember },
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

// 멤버 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id, memberId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 현재 사용자의 권한 확인 (초대 수락한 멤버만)
    const { data: currentMember } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null) // 초대 수락한 멤버만
      .single();

    if (!currentMember) {
      return NextResponse.json(
        { error: '프로젝트에 접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 대상 멤버 확인
    const { data: targetMember } = await adminClient
      .from('project_members')
      .select('user_id, role')
      .eq('id', memberId)
      .eq('project_id', id)
      .single();

    if (!targetMember) {
      return NextResponse.json(
        { error: '멤버를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 자신을 삭제하는 경우 (프로젝트 탈퇴)
    if (targetMember.user_id === user.id) {
      // owner는 탈퇴 불가 (다른 사람에게 owner 양도 후 탈퇴)
      if (targetMember.role === 'owner') {
        return NextResponse.json(
          { error: 'owner는 프로젝트를 탈퇴할 수 없습니다. 먼저 다른 멤버에게 owner 역할을 양도하세요.' },
          { status: 400 }
        );
      }
    } else {
      // 다른 멤버를 삭제하는 경우 owner 또는 editor만 가능
      if (currentMember.role !== 'owner' && currentMember.role !== 'editor') {
        return NextResponse.json(
          { error: '멤버 삭제 권한이 없습니다' },
          { status: 403 }
        );
      }

      // owner는 owner만 삭제 가능
      if (targetMember.role === 'owner' && currentMember.role !== 'owner') {
        return NextResponse.json(
          { error: 'owner는 다른 owner만 삭제할 수 있습니다' },
          { status: 403 }
        );
      }
    }

    const { error: deleteError } = await adminClient
      .from('project_members')
      .delete()
      .eq('id', memberId);

    if (deleteError) {
      return NextResponse.json(
        { error: '멤버 삭제에 실패했습니다' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: '멤버가 삭제되었습니다',
    });
  } catch {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
