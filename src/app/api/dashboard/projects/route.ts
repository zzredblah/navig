import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { projectsQuerySchema } from '@/lib/validations/dashboard';

/**
 * GET /api/dashboard/projects
 * 내 프로젝트 목록 조회 (대시보드용)
 *
 * Query Parameters:
 * - status?: 'planning' | 'production' | 'review' | 'completed'
 * - limit?: number (기본 10, 최대 100)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 인증 확인
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 2. 쿼리 파라미터 파싱 및 검증
    const { searchParams } = new URL(request.url);
    const queryResult = projectsQuerySchema.safeParse({
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: '유효하지 않은 요청입니다', details: queryResult.error.flatten() },
        { status: 400 }
      );
    }

    const { status, limit } = queryResult.data;

    // 3. Admin 클라이언트로 데이터 조회
    const adminClient = createAdminClient();

    // 소유한 프로젝트 ID
    const { data: ownedProjects, error: ownedError } = await adminClient
      .from('projects')
      .select('id')
      .eq('client_id', user.id);

    if (ownedError) {
      console.error('[Dashboard Projects] 소유 프로젝트 조회 실패:', ownedError);
      return NextResponse.json(
        { error: '프로젝트 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    // 멤버로 참여한 프로젝트 ID
    const { data: memberProjects, error: memberError } = await adminClient
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);

    if (memberError) {
      console.error('[Dashboard Projects] 멤버 프로젝트 조회 실패:', memberError);
      return NextResponse.json(
        { error: '프로젝트 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    const ownedIds = ownedProjects?.map(p => p.id) || [];
    const memberIds = memberProjects?.map(m => m.project_id) || [];
    const allProjectIds = [...new Set([...ownedIds, ...memberIds])];

    if (allProjectIds.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // 4. 프로젝트 상세 정보 조회
    let query = adminClient
      .from('projects')
      .select('id, title, status, deadline, updated_at')
      .in('id', allProjectIds);

    // 상태 필터링
    if (status) {
      query = query.eq('status', status);
    }

    // 정렬 및 제한
    query = query
      .order('updated_at', { ascending: false })
      .limit(limit);

    const { data: projects, error: projectsError } = await query;

    if (projectsError) {
      console.error('[Dashboard Projects] 프로젝트 상세 조회 실패:', projectsError);
      return NextResponse.json(
        { error: '프로젝트 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    // 5. 각 프로젝트의 추가 정보 조회 (멤버 수, 피드백 수)
    const projectsWithDetails = await Promise.all(
      (projects || []).map(async (project) => {
        // 멤버 수
        const { count: memberCount } = await adminClient
          .from('project_members')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);

        // 전체 피드백 수 (open 상태)
        const { count: pendingFeedbacks } = await adminClient
          .from('video_feedbacks')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .eq('status', 'open');

        // 긴급 피드백 수 (video_feedbacks 테이블에 is_urgent 컬럼이 있다고 가정)
        // 만약 없다면 created_at 기준으로 최근 24시간 내 피드백을 긴급으로 간주
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const { count: urgentFeedbacks } = await adminClient
          .from('video_feedbacks')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .eq('status', 'open')
          .gte('created_at', oneDayAgo.toISOString());

        // 진행률 계산 (간단 버전: 상태 기반)
        // planning: 25%, production: 50%, review: 75%, completed: 100%
        const progressMap: Record<string, number> = {
          planning: 25,
          production: 50,
          review: 75,
          completed: 100,
        };
        const progress = progressMap[project.status] || 0;

        return {
          id: project.id,
          title: project.title,
          status: project.status,
          progress,
          deadline: project.deadline,
          pending_feedbacks: pendingFeedbacks || 0,
          urgent_feedbacks: urgentFeedbacks || 0,
          updated_at: project.updated_at,
          member_count: memberCount || 0,
        };
      })
    );

    return NextResponse.json({ data: projectsWithDetails }, { status: 200 });

  } catch (error) {
    console.error('[Dashboard Projects] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
