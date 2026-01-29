'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Video,
  Play,
  CheckCircle,
  Clock,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface VideoVersion {
  id: string;
  version_number: number;
  version_name: string | null;
  original_filename: string;
  thumbnail_url: string | null;
  duration: number | null;
  status: string;
  approved_at: string | null;
  created_at: string;
  feedback_count?: number;
}

interface ClientVideoSectionProps {
  projectId: string;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  uploading: { label: '업로드 중', className: 'bg-gray-100 text-gray-600' },
  processing: { label: '처리 중', className: 'bg-blue-100 text-blue-700' },
  ready: { label: '검토 대기', className: 'bg-yellow-100 text-yellow-700' },
  error: { label: '오류', className: 'bg-red-100 text-red-700' },
};

export function ClientVideoSection({ projectId }: ClientVideoSectionProps) {
  const [videos, setVideos] = useState<VideoVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, [projectId]);

  const fetchVideos = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/videos`);
      if (response.ok) {
        const { data } = await response.json();
        setVideos(data.videos || []);
      }
    } catch (error) {
      console.error('영상 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        </CardContent>
      </Card>
    );
  }

  if (videos.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Video className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 mb-1">아직 업로드된 영상이 없습니다</p>
          <p className="text-sm text-gray-400">
            제작팀이 영상을 업로드하면 여기에 표시됩니다
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Video className="h-5 w-5 text-primary-600" />
          영상 버전 ({videos.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {videos.map((video) => {
            const isApproved = !!video.approved_at;
            const status = isApproved
              ? { label: '승인됨', className: 'bg-green-100 text-green-700' }
              : statusLabels[video.status] || statusLabels.ready;

            return (
              <Link
                key={video.id}
                href={`/videos/${video.id}`}
                className="block"
              >
                <div className="flex gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group">
                  {/* 썸네일 */}
                  <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                    {video.thumbnail_url ? (
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
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="h-8 w-8 text-white" />
                    </div>
                    {video.duration && (
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                        {formatDuration(video.duration)}
                      </div>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        v{video.version_number}
                      </span>
                      {video.version_name && (
                        <span className="text-gray-600">
                          {video.version_name}
                        </span>
                      )}
                      <Badge className={status.className}>{status.label}</Badge>
                      {isApproved && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>

                    <p className="text-sm text-gray-500 truncate mt-1">
                      {video.original_filename}
                    </p>

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(video.created_at)}
                      </span>
                      {video.feedback_count !== undefined && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          피드백 {video.feedback_count}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 리뷰 버튼 */}
                  <div className="flex items-center shrink-0">
                    <Button variant="outline" size="sm">
                      리뷰하기
                    </Button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
