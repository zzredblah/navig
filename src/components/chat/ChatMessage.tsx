'use client';

/**
 * 채팅 메시지 아이템 컴포넌트
 */

import { useState } from 'react';
import {
  MoreHorizontal,
  Reply,
  Pencil,
  Trash2,
  Image,
  FileText,
  Video,
  Download,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmojiPicker } from './EmojiPicker';
import {
  ChatMessageWithDetails,
  ChatAttachment,
  formatChatTime,
  formatFileSize,
  COMMON_EMOJIS,
} from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: ChatMessageWithDetails;
  currentUserId: string;
  showProfile?: boolean; // 프로필 표시 여부 (연속 메시지 그룹화용)
  onReply?: (message: ChatMessageWithDetails) => void;
  onEdit?: (messageId: string, content: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
  onReaction?: (messageId: string, emoji: string) => Promise<void>;
  onRemoveReaction?: (messageId: string, emoji: string) => Promise<void>;
}

export function ChatMessage({
  message,
  currentUserId,
  showProfile = true,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  onRemoveReaction,
}: ChatMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);

  const isOwn = message.sender_id === currentUserId;
  const isDeleted = message.is_deleted;
  // 내 메시지는 프로필 표시 안함, 상대방 메시지는 showProfile에 따라
  const shouldShowProfile = !isOwn && showProfile;

  const handleSaveEdit = async () => {
    if (!editContent.trim() || !onEdit) return;
    await onEdit(message.id, editContent.trim());
    setIsEditing(false);
  };

  const handleReaction = async (emoji: string) => {
    const existingReaction = message.reactions?.find(
      (r) => r.emoji === emoji && r.reacted_by_me
    );

    if (existingReaction) {
      await onRemoveReaction?.(message.id, emoji);
    } else {
      await onReaction?.(message.id, emoji);
    }
  };

  const getAttachmentIcon = (type: ChatAttachment['type']) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div
      className={cn(
        'group flex gap-2 px-4 hover:bg-gray-50/50 transition-colors',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        shouldShowProfile ? 'pt-2' : 'pt-0.5'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* 아바타 - 내 메시지는 표시 안함, 연속 메시지도 공간만 확보 */}
      {!isOwn && (
        <div className="w-8 shrink-0">
          {shouldShowProfile && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.sender?.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-primary-100 text-primary-700">
                {message.sender?.name?.slice(0, 2) || 'U'}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      {/* 메시지 내용 */}
      <div className={cn('flex-1 min-w-0 max-w-[75%]', isOwn && 'flex flex-col items-end')}>
        {/* 헤더 - 상대방 연속 메시지 첫 번째만 표시 */}
        {shouldShowProfile && (
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-gray-700">
              {message.sender?.name || '알 수 없음'}
            </span>
          </div>
        )}

        {/* 답장 대상 */}
        {message.reply_to && (
          <div
            className={cn(
              'flex items-center gap-2 p-2 mb-1 bg-gray-100 rounded-lg text-sm max-w-md',
              isOwn && 'ml-auto'
            )}
          >
            <Reply className="h-3 w-3 text-gray-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{message.reply_to.sender?.name || '알 수 없음'}</p>
              <p className="text-gray-600 truncate">{message.reply_to.content}</p>
            </div>
          </div>
        )}

        {/* 메시지 본문 */}
        {isEditing ? (
          <div className="flex flex-col gap-2 w-full max-w-md">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg text-sm resize-none bg-white text-gray-900"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(message.content);
                }}
              >
                취소
              </Button>
              <Button size="sm" onClick={handleSaveEdit}>
                저장
              </Button>
            </div>
          </div>
        ) : (
          <div className={cn('flex items-end gap-1', isOwn && 'flex-row-reverse')}>
            <div
              className={cn(
                'inline-block px-3 py-1.5 text-sm',
                isDeleted
                  ? 'bg-gray-100 text-gray-400 italic rounded-xl'
                  : isOwn
                  ? 'bg-primary-600 text-white rounded-2xl rounded-br-md'
                  : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
              )}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
            <span className="text-[10px] text-gray-400 shrink-0 pb-0.5">
              {formatChatTime(message.created_at)}
              {message.is_edited && ' (수정됨)'}
            </span>
          </div>
        )}

        {/* 첨부 파일 */}
        {message.attachments && message.attachments.length > 0 && !isDeleted && (
          <div className={cn('flex flex-wrap gap-2 mt-2', isOwn && 'justify-end')}>
            {message.attachments.map((attachment, index) => (
              <div key={index} className="max-w-xs">
                {attachment.type === 'image' ? (
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90"
                    onClick={() => window.open(attachment.url, '_blank')}
                  />
                ) : (
                  <a
                    href={attachment.url}
                    download={attachment.name}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    {getAttachmentIcon(attachment.type)}
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700 truncate">
                        {attachment.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                    <Download className="h-4 w-4 text-gray-400" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 리액션 */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={cn('flex flex-wrap gap-1 mt-2', isOwn && 'justify-end')}>
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => handleReaction(reaction.emoji)}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition-colors',
                  reaction.reacted_by_me
                    ? 'bg-primary-50 border-primary-200 text-primary-700'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                )}
                title={reaction.users.map((u) => u.name).join(', ')}
              >
                <span>{reaction.emoji}</span>
                <span className="text-xs">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      {showActions && !isDeleted && !isEditing && (
        <div
          className={cn(
            'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
            isOwn && 'flex-row-reverse'
          )}
        >
          {/* 빠른 리액션 */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm">
            {COMMON_EMOJIS.slice(0, 4).map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="p-1 hover:bg-gray-100 transition-colors"
              >
                {emoji}
              </button>
            ))}
            <EmojiPicker
              onSelect={handleReaction}
              trigger={
                <button className="p-1 hover:bg-gray-100 transition-colors text-gray-400">
                  +
                </button>
              }
            />
          </div>

          {/* 답장 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onReply?.(message)}
          >
            <Reply className="h-4 w-4" />
          </Button>

          {/* 더보기 메뉴 */}
          {isOwn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? 'start' : 'end'}>
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  수정
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete?.(message.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  );
}
