'use client';

import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CheckCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { VoteButton } from './VoteButton';
import { cn } from '@/lib/utils';

interface Answer {
  id: string;
  content: string;
  vote_count: number;
  is_accepted: boolean;
  created_at: string;
  author: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
}

interface AnswerItemProps {
  answer: Answer;
  isPostAuthor: boolean;
  onAccept?: (answerId: string) => void;
  userVote?: 'up' | 'down' | null;
}

export function AnswerItem({
  answer,
  isPostAuthor,
  onAccept,
  userVote,
}: AnswerItemProps) {
  const timeAgo = formatDistanceToNow(new Date(answer.created_at), {
    addSuffix: true,
    locale: ko,
  });

  return (
    <div
      className={cn(
        'flex gap-4 p-4 rounded-lg border',
        answer.is_accepted
          ? 'border-green-200 bg-green-50'
          : 'border-gray-200 bg-white'
      )}
    >
      {/* 투표 */}
      <div className="shrink-0">
        <VoteButton
          targetType="answer"
          targetId={answer.id}
          voteCount={answer.vote_count}
          userVote={userVote}
        />
      </div>

      {/* 본문 */}
      <div className="flex-1 min-w-0">
        {/* 채택 표시 */}
        {answer.is_accepted && (
          <div className="flex items-center gap-2 text-green-600 mb-3">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">채택된 답변</span>
          </div>
        )}

        {/* 내용 */}
        <div className="prose prose-sm max-w-none text-gray-700">
          <p className="whitespace-pre-wrap">{answer.content}</p>
        </div>

        {/* 메타 정보 */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Avatar className="h-6 w-6">
              <AvatarImage src={answer.author.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {answer.author.name[0]}
              </AvatarFallback>
            </Avatar>
            <span>{answer.author.name}</span>
            <span className="text-gray-300">·</span>
            <span>{timeAgo}</span>
          </div>

          {/* 채택 버튼 (게시글 작성자만, 미채택 시) */}
          {isPostAuthor && !answer.is_accepted && onAccept && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAccept(answer.id)}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              채택하기
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
