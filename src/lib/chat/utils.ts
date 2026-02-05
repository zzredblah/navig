/**
 * 채팅 유틸리티 함수
 */

import type { ChatMessageWithDetails } from '@/types/chat';

/**
 * 메시지를 날짜별로 그룹화
 * @param messages 메시지 배열
 * @returns 날짜별로 그룹화된 메시지 객체
 */
export function groupMessagesByDate(
  messages: ChatMessageWithDetails[]
): Record<string, ChatMessageWithDetails[]> {
  return messages.reduce(
    (groups, message) => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    },
    {} as Record<string, ChatMessageWithDetails[]>
  );
}

/**
 * 연속 메시지 여부 판단 (같은 발신자, 5분 이내)
 * @param prevMessage 이전 메시지
 * @param currentMessage 현재 메시지
 * @param timeWindowMs 시간 간격 (기본: 5분)
 * @returns 연속 메시지 여부
 */
export function isConsecutiveMessage(
  prevMessage: ChatMessageWithDetails | null,
  currentMessage: ChatMessageWithDetails,
  timeWindowMs = 5 * 60 * 1000
): boolean {
  if (!prevMessage) return false;
  if (prevMessage.sender_id !== currentMessage.sender_id) return false;

  const timeDiff =
    new Date(currentMessage.created_at).getTime() - new Date(prevMessage.created_at).getTime();

  return timeDiff < timeWindowMs;
}

/**
 * 읽지 않은 메시지 수 계산
 * @param messages 메시지 배열
 * @param lastReadAt 마지막 읽은 시간
 * @param currentUserId 현재 사용자 ID (자신의 메시지 제외)
 * @returns 읽지 않은 메시지 수
 */
export function countUnreadMessages(
  messages: ChatMessageWithDetails[],
  lastReadAt: string | null,
  currentUserId: string
): number {
  if (!lastReadAt) return messages.filter((m) => m.sender_id !== currentUserId).length;

  const lastReadTime = new Date(lastReadAt).getTime();

  return messages.filter((m) => {
    if (m.sender_id === currentUserId) return false;
    return new Date(m.created_at).getTime() > lastReadTime;
  }).length;
}

/**
 * 메시지 미리보기 텍스트 생성
 * @param message 메시지 객체
 * @param maxLength 최대 길이
 * @returns 미리보기 텍스트
 */
export function getMessagePreview(message: ChatMessageWithDetails, maxLength = 50): string {
  if (message.is_deleted) {
    return '삭제된 메시지입니다';
  }

  const attachments = message.attachments as Array<{ type: string }> | null;
  if (attachments && attachments.length > 0) {
    const type = attachments[0].type;
    if (type === 'image') return '🖼️ 사진';
    if (type === 'video') return '🎥 동영상';
    return '📎 파일';
  }

  if (message.content.length <= maxLength) {
    return message.content;
  }

  return message.content.slice(0, maxLength) + '...';
}
