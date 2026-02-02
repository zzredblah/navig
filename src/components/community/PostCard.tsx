'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MessageSquare, Eye, CheckCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface PostCardProps {
  post: {
    id: string;
    title: string;
    content: string;
    view_count: number;
    vote_count: number;
    answer_count: number;
    is_solved: boolean;
    created_at: string;
    author: {
      id: string;
      name: string;
      avatar_url?: string | null;
    };
    post_tags?: { tag: Tag }[];
  };
}

const TAG_COLORS: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  orange: 'bg-orange-100 text-orange-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  red: 'bg-red-100 text-red-700',
  primary: 'bg-primary-100 text-primary-700',
  gray: 'bg-gray-100 text-gray-700',
};

export function PostCard({ post }: PostCardProps) {
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: ko,
  });

  const tags = post.post_tags?.map((pt) => pt.tag) || [];

  return (
    <Link
      href={`/community/${post.id}`}
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-200 hover:shadow-sm transition-all"
    >
      <div className="flex gap-4">
        {/* 투표 수 */}
        <div className="shrink-0 flex flex-col items-center">
          <span
            className={cn(
              'text-lg font-semibold',
              post.vote_count > 0 && 'text-primary-600',
              post.vote_count < 0 && 'text-red-600',
              post.vote_count === 0 && 'text-gray-400'
            )}
          >
            {post.vote_count}
          </span>
          <span className="text-xs text-gray-400">추천</span>
        </div>

        {/* 답변 수 */}
        <div
          className={cn(
            'shrink-0 flex flex-col items-center px-3 py-1 rounded',
            post.is_solved
              ? 'bg-green-100 text-green-700'
              : post.answer_count > 0
              ? 'bg-gray-100 text-gray-700'
              : 'text-gray-400'
          )}
        >
          <span className="text-lg font-semibold">{post.answer_count}</span>
          <span className="text-xs">답변</span>
        </div>

        {/* 본문 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="text-base font-medium text-gray-900 line-clamp-1 flex-1">
              {post.is_solved && (
                <CheckCircle className="inline h-4 w-4 text-green-600 mr-1" />
              )}
              {post.title}
            </h3>
          </div>

          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {post.content.replace(/<[^>]*>/g, '').slice(0, 150)}
          </p>

          {/* 태그 */}
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className={cn('text-xs', TAG_COLORS[tag.color] || TAG_COLORS.gray)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {/* 메타 정보 */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Avatar className="h-5 w-5">
                <AvatarImage src={post.author.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {post.author.name[0]}
                </AvatarFallback>
              </Avatar>
              <span>{post.author.name}</span>
            </div>
            <span>{timeAgo}</span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {post.view_count}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {post.answer_count}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
