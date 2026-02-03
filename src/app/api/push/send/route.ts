import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendPushNotification, isPushConfigured } from '@/lib/push/web-push';
import { z } from 'zod';

// Send notification schema
const sendSchema = z.object({
  user_id: z.string().uuid(),
  notification_type: z.enum(['feedback', 'chat', 'project', 'system']),
  title: z.string().min(1).max(200),
  body: z.string().max(500).optional(),
  data: z.record(z.unknown()).optional(),
  url: z.string().url().optional(),
});

// POST /api/push/send - Send push notification (internal use)
// Note: This endpoint should be protected for internal use only
export async function POST(request: NextRequest) {
  try {
    // Verify internal API key or service role
    const authHeader = request.headers.get('authorization');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Simple internal auth check (you may want a more robust solution)
    if (!authHeader || !serviceKey || !authHeader.includes(serviceKey.slice(0, 20))) {
      // Allow if called from server-side (check for specific header)
      const internalHeader = request.headers.get('x-internal-request');
      if (internalHeader !== 'true') {
        return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
      }
    }

    if (!isPushConfigured()) {
      return NextResponse.json(
        { error: 'Push notifications not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validationResult = sendSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '잘못된 요청입니다', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { user_id, notification_type, title, body: notificationBody, data, url } = validationResult.data;
    const adminClient = createAdminClient();

    // Check user's notification settings
    const { data: settings } = await adminClient
      .from('push_notification_settings')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // Check if notifications are enabled for this type
    if (settings) {
      if (!settings.enabled) {
        return NextResponse.json({ message: 'User has disabled notifications' });
      }

      const typeEnabledKey = `${notification_type}_enabled` as keyof typeof settings;
      if (settings[typeEnabledKey] === false) {
        return NextResponse.json({ message: `User has disabled ${notification_type} notifications` });
      }

      // Check quiet hours
      if (settings.quiet_hours_start && settings.quiet_hours_end) {
        const now = new Date();
        const userTimezone = settings.timezone || 'Asia/Seoul';

        try {
          const userTime = new Intl.DateTimeFormat('en-US', {
            timeZone: userTimezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(now);

          const currentTime = userTime;
          const startTime = settings.quiet_hours_start;
          const endTime = settings.quiet_hours_end;

          // Simple time comparison (assumes same day quiet hours)
          if (isInQuietHours(currentTime, startTime, endTime)) {
            return NextResponse.json({ message: 'User is in quiet hours' });
          }
        } catch {
          // Ignore timezone errors
        }
      }
    }

    // Get user's active push subscriptions
    const { data: subscriptions, error: subError } = await adminClient
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (subError) {
      console.error('[Push] Get subscriptions failed:', subError);
      return NextResponse.json({ error: '구독 정보 조회 실패' }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No active subscriptions' });
    }

    // Send to all subscriptions
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        // Create log entry
        const { data: log } = await adminClient
          .from('push_notification_logs')
          .insert({
            subscription_id: sub.id,
            user_id,
            notification_type,
            title,
            body: notificationBody,
            data: { ...data, url },
            status: 'pending',
          })
          .select()
          .single();

        // Send notification
        const result = await sendPushNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          {
            title,
            body: notificationBody,
            tag: `${notification_type}-${Date.now()}`,
            data: {
              url: url || '/notifications',
              type: notification_type,
              ...data,
            },
          }
        );

        // Update log status
        if (log) {
          await adminClient
            .from('push_notification_logs')
            .update({
              status: result.success ? 'sent' : 'failed',
              error_message: result.error,
              sent_at: result.success ? new Date().toISOString() : null,
            })
            .eq('id', log.id);
        }

        // Handle expired subscriptions
        if (result.error === 'subscription_expired') {
          await adminClient
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', sub.id);
        }

        return {
          subscription_id: sub.id,
          success: result.success,
          error: result.error,
        };
      })
    );

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `Sent to ${successCount} subscriptions, ${failCount} failed`,
      results,
    });
  } catch (error) {
    console.error('[Push] Send error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// Helper function to check if current time is in quiet hours
function isInQuietHours(current: string, start: string, end: string): boolean {
  // Convert time strings to minutes for easier comparison
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const currentMins = toMinutes(current);
  const startMins = toMinutes(start);
  const endMins = toMinutes(end);

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (startMins > endMins) {
    return currentMins >= startMins || currentMins < endMins;
  }

  return currentMins >= startMins && currentMins < endMins;
}
