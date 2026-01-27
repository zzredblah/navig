import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/dashboard/urgent
 * 긴급 항목 조회 (긴급 피드백 + 기한 초과 프로젝트)
 */
export async function GET() {
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

    // 2. Admin 클라이언트로 데이터 조회
    const adminClient = createAdminClient();

    // 소유한 프로젝트 ID
    const { data: ownedProjects, error: ownedError } = await adminClient
      .from('projects')
      .select('id')
      .eq('client_id', user.id);

    if (ownedError) {
      console.error('[Dashboard Urgent] 소유 프로젝트 조회 실패:', ownedError);
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
      console.error('[Dashboard Urgent] 멤버 프로젝트 조회 실패:', memberError);
      return NextResponse.json(
        { error: '프로젝트 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    const ownedIds = ownedProjects?.map(p => p.id) || [];
    const memberIds = memberProjects?.map(m => m.project_id) || [];
    const allProjectIds = [...new Set([...ownedIds, ...memberIds])];

    if (allProjectIds.length === 0) {
      return NextResponse.json({
        urgent_feedbacks: [],
        overdue_projects: [],
      }, { status: 200 });
    }

    // 3. 긴급 피드백 조회 (미해결 상태의 모든 피드백)
    // 해결되지 않은 피드백은 생성 시간에 관계없이 표시
    const { data: feedbacks, error: feedbacksError } = await adminClient
      .from('video_feedbacks')
      .select(`
        id,
        content,
        created_at,
        project_id,
        video_id,
        video_versions!inner(id, version_name, original_filename),
        projects!inner(id, title)
      `)
      .in('project_id', allProjectIds)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20);

    if (feedbacksError) {
      console.error('[Dashboard Urgent] 긴급 피드백 조회 실패:', feedbacksError);
    }

    const urgentFeedbacks = (feedbacks || []).map((fb: any) => ({
      id: fb.id,
      content: fb.content,
      project_title: fb.projects?.title || '알 수 없음',
      video_title: fb.video_versions?.version_name || fb.video_versions?.original_filename || '알 수 없음',
      created_at: fb.created_at,
    }));

    // 4. 기한 초과 프로젝트 조회
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const { data: overdueProjects, error: overdueError } = await adminClient
      .from('projects')
      .select('id, title, deadline')
      .in('id', allProjectIds)
      .not('status', 'eq', 'completed')
      .not('deadline', 'is', null)
      .lt('deadline', today)
      .order('deadline', { ascending: true })
      .limit(10);

    if (overdueError) {
      console.error('[Dashboard Urgent] 기한 초과 프로젝트 조회 실패:', overdueError);
    }

    const overdueProjectsWithDays = (overdueProjects || []).map((project) => {
      const deadline = new Date(project.deadline!);
      const todayDate = new Date();
      const diffTime = todayDate.getTime() - deadline.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        id: project.id,
        title: project.title,
        deadline: project.deadline,
        days_overdue: diffDays,
      };
    });

    return NextResponse.json({
      urgent_feedbacks: urgentFeedbacks,
      overdue_projects: overdueProjectsWithDays,
    }, { status: 200 });

  } catch (error) {
    console.error('[Dashboard Urgent] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
