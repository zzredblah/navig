'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, MessageSquare, Calendar, ChevronDown, ChevronUp, AlertCircle, Loader2 } from 'lucide-react';

interface UrgentFeedback {
  id: string;
  content: string;
  project_title: string;
  video_title: string;
  created_at: string;
}

interface OverdueProject {
  id: string;
  title: string;
  deadline: string;
  days_overdue: number;
}

interface UrgentSectionProps {
  urgentFeedbacks: UrgentFeedback[];
  overdueProjects: OverdueProject[];
}

const ITEMS_PER_PAGE = 3;

export function UrgentSection({ urgentFeedbacks, overdueProjects }: UrgentSectionProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackShowCount, setFeedbackShowCount] = useState(ITEMS_PER_PAGE);
  const [overdueShowCount, setOverdueShowCount] = useState(ITEMS_PER_PAGE);

  // 클라이언트 마운트 후에만 Collapsible 렌더링 (Radix UI hydration 에러 방지)
  useEffect(() => {
    setMounted(true);
  }, []);

  const totalUrgent = urgentFeedbacks.length + overdueProjects.length;
  const hasUrgentItems = totalUrgent > 0;

  // SSR에서는 기본 레이아웃만 렌더링 (Radix UI hydration 에러 방지)
  if (!mounted) {
    return (
      <div className={`bg-white rounded-lg border shadow-sm overflow-hidden ${hasUrgentItems ? 'border-red-100' : 'border-gray-100'}`}>
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${hasUrgentItems ? 'bg-red-100' : 'bg-gray-100'}`}>
              <AlertCircle className={`h-3.5 w-3.5 ${hasUrgentItems ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
            <span className="text-sm font-medium text-gray-900">긴급 항목</span>
            {hasUrgentItems && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {totalUrgent}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    );
  }

  const displayedFeedbacks = urgentFeedbacks.slice(0, feedbackShowCount);
  const displayedOverdue = overdueProjects.slice(0, overdueShowCount);

  const handleShowMoreFeedbacks = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFeedbackShowCount((prev) => prev + ITEMS_PER_PAGE);
  };

  const handleShowLessFeedbacks = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFeedbackShowCount(ITEMS_PER_PAGE);
  };

  const handleShowMoreOverdue = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOverdueShowCount((prev) => prev + ITEMS_PER_PAGE);
  };

  const handleShowLessOverdue = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOverdueShowCount(ITEMS_PER_PAGE);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={`bg-white rounded-lg border shadow-sm overflow-hidden ${hasUrgentItems ? 'border-red-100' : 'border-gray-100'}`}>
        <CollapsibleTrigger asChild>
          <button className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${hasUrgentItems ? 'hover:bg-red-50/30' : 'hover:bg-gray-50'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center ${hasUrgentItems ? 'bg-red-100' : 'bg-gray-100'}`}>
                <AlertCircle className={`h-3.5 w-3.5 ${hasUrgentItems ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
              <span className="text-sm font-medium text-gray-900">긴급 항목</span>
              {hasUrgentItems && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  {totalUrgent}
                </Badge>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {!hasUrgentItems ? (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertCircle className="h-8 w-8 text-gray-200 mb-2" />
              <p className="text-xs text-gray-400">긴급한 항목이 없습니다</p>
            </div>
          ) : (
          <div className="px-3 pb-3 space-y-3">
            {/* 긴급 피드백 */}
            {urgentFeedbacks.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5 px-1">
                  <MessageSquare className="h-3 w-3 text-red-500" />
                  <span className="text-[11px] font-medium text-gray-600">
                    긴급 피드백 ({urgentFeedbacks.length})
                  </span>
                </div>
                <div className="space-y-1">
                  {displayedFeedbacks.map((feedback) => (
                    <Link
                      key={feedback.id}
                      href={`/projects/${feedback.id}`}
                      className="block p-2 rounded-md bg-red-50/50 hover:bg-red-50 border border-red-100/50 transition-colors"
                    >
                      <p className="text-xs text-gray-800 line-clamp-1 mb-0.5">
                        {feedback.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 truncate max-w-[60%]">
                          {feedback.project_title}
                        </span>
                        <span className="text-[10px] text-red-500 font-medium">
                          {getTimeAgo(feedback.created_at)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
                {urgentFeedbacks.length > ITEMS_PER_PAGE && (
                  <div className="flex justify-center gap-2 pt-1">
                    {feedbackShowCount < urgentFeedbacks.length && (
                      <button
                        onClick={handleShowMoreFeedbacks}
                        className="text-[10px] text-red-600 hover:text-red-700 font-medium"
                      >
                        +{Math.min(ITEMS_PER_PAGE, urgentFeedbacks.length - feedbackShowCount)}개 더보기
                      </button>
                    )}
                    {feedbackShowCount > ITEMS_PER_PAGE && (
                      <button
                        onClick={handleShowLessFeedbacks}
                        className="text-[10px] text-gray-500 hover:text-gray-600 font-medium"
                      >
                        접기
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 기한 초과 */}
            {overdueProjects.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5 px-1">
                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                  <span className="text-[11px] font-medium text-gray-600">
                    기한 초과 ({overdueProjects.length})
                  </span>
                </div>
                <div className="space-y-1">
                  {displayedOverdue.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="block p-2 rounded-md bg-orange-50/50 hover:bg-orange-50 border border-orange-100/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-800 truncate max-w-[60%]">
                          {project.title}
                        </p>
                        <Badge variant="destructive" className="text-[9px] px-1 py-0">
                          {project.days_overdue}일 초과
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-500">
                        <Calendar className="h-2.5 w-2.5" />
                        <span>
                          마감 {new Date(project.deadline).toLocaleDateString('ko-KR', {
                            month: 'numeric',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
                {overdueProjects.length > ITEMS_PER_PAGE && (
                  <div className="flex justify-center gap-2 pt-1">
                    {overdueShowCount < overdueProjects.length && (
                      <button
                        onClick={handleShowMoreOverdue}
                        className="text-[10px] text-orange-600 hover:text-orange-700 font-medium"
                      >
                        +{Math.min(ITEMS_PER_PAGE, overdueProjects.length - overdueShowCount)}개 더보기
                      </button>
                    )}
                    {overdueShowCount > ITEMS_PER_PAGE && (
                      <button
                        onClick={handleShowLessOverdue}
                        className="text-[10px] text-gray-500 hover:text-gray-600 font-medium"
                      >
                        접기
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return '방금';
  if (diffMins < 60) return `${diffMins}분`;
  if (diffHours < 24) return `${diffHours}시간`;
  return `${Math.floor(diffHours / 24)}일`;
}
