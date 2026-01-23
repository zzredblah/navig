import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FolderOpen, Users, Clock, Plus, ArrowRight, FileText, TrendingUp } from 'lucide-react';
import { ProjectStatusChart, DocumentStatusChart } from '@/components/dashboard/DashboardCharts';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  planning: { label: '기획', variant: 'secondary' },
  production: { label: '제작', variant: 'default' },
  review: { label: '검수', variant: 'outline' },
  completed: { label: '완료', variant: 'secondary' },
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // 프로필 정보 가져오기
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single();

  // 사용자의 프로젝트 가져오기 (소유 + 멤버)
  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('client_id', user!.id);

  const { data: memberProjects } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', user!.id);

  const ownedIds = ownedProjects?.map(p => p.id) || [];
  const memberIds = memberProjects?.map(m => m.project_id) || [];
  const allProjectIds = [...new Set([...ownedIds, ...memberIds])];

  // 프로젝트 상세 정보 가져오기 (최근 5개)
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
      .order('created_at', { ascending: false })
      .limit(5);

    // 각 프로젝트별 멤버 수와 문서 수 조회
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

    // 전체 프로젝트 상태 통계
    const { data: allData } = await supabase
      .from('projects')
      .select('status')
      .in('id', allProjectIds);

    allProjects = allData || [];
  }

  // 진행 중인 프로젝트 수 (planning, production, review)
  const activeProjectCount = allProjects.filter(
    p => ['planning', 'production', 'review'].includes(p.status)
  ).length;

  // 협업 멤버 수 계산 - distinct user_id, 자기 자신 제외
  let totalMembers = 0;
  if (allProjectIds.length > 0) {
    const { data: members } = await supabase
      .from('project_members')
      .select('user_id')
      .in('project_id', allProjectIds)
      .neq('user_id', user!.id);

    const uniqueMembers = new Set(members?.map(m => m.user_id) || []);
    totalMembers = uniqueMembers.size;
  }

  // 최근 활동 시간 (년월일시분)
  const lastActivity = recentProjects.length > 0
    ? new Date(recentProjects[0].created_at).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 인사 헤더 */}
      <div className="bg-gradient-to-r from-primary-50 via-white to-purple-50 rounded-2xl p-6 border border-primary-100">
        <h1 className="text-2xl font-bold text-gray-900">
          안녕하세요, {profile?.name || '사용자'}님
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          오늘도 좋은 하루 되세요
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                <FolderOpen className="h-5 w-5 text-primary-600" />
              </div>
              <TrendingUp className="h-4 w-4 text-primary-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{activeProjectCount}</div>
            <p className="text-xs text-gray-500 mt-1">진행 중인 프로젝트</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalMembers}</div>
            <p className="text-xs text-gray-500 mt-1">협업 멤버</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalDocuments}</div>
            <p className="text-xs text-gray-500 mt-1">전체 문서</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <div className="text-lg font-semibold text-gray-900 truncate">{lastActivity}</div>
            <p className="text-xs text-gray-500 mt-1">최근 활동</p>
          </CardContent>
        </Card>
      </div>

      {/* 그래프 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProjectStatusChart data={projectStatusData} />
        <DocumentStatusChart data={documentStatusData} />
      </div>

      {/* 최근 프로젝트 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">최근 프로젝트</CardTitle>
            <CardDescription className="text-xs">최근에 작업한 프로젝트 목록</CardDescription>
          </div>
          {recentProjects.length > 0 && (
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="text-xs">
                전체 보기
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {recentProjects.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <FolderOpen className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm">아직 프로젝트가 없습니다</p>
              <p className="text-xs text-gray-400 mt-1">새 프로젝트를 만들어 시작해보세요</p>
              <Link href="/projects">
                <Button size="sm" className="mt-4 bg-primary-600 hover:bg-primary-700">
                  <Plus className="h-4 w-4 mr-1" />
                  새 프로젝트 만들기
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block p-4 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {project.title}
                    </p>
                    <Badge variant={statusLabels[project.status]?.variant || 'default'} className="ml-3 text-xs">
                      {statusLabels[project.status]?.label || project.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      멤버 {project.memberCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      문서 {project.documentCount}
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1">
                      생성 {new Date(project.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1">
                      수정 {new Date(project.updated_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
