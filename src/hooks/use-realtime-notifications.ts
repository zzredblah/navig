'use client';

/**
 * 실시간 알림 훅
 *
 * Supabase Realtime을 사용하여 새 알림을 실시간으로 수신합니다.
 */

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/hooks/use-toast';
import { playSoundForNotificationType } from '@/lib/sounds';
import type { Notification } from '@/types/notification';

interface UseRealtimeNotificationsOptions {
  userId: string | undefined;
  enabled?: boolean;
  onNewNotification?: (notification: Notification) => void;
}

export function useRealtimeNotifications({
  userId,
  enabled = true,
  onNewNotification,
}: UseRealtimeNotificationsOptions) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const handleNewNotification = useCallback(
    (notification: Notification) => {
      // React Query 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // 콜백 호출
      onNewNotification?.(notification);

      // 알림음 재생
      playSoundForNotificationType(notification.type);

      // 토스트 알림 표시
      const icon = getNotificationIcon(notification.type);
      const isUrgent = notification.type === 'urgent_feedback';

      toast({
        title: `${icon} ${notification.title}`,
        description: notification.content || undefined,
        variant: isUrgent ? 'destructive' : 'default',
      });
    },
    [queryClient, onNewNotification]
  );

  useEffect(() => {
    if (!userId || !enabled) return;

    // Supabase Realtime 채널 구독
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          handleNewNotification(notification);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] 알림 채널 구독 시작');
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] 알림 채널 에러');
        }
      });

    // 클린업
    return () => {
      console.log('[Realtime] 알림 채널 구독 해제');
      supabase.removeChannel(channel);
    };
  }, [userId, enabled, supabase, handleNewNotification]);
}

// 알림 타입별 아이콘 이모지
function getNotificationIcon(type: string): string {
  switch (type) {
    case 'new_feedback':
      return '💬';
    case 'urgent_feedback':
      return '🔥';
    case 'feedback_status':
      return '✅';
    case 'feedback_reply':
      return '↩️';
    case 'new_version':
      return '📹';
    case 'document_status':
      return '📄';
    case 'project_invite':
      return '👋';
    case 'deadline_reminder':
      return '⏰';
    case 'chat_message':
      return '💬';
    default:
      return '🔔';
  }
}
