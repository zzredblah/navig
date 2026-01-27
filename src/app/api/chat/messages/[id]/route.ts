/**
 * 개별 메시지 API
 * PATCH  - 메시지 수정
 * DELETE - 메시지 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

// PATCH: 메시지 수정
export async function PATCH(
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

    // 메시지 조회 및 소유권 확인
    const { data: message, error: queryError } = await adminClient
      .from('chat_messages')
      .select('id, sender_id')
      .eq('id', messageId)
      .single();

    if (queryError || !message) {
      return NextResponse.json(
        { error: '메시지를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if ((message as { sender_id: string }).sender_id !== user.id) {
      return NextResponse.json(
        { error: '본인의 메시지만 수정할 수 있습니다' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = updateMessageSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '유효하지 않은 요청입니다' },
        { status: 400 }
      );
    }

    const { content } = validationResult.data;

    const { data: updated, error: updateError } = await adminClient
      .from('chat_messages')
      .update({
        content,
        is_edited: true,
      })
      .eq('id', messageId)
      .select()
      .single();

    if (updateError) {
      console.error('[Chat Message PATCH] 수정 오류:', updateError);
      return NextResponse.json(
        { error: '메시지 수정에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: updated });
  } catch (error) {
    console.error('[Chat Message PATCH] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// DELETE: 메시지 삭제
// Query params:
//   - type: 'everyone' (모두에게 삭제, 기본값) | 'me_only' (나에게만 삭제)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;
    const { searchParams } = new URL(request.url);
    const deleteType = searchParams.get('type') || 'everyone';

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

    // 메시지 조회
    const { data: message, error: queryError } = await adminClient
      .from('chat_messages')
      .select('id, sender_id, room_id')
      .eq('id', messageId)
      .single();

    if (queryError || !message) {
      return NextResponse.json(
        { error: '메시지를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 채팅방 멤버인지 확인
    const { data: membership } = await adminClient
      .from('chat_room_members')
      .select('id')
      .eq('room_id', message.room_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: '채팅방 멤버가 아닙니다' },
        { status: 403 }
      );
    }

    if (deleteType === 'me_only') {
      // 나에게만 삭제: chat_message_deletions 테이블에 기록
      const { error: insertError } = await adminClient
        .from('chat_message_deletions')
        .upsert({
          message_id: messageId,
          user_id: user.id,
          deleted_at: new Date().toISOString(),
        }, { onConflict: 'message_id,user_id' });

      if (insertError) {
        console.error('[Chat Message DELETE] 개인 삭제 기록 오류:', insertError);
        return NextResponse.json(
          { error: '메시지 삭제에 실패했습니다' },
          { status: 500 }
        );
      }
    } else {
      // 모두에게 삭제: 본인 메시지만 가능
      if ((message as { sender_id: string }).sender_id !== user.id) {
        return NextResponse.json(
          { error: '본인의 메시지만 모두에게 삭제할 수 있습니다' },
          { status: 403 }
        );
      }

      // 소프트 삭제
      const { error: deleteError } = await adminClient
        .from('chat_messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          content: '삭제된 메시지입니다',
          attachments: [],
        })
        .eq('id', messageId);

      if (deleteError) {
        console.error('[Chat Message DELETE] 삭제 오류:', deleteError);
        return NextResponse.json(
          { error: '메시지 삭제에 실패했습니다' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Chat Message DELETE] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
