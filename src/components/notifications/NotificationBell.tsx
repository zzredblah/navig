'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Loader2, CheckCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationItem } from './NotificationItem';

export function NotificationBell() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // 클라이언트 마운트 후에만 렌더링 (Radix UI hydration 에러 방지)
  useEffect(() => {
    setMounted(true);
  }, []);

  // 최근 5개 알림만 미리보기
  // enabled를 true로 유지하여 unreadCount가 항상 최신 상태 유지
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    isMarkingAllAsRead,
  } = useNotifications({
    page: 1,
    limit: 5,
    enabled: true,
  });

  const hasUnread = unreadCount > 0;

  // SSR에서는 버튼만 렌더링 (hydration 에러 방지)
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
        <span className="sr-only">알림</span>
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-error-600 text-white text-xs font-medium">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="sr-only">알림</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[360px] max-w-[calc(100vw-2rem)] p-0" align="end">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">알림</h3>
            {hasUnread && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-700">
                {unreadCount}
              </span>
            )}
          </div>

          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-primary-600 hover:text-primary-700"
              onClick={() => markAllAsRead()}
              disabled={isMarkingAllAsRead}
            >
              {isMarkingAllAsRead ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <CheckCheck className="h-3 w-3 mr-1" />
                  모두 읽음
                </>
              )}
            </Button>
          )}
        </div>

        {/* 알림 목록 */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500 mb-1">알림이 없습니다</p>
              <p className="text-xs text-gray-400 text-center">
                새로운 알림이 오면 여기에 표시됩니다
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                  compact
                />
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Link href="/notifications" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full text-sm text-primary-600 hover:text-primary-700">
                  모든 알림 보기
                </Button>
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
