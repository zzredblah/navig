'use client';

/**
 * 피드백 작성 폼 컴포넌트
 */

import { useState } from 'react';
import { Send, Loader2, Clock, Pencil, X, ImageIcon, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { formatTimestamp } from '@/types/feedback';
import { FeedbackTemplate } from '@/types/feedback-template';
import { FeedbackTemplateSelect } from './FeedbackTemplateSelect';
import { FeedbackTemplateManager } from './FeedbackTemplateManager';

interface FeedbackFormProps {
  videoId: string;
  currentTime: number;
  onSubmit: (content: string, timestamp: number, drawingImage?: string, isUrgent?: boolean) => Promise<void>;
  onDrawingModeToggle?: () => void;
  drawingImage?: string | null;
  onClearDrawing?: () => void;
  disabled?: boolean;
}

export function FeedbackForm({
  videoId,
  currentTime,
  onSubmit,
  onDrawingModeToggle,
  drawingImage,
  onClearDrawing,
  disabled,
}: FeedbackFormProps) {
  const [content, setContent] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [templateRefreshTrigger, setTemplateRefreshTrigger] = useState(0);

  // 템플릿 매니저가 닫힐 때 템플릿 목록 갱신
  const handleTemplateManagerClose = (open: boolean) => {
    setIsTemplateManagerOpen(open);
    if (!open) {
      // 매니저가 닫히면 템플릿 목록 갱신
      setTemplateRefreshTrigger((prev) => prev + 1);
    }
  };

  // 템플릿 선택 핸들러
  const handleTemplateSelect = (template: FeedbackTemplate) => {
    setContent(template.content);
    setIsUrgent(template.is_urgent);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim(), currentTime, drawingImage || undefined, isUrgent);
      setContent('');
      setIsUrgent(false);
      onClearDrawing?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>현재 위치: {formatTimestamp(currentTime)}</span>
        </div>

        <div className="flex items-center gap-2">
          <FeedbackTemplateSelect
            onSelect={handleTemplateSelect}
            onManageClick={() => setIsTemplateManagerOpen(true)}
            refreshTrigger={templateRefreshTrigger}
          />
          {onDrawingModeToggle && (
            <Button
              type="button"
              variant={disabled ? 'default' : 'outline'}
              size="sm"
              onClick={onDrawingModeToggle}
              className={disabled
                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                : 'text-primary-600 border-primary-200 hover:bg-primary-50'
              }
            >
              <Pencil className="h-4 w-4 mr-1" />
              {disabled ? '그리기 중...' : '그리기'}
            </Button>
          )}
        </div>
      </div>

      {/* 첨부된 그림 미리보기 */}
      {drawingImage && (
        <div className="relative">
          <img
            src={drawingImage}
            alt="Drawing"
            className="w-full h-20 object-contain bg-gray-100 rounded-lg border border-gray-200"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-1 right-1 h-6 w-6 p-0 bg-white/80 hover:bg-white"
            onClick={onClearDrawing}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="이 시점에 대한 피드백을 입력하세요..."
        rows={3}
        disabled={disabled || isSubmitting}
        className="resize-none"
      />

      <div className="flex items-center justify-between">
        {/* 긴급 피드백 체크박스 */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="urgent-feedback"
            checked={isUrgent}
            onCheckedChange={(checked) => setIsUrgent(checked === true)}
            disabled={disabled || isSubmitting}
          />
          <Label
            htmlFor="urgent-feedback"
            className={`text-sm cursor-pointer flex items-center gap-1 ${
              isUrgent ? 'text-red-600 font-medium' : 'text-gray-600'
            }`}
          >
            <AlertTriangle className={`h-3.5 w-3.5 ${isUrgent ? 'text-red-500' : 'text-gray-400'}`} />
            긴급 피드백
          </Label>
        </div>

        <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={!content.trim() || disabled || isSubmitting}
          className="bg-primary-600 hover:bg-primary-700"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          피드백 추가
          {drawingImage && (
            <ImageIcon className="h-3 w-3 ml-1" />
          )}
        </Button>
        </div>
      </div>
    </form>

    {/* 템플릿 관리 모달 */}
    <FeedbackTemplateManager
      open={isTemplateManagerOpen}
      onOpenChange={handleTemplateManagerClose}
    />
    </>
  );
}
