'use client';

/**
 * 영상 목록 페이지
 *
 * 사용자가 접근 가능한 모든 프로젝트의 영상을 보여줍니다.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Video,
  Play,
  Clock,
  FolderOpen,
  Loader2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface VideoWithProject {
  id: string;
  project_id: string;
  version_number: number;
  version_name: string | null;
  original_filename: string;
  file_url: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  resolution: string | null;
  file_size: number;
  change_notes: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  created_at: string;
  project: {
    id: string;
    title: string;
  };
  uploader: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  uploading: { label: '업로드 중', color: 'bg-blue-100 text-blue-700' },
  processing: { label: '처리 중', color: 'bg-yellow-100 text-yellow-700' },
  ready: { label: '준비됨', color: 'bg-green-100 text-green-700' },
  error: { label: '오류', color: 'bg-red-100 text-red-700' },
};

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function VideosPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoWithProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [playingVideo, setPlayingVideo] = useState<VideoWithProject | null>(null);

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/videos?${params}`);
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos);
      }
    } catch (error) {
      console.error('영상 목록 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">영상</h1>
            <p className="text-sm text-gray-500">
              모든 프로젝트의 영상을 한눈에 확인합니다
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="ready">준비됨</SelectItem>
              <SelectItem value="uploading">업로드 중</SelectItem>
              <SelectItem value="processing">처리 중</SelectItem>
              <SelectItem value="error">오류</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchVideos}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 영상 목록 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : videos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Video className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">영상이 없습니다</p>
            <p className="text-sm text-gray-400 mb-4">
              프로젝트에서 영상을 업로드하면 여기에 표시됩니다
            </p>
            <Button
              variant="outline"
              onClick={() => router.push('/projects')}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              프로젝트 보기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {videos.map((video) => {
            const status = statusLabels[video.status] || statusLabels.ready;
            return (
              <Card key={video.id} className="hover:shadow-md transition-shadow">
                <CardContent className="flex flex-col sm:flex-row gap-4 p-4">
                  {/* 썸네일 */}
                  <div
                    className="relative w-full sm:w-48 aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer group shrink-0"
                    onClick={() => video.file_url && setPlayingVideo(video)}
                  >
                    {video.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={video.thumbnail_url}
                        alt={video.original_filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    {video.file_url && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="h-10 w-10 text-white" />
                      </div>
                    )}
                    {video.duration && (
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                        {formatDuration(video.duration)}
                      </div>
                    )}
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
                            <span className="text-gray-500">
                              - {video.version_name}
                            </span>
                          )}
                          <Badge className={status.color}>{status.label}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {video.original_filename}
                        </p>
                      </div>
                    </div>

                    {/* 프로젝트 링크 */}
                    <Link
                      href={`/projects/${video.project_id}/videos`}
                      className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-2"
                    >
                      <FolderOpen className="h-3 w-3" />
                      {video.project.title}
                      <ExternalLink className="h-3 w-3" />
                    </Link>

                    {/* 메타데이터 */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                      <span>{formatFileSize(video.file_size)}</span>
                      {video.resolution && <span>{video.resolution}</span>}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(video.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>

                    {/* 변경사항 */}
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {video.change_notes}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 재생 모달 */}
      <Dialog
        open={!!playingVideo}
        onOpenChange={(open) => !open && setPlayingVideo(null)}
      >
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>v{playingVideo?.version_number}</span>
              {playingVideo?.version_name && (
                <span className="text-gray-500">- {playingVideo.version_name}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {playingVideo?.file_url ? (
            <VideoPlayer
              src={playingVideo.file_url}
              poster={playingVideo.thumbnail_url || undefined}
              title={playingVideo.original_filename}
              className="aspect-video"
            />
          ) : (
            <div className="aspect-video bg-gray-200 flex items-center justify-center rounded-lg">
              <p className="text-gray-500">영상을 불러올 수 없습니다</p>
            </div>
          )}

          {playingVideo && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-gray-600">{playingVideo.change_notes}</p>
              <Link
                href={`/projects/${playingVideo.project_id}/videos`}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                프로젝트에서 보기
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
