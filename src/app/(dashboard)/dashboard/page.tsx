import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { ProjectStatusChart, DocumentStatusChart } from '@/components/dashboard/DashboardCharts';
import { StatCards } from '@/components/dashboard/StatCards';
import { UrgentSection } from '@/components/dashboard/UrgentSection';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { RecentProjects } from '@/components/dashboard/RecentProjects';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

async function DashboardContent() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">로그인이 필요합니다</p>
      </div>
    );
  }

  // 프로필 정보 가져오기
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // 1. 프로젝트 현황 요약 (직접 조회)
  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('id, status')
    .eq('client_id', user.id);

  const { data: memberProjects } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', user.id);

  const ownedIds = ownedProjects?.map(p => p.id) || [];
  const memberIds = memberProjects?.map(m => m.project_id) || [];
  const allProjectIds = [...new Set([...ownedIds, ...memberIds])];

  // 멤버 프로젝트의 상태 조회
  let memberProjectStatuses: { status: string }[] = [];
  if (memberIds.length > 0) {
    const { data } = await supabase
      .from('projects')
      .select('status')
      .in('id', memberIds);
    memberProjectStatuses = data || [];
  }

  // 모든 프로젝트 상태 합치기
  const allStatuses = [
    ...(ownedProjects || []),
    ...memberProjectStatuses
  ];

  const summary = {
    total: allProjectIds.length,
    planning: allStatuses.filter(p => p.status === 'planning').length,
    production: allStatuses.filter(p => p.status === 'production').length,
    review: allStatuses.filter(p => p.status === 'review').length,
    completed: allStatuses.filter(p => p.status === 'completed').length,
  };

  // 2. 긴급 항목
  let urgent = { urgent_feedbacks: [], overdue_projects: [] };

  if (allProjectIds.length > 0) {
    // 긴급 피드백 (최근 24시간 이내)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: feedbacks } = await supabase
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
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const urgentFeedbacks = (feedbacks || []).map((fb: any) => ({
      id: fb.id,
      content: fb.content,
      project_title: fb.projects?.title || '알 수 없음',
      video_title: fb.video_versions?.version_name || fb.video_versions?.original_filename || '알 수 없음',
      created_at: fb.created_at,
    }));

    // 기한 초과 프로젝트
    const today = new Date().toISOString().split('T')[0];
    const { data: overdueProjects } = await supabase
      .from('projects')
      .select('id, title, deadline')
      .in('id', allProjectIds)
      .not('status', 'eq', 'completed')
      .not('deadline', 'is', null)
      .lt('deadline', today)
      .order('deadline', { ascending: true })
      .limit(10);

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

    urgent = {
      urgent_feedbacks: urgentFeedbacks,
      overdue_projects: overdueProjectsWithDays,
    };
  }

  // 3. 최근 활동
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let activitiesData = { activities: [] as any[] };

  if (allProjectIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activities: any[] = [];
    const limit = 10;

    // 피드백 활동
    const { data: feedbacks } = await supabase
      .from('video_feedbacks')
      .select(`
        id,
        content,
        created_at,
        project_id,
        video_id,
        created_by,
        projects!inner(id, title),
        profiles!video_feedbacks_created_by_fkey(id, name, avatar_url)
      `)
      .in('project_id', allProjectIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (feedbacks) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      feedbacks.forEach((fb: any) => {
        activities.push({
          type: 'feedback',
          action: 'created',
          title: fb.content.substring(0, 50) + (fb.content.length > 50 ? '...' : ''),
          project_name: fb.projects?.title || '알 수 없음',
          actor_name: fb.profiles?.name || '알 수 없음',
          actor_avatar: fb.profiles?.avatar_url || null,
          created_at: fb.created_at,
          link: `/projects/${fb.project_id}/videos/${fb.video_id}`,
        });
      });
    }

    // 영상 버전 활동
    const { data: versions } = await supabase
      .from('video_versions')
      .select(`
        id,
        version_name,
        original_filename,
        created_at,
        project_id,
        uploaded_by,
        projects!inner(id, title),
        profiles!video_versions_uploaded_by_fkey(id, name, avatar_url)
      `)
      .in('project_id', allProjectIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (versions) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      versions.forEach((version: any) => {
        activities.push({
          type: 'version',
          action: 'created',
          title: version.version_name || version.original_filename || '새 버전',
          project_name: version.projects?.title || '알 수 없음',
          actor_name: version.profiles?.name || '알 수 없음',
          actor_avatar: version.profiles?.avatar_url || null,
          created_at: version.created_at,
          link: `/projects/${version.project_id}/videos/${version.id}`,
        });
      });
    }

    // 문서 활동
    const { data: documents } = await supabase
      .from('documents')
      .select(`
        id,
        title,
        created_at,
        project_id,
        created_by,
        projects!inner(id, title),
        profiles!documents_created_by_fkey(id, name, avatar_url)
      `)
      .in('project_id', allProjectIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (documents) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documents.forEach((doc: any) => {
        activities.push({
          type: 'document',
          action: 'created',
          title: doc.title,
          project_name: doc.projects?.title || '알 수 없음',
          actor_name: doc.profiles?.name || '알 수 없음',
          actor_avatar: doc.profiles?.avatar_url || null,
          created_at: doc.created_at,
          link: `/projects/${doc.project_id}/documents/${doc.id}`,
        });
      });
    }

    // 프로젝트 활동
    const { data: projectActivities } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        created_at,
        client_id,
        profiles!projects_client_id_fkey(id, name, avatar_url)
      `)
      .in('id', allProjectIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (projectActivities) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      projectActivities.forEach((proj: any) => {
        activities.push({
          type: 'project',
          action: 'created',
          title: proj.title,
          project_name: proj.title,
          actor_name: proj.profiles?.name || '알 수 없음',
          actor_avatar: proj.profiles?.avatar_url || null,
          created_at: proj.created_at,
          link: `/projects/${proj.id}`,
        });
      });
    }

    // 시간순 정렬
    activities.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    activitiesData = { activities: activities.slice(0, limit) };
  }

  // 4. 최근 프로젝트
  let recentProjects: Array<{
    id: string;
    title: string;
    status: string;
    created_at: string;
    updated_at: string;
    description: string | null;
    memberCount: number;
    documentCount: number;
  }> = [];

  let allProjects: Array<{ status: string }> = [];

  if (allProjectIds.length > 0) {
    const { data } = await supabase
      .from('projects')
      .select('id, title, status, created_at, updated_at, description')
      .in('id', allProjectIds)
      .order('updated_at', { ascending: false })
      .limit(10);

    const projectsWithDetails = await Promise.all(
      (data || []).map(async (project) => {
        const { count: memberCount } = await supabase
          .from('project_members')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);

        const { count: documentCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .is('deleted_at', null);

        return {
          ...project,
          memberCount: memberCount || 0,
          documentCount: documentCount || 0,
        };
      })
    );

    recentProjects = projectsWithDetails;

    const { data: allData } = await supabase
      .from('projects')
      .select('status')
      .in('id', allProjectIds);

    allProjects = allData || [];
  }

  // 협업 멤버 수
  let totalMembers = 0;
  if (allProjectIds.length > 0) {
    const { data: members } = await supabase
      .from('project_members')
      .select('user_id')
      .in('project_id', allProjectIds)
      .neq('user_id', user.id);

    const uniqueMembers = new Set(members?.map(m => m.user_id) || []);
    totalMembers = uniqueMembers.size;
  }

  // 프로젝트 상태 차트 데이터
  const projectStatusData = [
    { name: '기획', value: allProjects.filter(p => p.status === 'planning').length, color: '#A78BFA' },
    { name: '제작', value: allProjects.filter(p => p.status === 'production').length, color: '#8B5CF6' },
    { name: '검수', value: allProjects.filter(p => p.status === 'review').length, color: '#6D28D9' },
    { name: '완료', value: allProjects.filter(p => p.status === 'completed').length, color: '#4C1D95' },
  ];

  // 문서 현황 데이터
  let documentStatusData = [
    { name: '작성 중', count: 0 },
    { name: '검토 대기', count: 0 },
    { name: '승인', count: 0 },
    { name: '반려', count: 0 },
    { name: '서명 완료', count: 0 },
  ];

  if (allProjectIds.length > 0) {
    const { data: docs } = await supabase
      .from('documents')
      .select('status')
      .in('project_id', allProjectIds)
      .is('deleted_at', null);

    if (docs) {
      documentStatusData = [
        { name: '작성 중', count: docs.filter(d => d.status === 'draft').length },
        { name: '검토 대기', count: docs.filter(d => d.status === 'pending').length },
        { name: '승인', count: docs.filter(d => d.status === 'approved').length },
        { name: '반려', count: docs.filter(d => d.status === 'rejected').length },
        { name: '서명 완료', count: docs.filter(d => d.status === 'signed').length },
      ];
    }
  }

  const totalDocuments = documentStatusData.reduce((sum, d) => sum + d.count, 0);

  // 현재 시간대 인사말
  const hour = new Date().getHours();
  let greeting = '안녕하세요';
  if (hour >= 5 && hour < 12) greeting = '좋은 아침이에요';
  else if (hour >= 12 && hour < 18) greeting = '좋은 오후에요';
  else if (hour >= 18 && hour < 22) greeting = '좋은 저녁이에요';
  else greeting = '늦은 시간까지 수고하세요';

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* 인사 헤더 - 간결하게 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {greeting}, {profile?.name || '사용자'}님 👋
          </h1>
          <p className="text-sm text-gray-500">오늘의 프로젝트 현황을 확인하세요</p>
        </div>
      </div>

      {/* 통계 카드 (컴팩트) */}
      <StatCards
        total={summary.total}
        planning={summary.planning}
        production={summary.production}
        review={summary.review}
        completed={summary.completed}
        totalMembers={totalMembers}
        totalDocuments={totalDocuments}
      />

      {/* 그래프 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProjectStatusChart data={projectStatusData} />
        <DocumentStatusChart data={documentStatusData} />
      </div>

      {/* 긴급 피드백 + 최근 활동 (한 줄에 반반, 접힘) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* 긴급 섹션 - 긴급 피드백과 기한 초과를 하나로 */}
        <UrgentSection
          urgentFeedbacks={urgent.urgent_feedbacks}
          overdueProjects={urgent.overdue_projects}
        />

        {/* 최근 활동 */}
        <ActivityFeed activities={activitiesData.activities} />
      </div>

      {/* 최근 프로젝트 (기본 펼침) */}
      <RecentProjects projects={recentProjects} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
