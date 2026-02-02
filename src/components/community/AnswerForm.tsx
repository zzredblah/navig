'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface AnswerFormProps {
  postId: string;
  onAnswerCreated?: (answer: unknown) => void;
}

export function AnswerForm({ postId, onAnswerCreated }: AnswerFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('답변 내용을 입력해주세요');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/community/posts/${postId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || '답변 작성에 실패했습니다');
        return;
      }

      toast.success('답변이 등록되었습니다');
      setContent('');
      onAnswerCreated?.(data.data);
    } catch (error) {
      toast.error('답변 작성 중 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="답변을 작성해주세요..."
        rows={6}
        disabled={isSubmitting}
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          className="bg-primary-600 hover:bg-primary-700"
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              등록 중...
            </>
          ) : (
            '답변 등록'
          )}
        </Button>
      </div>
    </form>
  );
}
