'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Video,
  MessageSquare,
  Clock,
  CheckCircle,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientVideoSection } from './ClientVideoSection';
import { ClientProgressBar } from './ClientProgressBar';

interface ProjectDetails {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  created_at: string;
  client: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  members: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      name: string;
      avatar_url: string | null;
    };
  }>;
}

interface ProjectStats {
  total_videos: number;
  approved_videos: number;
  open_feedbacks: number;
  resolved_feedbacks: number;
}

interface ClientProjectViewProps {
  projectId: string;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  planning: { label: '기획 중', className: 'bg-gray-100 text-gray-600' },
  production: { label: '제작 중', className: 'bg-blue-100 text-blue-700' },
  review: { label: '검토 중', className: 'bg-yellow-100 text-yellow-700' },
  completed: { label: '완료', className: 'bg-green-100 text-green-700' },
};

export function ClientProjectView({ projectId }: ClientProjectViewProps) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const [projectRes, statsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/feedback-stats`),
      ]);

      if (projectRes.ok) {
        const { data } = await projectRes.json();
        setProject(data.project);
      }

      if (statsRes.ok) {
        const { data } = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error('프로젝트 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">프로젝트를 찾을 수 없습니다</p>
        <Button
          variant="outline"
          onClick={() => router.push('/client/projects')}
          className="mt-4"
        >
          프로젝트 목록으로
        </Button>
      </div>
    );
  }

  const status = statusLabels[project.status] || statusLabels.planning;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/client/projects')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
              {project.title}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge className={status.className}>{status.label}</Badge>
              {project.deadline && (
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  마감 {formatDate(project.deadline)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 진행 상황 */}
      {stats && (
        <ClientProgressBar
          totalVideos={stats.total_videos}
          approvedVideos={stats.approved_videos}
          openFeedbacks={stats.open_feedbacks}
          resolvedFeedbacks={stats.resolved_feedbacks}
        />
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <Video className="h-6 w-6 text-primary-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {stats?.total_videos || 0}
            </div>
            <div className="text-xs text-gray-500">전체 영상</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {stats?.approved_videos || 0}
            </div>
            <div className="text-xs text-gray-500">승인된 영상</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-6 w-6 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {stats?.open_feedbacks || 0}
            </div>
            <div className="text-xs text-gray-500">대기 중 피드백</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {project.members?.length || 0}
            </div>
            <div className="text-xs text-gray-500">팀 멤버</div>
          </CardContent>
        </Card>
      </div>

      {/* 프로젝트 설명 */}
      {project.description && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">프로젝트 설명</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 whitespace-pre-wrap">
              {project.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 영상 목록 */}
      <ClientVideoSection projectId={projectId} />
    </div>
  );
}
