/**
 * 채팅방 API
 * GET  - 채팅방 목록 조회
 * POST - DM/그룹 채팅방 생성/조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// GET: 채팅방 목록 조회
export async function GET() {
  console.log('[Chat Rooms GET] API 호출됨');

  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient = createAdminClient() as any;

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log('[Chat Rooms GET] 인증 결과:', { userId: user?.id, authError });

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 사용자가 속한 채팅방 목록 조회 (adminClient로 RLS 우회)
    console.log('[Chat Rooms GET] 멤버십 조회 시작...');
    const { data: memberships, error: memberError } = await adminClient
      .from('chat_room_members')
      .select('room_id, last_read_at')
      .eq('user_id', user.id);

    console.log('[Chat Rooms GET] 멤버십 조회 결과:', { count: memberships?.length, error: memberError });

    if (memberError) {
      console.error('[Chat Rooms GET] 멤버십 조회 오류:', memberError);
      return NextResponse.json(
        { error: '채팅방 목록 조회에 실패했습니다', details: memberError.message },
        { status: 500 }
      );
    }

    if (!memberships || memberships.length === 0) {
      console.log('[Chat Rooms GET] 멤버십 없음, 빈 배열 반환');
      return NextResponse.json({ rooms: [] });
    }

    const roomIds = memberships.map((m: { room_id: string }) => m.room_id);
    const lastReadMap = new Map(
      memberships.map((m: { room_id: string; last_read_at: string }) => [m.room_id, m.last_read_at])
    );

    // 채팅방 상세 정보 조회 (adminClient)
    console.log('[Chat Rooms GET] 채팅방 조회 시작... roomIds:', roomIds);
    const { data: rooms, error: roomsError } = await adminClient
      .from('chat_rooms')
      .select(`
        *,
        project:projects(id, title)
      `)
      .in('id', roomIds)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    console.log('[Chat Rooms GET] 채팅방 조회 결과:', { count: rooms?.length, error: roomsError });

    if (roomsError) {
      console.error('[Chat Rooms GET] 채팅방 조회 오류:', roomsError);
      return NextResponse.json(
        { error: '채팅방 목록 조회에 실패했습니다', details: roomsError.message },
        { status: 500 }
      );
    }

    // 각 채팅방의 읽지 않은 메시지 수 계산 + DM/그룹 상대방 정보
    const roomsWithDetails = await Promise.all(
      (rooms || []).map(async (room) => {
        const lastReadAt = lastReadMap.get(room.id);

        // 읽지 않은 메시지 수
        let unreadCount = 0;
        if (lastReadAt) {
          const { count } = await adminClient
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .gt('created_at', lastReadAt)
            .neq('sender_id', user.id);
          unreadCount = count || 0;
        }

        // DM/그룹인 경우 다른 멤버 정보 조회
        let otherUser = null;
        let members: { id: string; name: string; avatar_url: string | null }[] = [];
        if (room.type === 'direct') {
          // 채팅방의 모든 멤버 조회
          const { data: roomMembers } = await adminClient
            .from('chat_room_members')
            .select('user_id')
            .eq('room_id', room.id)
            .neq('user_id', user.id);

          if (roomMembers && roomMembers.length > 0) {
            const memberIds = roomMembers.map((m: { user_id: string }) => m.user_id);
            const { data: profiles } = await adminClient
              .from('profiles')
              .select('id, name, avatar_url')
              .in('id', memberIds);

            if (profiles) {
              members = profiles;
              // 1:1 DM인 경우 otherUser 설정 (하위 호환성)
              if (profiles.length === 1) {
                otherUser = profiles[0];
              }
            }
          }
        }

        return {
          ...room,
          unread_count: unreadCount,
          otherUser,
          members,
        };
      })
    );

    console.log('[Chat Rooms GET] 최종 결과:', roomsWithDetails.length, '개 채팅방');
    return NextResponse.json({ rooms: roomsWithDetails });
  } catch (error) {
    console.error('[Chat Rooms GET] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST: DM/그룹 채팅방 생성 또는 기존 채팅방 반환
export async function POST(request: NextRequest) {
  console.log('[Chat Rooms POST] API 호출됨');

  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient = createAdminClient() as any;

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

    const body = await request.json();
    // user_ids: 배열로 받아서 그룹 채팅 지원 (하위 호환: user_id도 지원)
    let targetUserIds: string[] = body.user_ids || [];
    if (body.user_id && !targetUserIds.includes(body.user_id)) {
      targetUserIds.push(body.user_id);
    }
    const roomName = body.name || null; // 그룹 채팅방 이름 (선택)

    console.log('[Chat Rooms POST] 요청 데이터:', { targetUserIds, roomName });

    if (!targetUserIds || targetUserIds.length === 0) {
      return NextResponse.json(
        { error: '대화 상대가 필요합니다' },
        { status: 400 }
      );
    }

    // 자기 자신 제외
    targetUserIds = targetUserIds.filter((id: string) => id !== user.id);

    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { error: '자기 자신과 채팅할 수 없습니다' },
        { status: 400 }
      );
    }

    // 상대방들 존재 확인 (adminClient 사용 - RLS 우회)
    const { data: targetUsers, error: usersError } = await adminClient
      .from('profiles')
      .select('id, name')
      .in('id', targetUserIds);

    console.log('[Chat Rooms POST] 상대방 조회:', { count: targetUsers?.length, error: usersError });

    if (usersError || !targetUsers || targetUsers.length !== targetUserIds.length) {
      return NextResponse.json(
        { error: '일부 사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 1:1 DM인 경우 기존 채팅방 확인
    if (targetUserIds.length === 1) {
      const targetUserId = targetUserIds[0];

      // 사용자가 속한 모든 DM 채팅방 조회 (adminClient 사용)
      const { data: myRooms } = await adminClient
        .from('chat_room_members')
        .select('room_id')
        .eq('user_id', user.id);

      if (myRooms && myRooms.length > 0) {
        const myRoomIds = myRooms.map((r: { room_id: string }) => r.room_id);

        // 해당 채팅방들 중 DM 타입인 것 찾기
        const { data: dmRooms } = await adminClient
          .from('chat_rooms')
          .select('id')
          .in('id', myRoomIds)
          .eq('type', 'direct');

        if (dmRooms && dmRooms.length > 0) {
          const dmRoomIds = dmRooms.map((r: { id: string }) => r.id);

          // 상대방도 같은 DM 채팅방에 있는지 확인
          const { data: targetMembership } = await adminClient
            .from('chat_room_members')
            .select('room_id')
            .eq('user_id', targetUserId)
            .in('room_id', dmRoomIds);

          if (targetMembership && targetMembership.length > 0) {
            // 기존 1:1 DM 채팅방 반환
            console.log('[Chat Rooms POST] 기존 DM 채팅방 발견:', targetMembership[0].room_id);
            return NextResponse.json({ room: { id: targetMembership[0].room_id } });
          }
        }
      }
    }

    // 새 채팅방 생성 (adminClient로 RLS 우회)
    console.log('[Chat Rooms POST] 새 채팅방 생성 시작...');

    // 그룹 채팅 이름 생성 (지정 안 된 경우)
    const isGroup = targetUserIds.length > 1;
    const generatedName = isGroup && !roomName
      ? targetUsers.map((u: { name: string }) => u.name).join(', ')
      : roomName;

    const { data: newRoom, error: createError } = await adminClient
      .from('chat_rooms')
      .insert({
        type: 'direct',
        name: generatedName,
      })
      .select()
      .single();

    console.log('[Chat Rooms POST] 채팅방 생성 결과:', { room: newRoom, error: createError });

    if (createError || !newRoom) {
      console.error('[Chat Rooms POST] 생성 오류:', createError);
      return NextResponse.json(
        { error: '채팅방 생성에 실패했습니다', details: createError?.message },
        { status: 500 }
      );
    }

    // 멤버 추가 (본인 + 상대방들) - adminClient 사용
    const memberInserts = [
      { room_id: newRoom.id, user_id: user.id },
      ...targetUserIds.map((id: string) => ({ room_id: newRoom.id, user_id: id })),
    ];

    console.log('[Chat Rooms POST] 멤버 추가 시작:', memberInserts.length, '명');

    const { error: memberError } = await adminClient
      .from('chat_room_members')
      .insert(memberInserts);

    if (memberError) {
      console.error('[Chat Rooms POST] 멤버 추가 오류:', memberError);
      // 채팅방 롤백
      await adminClient.from('chat_rooms').delete().eq('id', newRoom.id);
      return NextResponse.json(
        { error: '채팅방 생성에 실패했습니다', details: memberError.message },
        { status: 500 }
      );
    }

    console.log('[Chat Rooms POST] 채팅방 생성 완료:', newRoom.id);
    return NextResponse.json({ room: newRoom }, { status: 201 });
  } catch (error) {
    console.error('[Chat Rooms POST] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
