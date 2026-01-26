/**
 * 메시지 리액션 API
 * POST   - 리액션 추가
 * DELETE - 리액션 제거
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

const reactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

// POST: 리액션 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;
    const supabase = await createClient();

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

    // 메시지 존재 및 접근 권한 확인
    const { data: message, error: msgError } = await adminClient
      .from('chat_messages')
      .select('id, room_id')
      .eq('id', messageId)
      .single();

    if (msgError || !message) {
      return NextResponse.json(
        { error: '메시지를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 채팅방 멤버 확인
    const { data: membership } = await adminClient
      .from('chat_room_members')
      .select('id')
      .eq('room_id', (message as { room_id: string }).room_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: '채팅방에 접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = reactionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '유효하지 않은 요청입니다' },
        { status: 400 }
      );
    }

    const { emoji } = validationResult.data;

    // 기존 리액션 확인
    const { data: existingReactions } = await adminClient
      .from('chat_message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .limit(1);

    // 이미 존재하면 성공으로 처리
    if (existingReactions && existingReactions.length > 0) {
      return NextResponse.json({ reaction: existingReactions[0], existing: true }, { status: 200 });
    }

    // 리액션 추가
    const { data: reaction, error: insertError } = await adminClient
      .from('chat_message_reactions')
      .insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      })
      .select()
      .single();

    if (insertError) {
      // 동시 요청으로 중복 발생 시 성공으로 처리
      if (insertError.code === '23505') {
        return NextResponse.json({ existing: true }, { status: 200 });
      }
      console.error('[Reaction POST] 추가 오류:', insertError);
      return NextResponse.json(
        { error: '리액션 추가에 실패했습니다', details: insertError.message, code: insertError.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ reaction }, { status: 201 });
  } catch (error) {
    console.error('[Reaction POST] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE: 리액션 제거
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;
    const supabase = await createClient();

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

    const searchParams = request.nextUrl.searchParams;
    const emoji = searchParams.get('emoji');

    if (!emoji) {
      return NextResponse.json(
        { error: '이모지가 필요합니다' },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient = createAdminClient() as any;

    const { error: deleteError } = await adminClient
      .from('chat_message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);

    if (deleteError) {
      console.error('[Reaction DELETE] 삭제 오류:', deleteError);
      return NextResponse.json(
        { error: '리액션 삭제에 실패했습니다', details: deleteError.message, code: deleteError.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Reaction DELETE] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
