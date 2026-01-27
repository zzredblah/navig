import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PATCH /api/notifications/[id]/read
 * 단일 알림 읽음 처리
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 2. 파라미터 추출
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: '알림 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 3. 알림 읽음 처리
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id); // 본인의 알림만 수정 가능

    if (error) {
      console.error('[PATCH /api/notifications/[id]/read] 알림 읽음 처리 실패:', error);
      return NextResponse.json(
        { error: '알림 읽음 처리에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PATCH /api/notifications/[id]/read] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
