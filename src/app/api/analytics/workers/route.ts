/**
 * 작업자 분석 API
 * GET - 팀 멤버/작업자 관련 통계 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { subDays } from 'date-fns';

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
        totalMembers: 0,
        activeMembers: 0,
        membersByRole: [],
        topContributors: [],
        activityLeaderboard: [],
      });
    }

    // 프로젝트 멤버 조회
    const { data: members } = await adminClient
      .from('project_members')
      .select(`
        id,
        user_id,
        role,
        joined_at,
        user:profiles!user_id(id, name, avatar_url)
      `)
      .in('project_id', projectIds)
      .not('joined_at', 'is', null);

    // 중복 멤버 제거 (여러 프로젝트에 참여 가능)
    const uniqueMembers = new Map<string, typeof members extends (infer T)[] | null ? T : never>();
    members?.forEach((m) => {
      if (!uniqueMembers.has(m.user_id)) {
        uniqueMembers.set(m.user_id, m);
      }
    });

    const totalMembers = uniqueMembers.size;

    // 역할별 분포
    const roleCounts: Record<string, number> = {};
    uniqueMembers.forEach((m) => {
      roleCounts[m.role] = (roleCounts[m.role] || 0) + 1;
    });

    const membersByRole = Object.entries(roleCounts).map(([role, count]) => ({
      role,
      count,
    }));

    // 기간 설정
    let startDate: string | null = null;
    if (period !== 'all') {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      startDate = subDays(new Date(), days).toISOString();
    }

    // 피드백 작성자별 통계
    let feedbackQuery = adminClient
      .from('video_feedbacks')
      .select('created_by')
      .in('project_id', projectIds);

    if (startDate) {
      feedbackQuery = feedbackQuery.gte('created_at', startDate);
    }

    const { data: feedbacks } = await feedbackQuery;

    const feedbackCountMap: Record<string, number> = {};
    feedbacks?.forEach((f) => {
      feedbackCountMap[f.created_by] = (feedbackCountMap[f.created_by] || 0) + 1;
    });

    // 영상 업로드 작성자별 통계
    let videoQuery = adminClient
      .from('video_versions')
      .select('uploaded_by')
      .in('project_id', projectIds);

    if (startDate) {
      videoQuery = videoQuery.gte('created_at', startDate);
    }

    const { data: videos } = await videoQuery;

    const videoCountMap: Record<string, number> = {};
    videos?.forEach((v) => {
      videoCountMap[v.uploaded_by] = (videoCountMap[v.uploaded_by] || 0) + 1;
    });

    // 활동 기여자 순위 (피드백 + 영상)
    const activityMap: Record<string, { feedbacks: number; videos: number; total: number }> = {};

    uniqueMembers.forEach((_, userId) => {
      activityMap[userId] = {
        feedbacks: feedbackCountMap[userId] || 0,
        videos: videoCountMap[userId] || 0,
        total: (feedbackCountMap[userId] || 0) + (videoCountMap[userId] || 0),
      };
    });

    // 프로필 정보 가져오기
    const userIds = Array.from(uniqueMembers.keys());
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // 상위 기여자 (활동량 기준)
    const topContributors = Object.entries(activityMap)
      .map(([userId, stats]) => ({
        userId,
        name: profileMap.get(userId)?.name || '알 수 없음',
        avatarUrl: profileMap.get(userId)?.avatar_url,
        ...stats,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // 피드백 해결자별 통계
    let resolvedQuery = adminClient
      .from('video_feedbacks')
      .select('resolved_by')
      .in('project_id', projectIds)
      .eq('status', 'resolved')
      .not('resolved_by', 'is', null);

    if (startDate) {
      resolvedQuery = resolvedQuery.gte('resolved_at', startDate);
    }

    const { data: resolvedFeedbacks } = await resolvedQuery;

    const resolvedCountMap: Record<string, number> = {};
    resolvedFeedbacks?.forEach((f) => {
      if (f.resolved_by) {
        resolvedCountMap[f.resolved_by] = (resolvedCountMap[f.resolved_by] || 0) + 1;
      }
    });

    // 활동 리더보드 (피드백 작성, 해결, 영상 업로드)
    const activityLeaderboard = userIds
      .map((userId) => ({
        userId,
        name: profileMap.get(userId)?.name || '알 수 없음',
        avatarUrl: profileMap.get(userId)?.avatar_url,
        feedbacksCreated: feedbackCountMap[userId] || 0,
        feedbacksResolved: resolvedCountMap[userId] || 0,
        videosUploaded: videoCountMap[userId] || 0,
        score:
          (feedbackCountMap[userId] || 0) * 1 +
          (resolvedCountMap[userId] || 0) * 2 +
          (videoCountMap[userId] || 0) * 3,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // 활성 멤버 (기간 내 활동이 있는 멤버)
    const activeUserIds = new Set([
      ...Object.keys(feedbackCountMap),
      ...Object.keys(videoCountMap),
      ...Object.keys(resolvedCountMap),
    ]);
    const activeMembers = activeUserIds.size;

    return NextResponse.json({
      totalMembers,
      activeMembers,
      membersByRole,
      topContributors,
      activityLeaderboard,
    });
  } catch (error) {
    console.error('[Analytics Workers] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
