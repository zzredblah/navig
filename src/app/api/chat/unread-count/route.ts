/**
 * 읽지 않은 채팅 메시지 수 API
 * GET - 전체 읽지 않은 메시지 수 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
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

    // 사용자가 속한 채팅방 목록 조회
    const { data: memberships, error: memberError } = await adminClient
      .from('chat_room_members')
      .select('room_id, last_read_at')
      .eq('user_id', user.id);

    if (memberError || !memberships || memberships.length === 0) {
      return NextResponse.json({ unread_count: 0 });
    }

    // 각 채팅방의 읽지 않은 메시지 수 합계
    let totalUnread = 0;

    for (const membership of memberships) {
      if (membership.last_read_at) {
        const { count } = await adminClient
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', membership.room_id)
          .gt('created_at', membership.last_read_at)
          .neq('sender_id', user.id);

        totalUnread += count || 0;
      }
    }

    return NextResponse.json({ unread_count: totalUnread });
  } catch (error) {
    console.error('[Chat Unread Count] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
