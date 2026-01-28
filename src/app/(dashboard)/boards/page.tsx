'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutGrid, Loader2, MoreHorizontal, Trash2, Image, Video, Type, StickyNote, Shapes, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface BoardWithProject {
  id: string;
  title: string;
  description: string | null;
  background_color: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  creator: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
  project: {
    id: string;
    title: string;
  } | null;
  elementStats?: {
    total: number;
    images: number;
    videos: number;
    texts: number;
    stickies: number;
    shapes: number;
  };
  previewImageUrl?: string | null;
}

export default function AllBoardsPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<BoardWithProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 보드 목록 조회
  useEffect(() => {
    async function fetchBoards() {
      try {
        const response = await fetch('/api/boards?limit=50');
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
  }, []);

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">레퍼런스 보드</h1>
          <p className="text-sm text-gray-500">모든 프로젝트의 레퍼런스 보드를 확인하세요</p>
        </div>
      </div>

      {/* 보드 목록 */}
      {boards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <LayoutGrid className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">아직 보드가 없습니다</p>
            <p className="text-sm text-gray-400 mb-4">
              프로젝트에서 새 보드를 만들어 레퍼런스를 정리하세요
            </p>
            <Button onClick={() => router.push('/projects')}>
              <FolderOpen className="h-4 w-4 mr-2" />
              프로젝트 보기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => (
            <Link
              key={board.id}
              href={`/projects/${board.project?.id}/boards/${board.id}`}
            >
              <Card className="group cursor-pointer hover:shadow-md transition-shadow">
                {/* 썸네일/미리보기 */}
                <div
                  className="aspect-video rounded-t-lg relative overflow-hidden"
                  style={{ backgroundColor: board.background_color || '#f3f4f6' }}
                >
                  {board.thumbnail_url ? (
                    <img
                      src={board.thumbnail_url}
                      alt={board.title}
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                  ) : board.previewImageUrl ? (
                    <div className="w-full h-full relative">
                      <img
                        src={board.previewImageUrl}
                        alt={board.title}
                        className="w-full h-full object-cover"
                      />
                      {/* 요소 개수 오버레이 */}
                      {board.elementStats && board.elementStats.total > 1 && (
                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-white text-xs flex items-center gap-1">
                          <LayoutGrid className="h-3 w-3" />
                          +{board.elementStats.total - 1}
                        </div>
                      )}
                    </div>
                  ) : board.elementStats && board.elementStats.total > 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                      <div className="flex items-center gap-3 mb-2">
                        {board.elementStats.images > 0 && (
                          <div className="flex items-center gap-1 text-blue-500">
                            <Image className="h-5 w-5" />
                            <span className="text-sm font-medium">{board.elementStats.images}</span>
                          </div>
                        )}
                        {board.elementStats.videos > 0 && (
                          <div className="flex items-center gap-1 text-purple-500">
                            <Video className="h-5 w-5" />
                            <span className="text-sm font-medium">{board.elementStats.videos}</span>
                          </div>
                        )}
                        {board.elementStats.texts > 0 && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Type className="h-5 w-5" />
                            <span className="text-sm font-medium">{board.elementStats.texts}</span>
                          </div>
                        )}
                        {board.elementStats.stickies > 0 && (
                          <div className="flex items-center gap-1 text-yellow-500">
                            <StickyNote className="h-5 w-5" />
                            <span className="text-sm font-medium">{board.elementStats.stickies}</span>
                          </div>
                        )}
                        {board.elementStats.shapes > 0 && (
                          <div className="flex items-center gap-1 text-green-500">
                            <Shapes className="h-5 w-5" />
                            <span className="text-sm font-medium">{board.elementStats.shapes}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        총 {board.elementStats.total}개 요소
                      </p>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <LayoutGrid className="h-10 w-10 text-gray-300 mb-2" />
                      <p className="text-xs text-gray-400">빈 보드</p>
                    </div>
                  )}

                  {/* 프로젝트 뱃지 */}
                  {board.project && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="bg-white/90 text-gray-700 text-xs">
                        <FolderOpen className="h-3 w-3 mr-1" />
                        {board.project.title}
                      </Badge>
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
