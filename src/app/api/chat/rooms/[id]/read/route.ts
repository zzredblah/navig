/**
 * 채팅 메시지 읽음 처리 API
 * POST - 여러 메시지를 읽음 처리
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 읽음 처리 요청 스키마
const markReadSchema = z.object({
  message_ids: z.array(z.string().uuid()).min(1, '메시지 ID가 필요합니다'),
});

// POST: 메시지 읽음 처리
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

    // 멤버십 확인
    const { data: membership } = await adminClient
      .from('chat_room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: '채팅방에 접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 요청 바디 파싱
    const body = await request.json();
    const validationResult = markReadSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: '유효하지 않은 요청입니다',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { message_ids } = validationResult.data;

    // 해당 채팅방의 메시지인지 확인
    const { data: validMessages } = await adminClient
      .from('chat_messages')
      .select('id')
      .eq('room_id', roomId)
      .in('id', message_ids);

    if (!validMessages || validMessages.length === 0) {
      return NextResponse.json(
        { error: '유효한 메시지가 없습니다' },
        { status: 400 }
      );
    }

    const validMessageIds = validMessages.map((m: { id: string }) => m.id);

    // 이미 읽은 메시지 확인
    const { data: existingReads } = await adminClient
      .from('chat_message_reads')
      .select('message_id')
      .eq('user_id', user.id)
      .in('message_id', validMessageIds);

    const alreadyReadIds = new Set(
      (existingReads || []).map((r: { message_id: string }) => r.message_id)
    );

    // 아직 읽지 않은 메시지만 읽음 처리
    const unreadMessageIds = validMessageIds.filter(
      (id: string) => !alreadyReadIds.has(id)
    );

    if (unreadMessageIds.length > 0) {
      const readRecords = unreadMessageIds.map((message_id: string) => ({
        message_id,
        user_id: user.id,
      }));

      await adminClient.from('chat_message_reads').insert(readRecords);
    }

    // 마지막 읽은 시간 업데이트
    await adminClient
      .from('chat_room_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      read_count: unreadMessageIds.length,
    });
  } catch (error) {
    console.error('[Chat Read POST] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
