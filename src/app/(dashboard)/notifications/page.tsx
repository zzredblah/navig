'use client';

import { useState } from 'react';
import { Loader2, Bell } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';

export default function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const {
    notifications,
    total,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    isMarkingAllAsRead,
  } = useNotifications({
    page,
    limit,
    unreadOnly,
  });

  const totalPages = Math.ceil(total / limit);
  const hasUnread = unreadCount > 0;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">알림</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadOnly
              ? `읽지 않은 알림 ${unreadCount}개`
              : `전체 알림 ${total}개 · 읽지 않음 ${unreadCount}개`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 필터 버튼 */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <Button
              variant={!unreadOnly ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setUnreadOnly(false);
                setPage(1);
              }}
              className={!unreadOnly ? 'bg-white shadow-sm' : ''}
            >
              전체
            </Button>
            <Button
              variant={unreadOnly ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setUnreadOnly(true);
                setPage(1);
              }}
              className={unreadOnly ? 'bg-white shadow-sm' : ''}
            >
              읽지 않음
            </Button>
          </div>

          {/* 모두 읽음 버튼 */}
          {hasUnread && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsRead()}
              disabled={isMarkingAllAsRead}
            >
              {isMarkingAllAsRead ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                '모두 읽음'
              )}
            </Button>
          )}
        </div>
      </div>

      {/* 알림 목록 */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <Bell className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-500 mb-2">
                {unreadOnly ? '읽지 않은 알림이 없습니다' : '알림이 없습니다'}
              </p>
              <p className="text-sm text-gray-400 text-center max-w-sm">
                {unreadOnly
                  ? '모든 알림을 확인했습니다'
                  : '새로운 알림이 오면 여기에 표시됩니다'}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={markAsRead}
                  />
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    페이지 {page} / {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      이전
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      다음
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
