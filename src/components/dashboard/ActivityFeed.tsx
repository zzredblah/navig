'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MessageSquare, Video, FileText, FolderOpen, Activity, ChevronDown, ChevronUp } from 'lucide-react';

interface ActivityItem {
  type: 'feedback' | 'version' | 'document' | 'project';
  action: 'created' | 'updated' | 'status_changed';
  title: string;
  project_name: string;
  actor_name: string;
  actor_avatar: string | null;
  created_at: string;
  link: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

const activityConfig = {
  feedback: {
    icon: MessageSquare,
    label: '피드백',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  version: {
    icon: Video,
    label: '영상',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  document: {
    icon: FileText,
    label: '문서',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  project: {
    icon: FolderOpen,
    label: '프로젝트',
    color: 'text-primary-600',
    bgColor: 'bg-primary-100',
  },
} as const;

const ITEMS_PER_PAGE = 3;

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showCount, setShowCount] = useState(ITEMS_PER_PAGE);

  const hasActivities = activities.length > 0;

  // 클라이언트 마운트 후에만 Collapsible 렌더링 (Radix UI hydration 에러 방지)
  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR에서는 기본 레이아웃만 렌더링
  if (!mounted) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center">
              <Activity className={`h-3.5 w-3.5 ${hasActivities ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
            <span className="text-sm font-medium text-gray-900">최근 활동</span>
            {hasActivities && (
              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                {activities.length}
              </span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    );
  }

  const displayedActivities = activities.slice(0, showCount);

  const handleShowMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCount((prev) => prev + ITEMS_PER_PAGE);
  };

  const handleShowLess = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCount(ITEMS_PER_PAGE);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center">
                <Activity className={`h-3.5 w-3.5 ${hasActivities ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <span className="text-sm font-medium text-gray-900">최근 활동</span>
              {hasActivities && (
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  {activities.length}
                </span>
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
          {!hasActivities ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Activity className="h-8 w-8 text-gray-200 mb-2" />
              <p className="text-xs text-gray-400">아직 활동 내역이 없습니다</p>
            </div>
          ) : (
          <div className="px-3 pb-3 space-y-1">
            {displayedActivities.map((activity, index) => {
              const config = activityConfig[activity.type];
              const Icon = config.icon;
              const timeAgo = getTimeAgo(activity.created_at);

              return (
                <Link
                  key={`${activity.type}-${index}`}
                  href={activity.link}
                  className="flex items-center gap-2.5 p-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  {/* 아바타 */}
                  <Avatar className="h-6 w-6 shrink-0">
                    {activity.actor_avatar ? (
                      <AvatarImage src={activity.actor_avatar} alt={activity.actor_name} />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-primary-400 to-primary-600 text-white text-[10px]">
                        {activity.actor_name.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  {/* 타입 아이콘 */}
                  <div className={`w-5 h-5 rounded ${config.bgColor} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-2.5 w-2.5 ${config.color}`} />
                  </div>

                  {/* 콘텐츠 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-gray-700 truncate">
                        {activity.actor_name}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {config.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">
                      {activity.title}
                    </p>
                  </div>

                  {/* 시간 */}
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {timeAgo}
                  </span>
                </Link>
              );
            })}
            {activities.length > ITEMS_PER_PAGE && (
              <div className="flex justify-center gap-2 pt-1">
                {showCount < activities.length && (
                  <button
                    onClick={handleShowMore}
                    className="text-[10px] text-primary-600 hover:text-primary-700 font-medium"
                  >
                    +{Math.min(ITEMS_PER_PAGE, activities.length - showCount)}개 더보기
                  </button>
                )}
                {showCount > ITEMS_PER_PAGE && (
                  <button
                    onClick={handleShowLess}
                    className="text-[10px] text-gray-500 hover:text-gray-600 font-medium"
                  >
                    접기
                  </button>
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
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '방금';
  if (diffMins < 60) return `${diffMins}분`;
  if (diffHours < 24) return `${diffHours}시간`;
  if (diffDays < 7) return `${diffDays}일`;
  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
}
