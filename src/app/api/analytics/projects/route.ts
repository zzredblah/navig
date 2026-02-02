/**
 * 프로젝트 분석 API
 * GET - 프로젝트 관련 통계 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';

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

    // 쿼리 파라미터 파싱
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

    // 기간 계산
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const currentPeriodStart = startOfDay(subDays(new Date(), days));
    const previousPeriodStart = startOfDay(subDays(new Date(), days * 2));
    const previousPeriodEnd = endOfDay(subDays(new Date(), days + 1));

    // 사용자의 프로젝트 ID 목록 조회
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
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        prevTotalProjects: 0,
        prevActiveProjects: 0,
        prevCompletedProjects: 0,
        projectsByStatus: [],
        projectsOverTime: [],
        topProjects: [],
        avgVideosPerProject: 0,
        avgFeedbacksPerProject: 0,
        avgMembersPerProject: 0,
        recentActivity: [],
      });
    }

    // 프로젝트 상태별 통계 (전체 + 현재 기간 + 이전 기간)
    const { data: allProjects } = await adminClient
      .from('projects')
      .select('id, title, status, created_at')
      .in('id', projectIds);

    const currentPeriodProjects = allProjects?.filter(
      (p) => new Date(p.created_at) >= currentPeriodStart
    ) || [];

    const previousPeriodProjects = allProjects?.filter(
      (p) =>
        new Date(p.created_at) >= previousPeriodStart &&
        new Date(p.created_at) <= previousPeriodEnd
    ) || [];

    const totalProjects = allProjects?.length || 0;
    const activeProjects = allProjects?.filter((p) => p.status !== 'completed').length || 0;
    const completedProjects = allProjects?.filter((p) => p.status === 'completed').length || 0;

    // 이전 기간 데이터 (비교용)
    const prevTotalProjects = previousPeriodProjects.length;
    const prevActiveProjects = previousPeriodProjects.filter((p) => p.status !== 'completed').length;
    const prevCompletedProjects = previousPeriodProjects.filter((p) => p.status === 'completed').length;

    // 상태별 그룹
    const statusCounts: Record<string, number> = {};
    allProjects?.forEach((p) => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });

    const projectsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // 시간별 프로젝트 생성 추이
    const projectsOverTime: { date: string; count: number; cumulative: number }[] = [];
    if (allProjects && allProjects.length > 0) {
      const dateCountMap: Record<string, number> = {};
      allProjects.forEach((p) => {
        const date = format(new Date(p.created_at), 'yyyy-MM-dd');
        dateCountMap[date] = (dateCountMap[date] || 0) + 1;
      });

      let cumulative = 0;
      for (let i = days - 1; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        const count = dateCountMap[date] || 0;
        cumulative += count;
        projectsOverTime.push({
          date,
          count,
          cumulative,
        });
      }
    }

    // 프로젝트별 피드백 수 및 비디오 수
    const [feedbackResult, videoResult, memberResult] = await Promise.all([
      adminClient.from('video_feedbacks').select('project_id').in('project_id', projectIds),
      adminClient.from('video_versions').select('project_id').in('project_id', projectIds),
      adminClient.from('project_members').select('project_id').in('project_id', projectIds).not('joined_at', 'is', null),
    ]);

    const projectFeedbackMap: Record<string, number> = {};
    feedbackResult.data?.forEach((f) => {
      projectFeedbackMap[f.project_id] = (projectFeedbackMap[f.project_id] || 0) + 1;
    });

    const projectVideoMap: Record<string, number> = {};
    videoResult.data?.forEach((v) => {
      projectVideoMap[v.project_id] = (projectVideoMap[v.project_id] || 0) + 1;
    });

    const projectMemberMap: Record<string, number> = {};
    memberResult.data?.forEach((m) => {
      projectMemberMap[m.project_id] = (projectMemberMap[m.project_id] || 0) + 1;
    });

    // 평균 통계
    const avgVideosPerProject = totalProjects > 0
      ? Math.round((videoResult.data?.length || 0) / totalProjects * 10) / 10
      : 0;
    const avgFeedbacksPerProject = totalProjects > 0
      ? Math.round((feedbackResult.data?.length || 0) / totalProjects * 10) / 10
      : 0;
    const avgMembersPerProject = totalProjects > 0
      ? Math.round((memberResult.data?.length || 0) / totalProjects * 10) / 10
      : 0;

    // Top 프로젝트 (피드백 + 비디오 + 멤버 종합)
    const topProjects = allProjects
      ?.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        feedbackCount: projectFeedbackMap[p.id] || 0,
        videoCount: projectVideoMap[p.id] || 0,
        memberCount: projectMemberMap[p.id] || 0,
        activityScore:
          (projectFeedbackMap[p.id] || 0) * 2 +
          (projectVideoMap[p.id] || 0) * 5 +
          (projectMemberMap[p.id] || 0),
      }))
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, 10) || [];

    // 최근 활동 (activity_logs에서)
    const adminClientAny = adminClient as any;
    const { data: recentActivities } = await adminClientAny
      .from('activity_logs')
      .select(`
        id,
        activity_type,
        title,
        created_at,
        user:profiles!user_id(name, avatar_url)
      `)
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      totalProjects,
      activeProjects,
      completedProjects,
      prevTotalProjects,
      prevActiveProjects,
      prevCompletedProjects,
      newProjectsThisPeriod: currentPeriodProjects.length,
      projectsByStatus,
      projectsOverTime,
      topProjects,
      avgVideosPerProject,
      avgFeedbacksPerProject,
      avgMembersPerProject,
      recentActivity: recentActivities || [],
    });
  } catch (error) {
    console.error('[Analytics Projects] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
