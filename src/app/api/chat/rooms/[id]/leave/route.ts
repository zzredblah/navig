/**
 * 채팅방 나가기 API
 * POST /api/chat/rooms/[id]/leave
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const supabase = await createClient();

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient = createAdminClient() as any;

    // 채팅방 정보 확인
    const { data: room, error: roomError } = await adminClient
      .from('chat_rooms')
      .select('id, type, project_id')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: '채팅방을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 프로젝트 채팅방만 나가기 가능 (1:1 DM은 나가기 불가)
    if (room.type === 'direct') {
      return NextResponse.json(
        { error: '1:1 채팅방은 나갈 수 없습니다' },
        { status: 400 }
      );
    }

    // 멤버십 확인
    const { data: membership, error: memberError } = await adminClient
      .from('chat_room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: '채팅방 멤버가 아닙니다' },
        { status: 403 }
      );
    }

    // 채팅방 멤버에서 제거
    const { error: deleteError } = await adminClient
      .from('chat_room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[Chat Room Leave] 멤버 삭제 오류:', deleteError);
      return NextResponse.json(
        { error: '채팅방 나가기에 실패했습니다' },
        { status: 500 }
      );
    }

    // 남은 멤버 수 확인
    const { count: remainingMembers } = await adminClient
      .from('chat_room_members')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomId);

    // 멤버가 0명이면 채팅방 삭제 (프로젝트 채팅방이 아닌 경우)
    if (remainingMembers === 0 && !room.project_id) {
      await adminClient
        .from('chat_rooms')
        .delete()
        .eq('id', roomId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Chat Room Leave] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
