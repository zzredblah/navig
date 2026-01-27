import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notificationListQuerySchema } from '@/lib/validations/notification';

/**
 * GET /api/notifications
 * 알림 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 2. 쿼리 파라미터 파싱 및 유효성 검증
    const { searchParams } = new URL(request.url);
    const queryResult = notificationListQuerySchema.safeParse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      unread_only: searchParams.get('unread_only') || undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: '유효하지 않은 쿼리입니다', details: queryResult.error.flatten() },
        { status: 400 }
      );
    }

    const { page, limit, unread_only } = queryResult.data;
    const offset = (page - 1) * limit;

    // 3. 알림 목록 조회
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unread_only) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error, count } = await query;

    // 테이블이 존재하지 않는 경우 빈 결과 반환
    if (error) {
      // 테이블이 없거나 권한 문제인 경우 빈 결과로 처리
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.warn('[GET /api/notifications] notifications 테이블이 존재하지 않습니다. 마이그레이션을 실행해주세요.');
        return NextResponse.json({
          data: [],
          total: 0,
          unread_count: 0,
          warning: '알림 시스템이 아직 설정되지 않았습니다.',
        });
      }

      console.error('[GET /api/notifications] 알림 조회 실패:', error);
      return NextResponse.json(
        { error: '알림 조회에 실패했습니다', details: error.message },
        { status: 500 }
      );
    }

    // 4. 읽지 않은 알림 개수 조회
    const { count: unreadCount, error: unreadError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (unreadError) {
      // 에러가 있어도 메인 데이터는 반환
      console.error('[GET /api/notifications] 읽지 않은 알림 개수 조회 실패:', unreadError);
    }

    return NextResponse.json({
      data: notifications || [],
      total: count || 0,
      unread_count: unreadCount || 0,
    });
  } catch (error) {
    console.error('[GET /api/notifications] 예외:', error);
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
