'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VoteButtonProps {
  targetType: 'post' | 'answer';
  targetId: string;
  voteCount: number;
  userVote?: 'up' | 'down' | null;
  onVoteChange?: (newCount: number, newVote: 'up' | 'down' | null) => void;
}

export function VoteButton({
  targetType,
  targetId,
  voteCount: initialCount,
  userVote: initialVote = null,
  onVoteChange,
}: VoteButtonProps) {
  const [voteCount, setVoteCount] = useState(initialCount);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(initialVote);
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = async (voteType: 'up' | 'down') => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/community/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          vote_type: voteType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || '투표에 실패했습니다');
        return;
      }

      setVoteCount(data.vote_count);
      setUserVote(userVote === voteType ? null : voteType);
      onVoteChange?.(data.vote_count, userVote === voteType ? null : voteType);
    } catch (error) {
      toast.error('투표 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-8 w-8 rounded-full',
          userVote === 'up' && 'bg-primary-100 text-primary-600'
        )}
        onClick={() => handleVote('up')}
        disabled={isLoading}
      >
        <ChevronUp className="h-5 w-5" />
      </Button>
      <span
        className={cn(
          'text-sm font-medium',
          voteCount > 0 && 'text-primary-600',
          voteCount < 0 && 'text-red-600',
          voteCount === 0 && 'text-gray-500'
        )}
      >
        {voteCount}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-8 w-8 rounded-full',
          userVote === 'down' && 'bg-red-100 text-red-600'
        )}
        onClick={() => handleVote('down')}
        disabled={isLoading}
      >
        <ChevronDown className="h-5 w-5" />
      </Button>
    </div>
  );
}
