import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { updateNotificationSettingsSchema } from '@/lib/validations/notification';

/**
 * GET /api/notification-settings
 * 알림 설정 조회
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

    // 2. 알림 설정 조회
    const { data: settings, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // 설정이 없는 경우 (신규 사용자) - 기본값 생성
      if (error.code === 'PGRST116') {
        const adminClient = createAdminClient();
        const { data: newSettings, error: insertError } = await adminClient
          .from('notification_settings')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) {
          console.error('[GET /api/notification-settings] 기본 설정 생성 실패:', insertError);
          return NextResponse.json(
            { error: '알림 설정 조회에 실패했습니다' },
            { status: 500 }
          );
        }

        return NextResponse.json({ settings: newSettings });
      }

      console.error('[GET /api/notification-settings] 알림 설정 조회 실패:', error);
      return NextResponse.json(
        { error: '알림 설정 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[GET /api/notification-settings] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notification-settings
 * 알림 설정 변경
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

    // 2. 요청 파싱 및 유효성 검증
    const body = await request.json();
    const result = updateNotificationSettingsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '유효하지 않은 요청입니다', details: result.error.flatten() },
        { status: 400 }
      );
    }

    // 3. 알림 설정 업데이트
    const { data: settings, error } = await supabase
      .from('notification_settings')
      .update(result.data)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[PATCH /api/notification-settings] 알림 설정 업데이트 실패:', error);
      return NextResponse.json(
        { error: '알림 설정 업데이트에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[PATCH /api/notification-settings] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
