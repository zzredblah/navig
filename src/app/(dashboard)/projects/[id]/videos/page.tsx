'use client';

/**
 * 프로젝트 영상 버전 관리 페이지
 *
 * 기능:
 * - 영상 버전 목록 조회
 * - 새 영상 업로드
 * - 영상 재생
 * - 버전 비교
 */

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Video, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoUploader } from '@/components/video/VideoUploader';
import { VideoVersionList } from '@/components/video/VideoVersionList';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { VideoCompareModal } from '@/components/video/VideoCompareModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  VideoVersionWithUploader,
  VideoStatus,
  VideoListResponse,
} from '@/types/video';

interface ProjectInfo {
  id: string;
  title: string;
}

export default function ProjectVideosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();

  // 상태
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [videos, setVideos] = useState<VideoVersionWithUploader[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [statusFilter, setStatusFilter] = useState<VideoStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // 모달 상태
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<VideoVersionWithUploader | null>(
    null
  );
  const [compareVideos, setCompareVideos] = useState<{
    video1: VideoVersionWithUploader | null;
    video2: VideoVersionWithUploader | null;
  }>({ video1: null, video2: null });

  // 프로젝트 정보 조회
  useEffect(() => {
    async function fetchProject() {
      try {
        const response = await fetch(`/api/projects/${resolvedParams.id}`);
        if (response.ok) {
          const result = await response.json();
          setProject({
            id: result.data.project.id,
            title: result.data.project.title,
          });
        } else if (response.status === 404) {
          router.push('/projects');
        }
      } catch (error) {
        console.error('프로젝트 조회 실패:', error);
      }
    }
    fetchProject();
  }, [resolvedParams.id, router]);

  // 영상 목록 조회
  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(
        `/api/projects/${resolvedParams.id}/videos?${params}`
      );

      if (response.ok) {
        const data: VideoListResponse = await response.json();
        setVideos(data.videos);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error('영상 목록 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, [resolvedParams.id, pagination.page, pagination.limit, statusFilter]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // 영상 삭제
  const handleDelete = async (videoId: string) => {
    const response = await fetch(`/api/videos/${videoId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '삭제에 실패했습니다');
    }

    // 목록 새로고침
    fetchVideos();
  };

  // 버전 비교
  const handleCompare = (
    video1: VideoVersionWithUploader,
    video2: VideoVersionWithUploader
  ) => {
    setCompareVideos({ video1, video2 });
  };

  // 상태 필터 변경
  const handleStatusFilter = (status: VideoStatus | 'all') => {
    setStatusFilter(status);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // 업로드 성공
  const handleUploadSuccess = () => {
    fetchVideos();
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <Link
          href={`/projects/${resolvedParams.id}`}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          프로젝트로 돌아가기
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                <Video className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 truncate">
                  영상 버전 관리
                </h1>
                <p className="text-sm text-gray-500 truncate">
                  {project?.title || '로딩 중...'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchVideos}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              새로고침
            </Button>
            <Button
              size="sm"
              onClick={() => setIsUploaderOpen(true)}
              className="bg-primary-600 hover:bg-primary-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              업로드
            </Button>
          </div>
        </div>
      </div>

      {/* 영상 목록 */}
      <VideoVersionList
        videos={videos}
        projectId={resolvedParams.id}
        isLoading={isLoading}
        onPlay={setPlayingVideo}
        onCompare={handleCompare}
        onDelete={handleDelete}
        onStatusFilter={handleStatusFilter}
        statusFilter={statusFilter}
      />

      {/* 페이지네이션 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
            }
            disabled={pagination.page <= 1}
          >
            이전
          </Button>
          <span className="text-sm text-gray-600">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
            }
            disabled={pagination.page >= pagination.totalPages}
          >
            다음
          </Button>
        </div>
      )}

      {/* 업로드 모달 */}
      <VideoUploader
        projectId={resolvedParams.id}
        open={isUploaderOpen}
        onOpenChange={setIsUploaderOpen}
        onSuccess={handleUploadSuccess}
      />

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
            <div className="mt-2">
              <p className="text-sm text-gray-600">{playingVideo.change_notes}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 비교 모달 */}
      <VideoCompareModal
        open={!!compareVideos.video1 && !!compareVideos.video2}
        onOpenChange={(open) =>
          !open && setCompareVideos({ video1: null, video2: null })
        }
        video1={compareVideos.video1}
        video2={compareVideos.video2}
      />
    </div>
  );
}
