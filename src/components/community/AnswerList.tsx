'use client';

import { MessageSquare } from 'lucide-react';
import { AnswerItem } from './AnswerItem';

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

interface AnswerListProps {
  answers: Answer[];
  isPostAuthor: boolean;
  onAccept?: (answerId: string) => void;
  userVotes?: Record<string, 'up' | 'down' | null>;
}

export function AnswerList({
  answers,
  isPostAuthor,
  onAccept,
  userVotes = {},
}: AnswerListProps) {
  if (answers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <MessageSquare className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-gray-500">아직 답변이 없습니다</p>
        <p className="text-sm text-gray-400">첫 번째 답변을 작성해보세요!</p>
      </div>
    );
  }

  // 채택된 답변을 먼저, 그 다음 투표 수 순서
  const sortedAnswers = [...answers].sort((a, b) => {
    if (a.is_accepted && !b.is_accepted) return -1;
    if (!a.is_accepted && b.is_accepted) return 1;
    return b.vote_count - a.vote_count;
  });

  return (
    <div className="space-y-4">
      {sortedAnswers.map((answer) => (
        <AnswerItem
          key={answer.id}
          answer={answer}
          isPostAuthor={isPostAuthor}
          onAccept={onAccept}
          userVote={userVotes[answer.id]}
        />
      ))}
    </div>
  );
}
