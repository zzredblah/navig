'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  FileText,
  Upload,
  AlertCircle,
  CheckCircle,
  UserPlus,
  Clock,
  Bell,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

import type { Notification, NotificationType } from '@/types/notification';

interface NotificationItemProps {
  notification: Notification;
  onRead?: (id: string) => void;
  compact?: boolean;
}

/**
 * 알림 타입별 아이콘 및 색상
 */
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'new_feedback':
      return { icon: MessageSquare, color: 'text-blue-600 bg-blue-100' };
    case 'urgent_feedback':
      return { icon: AlertCircle, color: 'text-error-600 bg-error-100' };
    case 'feedback_status':
      return { icon: CheckCircle, color: 'text-success-600 bg-success-100' };
    case 'feedback_reply':
      return { icon: MessageSquare, color: 'text-primary-600 bg-primary-100' };
    case 'new_version':
      return { icon: Upload, color: 'text-primary-600 bg-primary-100' };
    case 'document_status':
      return { icon: FileText, color: 'text-info-600 bg-info-100' };
    case 'project_invite':
      return { icon: UserPlus, color: 'text-success-600 bg-success-100' };
    case 'deadline_reminder':
      return { icon: Clock, color: 'text-warning-600 bg-warning-100' };
    case 'chat_message':
      return { icon: MessageSquare, color: 'text-primary-600 bg-primary-100' };
    default:
      return { icon: Bell, color: 'text-gray-600 bg-gray-100' };
  }
}

export function NotificationItem({ notification, onRead, compact = false }: NotificationItemProps) {
  const { icon: Icon, color } = getNotificationIcon(notification.type);

  // 상대 시간 표시
  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(notification.created_at), {
        addSuffix: true,
        locale: ko,
      });
    } catch {
      return '방금 전';
    }
  }, [notification.created_at]);

  const handleClick = () => {
    if (!notification.is_read && onRead) {
      onRead(notification.id);
    }
  };

  // 링크가 있으면 Link로, 없으면 div로 렌더링
  const content = (
    <>
      {/* 읽지 않은 알림 표시 (좌측 점) */}
      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full bg-primary-600 mt-2 shrink-0" />
      )}

      {/* 아이콘 */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <p
          className={`${
            !notification.is_read ? 'font-semibold' : 'font-medium'
          } text-gray-900 truncate`}
        >
          {notification.title}
        </p>
        {notification.content && (
          <p className={`text-gray-600 mt-0.5 ${compact ? 'line-clamp-1' : 'line-clamp-2'}`}>
            {notification.content}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">{timeAgo}</p>
      </div>
    </>
  );

  const wrapperClassName = `
    group flex gap-3 px-4 py-3 transition-colors
    ${notification.link ? 'cursor-pointer hover:bg-gray-50' : ''}
    ${!notification.is_read ? 'bg-primary-50/30' : ''}
    ${compact ? 'text-sm' : ''}
  `;

  return notification.link ? (
    <Link href={notification.link} onClick={handleClick} className={wrapperClassName}>
      {content}
    </Link>
  ) : (
    <div onClick={handleClick} className={wrapperClassName}>
      {content}
    </div>
  );
}
