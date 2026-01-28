'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VideoCompare, type CompareMode } from '@/components/video/compare';
import type { VideoVersionWithUploader } from '@/types/video';

interface PageProps {
  params: Promise<{ id: string; videoId: string }>;
}

export default function VideoComparePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [versions, setVersions] = useState<VideoVersionWithUploader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // URL 쿼리에서 버전 ID 가져오기
  const v1Id = searchParams.get('v1');
  const v2Id = searchParams.get('v2');

  // 선택된 버전 ID 상태
  const [leftVersionId, setLeftVersionId] = useState<string>(v1Id || '');
  const [rightVersionId, setRightVersionId] = useState<string>(v2Id || '');

  // 버전 목록 조회
  useEffect(() => {
    async function fetchVersions() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/projects/${resolvedParams.id}/videos?all=true`
        );
        if (response.ok) {
          const data = await response.json();
          const versionList = data.videos || [];
          setVersions(versionList);

          // 기본 선택: 가장 최근 2개 버전
          if (versionList.length >= 2) {
            if (!v1Id) setLeftVersionId(versionList[1]?.id || '');
            if (!v2Id) setRightVersionId(versionList[0]?.id || '');
          }
        } else {
          setError('버전 목록을 불러올 수 없습니다.');
        }
      } catch {
        setError('서버 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchVersions();
  }, [resolvedParams.id, v1Id, v2Id]);

  // URL 업데이트
  useEffect(() => {
    if (leftVersionId && rightVersionId) {
      const newUrl = `/projects/${resolvedParams.id}/videos/${resolvedParams.videoId}/compare?v1=${leftVersionId}&v2=${rightVersionId}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [leftVersionId, rightVersionId, resolvedParams.id, resolvedParams.videoId, router]);

  // 선택된 버전 찾기
  const leftVersion = versions.find((v) => v.id === leftVersionId);
  const rightVersion = versions.find((v) => v.id === rightVersionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-gray-600">{error}</p>
        <Button
          variant="outline"
          onClick={() => router.push(`/projects/${resolvedParams.id}/videos/${resolvedParams.videoId}`)}
        >
          돌아가기
        </Button>
      </div>
    );
  }

  if (versions.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-gray-300" />
        <p className="text-gray-600">비교할 버전이 2개 이상 필요합니다.</p>
        <Button
          variant="outline"
          onClick={() => router.push(`/projects/${resolvedParams.id}/videos/${resolvedParams.videoId}`)}
        >
          돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 -my-4 sm:-my-6 lg:-my-8">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${resolvedParams.id}/videos/${resolvedParams.videoId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              돌아가기
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">버전 비교</h1>
        </div>

        {/* 버전 선택 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">비교:</span>
          <Select value={leftVersionId} onValueChange={setLeftVersionId}>
            <SelectTrigger className="w-40 h-8">
              <SelectValue placeholder="버전 선택" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem
                  key={v.id}
                  value={v.id}
                  disabled={v.id === rightVersionId}
                >
                  v{v.version_number} {v.version_name && `(${v.version_name})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-gray-400">↔</span>

          <Select value={rightVersionId} onValueChange={setRightVersionId}>
            <SelectTrigger className="w-40 h-8">
              <SelectValue placeholder="버전 선택" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem
                  key={v.id}
                  value={v.id}
                  disabled={v.id === leftVersionId}
                >
                  v{v.version_number} {v.version_name && `(${v.version_name})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 비교 뷰어 */}
      <div className="flex-1 p-4 bg-gray-100">
        {leftVersion?.file_url && rightVersion?.file_url ? (
          <VideoCompare
            leftVideo={{
              url: leftVersion.file_url,
              label: `v${leftVersion.version_number} ${leftVersion.version_name || ''}`,
            }}
            rightVideo={{
              url: rightVersion.file_url,
              label: `v${rightVersion.version_number} ${rightVersion.version_name || ''}`,
            }}
            initialMode="slider"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">
                선택한 버전의 영상 파일을 사용할 수 없습니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
