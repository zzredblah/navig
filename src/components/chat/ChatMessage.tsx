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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  isSelectMode?: boolean; // 선택 모드
  isSelected?: boolean; // 선택 여부
  onSelect?: (messageId: string) => void; // 선택 토글
  onReply?: (message: ChatMessageWithDetails) => void;
  onEdit?: (messageId: string, content: string) => Promise<void>;
  onDelete?: (messageId: string, type: 'everyone' | 'me_only') => Promise<void>;
  onReaction?: (messageId: string, emoji: string) => Promise<void>;
  onRemoveReaction?: (messageId: string, emoji: string) => Promise<void>;
}

export function ChatMessage({
  message,
  currentUserId,
  showProfile = true,
  isSelectMode = false,
  isSelected = false,
  onSelect,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  onRemoveReaction,
}: ChatMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  const handleDeleteClick = (type: 'everyone' | 'me_only') => {
    setShowDeleteDialog(false);
    onDelete?.(message.id, type);
  };

  // 선택 모드에서 클릭 처리
  const handleClick = () => {
    if (isSelectMode && onSelect) {
      onSelect(message.id);
    }
  };

  return (
    <>
    <div
      className={cn(
        'group relative flex gap-2 px-4 hover:bg-gray-50/50 transition-colors',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        shouldShowProfile ? 'pt-2' : 'pt-0.5',
        isSelectMode && 'cursor-pointer',
        isSelected && 'bg-primary-50'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={handleClick}
    >
      {/* 선택 모드 체크박스 */}
      {isSelectMode && (
        <div className="flex items-center shrink-0">
          <div className={cn(
            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
            isSelected
              ? 'bg-primary-600 border-primary-600'
              : 'border-gray-300 bg-white'
          )}>
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}
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
      <div className={cn('max-w-[70%] min-w-0', isOwn && 'flex flex-col items-end')}>
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
          <div className={cn('flex items-end gap-1 max-w-full', isOwn && 'flex-row-reverse')}>
            <div
              className={cn(
                'px-3 py-1.5 text-sm max-w-full',
                isDeleted
                  ? 'bg-gray-100 text-gray-400 italic rounded-xl'
                  : isOwn
                  ? 'bg-primary-600 text-white rounded-2xl rounded-br-md'
                  : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
              )}
            >
              <p className="whitespace-pre-wrap break-words overflow-wrap-anywhere"
                 style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                {message.content}
              </p>
            </div>
            <div className={cn('flex items-end gap-1 shrink-0 pb-0.5', isOwn && 'flex-row-reverse')}>
              {/* 읽지 않은 수 (0보다 클 때만 표시) */}
              {typeof message.unread_count === 'number' && message.unread_count > 0 && (
                <span className="text-[10px] text-rose-400 font-bold">
                  {message.unread_count}
                </span>
              )}
              <span className="text-[10px] text-gray-400 whitespace-nowrap">
                {formatChatTime(message.created_at)}
                {message.is_edited && ' (수정됨)'}
              </span>
            </div>
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
                aria-label={`${reaction.emoji} 리액션 ${reaction.count}명${reaction.reacted_by_me ? ' (나도 반응함)' : ''}`}
                aria-pressed={reaction.reacted_by_me}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
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

      {/* 액션 버튼 - 절대 위치로 레이아웃 영향 방지 */}
      {showActions && !isDeleted && !isEditing && (
        <div
          className={cn(
            'absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10',
            isOwn ? 'left-2' : 'right-2'
          )}
        >
          {/* 빠른 리액션 */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm">
            {COMMON_EMOJIS.slice(0, 4).map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="p-1 hover:bg-gray-100 transition-colors text-sm"
              >
                {emoji}
              </button>
            ))}
            <EmojiPicker
              onSelect={handleReaction}
              trigger={
                <button className="p-1 hover:bg-gray-100 transition-colors text-gray-400 text-sm">
                  +
                </button>
              }
            />
          </div>

          {/* 답장 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 bg-white border border-gray-200 shadow-sm"
            onClick={() => onReply?.(message)}
          >
            <Reply className="h-4 w-4" />
          </Button>

          {/* 더보기 메뉴 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 bg-white border border-gray-200 shadow-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isOwn ? 'start' : 'end'}>
              {isOwn && (
                <>
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    수정
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>

    {/* 삭제 확인 다이얼로그 */}
    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent className="sm:max-w-[280px] p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-5 pb-4 text-center">
          <DialogTitle className="text-base font-semibold">메시지 삭제</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 mt-1">
            이 메시지를 삭제하시겠습니까?
          </DialogDescription>
        </DialogHeader>
        <div className="border-t border-gray-200">
          {isOwn && (
            <button
              className="w-full px-4 py-3.5 text-sm text-red-500 font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors text-center border-b border-gray-200"
              onClick={() => handleDeleteClick('everyone')}
            >
              모두에게서 삭제
            </button>
          )}
          <button
            className="w-full px-4 py-3.5 text-sm text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors text-center border-b border-gray-200"
            onClick={() => handleDeleteClick('me_only')}
          >
            나에게서만 삭제
          </button>
          <button
            className="w-full px-4 py-3.5 text-sm text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors text-center"
            onClick={() => setShowDeleteDialog(false)}
          >
            취소
          </button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
