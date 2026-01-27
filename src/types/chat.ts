/**
 * 채팅 시스템 타입 정의
 */

// 채팅방 유형
export type ChatRoomType = 'project' | 'direct';

// 첨부 파일 타입
export type AttachmentType = 'image' | 'video' | 'document';

// 첨부 파일
export interface ChatAttachment {
  type: AttachmentType;
  url: string;
  name: string;
  size: number;
  mimeType?: string;
}

// 채팅방
export interface ChatRoom {
  id: string;
  type: ChatRoomType;
  project_id: string | null;
  name: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
}

// 간단한 멤버 정보 (API 응답용)
export interface SimpleMember {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

// 채팅방 + 추가 정보
export interface ChatRoomWithDetails extends ChatRoom {
  // 프로젝트 정보 (프로젝트 채팅방인 경우)
  project?: {
    id: string;
    title?: string; // projects 테이블의 컬럼명
    name?: string; // 하위 호환
  } | null;
  // DM 상대방 정보 (1:1 DM인 경우)
  otherUser?: SimpleMember | null;
  // 그룹 채팅 멤버 목록 (본인 제외)
  members?: SimpleMember[];
  // 읽지 않은 메시지 수
  unread_count?: number;
}

// 채팅방 멤버
export interface ChatRoomMember {
  id: string;
  room_id: string;
  user_id: string;
  last_read_at: string;
  notifications_enabled: boolean;
  joined_at: string;
  // 사용자 정보
  user?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
}

// 채팅 메시지
export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  reply_to_id: string | null;
  mentions: string[];
  attachments: ChatAttachment[];
  is_edited: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// 채팅 메시지 + 추가 정보
export interface ChatMessageWithDetails extends ChatMessage {
  // 보낸 사람 정보
  sender?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
  // 답장 대상 메시지 (요약)
  reply_to?: {
    id: string;
    content: string;
    sender: {
      id: string;
      name: string | null;
    };
  } | null;
  // 리액션 목록
  reactions?: ChatReactionGroup[];
  // 읽지 않은 사람 수 (KakaoTalk 스타일)
  unread_count?: number;
}

// 메시지 리액션
export interface ChatMessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

// 리액션 그룹 (같은 이모지 묶음)
export interface ChatReactionGroup {
  emoji: string;
  count: number;
  users: {
    id: string;
    name: string | null;
  }[];
  reacted_by_me: boolean;
}

// 메시지 생성 요청
export interface CreateMessageRequest {
  content: string;
  reply_to_id?: string;
  mentions?: string[];
  attachments?: ChatAttachment[];
}

// 메시지 수정 요청
export interface UpdateMessageRequest {
  content: string;
}

// DM 채팅방 생성/조회 요청
export interface CreateDMRoomRequest {
  user_id: string;
}

// 읽음 표시 업데이트 요청
export interface UpdateReadStatusRequest {
  last_read_at: string;
}

// 채팅방 목록 응답
export interface ChatRoomListResponse {
  rooms: ChatRoomWithDetails[];
}

// 메시지 목록 응답
export interface ChatMessageListResponse {
  messages: ChatMessageWithDetails[];
  pagination: {
    has_more: boolean;
    cursor?: string;
  };
}

// 자주 사용하는 이모지 목록
export const COMMON_EMOJIS = [
  '👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏',
  '✅', '❌', '👀', '🙏', '💯', '🚀', '⭐', '💪',
];

// 이모지 카테고리
export const EMOJI_CATEGORIES = {
  smileys: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘'],
  gestures: ['👍', '👎', '👏', '🙌', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '👌', '🤙', '💪', '👊', '✊'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💕', '💞', '💓', '💗', '💖', '💝'],
  objects: ['🎉', '🎊', '🔥', '⭐', '🌟', '✨', '💯', '🚀', '💡', '📌', '📎', '✅', '❌', '⚠️', '💬'],
};

// 시간 포맷 (채팅용)
export function formatChatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // 1분 이내
  if (diff < 60 * 1000) {
    return '방금';
  }

  // 1시간 이내
  if (diff < 60 * 60 * 1000) {
    const mins = Math.floor(diff / (60 * 1000));
    return `${mins}분 전`;
  }

  // 오늘
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }

  // 어제
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `어제 ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  // 올해
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  }

  // 그 외
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

// 메시지 날짜 구분선용 포맷
export function formatMessageDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return '오늘';
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return '어제';
  }

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

// 파일 크기 포맷
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

// 첨부 파일 아이콘 타입
export function getAttachmentIcon(type: AttachmentType): string {
  switch (type) {
    case 'image':
      return 'image';
    case 'video':
      return 'video';
    case 'document':
      return 'file-text';
    default:
      return 'file';
  }
}
