import { createClient } from '@/lib/supabase/server';
import { addMemberSchema } from '@/lib/validations/project';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = Promise<{ id: string }>;

// 프로젝트 멤버 추가
export async function POST(
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

    // 멤버 추가 권한 확인 (owner 또는 editor만)
    const { data: currentMember } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .single();

    if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'editor')) {
      return NextResponse.json(
        { error: '멤버 추가 권한이 없습니다' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = addMemberSchema.parse(body);

    // 이메일로 사용자 찾기
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', validatedData.email)
      .single();

    if (!targetUser) {
      return NextResponse.json(
        { error: '해당 이메일의 사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 이미 멤버인지 확인
    const { data: existingMember } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', id)
      .eq('user_id', targetUser.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: '이미 프로젝트 멤버입니다' },
        { status: 400 }
      );
    }

    // owner 역할은 기존 owner만 부여 가능
    if (validatedData.role === 'owner' && currentMember.role !== 'owner') {
      return NextResponse.json(
        { error: 'owner 역할은 owner만 부여할 수 있습니다' },
        { status: 403 }
      );
    }

    // 멤버 추가
    const { data: newMember, error: insertError } = await supabase
      .from('project_members')
      .insert({
        project_id: id,
        user_id: targetUser.id,
        role: validatedData.role,
      })
      .select(`
        id,
        user_id,
        role,
        invited_at,
        profiles(id, name, email, avatar_url)
      `)
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: '멤버 추가에 실패했습니다' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: '멤버가 추가되었습니다',
      data: { member: newMember },
    }, { status: 201 });
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
