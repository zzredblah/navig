/**
 * 대화 내용 전체 삭제 API
 * POST /api/chat/rooms/[id]/clear
 *
 * 나에게만: cleared_at 업데이트 (해당 시간 이전 메시지 숨김)
 * 모두에게: 모든 메시지의 is_deleted = true 처리
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

const clearRequestSchema = z.object({
  type: z.enum(['me_only', 'everyone']),
});

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

    // 요청 바디 파싱
    const body = await request.json();
    const validationResult = clearRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '유효하지 않은 요청입니다' },
        { status: 400 }
      );
    }

    const { type } = validationResult.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient = createAdminClient() as any;

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

    if (type === 'me_only') {
      // 나에게만 삭제: cleared_at 업데이트
      const { error: updateError } = await adminClient
        .from('chat_room_members')
        .update({ cleared_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[Chat Clear] cleared_at 업데이트 오류:', updateError);
        return NextResponse.json(
          { error: '대화 내용 삭제에 실패했습니다' },
          { status: 500 }
        );
      }
    } else {
      // 모두에게 삭제: 모든 메시지 soft delete
      // 주의: 본인이 보낸 메시지만 삭제 가능
      const { error: deleteError } = await adminClient
        .from('chat_messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          content: '삭제된 메시지입니다',
        })
        .eq('room_id', roomId)
        .eq('sender_id', user.id);

      if (deleteError) {
        console.error('[Chat Clear] 메시지 삭제 오류:', deleteError);
        return NextResponse.json(
          { error: '대화 내용 삭제에 실패했습니다' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Chat Clear] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
