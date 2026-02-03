/**
 * 프로젝트 채팅방 API
 * GET - 프로젝트 채팅방 조회 (없으면 자동 생성)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any; // chat_rooms, chat_room_members 테이블 타입 미정의로 any 사용

type RouteParams = Promise<{ id: string }>;

// GET: 프로젝트 채팅방 조회 또는 생성
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 프로젝트 존재 및 권한 확인
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('id, title, client_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 프로젝트 멤버인지 확인 (소유자 또는 멤버)
    const isOwner = project.client_id === user.id;

    const { data: membership } = await adminClient
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .single();

    if (!isOwner && !membership) {
      return NextResponse.json(
        { error: '프로젝트 접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 기존 채팅방 조회
    const chatClient = adminClient as AdminClient;
    let { data: chatRoom } = await chatClient
      .from('chat_rooms')
      .select('id, name, type, project_id, created_at')
      .eq('type', 'project')
      .eq('project_id', projectId)
      .single();

    // 채팅방이 없으면 생성
    if (!chatRoom) {
      console.log('[Project Chat API] 채팅방 없음, 새로 생성:', projectId);

      const { data: newRoom, error: createError } = await chatClient
        .from('chat_rooms')
        .insert({
          type: 'project',
          project_id: projectId,
          name: project.title,
        })
        .select()
        .single();

      if (createError) {
        console.error('[Project Chat API] 채팅방 생성 실패:', createError);
        return NextResponse.json(
          { error: '채팅방 생성에 실패했습니다' },
          { status: 500 }
        );
      }

      chatRoom = newRoom;

      // 프로젝트의 모든 멤버를 채팅방에 추가
      const { data: projectMembers } = await adminClient
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)
        .not('joined_at', 'is', null);

      // 소유자도 포함
      const memberUserIds = new Set<string>();
      memberUserIds.add(project.client_id); // 소유자

      if (projectMembers) {
        projectMembers.forEach((m) => memberUserIds.add(m.user_id));
      }

      // 채팅방 멤버 추가
      const memberInserts = Array.from(memberUserIds).map((userId) => ({
        room_id: chatRoom!.id,
        user_id: userId,
      }));

      const { error: memberError } = await chatClient
        .from('chat_room_members')
        .insert(memberInserts);

      if (memberError) {
        console.error('[Project Chat API] 멤버 추가 실패:', memberError);
      }

      console.log('[Project Chat API] 채팅방 생성 완료:', chatRoom.id, '멤버:', memberInserts.length);
    } else {
      // 현재 사용자가 채팅방 멤버인지 확인, 아니면 추가
      const { data: existingMember } = await chatClient
        .from('chat_room_members')
        .select('id')
        .eq('room_id', chatRoom.id)
        .eq('user_id', user.id)
        .single();

      if (!existingMember) {
        await chatClient
          .from('chat_room_members')
          .insert({
            room_id: chatRoom.id,
            user_id: user.id,
          });

        console.log('[Project Chat API] 현재 사용자 채팅방 멤버로 추가:', user.id);
      }
    }

    return NextResponse.json({
      data: {
        room_id: chatRoom.id,
        name: chatRoom.name,
        project_id: projectId,
      },
    });
  } catch (error) {
    console.error('[Project Chat API] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
