'use client';

/**
 * 채팅 메시지 입력 컴포넌트
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Send,
  Paperclip,
  X,
  Image,
  FileText,
  Loader2,
  Reply,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EmojiPicker } from './EmojiPicker';
import { ChatAttachment, ChatMessageWithDetails, formatFileSize } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  roomId: string;
  replyTo?: ChatMessageWithDetails | null;
  onCancelReply?: () => void;
  onSend: (content: string, attachments?: ChatAttachment[], replyToId?: string) => Promise<void>;
  disabled?: boolean;
}

export function ChatInput({
  roomId,
  replyTo,
  onCancelReply,
  onSend,
  disabled,
}: ChatInputProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 컴포넌트 마운트 시 포커스
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if ((!content.trim() && attachments.length === 0) || disabled) return;

    // 즉시 입력창 초기화 및 포커스 (비동기 전송은 백그라운드)
    const messageContent = content.trim();
    const messageAttachments = [...attachments];
    const messageReplyToId = replyTo?.id;

    setContent('');
    setAttachments([]);
    onCancelReply?.();

    // 즉시 포커스
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);

    // 백그라운드로 전송 (UI 블로킹 없음)
    try {
      await onSend(messageContent, messageAttachments, messageReplyToId);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      // 실패 시 내용 복원
      setContent(messageContent);
      setAttachments(messageAttachments);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setContent((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      // 각 파일을 순차적으로 업로드
      for (const file of Array.from(files)) {
        // 파일 크기 검증 (20MB)
        if (file.size > 20 * 1024 * 1024) {
          alert(`${file.name}: 파일 크기는 20MB를 초과할 수 없습니다.`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/chat/attachments', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          console.error('파일 업로드 실패:', data.error);
          alert(`${file.name}: ${data.error || '업로드 실패'}`);
          continue;
        }

        const data = await response.json();
        setAttachments((prev) => [...prev, data.attachment]);
      }
    } catch (error) {
      console.error('파일 업로드 오류:', error);
      alert('파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-gray-200 bg-white p-3">
      {/* 답장 표시 */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded-lg">
          <Reply className="h-4 w-4 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">
              {replyTo.sender?.name || '알 수 없음'}에게 답장
            </p>
            <p className="text-sm text-gray-700 truncate">
              {replyTo.content}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0"
            onClick={onCancelReply}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 첨부 파일 미리보기 */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative group flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200"
            >
              {attachment.type === 'image' ? (
                <Image className="h-4 w-4 text-blue-500" />
              ) : (
                <FileText className="h-4 w-4 text-gray-500" />
              )}
              <div className="min-w-0">
                <p className="text-sm text-gray-700 truncate max-w-[150px]">
                  {attachment.name}
                </p>
                <p className="text-xs text-gray-400">
                  {formatFileSize(attachment.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeAttachment(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 입력 영역 */}
      <div className="flex items-end gap-2">
        {/* 파일 첨부 버튼 */}
        <div className="shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
            ) : (
              <Paperclip className="h-5 w-5 text-gray-500" />
            )}
          </Button>
        </div>

        {/* 텍스트 입력 */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            rows={1}
            disabled={disabled}
            className="resize-none pr-10 min-h-[36px] max-h-32"
          />
          <div className="absolute right-2 bottom-1">
            <EmojiPicker onSelect={handleEmojiSelect} />
          </div>
        </div>

        {/* 전송 버튼 */}
        <Button
          size="sm"
          className="h-9 w-9 p-0 bg-primary-600 hover:bg-primary-700 shrink-0"
          onClick={handleSend}
          disabled={(!content.trim() && attachments.length === 0) || disabled}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
