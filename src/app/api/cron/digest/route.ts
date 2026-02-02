/**
 * 알림 다이제스트 크론 API
 *
 * GET /api/cron/digest
 * - Vercel Cron에서 매시간 실행
 * - 해당 시간대에 다이제스트를 받을 사용자에게 이메일 발송
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// Resend 클라이언트
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// 기본 URL
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://navig.app';

// 알림 타입 정의
interface Notification {
  id: string;
  type: string;
  title: string;
  content: string | null;
  link: string | null;
  created_at: string;
}

interface UserWithSettings {
  user_id: string;
  digest_time: string;
  digest_timezone: string;
  digest_last_sent_at: string | null;
  profiles: {
    email: string;
    name: string;
  } | null;
}

export async function GET(request: NextRequest) {
  try {
    // Cron 인증 확인
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // 개발 환경이 아닌 경우 인증 필수
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Resend 확인
    if (!resend) {
      console.log('[Digest] Resend not configured, skipping');
      return NextResponse.json({
        message: 'Resend not configured',
        processed: 0,
      });
    }

    const adminClient = createAdminClient();

    // 현재 시간 (KST)
    const now = new Date();
    const currentHour = now.getUTCHours() + 9; // KST = UTC + 9
    const adjustedHour = currentHour >= 24 ? currentHour - 24 : currentHour;
    const targetTime = `${String(adjustedHour).padStart(2, '0')}:00:00`;

    console.log('[Digest] Running for time:', targetTime);

    // 현재 시간대에 다이제스트 받을 사용자 조회
    // Note: notification_settings에 digest 관련 컬럼이 아직 없을 수 있음
    const { data: users, error: usersError } = await (adminClient as any)
      .from('notification_settings')
      .select(`
        user_id,
        digest_time,
        digest_timezone,
        digest_last_sent_at,
        profiles!inner(email, name)
      `)
      .eq('digest_enabled', true)
      .eq('digest_time', targetTime);

    if (usersError) {
      console.error('[Digest] Failed to fetch users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      console.log('[Digest] No users to process at this time');
      return NextResponse.json({ processed: 0 });
    }

    console.log('[Digest] Processing users:', users.length);

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users as unknown as UserWithSettings[]) {
      try {
        const result = await sendDigestEmail(adminClient, user);
        if (result === 'sent') {
          processed++;
        } else if (result === 'skipped') {
          skipped++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error(`[Digest] Error processing user ${user.user_id}:`, err);
        failed++;

        // 실패 로그 기록 (digest_logs 테이블 타입이 아직 없으므로 콘솔 로깅만)
        console.error(`[Digest] Failed user ${user.user_id}:`, err instanceof Error ? err.message : 'Unknown error');
      }
    }

    console.log('[Digest] Completed:', { processed, skipped, failed });

    return NextResponse.json({
      processed,
      skipped,
      failed,
      total: users.length,
    });
  } catch (error) {
    console.error('[Digest] Error:', error);
    return NextResponse.json(
      { error: 'Digest processing failed' },
      { status: 500 }
    );
  }
}

async function sendDigestEmail(
  adminClient: ReturnType<typeof createAdminClient>,
  user: UserWithSettings
): Promise<'sent' | 'skipped' | 'failed'> {
  if (!user.profiles?.email) {
    console.log(`[Digest] User ${user.user_id} has no email`);
    return 'skipped';
  }

  // 마지막 발송 이후 알림 조회
  const lastSent = user.digest_last_sent_at
    ? new Date(user.digest_last_sent_at)
    : new Date(0);

  const { data: notifications, error: notifError } = await adminClient
    .from('notifications')
    .select('id, type, title, content, link, created_at')
    .eq('user_id', user.user_id)
    .gt('created_at', lastSent.toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  if (notifError) {
    console.error(`[Digest] Failed to fetch notifications for ${user.user_id}:`, notifError);
    return 'failed';
  }

  // 알림이 없으면 건너뛰기
  if (!notifications || notifications.length === 0) {
    console.log(`[Digest] No new notifications for ${user.user_id}`);

    // 건너뛰기 로그 (digest_logs 테이블 타입 미생성)
    console.log(`[Digest] Skipped user ${user.user_id}: no notifications`);

    return 'skipped';
  }

  // 카테고리별 분류
  const urgent = notifications.filter(
    (n: Notification) => n.type.includes('urgent') || n.type === 'deadline_reminder'
  );
  const feedbacks = notifications.filter((n: Notification) => n.type.includes('feedback'));
  const versions = notifications.filter((n: Notification) => n.type === 'new_version');
  const others = notifications.filter(
    (n: Notification) =>
      !n.type.includes('urgent') &&
      !n.type.includes('feedback') &&
      n.type !== 'new_version' &&
      n.type !== 'deadline_reminder'
  );

  // 이메일 HTML 생성
  const emailHtml = generateDigestHtml({
    name: user.profiles.name || '사용자',
    urgent,
    feedbacks,
    versions,
    others,
    baseUrl: BASE_URL,
  });

  // 이메일 발송
  const dateStr = format(new Date(), 'M월 d일', { locale: ko });

  try {
    const emailResult = await resend!.emails.send({
      from: 'NAVIG <noreply@navig.app>',
      to: user.profiles.email,
      subject: `📬 NAVIG 일일 요약 - ${dateStr}`,
      html: emailHtml,
    });

    // 발송 성공 로그 (digest_logs 테이블 타입 미생성)
    console.log(`[Digest] Sent to ${user.user_id}, email_id: ${emailResult.data?.id}, items: ${notifications.length}`);

    // 마지막 발송 시간 업데이트 (digest_last_sent_at 컬럼 타입 미생성)
    // Note: notification_settings 테이블에 digest 관련 컬럼이 추가되면 아래 코드 활성화
    // await adminClient
    //   .from('notification_settings')
    //   .update({ digest_last_sent_at: new Date().toISOString() })
    //   .eq('user_id', user.user_id);

    console.log(`[Digest] Sent to ${user.profiles.email}:`, notifications.length, 'items');
    return 'sent';
  } catch (err) {
    console.error(`[Digest] Failed to send email to ${user.profiles.email}:`, err);
    return 'failed';
  }
}

function generateDigestHtml({
  name,
  urgent,
  feedbacks,
  versions,
  others,
  baseUrl,
}: {
  name: string;
  urgent: Notification[];
  feedbacks: Notification[];
  versions: Notification[];
  others: Notification[];
  baseUrl: string;
}): string {
  const dateStr = format(new Date(), 'yyyy년 M월 d일', { locale: ko });

  const renderSection = (title: string, icon: string, items: Notification[]) => {
    if (items.length === 0) return '';

    const itemsHtml = items
      .slice(0, 5)
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
          <a href="${item.link ? `${baseUrl}${item.link}` : baseUrl}"
             style="color: #7C3AED; text-decoration: none; font-size: 14px;">
            ${item.title}
          </a>
          ${item.content ? `<p style="margin: 4px 0 0; color: #666; font-size: 13px;">${item.content.slice(0, 100)}${item.content.length > 100 ? '...' : ''}</p>` : ''}
        </td>
      </tr>
    `
      )
      .join('');

    const moreText =
      items.length > 5 ? `<p style="color: #999; font-size: 12px;">외 ${items.length - 5}개</p>` : '';

    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
        <tr>
          <td style="padding-bottom: 8px;">
            <span style="font-size: 16px; font-weight: 600; color: #1f2937;">
              ${icon} ${title} (${items.length})
            </span>
          </td>
        </tr>
        ${itemsHtml}
      </table>
      ${moreText}
    `;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7C3AED 0%, #9333EA 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">NAVIG</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">📬 일일 요약</p>
              <p style="margin: 4px 0 0; color: rgba(255,255,255,0.7); font-size: 14px;">${dateStr}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 24px; color: #374151; font-size: 15px;">
                안녕하세요, <strong>${name}</strong>님!<br>
                오늘의 알림을 정리해드립니다.
              </p>

              ${renderSection('긴급', '🔥', urgent)}
              ${renderSection('새 피드백', '💬', feedbacks)}
              ${renderSection('새 버전', '📹', versions)}
              ${renderSection('기타', '📌', others)}

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="${baseUrl}/dashboard"
                       style="display: inline-block; background-color: #7C3AED; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">
                      NAVIG 바로가기
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                이 이메일은 NAVIG 일일 요약 설정에 따라 발송되었습니다.<br>
                <a href="${baseUrl}/settings/notifications" style="color: #7C3AED; text-decoration: none;">알림 설정 변경</a>
                &nbsp;|&nbsp;
                <a href="${baseUrl}" style="color: #7C3AED; text-decoration: none;">NAVIG 방문하기</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
