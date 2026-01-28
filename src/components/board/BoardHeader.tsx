'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Share2, Settings, MoreHorizontal, Grid3X3, Loader2, Image, FileJson, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBoardStore } from '@/stores/board-store';
import type { Board } from '@/types/board';

interface BoardHeaderProps {
  board: Board;
  projectId: string;
  onUpdateBoard: (updates: Partial<Board>) => Promise<void>;
  onShare: () => void;
  onDelete: () => void;
  onSave?: () => void;
  hasUnsavedChanges?: boolean;
  onExportPNG?: () => void;
  onExportJSON?: () => void;
}

export function BoardHeader({
  board,
  projectId,
  onUpdateBoard,
  onShare,
  onDelete,
  onSave,
  hasUnsavedChanges,
  onExportPNG,
  onExportJSON,
}: BoardHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(board.title);
  const { gridEnabled, toggleGrid, isSaving } = useBoardStore();

  const handleTitleSubmit = async () => {
    if (title.trim() && title !== board.title) {
      await onUpdateBoard({ title: title.trim() });
    } else {
      setTitle(board.title);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setTitle(board.title);
      setIsEditingTitle(false);
    }
  };

  return (
    <div className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200">
      {/* 좌측: 뒤로가기 + 제목 */}
      <div className="flex items-center gap-3">
        <Link href={`/projects/${projectId}/boards`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>

        {isEditingTitle ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={handleTitleKeyDown}
            className="h-8 w-64"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors"
          >
            {board.title}
          </button>
        )}

        {isSaving && (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            저장 중...
          </div>
        )}
      </div>

      {/* 우측: 액션 버튼 */}
      <div className="flex items-center gap-2">
        {onSave && (
          <Button
            variant={hasUnsavedChanges ? 'default' : 'outline'}
            size="sm"
            onClick={onSave}
            disabled={isSaving || !hasUnsavedChanges}
            className={hasUnsavedChanges ? 'bg-primary-600 hover:bg-primary-700' : ''}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? '저장 중...' : hasUnsavedChanges ? '저장' : '저장됨'}
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleGrid}
          className={gridEnabled ? 'text-primary-600' : 'text-gray-500'}
        >
          <Grid3X3 className="h-5 w-5" />
        </Button>

        <Button variant="outline" size="sm" onClick={onShare}>
          <Share2 className="h-4 w-4 mr-2" />
          공유
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>
              <Settings className="h-4 w-4 mr-2" />
              이름 변경
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {onExportPNG && (
              <DropdownMenuItem onClick={onExportPNG}>
                <Image className="h-4 w-4 mr-2" />
                PNG로 내보내기
              </DropdownMenuItem>
            )}
            {onExportJSON && (
              <DropdownMenuItem onClick={onExportJSON}>
                <FileJson className="h-4 w-4 mr-2" />
                JSON으로 내보내기
              </DropdownMenuItem>
            )}
            {(onExportPNG || onExportJSON) && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-600 focus:text-red-600"
            >
              보드 삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
