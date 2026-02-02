/**
 * 피드백 분석 API
 * GET - 피드백 관련 통계 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { subDays, format, differenceInHours } from 'date-fns';

const querySchema = z.object({
  period: z.enum(['7d', '30d', '90d', 'all']).optional().default('30d'),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const queryResult = querySchema.safeParse({
      period: searchParams.get('period') || undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: '잘못된 쿼리 파라미터입니다' },
        { status: 400 }
      );
    }

    const { period } = queryResult.data;
    const adminClient = createAdminClient();

    // 사용자의 프로젝트 ID 목록
    const { data: memberProjects } = await adminClient
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id)
      .not('joined_at', 'is', null);

    const { data: ownedProjects } = await adminClient
      .from('projects')
      .select('id')
      .eq('client_id', user.id);

    const projectIds = [
      ...new Set([
        ...(memberProjects?.map((m) => m.project_id) || []),
        ...(ownedProjects?.map((p) => p.id) || []),
      ]),
    ];

    if (projectIds.length === 0) {
      return NextResponse.json({
        totalFeedbacks: 0,
        openFeedbacks: 0,
        resolvedFeedbacks: 0,
        urgentFeedbacks: 0,
        prevTotalFeedbacks: 0,
        prevResolvedFeedbacks: 0,
        avgResolutionTime: 0,
        resolutionRate: 0,
        feedbacksByStatus: [],
        feedbacksOverTime: [],
        resolutionTimeDistribution: [],
        topAuthors: [],
        projectsWithMostFeedbacks: [],
      });
    }

    // 기간 계산
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const currentPeriodStart = subDays(new Date(), days);
    const previousPeriodStart = subDays(new Date(), days * 2);
    const previousPeriodEnd = subDays(new Date(), days);

    // 전체 피드백 조회 (created_by 포함)
    const { data: allFeedbacks, error: feedbacksError } = await adminClient
      .from('video_feedbacks')
      .select('id, status, is_urgent, created_at, resolved_at, created_by, project_id')
      .in('project_id', projectIds);

    if (feedbacksError) {
      console.error('[Analytics Feedbacks] 조회 오류:', feedbacksError);
      return NextResponse.json(
        { error: '피드백 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    // 현재 기간과 이전 기간 분리
    const currentPeriodFeedbacks = allFeedbacks?.filter(
      (f) => new Date(f.created_at) >= currentPeriodStart
    ) || [];

    const previousPeriodFeedbacks = allFeedbacks?.filter(
      (f) =>
        new Date(f.created_at) >= previousPeriodStart &&
        new Date(f.created_at) < previousPeriodEnd
    ) || [];

    const feedbacks = currentPeriodFeedbacks;

    const totalFeedbacks = feedbacks?.length || 0;
    const openFeedbacks = feedbacks?.filter((f) => f.status === 'open').length || 0;
    const resolvedFeedbacks = feedbacks?.filter((f) => f.status === 'resolved').length || 0;
    const urgentFeedbacks = feedbacks?.filter((f) => f.is_urgent).length || 0;

    // 이전 기간 비교
    const prevTotalFeedbacks = previousPeriodFeedbacks.length;
    const prevResolvedFeedbacks = previousPeriodFeedbacks.filter((f) => f.status === 'resolved').length;

    // 해결률
    const resolutionRate = totalFeedbacks > 0
      ? Math.round((resolvedFeedbacks / totalFeedbacks) * 100)
      : 0;

    // 상태별 분포
    const statusCounts: Record<string, number> = {};
    feedbacks?.forEach((f) => {
      statusCounts[f.status] = (statusCounts[f.status] || 0) + 1;
    });

    const feedbacksByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // 시간별 피드백 생성 추이
    const feedbacksOverTime: { date: string; count: number; resolved: number }[] = [];
    const dateCountMap: Record<string, { count: number; resolved: number }> = {};

    feedbacks?.forEach((f) => {
      const date = format(new Date(f.created_at), 'yyyy-MM-dd');
      if (!dateCountMap[date]) {
        dateCountMap[date] = { count: 0, resolved: 0 };
      }
      dateCountMap[date].count++;
      if (f.status === 'resolved') {
        dateCountMap[date].resolved++;
      }
    });

    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      feedbacksOverTime.push({
        date,
        count: dateCountMap[date]?.count || 0,
        resolved: dateCountMap[date]?.resolved || 0,
      });
    }

    // 평균 해결 시간 (시간 단위)
    const resolvedWithTime = feedbacks?.filter(
      (f) => f.status === 'resolved' && f.resolved_at
    ) || [];

    let avgResolutionTime = 0;
    if (resolvedWithTime.length > 0) {
      const totalHours = resolvedWithTime.reduce((sum, f) => {
        return sum + differenceInHours(new Date(f.resolved_at!), new Date(f.created_at));
      }, 0);
      avgResolutionTime = Math.round(totalHours / resolvedWithTime.length);
    }

    // 해결 시간 분포 (0-1시간, 1-4시간, 4-24시간, 24시간+)
    const resolutionTimeDistribution = [
      { range: '1시간 이내', count: 0 },
      { range: '1-4시간', count: 0 },
      { range: '4-24시간', count: 0 },
      { range: '24시간 이상', count: 0 },
    ];

    resolvedWithTime.forEach((f) => {
      const hours = differenceInHours(new Date(f.resolved_at!), new Date(f.created_at));
      if (hours <= 1) {
        resolutionTimeDistribution[0].count++;
      } else if (hours <= 4) {
        resolutionTimeDistribution[1].count++;
      } else if (hours <= 24) {
        resolutionTimeDistribution[2].count++;
      } else {
        resolutionTimeDistribution[3].count++;
      }
    });

    // 작성자별 피드백 수 (Top 5)
    const authorCounts: Record<string, number> = {};
    feedbacks?.forEach((f) => {
      if (f.created_by) {
        authorCounts[f.created_by] = (authorCounts[f.created_by] || 0) + 1;
      }
    });

    const topAuthorIds = Object.entries(authorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    let topAuthors: { userId: string; name: string; avatarUrl?: string; count: number }[] = [];
    if (topAuthorIds.length > 0) {
      const { data: authors } = await adminClient
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', topAuthorIds);

      topAuthors = topAuthorIds.map((id) => {
        const author = authors?.find((a) => a.id === id);
        return {
          userId: id,
          name: author?.name || '알 수 없음',
          avatarUrl: author?.avatar_url || undefined,
          count: authorCounts[id],
        };
      });
    }

    // 프로젝트별 피드백 수 (Top 5)
    const projectCounts: Record<string, number> = {};
    feedbacks?.forEach((f) => {
      if (f.project_id) {
        projectCounts[f.project_id] = (projectCounts[f.project_id] || 0) + 1;
      }
    });

    const topProjectIds = Object.entries(projectCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    let projectsWithMostFeedbacks: { projectId: string; title: string; count: number }[] = [];
    if (topProjectIds.length > 0) {
      const { data: projects } = await adminClient
        .from('projects')
        .select('id, title')
        .in('id', topProjectIds);

      projectsWithMostFeedbacks = topProjectIds.map((id) => {
        const project = projects?.find((p) => p.id === id);
        return {
          projectId: id,
          title: project?.title || '알 수 없음',
          count: projectCounts[id],
        };
      });
    }

    return NextResponse.json({
      totalFeedbacks,
      openFeedbacks,
      resolvedFeedbacks,
      urgentFeedbacks,
      prevTotalFeedbacks,
      prevResolvedFeedbacks,
      avgResolutionTime,
      resolutionRate,
      feedbacksByStatus,
      feedbacksOverTime,
      resolutionTimeDistribution,
      topAuthors,
      projectsWithMostFeedbacks,
    });
  } catch (error) {
    console.error('[Analytics Feedbacks] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
