'use client';

import { useEffect, useState } from 'react';
import { Loader2, MessageSquare, RefreshCw, Search, CheckCircle, HelpCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { PostCard } from './PostCard';

interface Tag {
  id: string;
  name: string;
  color: string;
  usage_count: number;
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
}

interface Stats {
  totalPosts: number;
  solvedPosts: number;
  totalAnswers: number;
}

export function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [stats, setStats] = useState<Stats>({ totalPosts: 0, solvedPosts: 0, totalAnswers: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 필터
  const [sort, setSort] = useState('latest');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [solvedFilter, setSolvedFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // 태그 및 통계 로드
  useEffect(() => {
    async function fetchTagsAndStats() {
      try {
        const [tagsRes, statsRes] = await Promise.all([
          fetch('/api/community/tags'),
          fetch('/api/community/posts?limit=1'), // stats만 가져오기 위해
        ]);

        if (tagsRes.ok) {
          const data = await tagsRes.json();
          setTags(data.data);
        }

        if (statsRes.ok) {
          const data = await statsRes.json();
          if (data.stats) {
            setStats(data.stats);
          }
        }
      } catch (err) {
        console.error('태그/통계 로드 실패:', err);
      }
    }
    fetchTagsAndStats();
  }, []);

  // 게시글 로드
  const fetchPosts = async (pageNum: number, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        sort,
        solved: solvedFilter,
      });

      if (tagFilter && tagFilter !== 'all') {
        params.set('tag', tagFilter);
      }

      if (search) {
        params.set('search', search);
      }

      const response = await fetch(`/api/community/posts?${params}`);
      if (!response.ok) {
        throw new Error('게시글을 불러오는데 실패했습니다');
      }

      const data = await response.json();

      if (append) {
        setPosts((prev) => [...prev, ...data.data]);
      } else {
        setPosts(data.data);
      }

      setTotalCount(data.pagination.total || 0);
      setHasMore(pageNum < data.pagination.totalPages);
      setPage(pageNum);

      // 통계 업데이트
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 필터 변경 시 다시 로드
  useEffect(() => {
    fetchPosts(1, false);
  }, [sort, tagFilter, solvedFilter, search]);

  // 검색
  const handleSearch = () => {
    setSearch(searchInput);
  };

  // 더 보기
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchPosts(page + 1, true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <Button variant="outline" onClick={() => fetchPosts(1, false)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          다시 시도
        </Button>
      </div>
    );
  }

  const solvedRate = stats.totalPosts > 0 ? Math.round((stats.solvedPosts / stats.totalPosts) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
            <HelpCircle className="h-4 w-4 text-primary-600" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-gray-900">{stats.totalPosts}</p>
            <p className="text-xs text-gray-500 truncate">전체 질문</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-gray-900">{solvedRate}%</p>
            <p className="text-xs text-gray-500 truncate">해결률</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-gray-900">{stats.totalAnswers}</p>
            <p className="text-xs text-gray-500 truncate">전체 답변</p>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* 검색 - 고정 너비 */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="질문 검색..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9 w-full"
            />
          </div>

          {/* 필터 셀렉트들 */}
          <div className="flex gap-2 flex-wrap sm:ml-auto">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-24 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">최신순</SelectItem>
                <SelectItem value="votes">추천순</SelectItem>
                <SelectItem value="unanswered">미답변</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-28 text-sm">
                <SelectValue placeholder="태그" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 태그</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name} ({tag.usage_count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={solvedFilter} onValueChange={setSolvedFilter}>
              <SelectTrigger className="w-24 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="solved">해결됨</SelectItem>
                <SelectItem value="unsolved">미해결</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 검색 결과 또는 필터 상태 표시 */}
        {(search || tagFilter !== 'all' || solvedFilter !== 'all') && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">
              {totalCount}개의 결과
              {search && <span className="ml-1">- &quot;{search}&quot; 검색</span>}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-gray-500 hover:text-gray-700"
              onClick={() => {
                setSearch('');
                setSearchInput('');
                setTagFilter('all');
                setSolvedFilter('all');
              }}
            >
              필터 초기화
            </Button>
          </div>
        )}
      </div>

      {/* 게시글 목록 */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border border-gray-200">
          <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2">게시글이 없습니다</p>
          <p className="text-sm text-gray-400">
            첫 번째 질문을 작성해보세요!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          {hasMore && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    로딩 중...
                  </>
                ) : (
                  '더 보기'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
