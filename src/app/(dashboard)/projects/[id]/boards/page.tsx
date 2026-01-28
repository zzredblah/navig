'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, LayoutGrid, Loader2, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { BoardWithCreator } from '@/types/board';

export default function BoardsListPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [boards, setBoards] = useState<BoardWithCreator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // 보드 목록 조회
  useEffect(() => {
    async function fetchBoards() {
      try {
        const response = await fetch(`/api/projects/${resolvedParams.id}/boards`);
        if (response.ok) {
          const data = await response.json();
          setBoards(data.data || []);
        }
      } catch (error) {
        console.error('보드 목록 조회 실패:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBoards();
  }, [resolvedParams.id]);

  // 새 보드 생성
  const handleCreateBoard = async () => {
    setIsCreating(true);
    try {
      const response = await fetch(`/api/projects/${resolvedParams.id}/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '새 보드' }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/projects/${resolvedParams.id}/boards/${data.board.id}`);
      }
    } catch (error) {
      console.error('보드 생성 실패:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // 보드 삭제
  const handleDeleteBoard = async (boardId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('이 보드를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBoards((prev) => prev.filter((b) => b.id !== boardId));
      }
    } catch (error) {
      console.error('보드 삭제 실패:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${resolvedParams.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">레퍼런스 보드</h1>
            <p className="text-sm text-gray-500">프로젝트 레퍼런스와 아이디어를 정리하세요</p>
          </div>
        </div>

        <Button onClick={handleCreateBoard} disabled={isCreating}>
          {isCreating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          새 보드
        </Button>
      </div>

      {/* 보드 목록 */}
      {boards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <LayoutGrid className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">아직 보드가 없습니다</p>
            <p className="text-sm text-gray-400 mb-4">
              새 보드를 만들어 레퍼런스를 정리하세요
            </p>
            <Button onClick={handleCreateBoard} disabled={isCreating}>
              <Plus className="h-4 w-4 mr-2" />
              첫 보드 만들기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => (
            <Link
              key={board.id}
              href={`/projects/${resolvedParams.id}/boards/${board.id}`}
            >
              <Card className="group cursor-pointer hover:shadow-md transition-shadow">
                {/* 썸네일 */}
                <div
                  className="aspect-video rounded-t-lg"
                  style={{ backgroundColor: board.background_color }}
                >
                  {board.thumbnail_url ? (
                    <img
                      src={board.thumbnail_url}
                      alt={board.title}
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <LayoutGrid className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {board.title}
                      </h3>
                      {board.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                          {board.description}
                        </p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={(e) => e.preventDefault()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => handleDeleteBoard(board.id, e as unknown as React.MouseEvent)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* 생성자 정보 */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={board.creator?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary-100 text-primary-700">
                        {board.creator?.name?.slice(0, 2) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-gray-500">
                      {board.creator?.name || '알 수 없음'}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {new Date(board.updated_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
