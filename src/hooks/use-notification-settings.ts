'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NotificationSettings } from '@/types/notification';

/**
 * 알림 설정 관리 훅
 */
export function useNotificationSettings() {
  const queryClient = useQueryClient();

  // 1. 알림 설정 조회
  const {
    data: settings,
    isLoading,
    error,
  } = useQuery<NotificationSettings>({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const response = await fetch('/api/notification-settings');
      if (!response.ok) {
        throw new Error('알림 설정 조회에 실패했습니다');
      }
      return response.json();
    },
  });

  // 2. 알림 설정 변경
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<NotificationSettings>) => {
      const response = await fetch('/api/notification-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });
      if (!response.ok) {
        throw new Error('알림 설정 변경에 실패했습니다');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // 캐시 업데이트
      queryClient.setQueryData(['notification-settings'], data);
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
    updateError: updateSettingsMutation.error,
  };
}
