'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FolderOpen,
  Loader2,
  Video,
  MessageSquare,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Project {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  created_at: string;
  video_count?: number;
  feedback_count?: number;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  planning: { label: '기획 중', className: 'bg-gray-100 text-gray-600' },
  production: { label: '제작 중', className: 'bg-blue-100 text-blue-700' },
  review: { label: '검토 중', className: 'bg-yellow-100 text-yellow-700' },
  completed: { label: '완료', className: 'bg-green-100 text-green-700' },
};

export default function ClientProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects?role=client');
      if (response.ok) {
        const { data } = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('프로젝트 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'short',
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

  if (projects.length === 0) {
    return (
      <div className="text-center py-16">
        <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          아직 프로젝트가 없습니다
        </h2>
        <p className="text-gray-500">
          진행 중인 프로젝트가 있으면 여기에 표시됩니다
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">내 프로젝트</h1>
        <p className="text-sm text-gray-500 mt-1">
          진행 중인 영상 제작 프로젝트를 확인하세요
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const status = statusLabels[project.status] || statusLabels.planning;

          return (
            <Link
              key={project.id}
              href={`/client/projects/${project.id}`}
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                        {project.title}
                      </h3>
                      <Badge className={`mt-2 ${status.className}`}>
                        {status.label}
                      </Badge>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors shrink-0" />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Video className="h-4 w-4" />
                      영상 {project.video_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      피드백 {project.feedback_count || 0}
                    </span>
                    {project.deadline && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        마감 {formatDate(project.deadline)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
