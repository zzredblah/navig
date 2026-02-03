/**
 * 프로젝트 초대 수락/거절 API
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ActivityLogger } from '@/lib/activity/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any; // chat_rooms, chat_room_members 테이블 타입 미정의로 any 사용

type RouteParams = Promise<{ memberId: string }>;

// 초대 수락
export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { memberId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 멤버 레코드 조회 (본인 것만)
    const { data: member, error: memberError } = await adminClient
      .from('project_members')
      .select('id, project_id, user_id, role, joined_at')
      .eq('id', memberId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: '초대를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 이미 수락한 경우
    if (member.joined_at) {
      return NextResponse.json(
        { error: '이미 수락한 초대입니다' },
        { status: 400 }
      );
    }

    // 초대 수락 (joined_at 업데이트)
    const { error: updateError } = await adminClient
      .from('project_members')
      .update({ joined_at: new Date().toISOString() })
      .eq('id', memberId);

    if (updateError) {
      console.error('[Invitation API] 수락 실패:', updateError);
      return NextResponse.json(
        { error: '초대 수락에 실패했습니다' },
        { status: 500 }
      );
    }

    // 프로젝트 정보 및 사용자 정보 가져오기
    const { data: project } = await adminClient
      .from('projects')
      .select('title')
      .eq('id', member.project_id)
      .single();

    const { data: profile } = await adminClient
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();

    // 프로젝트 채팅방에 멤버 추가
    const chatClient = adminClient as AdminClient;
    const { data: chatRoom } = await chatClient
      .from('chat_rooms')
      .select('id')
      .eq('type', 'project')
      .eq('project_id', member.project_id)
      .single();

    if (chatRoom) {
      // 이미 멤버인지 확인
      const { data: existingMember } = await chatClient
        .from('chat_room_members')
        .select('id')
        .eq('room_id', chatRoom.id)
        .eq('user_id', user.id)
        .single();

      if (!existingMember) {
        const { error: chatMemberError } = await chatClient
          .from('chat_room_members')
          .insert({
            room_id: chatRoom.id,
            user_id: user.id,
          });

        if (chatMemberError) {
          console.error('[Invitation API] 채팅방 멤버 추가 실패:', chatMemberError);
        }
      }
    }

    // 활동 로그 기록
    await ActivityLogger.logMemberJoined(
      member.project_id,
      user.id,
      profile?.name || user.email || '멤버'
    );

    return NextResponse.json({
      message: '초대를 수락했습니다',
      data: {
        project_id: member.project_id,
        project_title: project?.title,
      },
    });
  } catch (error) {
    console.error('[Invitation API] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 초대 거절 (멤버 삭제)
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { memberId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 멤버 레코드 조회 (본인 것만)
    const { data: member, error: memberError } = await adminClient
      .from('project_members')
      .select('id, project_id, user_id, joined_at')
      .eq('id', memberId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: '초대를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 이미 수락한 경우 거절 불가
    if (member.joined_at) {
      return NextResponse.json(
        { error: '이미 수락한 초대는 거절할 수 없습니다' },
        { status: 400 }
      );
    }

    // 멤버 레코드 삭제 (초대 거절)
    const { error: deleteError } = await adminClient
      .from('project_members')
      .delete()
      .eq('id', memberId);

    if (deleteError) {
      console.error('[Invitation API] 거절 실패:', deleteError);
      return NextResponse.json(
        { error: '초대 거절에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '초대를 거절했습니다',
    });
  } catch (error) {
    console.error('[Invitation API] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
