import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FolderOpen, Users, Clock, Plus, ArrowRight } from 'lucide-react';

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
    description: string | null;
  }> = [];

  if (allProjectIds.length > 0) {
    const { data } = await supabase
      .from('projects')
      .select('id, title, status, created_at, description')
      .in('id', allProjectIds)
      .order('created_at', { ascending: false })
      .limit(5);

    recentProjects = data || [];
  }

  // 진행 중인 프로젝트 수 (planning, production, review)
  const activeProjectCount = recentProjects.filter(
    p => ['planning', 'production', 'review'].includes(p.status)
  ).length;

  // 협업 멤버 수 계산
  let totalMembers = 0;
  if (allProjectIds.length > 0) {
    const { count } = await supabase
      .from('project_members')
      .select('*', { count: 'exact', head: true })
      .in('project_id', allProjectIds);
    totalMembers = count || 0;
  }

  // 최근 활동 시간
  const lastActivity = recentProjects.length > 0
    ? new Date(recentProjects[0].created_at).toLocaleDateString('ko-KR')
    : '-';

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          안녕하세요, {profile?.name || '사용자'}님
        </h1>
        <p className="text-gray-600 mt-1">
          오늘도 좋은 하루 되세요
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">내 프로젝트</CardTitle>
            <FolderOpen className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjectCount}</div>
            <CardDescription>진행 중인 프로젝트</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">협업 멤버</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <CardDescription>함께하는 멤버</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">최근 활동</CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lastActivity}</div>
            <CardDescription>마지막 프로젝트 생성일</CardDescription>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>최근 프로젝트</CardTitle>
              <CardDescription>최근에 작업한 프로젝트 목록입니다</CardDescription>
            </div>
            {recentProjects.length > 0 && (
              <Link href="/projects">
                <Button variant="ghost" size="sm">
                  전체 보기
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>아직 프로젝트가 없습니다</p>
                <p className="text-sm mt-1">새 프로젝트를 만들어 시작해보세요</p>
                <Link href="/projects">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    새 프로젝트 만들기
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {project.title}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {project.description || '설명 없음'}
                        </p>
                      </div>
                      <Badge variant={statusLabels[project.status]?.variant || 'default'} className="ml-3">
                        {statusLabels[project.status]?.label || project.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
