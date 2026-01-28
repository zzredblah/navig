import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]/feedback-stats
 * 프로젝트 피드백 통계 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    // 1. 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 2. 프로젝트 접근 권한 확인
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('id, client_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 프로젝트 멤버 확인 (초대 수락한 멤버만)
    const { data: membership } = await adminClient
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null) // 초대 수락한 멤버만
      .limit(1);

    const isMember = (membership && membership.length > 0) || project.client_id === user.id;
    if (!isMember) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    // 3. 모든 피드백 조회
    const { data: feedbacks, error: feedbackError } = await adminClient
      .from('video_feedbacks')
      .select('id, status, is_urgent, created_at')
      .eq('project_id', projectId);

    if (feedbackError) {
      console.error('[feedback-stats] 피드백 조회 실패:', feedbackError);
      return NextResponse.json({ error: '통계 조회에 실패했습니다.' }, { status: 500 });
    }

    const feedbackList = feedbacks || [];

    // 4. 기본 통계 계산
    const total = feedbackList.length;
    const open = feedbackList.filter((f) => f.status === 'open').length;
    const resolved = feedbackList.filter((f) => f.status === 'resolved').length;
    const wontfix = feedbackList.filter((f) => f.status === 'wontfix').length;
    const urgent = feedbackList.filter((f) => f.is_urgent).length;
    const urgentOpen = feedbackList.filter((f) => f.is_urgent && f.status === 'open').length;

    // 해결률
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // 5. 일별 추이 계산 (최근 14일)
    const now = new Date();
    const dailyStats: { date: string; total: number; resolved: number }[] = [];

    for (let i = 13; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayFeedbacks = feedbackList.filter((f) => {
        const feedbackDate = f.created_at.split('T')[0];
        return feedbackDate === dateStr;
      });

      const dayResolved = feedbackList.filter((f) => {
        // resolved 상태인 피드백 중 해당 날짜까지 누적
        const feedbackDate = new Date(f.created_at);
        feedbackDate.setHours(23, 59, 59, 999);
        return f.status === 'resolved' && feedbackDate <= date;
      });

      dailyStats.push({
        date: dateStr,
        total: dayFeedbacks.length,
        resolved: dayResolved.length,
      });
    }

    // 6. 상태별 통계
    const statusStats = [
      { name: '열림', value: open, color: '#3B82F6' }, // blue
      { name: '해결됨', value: resolved, color: '#10B981' }, // green
      { name: '수정 안함', value: wontfix, color: '#6B7280' }, // gray
    ].filter((s) => s.value > 0);

    // 7. 응답 반환
    return NextResponse.json({
      data: {
        summary: {
          total,
          open,
          resolved,
          wontfix,
          urgent,
          urgentOpen,
          resolutionRate,
        },
        trend: dailyStats,
        statusDistribution: statusStats,
      },
    });
  } catch (error) {
    console.error('[feedback-stats] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
