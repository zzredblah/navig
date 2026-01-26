'use client';

/**
 * 피드백 아이템 컴포넌트
 *
 * 단일 피드백과 답글을 표시합니다.
 */

import { useState } from 'react';
import {
  MessageSquare,
  Check,
  X,
  MoreHorizontal,
  Trash2,
  Clock,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  ZoomIn,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FeedbackWithAuthor,
  ReplyWithAuthor,
  FeedbackStatus,
  formatTimestamp,
  feedbackStatusLabels,
} from '@/types/feedback';
import { cn } from '@/lib/utils';

interface FeedbackItemProps {
  feedback: FeedbackWithAuthor;
  replies?: ReplyWithAuthor[];
  isActive?: boolean;
  currentUserId?: string;
  onSeek?: (timestamp: number) => void;
  onStatusChange?: (feedbackId: string, status: FeedbackStatus) => Promise<void>;
  onDelete?: (feedbackId: string) => Promise<void>;
  onReply?: (feedbackId: string, content: string) => Promise<void>;
  onClick?: () => void;
}

export function FeedbackItem({
  feedback,
  replies = [],
  isActive,
  currentUserId,
  onSeek,
  onStatusChange,
  onDelete,
  onReply,
  onClick,
}: FeedbackItemProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const status = feedbackStatusLabels[feedback.status];
  const isOwner = currentUserId === feedback.created_by;

  const handleStatusChange = async (newStatus: FeedbackStatus) => {
    if (!onStatusChange || isUpdating) return;
    setIsUpdating(true);
    try {
      await onStatusChange(feedback.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReplySubmit = async () => {
    if (!onReply || !replyContent.trim() || isSubmittingReply) return;
    setIsSubmittingReply(true);
    try {
      await onReply(feedback.id, replyContent.trim());
      setReplyContent('');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('이 피드백을 삭제하시겠습니까?')) return;
    await onDelete(feedback.id);
  };

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-all cursor-pointer',
        isActive
          ? 'border-primary-300 bg-primary-50'
          : feedback.is_urgent
          ? 'border-red-300 bg-red-50 hover:border-red-400'
          : 'border-gray-200 bg-white hover:border-gray-300'
      )}
      onClick={onClick}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Avatar className="h-6 w-6">
            <AvatarImage src={feedback.author.avatar_url || undefined} />
            <AvatarFallback className="text-xs bg-primary-100 text-primary-700">
              {feedback.author.name?.slice(0, 2) || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-gray-900 truncate">
            {feedback.author.name}
          </span>
          {feedback.is_urgent && (
            <Badge className="text-xs bg-red-100 text-red-700 border-red-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              긴급
            </Badge>
          )}
          <Badge className={cn('text-xs', status.color)}>{status.label}</Badge>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* 타임스탬프 버튼 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-primary-600 hover:text-primary-700"
            onClick={(e) => {
              e.stopPropagation();
              onSeek?.(feedback.timestamp_seconds);
            }}
          >
            <Clock className="h-3 w-3 mr-1" />
            {formatTimestamp(feedback.timestamp_seconds)}
          </Button>

          {/* 메뉴 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {feedback.status === 'open' && (
                <>
                  <DropdownMenuItem onClick={() => handleStatusChange('resolved')}>
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                    해결됨으로 표시
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('wontfix')}>
                    <X className="h-4 w-4 mr-2 text-gray-600" />
                    수정 안함으로 표시
                  </DropdownMenuItem>
                </>
              )}
              {feedback.status !== 'open' && (
                <DropdownMenuItem onClick={() => handleStatusChange('open')}>
                  <MessageSquare className="h-4 w-4 mr-2 text-blue-600" />
                  다시 열기
                </DropdownMenuItem>
              )}
              {isOwner && (
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 첨부된 그림 */}
      {feedback.drawing_image && (
        <div className="mt-2 relative group">
          <img
            src={feedback.drawing_image}
            alt="Drawing annotation"
            className="w-full max-h-40 object-contain bg-gray-900 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setShowImageModal(true);
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-black/50 rounded-full p-2">
              <ZoomIn className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      )}

      {/* 내용 */}
      <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
        {feedback.content}
      </p>

      {/* 생성일 및 답글 토글 */}
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <span>
          {new Date(feedback.created_at).toLocaleString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>

        {(replies.length > 0 || onReply) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setShowReplies(!showReplies);
            }}
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            {replies.length > 0 ? `답글 ${replies.length}개` : '답글 작성'}
            {showReplies ? (
              <ChevronUp className="h-3 w-3 ml-1" />
            ) : (
              <ChevronDown className="h-3 w-3 ml-1" />
            )}
          </Button>
        )}
      </div>

      {/* 답글 섹션 */}
      {showReplies && (
        <div
          className="mt-3 pt-3 border-t border-gray-100 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 답글 목록 */}
          {replies.map((reply) => (
            <div key={reply.id} className="flex gap-2">
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarImage src={reply.author.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-gray-100 text-gray-700">
                  {reply.author.name?.slice(0, 2) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900">
                    {reply.author.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(reply.created_at).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5">{reply.content}</p>
              </div>
            </div>
          ))}

          {/* 답글 입력 */}
          {onReply && (
            <div className="flex gap-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="답글을 입력하세요..."
                rows={2}
                className="flex-1 resize-none text-sm"
              />
              <Button
                size="sm"
                onClick={handleReplySubmit}
                disabled={!replyContent.trim() || isSubmittingReply}
                className="self-end"
              >
                {isSubmittingReply ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 이미지 확대 모달 - 전체 화면 */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 bg-black/95 border-none">
          <DialogTitle className="sr-only">그림 주석 보기</DialogTitle>
          <div className="relative flex items-center justify-center min-h-[50vh]">
            {feedback.drawing_image && (
              <img
                src={feedback.drawing_image}
                alt="Drawing annotation"
                className="max-w-[90vw] max-h-[90vh] object-contain"
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 text-white hover:bg-white/20"
              onClick={() => setShowImageModal(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
