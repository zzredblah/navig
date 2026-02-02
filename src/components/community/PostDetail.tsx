'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ArrowLeft, CheckCircle, Eye, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { VoteButton } from './VoteButton';
import { AnswerList } from './AnswerList';
import { AnswerForm } from './AnswerForm';
import { cn } from '@/lib/utils';

interface Tag {
  id: string;
  name: string;
  color: string;
}

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

interface Post {
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
  answers?: Answer[];
}

interface PostDetailProps {
  postId: string;
  currentUserId?: string;
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

export function PostDetail({ postId, currentUserId }: PostDetailProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPost = useCallback(async () => {
    try {
      const response = await fetch(`/api/community/posts/${postId}`);
      if (!response.ok) {
        throw new Error('게시글을 불러오는데 실패했습니다');
      }
      const data = await response.json();
      setPost(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleAcceptAnswer = async (answerId: string) => {
    try {
      const response = await fetch(`/api/community/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted_answer_id: answerId }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || '채택에 실패했습니다');
        return;
      }

      toast.success('답변을 채택했습니다');
      fetchPost(); // 새로고침
    } catch (error) {
      toast.error('채택 중 오류가 발생했습니다');
    }
  };

  const handleAnswerCreated = () => {
    fetchPost(); // 새로고침
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 mb-4">{error || '게시글을 찾을 수 없습니다'}</p>
        <Link href="/community">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
        </Link>
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: ko,
  });

  const tags = post.post_tags?.map((pt) => pt.tag) || [];
  const isPostAuthor = currentUserId === post.author.id;

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link href="/community">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록
          </Button>
        </Link>
      </div>

      {/* 게시글 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex gap-6">
          {/* 투표 */}
          <div className="shrink-0">
            <VoteButton
              targetType="post"
              targetId={post.id}
              voteCount={post.vote_count}
            />
          </div>

          {/* 본문 */}
          <div className="flex-1 min-w-0">
            {/* 제목 */}
            <div className="flex items-start gap-2">
              {post.is_solved && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 shrink-0">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  해결됨
                </Badge>
              )}
              <h1 className="text-xl font-bold text-gray-900">{post.title}</h1>
            </div>

            {/* 태그 */}
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
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

            {/* 내용 */}
            <div className="mt-6 prose prose-sm max-w-none text-gray-700">
              <p className="whitespace-pre-wrap">{post.content}</p>
            </div>

            {/* 메타 정보 */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={post.author.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {post.author.name[0]}
                  </AvatarFallback>
                </Avatar>
                <span>{post.author.name}</span>
              </div>
              <span>{timeAgo}</span>
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {post.view_count}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 답변 섹션 */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">
          답변 {post.answer_count}개
        </h2>

        <AnswerList
          answers={post.answers || []}
          isPostAuthor={isPostAuthor}
          onAccept={handleAcceptAnswer}
        />

        {/* 답변 작성 폼 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-base font-medium text-gray-900 mb-4">
            답변 작성
          </h3>
          <AnswerForm postId={post.id} onAnswerCreated={handleAnswerCreated} />
        </div>
      </div>
    </div>
  );
}
