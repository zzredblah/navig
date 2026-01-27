import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { NotificationService } from '@/lib/notifications/service';

/**
 * GET /api/cron/deadline-reminders
 * 마감 알림 스케줄러
 *
 * 매일 실행하여 D-3, D-1, D-day 프로젝트에 대해 알림 발송
 *
 * Vercel Cron 설정 (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/deadline-reminders",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Cron 인증 (Vercel Cron 또는 API 키)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Vercel Cron은 자동으로 인증됨, 수동 호출은 CRON_SECRET 필요
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Vercel Cron에서 호출된 경우가 아니면 검증
      const isVercelCron = request.headers.get('x-vercel-cron') === '1';
      if (!isVercelCron) {
        return NextResponse.json({ error: '인증되지 않은 요청입니다' }, { status: 401 });
      }
    }

    const adminClient = createAdminClient();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // D-3, D-1, D-day 날짜 계산
    const dDay = today.toISOString().split('T')[0];
    const dMinus1 = new Date(today);
    dMinus1.setDate(dMinus1.getDate() + 1);
    const dMinus1Str = dMinus1.toISOString().split('T')[0];
    const dMinus3 = new Date(today);
    dMinus3.setDate(dMinus3.getDate() + 3);
    const dMinus3Str = dMinus3.toISOString().split('T')[0];

    // 완료되지 않은 프로젝트 중 마감일이 D-3, D-1, D-day인 프로젝트 조회
    const { data: projects, error: projectsError } = await adminClient
      .from('projects')
      .select(`
        id,
        title,
        deadline,
        client_id,
        status
      `)
      .in('deadline', [dDay, dMinus1Str, dMinus3Str])
      .neq('status', 'completed')
      .not('deadline', 'is', null);

    if (projectsError) {
      console.error('[Deadline Reminders] 프로젝트 조회 실패:', projectsError);
      return NextResponse.json(
        { error: '프로젝트 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        success: true,
        message: '마감 임박 프로젝트가 없습니다',
        processed: 0,
      });
    }

    let notificationsSent = 0;

    for (const project of projects) {
      const deadline = new Date(project.deadline);
      const diffTime = deadline.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // 프로젝트 멤버 조회
      const { data: members, error: membersError } = await adminClient
        .from('project_members')
        .select('user_id')
        .eq('project_id', project.id);

      if (membersError) {
        console.error(`[Deadline Reminders] 멤버 조회 실패 (${project.id}):`, membersError);
        continue;
      }

      // 소유자 + 멤버 ID 합치기 (중복 제거)
      const userIds = [
        ...new Set([project.client_id, ...(members?.map((m) => m.user_id) || [])]),
      ];

      // 알림 제목/내용 생성
      let title: string;
      let type: 'deadline_reminder' = 'deadline_reminder';

      if (daysRemaining === 0) {
        title = `🔥 프로젝트 "${project.title}" 오늘 마감!`;
      } else if (daysRemaining === 1) {
        title = `⚠️ 프로젝트 "${project.title}" 내일 마감`;
      } else {
        title = `프로젝트 "${project.title}" 마감 ${daysRemaining}일 전`;
      }

      const content = `마감일: ${deadline.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`;

      // 중복 알림 방지: 오늘 이미 발송한 알림 확인
      const todayStart = today.toISOString();
      const tomorrowStart = new Date(today);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      for (const userId of userIds) {
        // 오늘 이미 같은 프로젝트에 대한 마감 알림을 받았는지 확인
        const { data: existingNotif } = await adminClient
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'deadline_reminder')
          .contains('metadata', { project_id: project.id })
          .gte('created_at', todayStart)
          .lt('created_at', tomorrowStart.toISOString())
          .limit(1);

        if (existingNotif && existingNotif.length > 0) {
          continue; // 이미 발송됨
        }

        // 인앱 알림 발송
        try {
          await NotificationService.create({
            userId,
            type,
            title,
            content,
            link: `/projects/${project.id}`,
            metadata: {
              project_id: project.id,
              days_remaining: daysRemaining,
            },
          });
          notificationsSent++;
        } catch (err) {
          console.error(`[Deadline Reminders] 알림 생성 실패 (${userId}):`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '마감 알림 발송 완료',
      projects_checked: projects.length,
      notifications_sent: notificationsSent,
    });
  } catch (error) {
    console.error('[Deadline Reminders] 예외:', error);
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
