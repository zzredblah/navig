'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FeedbackSummaryModal } from './FeedbackSummaryModal';

interface FeedbackStats {
  total: number;
  resolved: number;
  urgent: number;
  open: number;
}

interface FeedbackSummaryButtonProps {
  videoId: string;
  feedbackCount: number;
}

export function FeedbackSummaryButton({ videoId, feedbackCount }: FeedbackSummaryButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [stats, setStats] = useState<FeedbackStats>({
    total: 0,
    resolved: 0,
    urgent: 0,
    open: 0,
  });
  const [remaining, setRemaining] = useState<number | undefined>();

  const handleGenerateSummary = async () => {
    if (feedbackCount === 0) {
      toast.error('분석할 피드백이 없습니다');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/videos/${videoId}/feedback-summary`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          toast.error(data.error || 'AI 사용량 제한에 도달했습니다');
        } else {
          toast.error(data.error || '요약 생성에 실패했습니다');
        }
        return;
      }

      setSummary(data.summary);
      setStats(data.stats);
      setRemaining(data.remaining);
      setIsModalOpen(true);
    } catch (error) {
      console.error('피드백 요약 오류:', error);
      toast.error('요약 생성 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerateSummary}
        disabled={isLoading || feedbackCount === 0}
        className="gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            분석 중...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            AI 요약
          </>
        )}
      </Button>

      <FeedbackSummaryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        summary={summary}
        stats={stats}
        remaining={remaining}
      />
    </>
  );
}
