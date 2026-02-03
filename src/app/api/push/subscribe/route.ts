import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Subscribe request schema
const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  device_name: z.string().max(255).optional(),
});

// POST /api/push/subscribe - Subscribe to push notifications
export async function POST(request: NextRequest) {
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
    const validationResult = subscribeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '잘못된 요청입니다', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { endpoint, keys, device_name } = validationResult.data;
    const adminClient = createAdminClient();

    // Upsert subscription (update if exists, insert if not)
    const { data: subscription, error } = await adminClient
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          device_name: device_name || getDeviceInfo(request),
          is_active: true,
          last_used_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,endpoint',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[Push] Subscribe failed:', error);
      return NextResponse.json({ error: '구독 등록에 실패했습니다' }, { status: 500 });
    }

    // Ensure notification settings exist
    await adminClient
      .from('push_notification_settings')
      .upsert(
        { user_id: user.id },
        { onConflict: 'user_id' }
      );

    return NextResponse.json({
      data: {
        id: subscription.id,
        device_name: subscription.device_name,
        created_at: subscription.created_at,
      },
      message: '푸시 알림이 활성화되었습니다',
    });
  } catch (error) {
    console.error('[Push] Subscribe error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// DELETE /api/push/subscribe - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
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
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint가 필요합니다' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Delete subscription
    const { error } = await adminClient
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('[Push] Unsubscribe failed:', error);
      return NextResponse.json({ error: '구독 해제에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ message: '푸시 알림이 비활성화되었습니다' });
  } catch (error) {
    console.error('[Push] Unsubscribe error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// GET /api/push/subscribe - List user's push subscriptions
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

    const { data: subscriptions, error } = await adminClient
      .from('push_subscriptions')
      .select('id, device_name, is_active, created_at, last_used_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('last_used_at', { ascending: false });

    if (error) {
      console.error('[Push] List subscriptions failed:', error);
      return NextResponse.json({ error: '구독 목록 조회에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ data: subscriptions });
  } catch (error) {
    console.error('[Push] List subscriptions error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// Helper function to extract device info from request
function getDeviceInfo(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || '';

  // Simple device detection
  if (/iPhone|iPad|iPod/.test(userAgent)) {
    return 'iOS Device';
  } else if (/Android/.test(userAgent)) {
    return 'Android Device';
  } else if (/Windows/.test(userAgent)) {
    if (/Chrome/.test(userAgent)) return 'Windows (Chrome)';
    if (/Firefox/.test(userAgent)) return 'Windows (Firefox)';
    if (/Edge/.test(userAgent)) return 'Windows (Edge)';
    return 'Windows';
  } else if (/Mac/.test(userAgent)) {
    if (/Chrome/.test(userAgent)) return 'Mac (Chrome)';
    if (/Firefox/.test(userAgent)) return 'Mac (Firefox)';
    if (/Safari/.test(userAgent)) return 'Mac (Safari)';
    return 'Mac';
  } else if (/Linux/.test(userAgent)) {
    return 'Linux';
  }

  return 'Unknown Device';
}
