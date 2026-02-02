'use client';

import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  FolderPlus,
  FileEdit,
  UserPlus,
  UserCheck,
  UserMinus,
  Video,
  Upload,
  MessageSquare,
  CheckCircle,
  RotateCcw,
  FileText,
  ThumbsUp,
  LayoutGrid,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivityLogWithUser, ActivityType, ACTIVITY_TYPE_CONFIG } from '@/types/activity';

interface ActivityItemProps {
  activity: ActivityLogWithUser;
  isLast?: boolean;
}

// 아이콘 매핑
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FolderPlus,
  FolderEdit: FileEdit,
  UserPlus,
  UserCheck,
  UserMinus,
  Video,
  Upload,
  MessageSquare,
  CheckCircle,
  RotateCcw,
  FileText,
  FileEdit,
  ThumbsUp,
  LayoutGrid,
};

// 색상 매핑
const COLOR_MAP: Record<string, string> = {
  primary: 'bg-primary-100 text-primary-600',
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  red: 'bg-red-100 text-red-600',
  orange: 'bg-orange-100 text-orange-600',
  purple: 'bg-purple-100 text-purple-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  gray: 'bg-gray-100 text-gray-600',
};

export function ActivityItem({ activity, isLast = false }: ActivityItemProps) {
  const config = ACTIVITY_TYPE_CONFIG[activity.activity_type as ActivityType] || {
    label: '활동',
    icon: 'Clock',
    color: 'gray',
  };

  const IconComponent = ICON_MAP[config.icon] || Clock;
  const colorClass = COLOR_MAP[config.color] || COLOR_MAP.gray;

  const timeAgo = formatDistanceToNow(new Date(activity.created_at), {
    addSuffix: true,
    locale: ko,
  });

  return (
    <div className="relative flex gap-4">
      {/* 연결선 */}
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-px bg-gray-200" />
      )}

      {/* 아이콘 */}
      <div
        className={cn(
          'relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          colorClass
        )}
      >
        <IconComponent className="h-5 w-5" />
      </div>

      {/* 내용 */}
      <div className="flex-1 pb-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div className="flex items-center gap-2 min-w-0">
            {activity.user?.avatar_url ? (
              <img
                src={activity.user.avatar_url}
                alt={activity.user.name || '사용자'}
                className="w-6 h-6 rounded-full shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                <span className="text-xs text-gray-500">
                  {(activity.user?.name || '?')[0]}
                </span>
              </div>
            )}
            <span className="font-medium text-gray-900 truncate">
              {activity.user?.name || '알 수 없음'}
            </span>
          </div>
          <span className="text-xs text-gray-500 shrink-0">{timeAgo}</span>
        </div>

        <p className="mt-1 text-sm text-gray-700">{activity.title}</p>

        {activity.description && (
          <p className="mt-1 text-sm text-gray-500">{activity.description}</p>
        )}

        <span className="mt-2 inline-block text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
          {config.label}
        </span>
      </div>
    </div>
  );
}
