'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  FileText,
  Upload,
  AlertCircle,
  CheckCircle,
  UserPlus,
  Clock,
  Bell,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

import type { Notification, NotificationType } from '@/types/notification';

interface NotificationItemProps {
  notification: Notification;
  onRead?: (id: string) => void;
  onInvitationHandled?: () => void;
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

export function NotificationItem({ notification, onRead, onInvitationHandled, compact = false }: NotificationItemProps) {
  const router = useRouter();
  const { icon: Icon, color } = getNotificationIcon(notification.type);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [inviteHandled, setInviteHandled] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // 프로젝트 초대 알림인 경우, 실제 초대 상태 확인
  const isProjectInvite = notification.type === 'project_invite' && notification.metadata?.member_id;

  useEffect(() => {
    if (!isProjectInvite) return;

    const memberId = notification.metadata?.member_id;
    if (!memberId) return;

    // 이미 처리되었는지 초대 상태 확인
    async function checkInvitationStatus() {
      setIsCheckingStatus(true);
      try {
        const response = await fetch(`/api/invitations/${memberId}/status`);
        if (response.ok) {
          const data = await response.json();
          // pending이 아니면 이미 처리된 것
          if (data.status !== 'pending') {
            setInviteHandled(true);
          }
        } else if (response.status === 404) {
          // 멤버가 존재하지 않음 (거절됨)
          setInviteHandled(true);
        }
      } catch {
        // 에러 시 버튼 숨김 (안전하게)
        setInviteHandled(true);
      } finally {
        setIsCheckingStatus(false);
      }
    }

    checkInvitationStatus();
  }, [isProjectInvite, notification.metadata?.member_id]);

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

  // 프로젝트 초대 수락
  const handleAcceptInvite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const memberId = notification.metadata?.member_id;
    if (!memberId) return;

    setIsAccepting(true);
    try {
      const response = await fetch(`/api/invitations/${memberId}`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setInviteHandled(true);
        // 알림 읽음 처리
        if (onRead) onRead(notification.id);
        if (onInvitationHandled) onInvitationHandled();
        // 프로젝트 페이지로 이동
        if (data.data?.project_id) {
          router.push(`/projects/${data.data.project_id}`);
        }
      } else {
        const data = await response.json();
        alert(data.error || '초대 수락에 실패했습니다');
      }
    } catch {
      alert('초대 수락에 실패했습니다');
    } finally {
      setIsAccepting(false);
    }
  };

  // 프로젝트 초대 거절
  const handleRejectInvite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const memberId = notification.metadata?.member_id;
    if (!memberId) return;

    if (!confirm('이 초대를 거절하시겠습니까?')) return;

    setIsRejecting(true);
    try {
      const response = await fetch(`/api/invitations/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setInviteHandled(true);
        // 알림 읽음 처리
        if (onRead) onRead(notification.id);
        if (onInvitationHandled) onInvitationHandled();
      } else {
        const data = await response.json();
        alert(data.error || '초대 거절에 실패했습니다');
      }
    } catch {
      alert('초대 거절에 실패했습니다');
    } finally {
      setIsRejecting(false);
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

        {/* 프로젝트 초대 액션 버튼 */}
        {isProjectInvite && !inviteHandled && !isCheckingStatus && (
          <div className={`flex items-center gap-2 ${compact ? 'mt-2' : 'mt-3'}`}>
            <Button
              size="sm"
              onClick={handleAcceptInvite}
              disabled={isAccepting || isRejecting}
              className={`bg-primary-600 hover:bg-primary-700 ${compact ? 'h-7 text-xs px-2' : 'h-8'}`}
            >
              {isAccepting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                '수락'
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRejectInvite}
              disabled={isAccepting || isRejecting}
              className={compact ? 'h-7 text-xs px-2' : 'h-8'}
            >
              {isRejecting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                '거절'
              )}
            </Button>
          </div>
        )}

        {/* 상태 확인 중 */}
        {isProjectInvite && isCheckingStatus && (
          <div className={`flex items-center gap-2 text-gray-400 ${compact ? 'mt-2' : 'mt-3'}`}>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs">확인 중...</span>
          </div>
        )}

        {/* 처리 완료 메시지 */}
        {isProjectInvite && inviteHandled && !isCheckingStatus && (
          <p className="text-sm text-gray-500 mt-2">처리 완료</p>
        )}
      </div>
    </>
  );

  const wrapperClassName = `
    group flex gap-3 px-4 py-3 transition-colors
    ${notification.link && !isProjectInvite ? 'cursor-pointer hover:bg-gray-50' : ''}
    ${!notification.is_read ? 'bg-primary-50/30' : ''}
    ${compact ? 'text-sm' : ''}
  `;

  // 프로젝트 초대는 버튼이 있으므로 Link로 감싸지 않음
  if (isProjectInvite) {
    return (
      <div onClick={handleClick} className={wrapperClassName}>
        {content}
      </div>
    );
  }

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
