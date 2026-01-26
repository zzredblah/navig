/**
 * 개별 채팅방 API
 * GET   - 채팅방 상세 조회
 * PATCH - 읽음 상태 업데이트
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// GET: 채팅방 상세 조회
export async function GET(
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

    // 멤버십 확인
    const { data: membership, error: memberError } = await adminClient
      .from('chat_room_members')
      .select('id, last_read_at')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: '채팅방에 접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 채팅방 정보 조회
    const { data: room, error: roomError } = await adminClient
      .from('chat_rooms')
      .select(`
        *,
        project:projects(id, title)
      `)
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: '채팅방을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 멤버 목록 조회
    const { data: members } = await adminClient
      .from('chat_room_members')
      .select(`
        *,
        user:profiles(id, name, avatar_url)
      `)
      .eq('room_id', roomId);

    // DM인 경우 상대방 정보
    let otherUser = null;
    if ((room as { type: string }).type === 'direct' && members) {
      const other = (members as { user_id: string; user: unknown }[]).find((m) => m.user_id !== user.id);
      otherUser = other?.user || null;
    }

    return NextResponse.json({
      room: {
        ...room,
        members: members || [],
        otherUser,
      },
    });
  } catch (error) {
    console.error('[Chat Room GET] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// PATCH: 읽음 상태 업데이트
export async function PATCH(
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

    // 읽음 상태 업데이트
    const { error: updateError } = await adminClient
      .from('chat_room_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[Chat Room PATCH] 업데이트 오류:', updateError);
      return NextResponse.json(
        { error: '읽음 상태 업데이트에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Chat Room PATCH] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
