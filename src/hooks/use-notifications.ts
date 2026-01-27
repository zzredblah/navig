'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Notification, NotificationListQuery, NotificationListResponse } from '@/types/notification';

interface UseNotificationsOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  enabled?: boolean;
}

/**
 * 알림 관리 훅
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const queryClient = useQueryClient();
  const { page = 1, limit = 20, unreadOnly = false, enabled = true } = options;

  // 1. 알림 목록 조회
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<NotificationListResponse>({
    queryKey: ['notifications', { page, limit, unreadOnly }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(unreadOnly && { unread_only: 'true' }),
      });

      const response = await fetch(`/api/notifications?${params}`);
      if (!response.ok) {
        throw new Error('알림 조회에 실패했습니다');
      }
      return response.json();
    },
    enabled,
    refetchInterval: 30000, // 30초마다 자동 갱신
    staleTime: 10000, // 10초 동안 캐시 유지
  });

  // 2. 알림 읽음 처리
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error('읽음 처리에 실패했습니다');
      }
      return response.json();
    },
    onMutate: async (notificationId) => {
      // Optimistic Update: 즉시 UI 갱신
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const previousData = queryClient.getQueryData<NotificationListResponse>([
        'notifications',
        { page, limit, unreadOnly },
      ]);

      if (previousData) {
        queryClient.setQueryData<NotificationListResponse>(
          ['notifications', { page, limit, unreadOnly }],
          {
            ...previousData,
            data: previousData.data.map((n) =>
              n.id === notificationId ? { ...n, is_read: true } : n
            ),
            unread_count: Math.max(0, previousData.unread_count - 1),
          }
        );
      }

      return { previousData };
    },
    onError: (err, notificationId, context) => {
      // 실패 시 롤백
      if (context?.previousData) {
        queryClient.setQueryData(
          ['notifications', { page, limit, unreadOnly }],
          context.previousData
        );
      }
    },
    onSettled: () => {
      // 모든 알림 쿼리 무효화 (최신 데이터 다시 페칭)
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // 3. 전체 읽음 처리
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error('전체 읽음 처리에 실패했습니다');
      }
      return response.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const previousData = queryClient.getQueryData<NotificationListResponse>([
        'notifications',
        { page, limit, unreadOnly },
      ]);

      if (previousData) {
        queryClient.setQueryData<NotificationListResponse>(
          ['notifications', { page, limit, unreadOnly }],
          {
            ...previousData,
            data: previousData.data.map((n) => ({ ...n, is_read: true })),
            unread_count: 0,
          }
        );
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['notifications', { page, limit, unreadOnly }],
          context.previousData
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    notifications: data?.data || [],
    total: data?.total || 0,
    unreadCount: data?.unread_count || 0,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}
