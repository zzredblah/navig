'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Scissors,
  MoreVertical,
  Trash2,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  FileVideo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { EditProjectWithDetails, EditProjectStatus } from '@/types/editing';

interface EditProjectCardProps {
  editProject: EditProjectWithDetails;
  projectId: string;
  onDelete?: (id: string) => void;
}

const statusConfig: Record<EditProjectStatus, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}> = {
  draft: {
    label: '작업 중',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-700',
  },
  registered: {
    label: '등록됨',
    icon: FileVideo,
    className: 'bg-blue-100 text-blue-700',
  },
  approved: {
    label: '승인됨',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700',
  },
  rejected: {
    label: '반려됨',
    icon: XCircle,
    className: 'bg-red-100 text-red-700',
  },
};

export function EditProjectCard({
  editProject,
  projectId,
  onDelete,
}: EditProjectCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const status = statusConfig[editProject.status];
  const StatusIcon = status.icon;

  const handleDelete = async () => {
    if (editProject.status !== 'draft') return;

    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/edits/${editProject.id}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        onDelete?.(editProject.id);
      }
    } catch (error) {
      console.error('삭제 실패:', error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const thumbnailUrl = editProject.preview_thumbnail_url ||
    editProject.source_video?.thumbnail_url ||
    null;

  return (
    <>
      <div className="group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
        {/* 썸네일 */}
        <Link
          href={`/projects/${projectId}/edits/${editProject.id}`}
          className="block relative aspect-video bg-gray-100"
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={editProject.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Scissors className="h-12 w-12 text-gray-300" />
            </div>
          )}

          {/* 상태 뱃지 */}
          <div className={cn(
            'absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1',
            status.className
          )}>
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </div>

          {/* 호버 오버레이 */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button variant="secondary" size="sm">
              편집하기
            </Button>
          </div>
        </Link>

        {/* 정보 */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Link
                href={`/projects/${projectId}/edits/${editProject.id}`}
                className="font-medium text-gray-900 truncate block hover:text-primary-600"
              >
                {editProject.title}
              </Link>
              <p className="text-sm text-gray-500 truncate">
                {editProject.source_video?.original_filename || '직접 업로드'}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/projects/${projectId}/edits/${editProject.id}`}>
                    <Scissors className="h-4 w-4 mr-2" />
                    편집하기
                  </Link>
                </DropdownMenuItem>
                {editProject.registered_video_id && (
                  <DropdownMenuItem asChild>
                    <Link href={`/projects/${projectId}/videos/${editProject.registered_video_id}`}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      등록된 영상 보기
                    </Link>
                  </DropdownMenuItem>
                )}
                {editProject.status === 'draft' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 메타 정보 */}
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            {editProject.creator && (
              <span>{editProject.creator.name}</span>
            )}
            <span>·</span>
            <span>
              {formatDistanceToNow(new Date(editProject.updated_at), {
                addSuffix: true,
                locale: ko,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>편집 프로젝트 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{editProject.title}&rdquo;을(를) 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
