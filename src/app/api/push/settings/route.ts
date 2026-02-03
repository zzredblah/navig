import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Settings update schema
const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  feedback_enabled: z.boolean().optional(),
  chat_enabled: z.boolean().optional(),
  project_enabled: z.boolean().optional(),
  system_enabled: z.boolean().optional(),
  quiet_hours_start: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  quiet_hours_end: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  timezone: z.string().max(50).optional(),
});

// GET /api/push/settings - Get user's notification settings
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Get or create settings
    let { data: settings } = await adminClient
      .from('push_notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // If no settings exist, create default
    if (!settings) {
      const { data: newSettings, error: createError } = await adminClient
        .from('push_notification_settings')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (createError) {
        console.error('[Push] Create settings failed:', createError);
        return NextResponse.json({ error: '설정 조회에 실패했습니다' }, { status: 500 });
      }

      settings = newSettings;
    }

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error('[Push] Get settings error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// PUT /api/push/settings - Update user's notification settings
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = settingsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '잘못된 요청입니다', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;
    const adminClient = createAdminClient();

    // Upsert settings
    const { data: settings, error } = await adminClient
      .from('push_notification_settings')
      .upsert(
        {
          user_id: user.id,
          ...updateData,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[Push] Update settings failed:', error);
      return NextResponse.json({ error: '설정 업데이트에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({
      data: settings,
      message: '알림 설정이 업데이트되었습니다',
    });
  } catch (error) {
    console.error('[Push] Update settings error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
