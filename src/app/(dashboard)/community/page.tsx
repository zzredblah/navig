import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostList } from '@/components/community/PostList';

export default function CommunityPage() {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">커뮤니티</h1>
          <p className="text-sm text-gray-500 mt-1">
            질문하고 답변을 공유하세요
          </p>
        </div>
        <Link href="/community/new">
          <Button className="bg-primary-600 hover:bg-primary-700">
            <Plus className="h-4 w-4 mr-2" />
            질문하기
          </Button>
        </Link>
      </div>

      {/* 게시글 목록 */}
      <PostList />
    </div>
  );
}
