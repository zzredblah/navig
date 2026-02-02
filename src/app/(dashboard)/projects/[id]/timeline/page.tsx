import { Metadata } from 'next';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ActivityTimeline } from '@/components/timeline/ActivityTimeline';

export const metadata: Metadata = {
  title: '프로젝트 타임라인 | NAVIG',
  description: '프로젝트 활동 기록을 확인합니다',
};

interface TimelinePageProps {
  params: Promise<{ id: string }>;
}

export default async function TimelinePage({ params }: TimelinePageProps) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const adminClient = createAdminClient();

  // 프로젝트 정보 조회
  const { data: project, error: projectError } = await adminClient
    .from('projects')
    .select('id, title, client_id')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    notFound();
  }

  // 접근 권한 확인
  const { data: memberData } = await adminClient
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .not('joined_at', 'is', null)
    .limit(1);

  const isMember = memberData && memberData.length > 0;
  const isOwner = project.client_id === user.id;

  if (!isMember && !isOwner) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="sm" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              프로젝트 타임라인
            </h1>
            <p className="text-sm text-gray-500 truncate">{project.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm">
            <Clock className="h-4 w-4" />
            <span>활동 기록</span>
          </div>
        </div>
      </div>

      {/* 타임라인 */}
      <ActivityTimeline projectId={projectId} />
    </div>
  );
}
