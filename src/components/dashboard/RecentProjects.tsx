'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FolderOpen, Users, FileText, Plus, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  description: string | null;
  memberCount: number;
  documentCount: number;
  userRole: string;
}

interface RecentProjectsProps {
  projects: Project[];
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  planning: { label: '기획', variant: 'secondary' },
  production: { label: '제작', variant: 'default' },
  review: { label: '검수', variant: 'outline' },
  completed: { label: '완료', variant: 'secondary' },
};

const roleLabels: Record<string, { label: string; className: string }> = {
  owner: { label: '소유자', className: 'text-primary-600 bg-primary-50' },
  approver: { label: '승인자', className: 'text-green-600 bg-green-50' },
  editor: { label: '편집자', className: 'text-blue-600 bg-blue-50' },
  viewer: { label: '뷰어', className: 'text-gray-600 bg-gray-100' },
};

const ITEMS_PER_PAGE = 5;

export function RecentProjects({ projects }: RecentProjectsProps) {
  const [isOpen, setIsOpen] = useState(true); // 기본 펼침 상태
  const [showCount, setShowCount] = useState(ITEMS_PER_PAGE);

  const displayedProjects = projects.slice(0, showCount);

  const handleShowMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCount((prev) => prev + ITEMS_PER_PAGE);
  };

  const handleShowLess = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCount(ITEMS_PER_PAGE);
  };

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100">
          <div className="w-6 h-6 rounded-md bg-primary-100 flex items-center justify-center">
            <FolderOpen className="h-3.5 w-3.5 text-primary-600" />
          </div>
          <span className="text-sm font-medium text-gray-900">최근 프로젝트</span>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <FolderOpen className="h-12 w-12 text-gray-200 mb-3" />
          <p className="text-sm text-gray-500 mb-1">아직 프로젝트가 없습니다</p>
          <p className="text-xs text-gray-400 mb-4">새 프로젝트를 만들어 시작해보세요</p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            새 프로젝트 만들기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary-100 flex items-center justify-center">
                <FolderOpen className="h-3.5 w-3.5 text-primary-600" />
              </div>
              <span className="text-sm font-medium text-gray-900">최근 프로젝트</span>
              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                {projects.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/projects"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium hidden sm:flex items-center gap-0.5"
              >
                전체 보기
                <ArrowRight className="h-3 w-3" />
              </Link>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {displayedProjects.map((project) => {
              const roleConfig = roleLabels[project.userRole] || roleLabels.viewer;
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block p-4 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 pr-3">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {project.title}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${roleConfig.className}`}>
                        {roleConfig.label}
                      </span>
                    </div>
                    <Badge
                      variant={statusLabels[project.status]?.variant || 'default'}
                      className="text-xs shrink-0"
                    >
                      {statusLabels[project.status]?.label || project.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      멤버 {project.memberCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      문서 {project.documentCount}
                    </span>
                    <span className="hidden sm:inline text-gray-400">
                      수정 {new Date(project.updated_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </Link>
              );
            })}
            {projects.length > ITEMS_PER_PAGE && (
              <div className="flex justify-center gap-3 pt-2">
                {showCount < projects.length && (
                  <button
                    onClick={handleShowMore}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    +{Math.min(ITEMS_PER_PAGE, projects.length - showCount)}개 더보기
                  </button>
                )}
                {showCount > ITEMS_PER_PAGE && (
                  <button
                    onClick={handleShowLess}
                    className="text-xs text-gray-500 hover:text-gray-600 font-medium"
                  >
                    접기
                  </button>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
