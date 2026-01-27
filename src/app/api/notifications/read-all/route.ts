import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PATCH /api/notifications/read-all
 * 전체 알림 읽음 처리
 */
export async function PATCH(request: NextRequest) {
  try {
    // 1. 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 2. 읽지 않은 알림 개수 조회
    const { count: beforeCount, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (countError) {
      console.error('[PATCH /api/notifications/read-all] 알림 개수 조회 실패:', countError);
      return NextResponse.json(
        { error: '알림 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    // 3. 전체 알림 읽음 처리
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('[PATCH /api/notifications/read-all] 알림 읽음 처리 실패:', error);
      return NextResponse.json(
        { error: '알림 읽음 처리에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: beforeCount || 0,
    });
  } catch (error) {
    console.error('[PATCH /api/notifications/read-all] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
