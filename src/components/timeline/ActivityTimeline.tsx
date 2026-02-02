'use client';

import { useEffect, useState } from 'react';
import { Loader2, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ActivityLogWithUser, ActivityType, ACTIVITY_TYPE_CONFIG } from '@/types/activity';
import { ActivityItem } from './ActivityItem';

interface ActivityTimelineProps {
  projectId: string;
}

export function ActivityTimeline({ projectId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityLogWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');

  // 활동 로그 불러오기
  const fetchActivities = async (pageNum: number, append: boolean = false) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
      });

      if (activityTypeFilter && activityTypeFilter !== 'all') {
        params.append('activity_type', activityTypeFilter);
      }

      const response = await fetch(
        `/api/projects/${projectId}/activities?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('활동 로그를 불러오는데 실패했습니다');
      }

      const result = await response.json();

      if (append) {
        setActivities((prev) => [...prev, ...result.data]);
      } else {
        setActivities(result.data);
      }

      setHasMore(pageNum < result.pagination.totalPages);
      setPage(pageNum);
    } catch (err) {
      console.error('활동 로그 조회 오류:', err);
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 필터 변경 시 처음부터 다시 로드
  useEffect(() => {
    fetchActivities(1, false);
  }, [projectId, activityTypeFilter]);

  // 더 보기
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchActivities(page + 1, true);
    }
  };

  // 새로고침
  const handleRefresh = () => {
    fetchActivities(1, false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 필터 및 새로고침 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="활동 유형 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 활동</SelectItem>
            {Object.entries(ACTIVITY_TYPE_CONFIG).map(([type, config]) => (
              <SelectItem key={type} value={type}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* 활동 목록 */}
      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Clock className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2">활동 기록이 없습니다</p>
          <p className="text-sm text-gray-400">
            프로젝트에서 활동하면 여기에 표시됩니다
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {activities.map((activity, index) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              isLast={index === activities.length - 1}
            />
          ))}

          {/* 더 보기 버튼 */}
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    로딩 중...
                  </>
                ) : (
                  '더 보기'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
