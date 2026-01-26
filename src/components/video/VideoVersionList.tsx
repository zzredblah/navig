'use client';

/**
 * 영상 버전 목록 컴포넌트
 *
 * 기능:
 * - 버전 카드 목록 표시
 * - 상태별 필터링
 * - 재생, 비교, 다운로드, 삭제 액션
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Play,
  Download,
  Trash2,
  MoreHorizontal,
  Video,
  Clock,
  HardDrive,
  User,
  Calendar,
  GitCompare,
  Loader2,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  VideoVersionWithUploader,
  VideoStatus,
  formatFileSize,
  formatDuration,
  getStatusText,
  getStatusColor,
} from '@/types/video';
import { cn } from '@/lib/utils';

interface VideoVersionListProps {
  videos: VideoVersionWithUploader[];
  projectId: string;
  isLoading?: boolean;
  onPlay: (video: VideoVersionWithUploader) => void;
  onCompare: (video1: VideoVersionWithUploader, video2: VideoVersionWithUploader) => void;
  onDelete: (videoId: string) => Promise<void>;
  onStatusFilter: (status: VideoStatus | 'all') => void;
  statusFilter: VideoStatus | 'all';
}

export function VideoVersionList({
  videos,
  projectId,
  isLoading,
  onPlay,
  onCompare,
  onDelete,
  onStatusFilter,
  statusFilter,
}: VideoVersionListProps) {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 비디오 선택 토글 (비교용)
  const toggleVideoSelection = useCallback((videoId: string) => {
    setSelectedVideos((prev) => {
      if (prev.includes(videoId)) {
        return prev.filter((id) => id !== videoId);
      }
      // 최대 2개까지 선택
      if (prev.length >= 2) {
        return [prev[1], videoId];
      }
      return [...prev, videoId];
    });
  }, []);

  // 선택된 영상 비교
  const handleCompare = useCallback(() => {
    if (selectedVideos.length !== 2) return;

    const video1 = videos.find((v) => v.id === selectedVideos[0]);
    const video2 = videos.find((v) => v.id === selectedVideos[1]);

    if (video1 && video2) {
      onCompare(video1, video2);
      setSelectedVideos([]);
    }
  }, [selectedVideos, videos, onCompare]);

  // 삭제 확인
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await onDelete(deleteTarget);
      setSelectedVideos((prev) => prev.filter((id) => id !== deleteTarget));
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, onDelete]);

  // 다운로드
  const handleDownload = useCallback((video: VideoVersionWithUploader) => {
    if (video.file_url) {
      const link = document.createElement('a');
      link.href = video.file_url;
      link.download = video.original_filename;
      link.click();
    }
  }, []);

  // 날짜 포맷
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 필터 및 액션 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select
            value={statusFilter}
            onValueChange={(value) => onStatusFilter(value as VideoStatus | 'all')}
          >
            <SelectTrigger className="w-[140px] bg-white">
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="ready">준비 완료</SelectItem>
              <SelectItem value="uploading">업로드 중</SelectItem>
              <SelectItem value="processing">처리 중</SelectItem>
              <SelectItem value="error">오류</SelectItem>
            </SelectContent>
          </Select>

          {selectedVideos.length > 0 && (
            <span className="text-sm text-gray-500">
              {selectedVideos.length}개 선택됨
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (selectedVideos.length === 1) {
                window.location.href = `/projects/${projectId}/videos/${selectedVideos[0]}`;
              }
            }}
            disabled={selectedVideos.length !== 1}
            className="disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            피드백 보기
          </Button>
          <Button
            onClick={handleCompare}
            disabled={selectedVideos.length !== 2}
            className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <GitCompare className="h-4 w-4 mr-2" />
            버전 비교 {selectedVideos.length > 0 && `(${selectedVideos.length}/2)`}
          </Button>
        </div>
      </div>

      {/* 비디오 목록 */}
      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Video className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2">영상이 없습니다</p>
          <p className="text-sm text-gray-400">
            새 영상을 업로드하여 버전 관리를 시작하세요
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {videos.map((video) => (
            <Card
              key={video.id}
              className={cn(
                'transition-all cursor-pointer hover:border-gray-300',
                selectedVideos.includes(video.id) &&
                  'ring-2 ring-primary-500 bg-primary-50/50',
                video.status !== 'ready' && 'cursor-default'
              )}
              onClick={() => {
                if (video.status === 'ready') {
                  toggleVideoSelection(video.id);
                }
              }}
            >
              <CardContent className="flex flex-col sm:flex-row gap-4 p-4">
                {/* 체크박스 + 썸네일 */}
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedVideos.includes(video.id)}
                    onCheckedChange={() => toggleVideoSelection(video.id)}
                    disabled={video.status !== 'ready'}
                    className="mt-1"
                    onClick={(e) => e.stopPropagation()}
                  />

                  <div
                    className={cn(
                      'relative w-32 h-20 rounded-lg overflow-hidden shrink-0 cursor-pointer group',
                      video.status !== 'ready' && 'opacity-60'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (video.status === 'ready') onPlay(video);
                    }}
                  >
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt={`버전 ${video.version_number}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Video className="h-8 w-8 text-gray-400" />
                      </div>
                    )}

                    {video.status === 'ready' && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="h-8 w-8 text-white" />
                      </div>
                    )}

                    {/* 길이 표시 */}
                    {video.duration && (
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-xs text-white">
                        {formatDuration(video.duration)}
                      </div>
                    )}
                  </div>
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          v{video.version_number}
                        </span>
                        {video.version_name && (
                          <span className="text-gray-600">
                            - {video.version_name}
                          </span>
                        )}
                        <span
                          className={cn(
                            'px-2 py-0.5 text-xs font-medium rounded-full',
                            getStatusColor(video.status)
                          )}
                        >
                          {getStatusText(video.status)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 truncate mb-2">
                        {video.original_filename}
                      </p>

                      <p className="text-sm text-gray-500 line-clamp-2">
                        {video.change_notes}
                      </p>
                    </div>

                    {/* 액션 메뉴 */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onPlay(video)}
                          disabled={video.status !== 'ready'}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          재생
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild disabled={video.status !== 'ready'}>
                          <Link href={`/projects/${projectId}/videos/${video.id}`}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            피드백 보기
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDownload(video)}
                          disabled={!video.file_url}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          다운로드
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(video.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* 메타데이터 */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      {formatFileSize(video.file_size)}
                    </span>
                    {video.resolution && (
                      <span className="flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        {video.resolution}
                      </span>
                    )}
                    {video.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(video.duration)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {video.uploader?.name || '알 수 없음'}
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(video.created_at)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>영상 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 영상을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  삭제 중...
                </>
              ) : (
                '삭제'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
