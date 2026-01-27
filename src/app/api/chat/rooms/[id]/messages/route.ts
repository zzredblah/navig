/**
 * 채팅 메시지 API
 * GET  - 메시지 목록 조회 (커서 기반 페이지네이션)
 * POST - 새 메시지 전송
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 메시지 생성 스키마
const createMessageSchema = z.object({
  content: z.string().min(1, '메시지를 입력해주세요').max(5000),
  reply_to_id: z.string().uuid().optional(),
  mentions: z.array(z.string().uuid()).optional(),
  attachments: z
    .array(
      z.object({
        type: z.enum(['image', 'video', 'document']),
        url: z.string().url(),
        name: z.string(),
        size: z.number(),
        mimeType: z.string().optional(),
      })
    )
    .optional(),
});

// GET: 메시지 목록 조회
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

    // 멤버십 확인 (cleared_at도 함께 조회 - 컬럼이 없을 수 있음)
    const { data: membership, error: membershipError } = await adminClient
      .from('chat_room_members')
      .select('id, cleared_at')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    // cleared_at 컬럼이 없는 경우 id만 조회
    let actualMembership = membership;
    if (membershipError && membershipError.message?.includes('cleared_at')) {
      const { data: fallbackMembership } = await adminClient
        .from('chat_room_members')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();
      actualMembership = fallbackMembership ? { ...fallbackMembership, cleared_at: null } : null;
    }

    if (!actualMembership) {
      return NextResponse.json(
        { error: '채팅방에 접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 사용자가 "나에게만 삭제"한 메시지 ID 목록 조회 (테이블이 없을 수 있음)
    let deletedMessageIds: string[] = [];
    const { data: deletedForMe, error: deletedError } = await adminClient
      .from('chat_message_deletions')
      .select('message_id')
      .eq('user_id', user.id);

    // 테이블이 없거나 에러가 발생해도 빈 배열 사용
    if (!deletedError && deletedForMe) {
      deletedMessageIds = deletedForMe.map((d: { message_id: string }) => d.message_id);
    }

    // 쿼리 파라미터
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor'); // created_at 기준
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // 메시지 조회 쿼리
    let query = adminClient
      .from('chat_messages')
      .select(
        `
        *,
        sender:profiles!sender_id(id, name, avatar_url)
      `
      )
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit + 1); // 다음 페이지 확인용 +1

    // cleared_at 이후 메시지만 조회 (대화내용 전체 삭제 적용)
    if (actualMembership.cleared_at) {
      query = query.gt('created_at', actualMembership.cleared_at);
    }

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: rawMessages, error: queryError } = await query;

    // "나에게만 삭제"된 메시지 필터링
    const messages = (rawMessages || []).filter(
      (m: { id: string }) => !deletedMessageIds.includes(m.id)
    );

    if (queryError) {
      console.error('[Chat Messages GET] 조회 오류:', queryError);
      return NextResponse.json(
        { error: '메시지 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    // 다음 페이지 여부 확인
    const hasMore = (messages?.length || 0) > limit;
    const resultMessages = hasMore ? messages?.slice(0, -1) : messages;

    // 각 메시지의 리액션 및 reply_to 정보 조회
    const messagesWithDetails = await Promise.all(
      (resultMessages || []).map(async (message) => {
        // 리액션 조회
        const { data: reactions } = await adminClient
          .from('chat_message_reactions')
          .select('emoji, user_id, profiles!user_id(id, name)')
          .eq('message_id', message.id);

        // 리액션 그룹화
        const reactionGroups = new Map<
          string,
          { count: number; users: { id: string; name: string | null }[]; reacted_by_me: boolean }
        >();

        (reactions || []).forEach((r: { emoji: string; user_id: string; profiles: { id: string; name: string | null } }) => {
          const existing = reactionGroups.get(r.emoji);
          const userInfo = r.profiles as { id: string; name: string | null };
          if (existing) {
            existing.count++;
            existing.users.push(userInfo);
            if (r.user_id === user.id) {
              existing.reacted_by_me = true;
            }
          } else {
            reactionGroups.set(r.emoji, {
              count: 1,
              users: [userInfo],
              reacted_by_me: r.user_id === user.id,
            });
          }
        });

        // reply_to 정보 조회 (답장 대상 메시지)
        let replyTo = null;
        if (message.reply_to_id) {
          const { data: replyMessage } = await adminClient
            .from('chat_messages')
            .select('id, content, sender_id, sender:profiles!sender_id(id, name, avatar_url)')
            .eq('id', message.reply_to_id)
            .single();

          if (replyMessage) {
            replyTo = {
              id: replyMessage.id,
              content: replyMessage.content,
              sender: replyMessage.sender,
            };
          }
        }

        return {
          ...message,
          reply_to: replyTo,
          reactions: Array.from(reactionGroups.entries()).map(([emoji, data]) => ({
            emoji,
            ...data,
          })),
        };
      })
    );

    // 메시지 순서 뒤집기 (오래된 것부터)
    const sortedMessages = messagesWithDetails.reverse();

    // 채팅방 멤버 수 조회 (읽지 않은 수 계산용)
    const { data: members } = await adminClient
      .from('chat_room_members')
      .select('user_id')
      .eq('room_id', roomId);

    const totalMembers = members?.length || 0;
    const messageIds = sortedMessages.map((m: { id: string }) => m.id);

    // 각 메시지의 읽음 수 조회
    let readCounts: { message_id: string; count: number }[] = [];
    if (messageIds.length > 0) {
      const { data: reads } = await adminClient
        .from('chat_message_reads')
        .select('message_id')
        .in('message_id', messageIds);

      // 메시지별 읽은 수 계산
      const countMap = new Map<string, number>();
      (reads || []).forEach((r: { message_id: string }) => {
        countMap.set(r.message_id, (countMap.get(r.message_id) || 0) + 1);
      });

      readCounts = Array.from(countMap.entries()).map(([message_id, count]) => ({
        message_id,
        count,
      }));
    }

    // unread_count 계산: 전체 멤버 수 - 읽은 수 - 1 (보낸 사람은 자동으로 읽은 것으로 간주)
    const messagesWithUnreadCount = sortedMessages.map((message: { id: string; sender_id: string }) => {
      const readCount = readCounts.find((r) => r.message_id === message.id)?.count || 0;
      // 보낸 사람 제외한 멤버 중 아직 읽지 않은 수
      const unreadCount = Math.max(0, totalMembers - readCount - 1);

      return {
        ...message,
        unread_count: unreadCount,
      };
    });

    return NextResponse.json({
      messages: messagesWithUnreadCount,
      pagination: {
        has_more: hasMore,
        cursor: hasMore ? (resultMessages?.[resultMessages.length - 1] as { created_at: string } | undefined)?.created_at : undefined,
      },
    });
  } catch (error) {
    console.error('[Chat Messages GET] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// POST: 새 메시지 전송
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
    const validationResult = createMessageSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: '유효하지 않은 요청입니다',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { content, reply_to_id, mentions, attachments } = validationResult.data;

    // 답장 대상 메시지 확인
    if (reply_to_id) {
      const { data: replyTarget } = await adminClient
        .from('chat_messages')
        .select('id')
        .eq('id', reply_to_id)
        .eq('room_id', roomId)
        .single();

      if (!replyTarget) {
        return NextResponse.json(
          { error: '답장 대상 메시지를 찾을 수 없습니다' },
          { status: 400 }
        );
      }
    }

    // 메시지 생성
    const { data: message, error: insertError } = await adminClient
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: user.id,
        content,
        reply_to_id: reply_to_id || null,
        mentions: mentions || [],
        attachments: attachments || [],
      })
      .select(
        `
        *,
        sender:profiles!sender_id(id, name, avatar_url)
      `
      )
      .single();

    if (insertError) {
      console.error('[Chat Messages POST] 생성 오류:', insertError);
      return NextResponse.json(
        { error: '메시지 전송에 실패했습니다' },
        { status: 500 }
      );
    }

    // reply_to 정보 별도 조회
    let replyTo = null;
    if (reply_to_id) {
      const { data: replyMessage } = await adminClient
        .from('chat_messages')
        .select('id, content, sender_id, sender:profiles!sender_id(id, name, avatar_url)')
        .eq('id', reply_to_id)
        .single();

      if (replyMessage) {
        replyTo = {
          id: replyMessage.id,
          content: replyMessage.content,
          sender: replyMessage.sender,
        };
      }
    }

    // 보낸 사람의 읽음 상태 업데이트
    await adminClient
      .from('chat_room_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    // 보낸 사람은 자동으로 해당 메시지를 읽음 처리
    await adminClient
      .from('chat_message_reads')
      .upsert(
        { message_id: message.id, user_id: user.id },
        { onConflict: 'message_id,user_id' }
      );

    // 채팅방 멤버 수 조회 (unread_count 계산용)
    const { data: members } = await adminClient
      .from('chat_room_members')
      .select('user_id')
      .eq('room_id', roomId);

    // 보낸 사람 제외한 멤버 수 = 읽지 않은 수
    const unreadCount = Math.max(0, (members?.length || 0) - 1);

    return NextResponse.json({
      message: {
        ...message,
        reply_to: replyTo,
        reactions: [],
        unread_count: unreadCount,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[Chat Messages POST] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
