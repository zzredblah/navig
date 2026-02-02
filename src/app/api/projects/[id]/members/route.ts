import { createClient, createAdminClient } from '@/lib/supabase/server';
import { addMemberSchema } from '@/lib/validations/project';
import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/lib/notifications/service';
import { ActivityLogger } from '@/lib/activity/logger';

type RouteParams = Promise<{ id: string }>;

// 프로젝트 멤버 목록 조회
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

    const adminClient = createAdminClient();

    // 프로젝트 접근 권한 확인 (소유자이거나 멤버)
    const { data: project } = await adminClient
      .from('projects')
      .select('id, client_id')
      .eq('id', id)
      .single();

    if (!project) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const isOwner = project.client_id === user.id;

    const { data: currentMember } = await adminClient
      .from('project_members')
      .select('id')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null) // 초대 수락한 멤버만
      .single();

    if (!isOwner && !currentMember) {
      return NextResponse.json(
        { error: '프로젝트 접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 프로젝트 멤버 목록 조회
    const { data: members, error: membersError } = await adminClient
      .from('project_members')
      .select(`
        id,
        user_id,
        role,
        invited_at,
        joined_at,
        profiles!project_members_user_id_fkey(id, name, email, avatar_url)
      `)
      .eq('project_id', id)
      .order('invited_at', { ascending: false });

    if (membersError) {
      console.error('[Project Members API] 멤버 조회 실패:', membersError);
      return NextResponse.json(
        { error: '멤버 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: members || [] });
  } catch (error) {
    console.error('[Project Members API] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 프로젝트 멤버 추가 (초대)
export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 초대자 프로필 조회
    const { data: inviterProfile } = await adminClient
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();

    // 프로젝트 정보 조회
    const { data: project } = await adminClient
      .from('projects')
      .select('title')
      .eq('id', id)
      .single();

    if (!project) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 멤버 추가 권한 확인 (초대 수락한 owner 또는 editor만)
    const { data: currentMember } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null) // 초대 수락한 멤버만
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

    // 멤버 추가 (초대 상태 - joined_at은 null)
    const { data: newMember, error: insertError } = await adminClient
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
        profiles!project_members_user_id_fkey(id, name, email, avatar_url)
      `)
      .single();

    if (insertError) {
      console.error('[Members API] 멤버 추가 실패:', insertError);
      return NextResponse.json(
        { error: '멤버 추가에 실패했습니다' },
        { status: 400 }
      );
    }

    // 초대 알림 발송
    const roleLabels: Record<string, string> = {
      owner: '소유자',
      approver: '승인자',
      editor: '편집자',
      viewer: '뷰어',
    };

    try {
      await NotificationService.create({
        userId: targetUser.id,
        type: 'project_invite',
        title: '프로젝트 초대',
        content: `${inviterProfile?.name || '알 수 없음'}님이 "${project.title}" 프로젝트에 ${roleLabels[validatedData.role] || validatedData.role}(으)로 초대했습니다.`,
        metadata: {
          project_id: id,
          project_title: project.title,
          member_id: newMember.id,
          role: validatedData.role,
          inviter_id: user.id,
          inviter_name: inviterProfile?.name,
        },
      });
    } catch (notifError) {
      console.error('[Members API] 알림 발송 실패:', notifError);
      // 알림 실패해도 멤버 추가는 성공으로 처리
    }

    // 활동 로그 기록
    await ActivityLogger.logMemberInvited(
      id,
      user.id,
      validatedData.email,
      (newMember.profiles as { name?: string })?.name
    );

    return NextResponse.json({
      message: '멤버를 초대했습니다',
      data: { member: newMember },
    }, { status: 201 });
  } catch (error) {
    console.error('[Members API] 예외:', error);
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
