'use client';

import { CheckCircle, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ClientProgressBarProps {
  totalVideos: number;
  approvedVideos: number;
  openFeedbacks: number;
  resolvedFeedbacks: number;
}

export function ClientProgressBar({
  totalVideos,
  approvedVideos,
  openFeedbacks,
  resolvedFeedbacks,
}: ClientProgressBarProps) {
  const videoProgress = totalVideos > 0
    ? Math.round((approvedVideos / totalVideos) * 100)
    : 0;

  const totalFeedbacks = openFeedbacks + resolvedFeedbacks;
  const feedbackProgress = totalFeedbacks > 0
    ? Math.round((resolvedFeedbacks / totalFeedbacks) * 100)
    : 100; // 피드백이 없으면 100%

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-r from-primary-50 to-purple-50">
      <CardContent className="p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">프로젝트 진행률</h3>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* 영상 승인 진행률 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>영상 승인</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {approvedVideos} / {totalVideos}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-white overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  videoProgress === 100
                    ? 'bg-green-500'
                    : 'bg-primary-500'
                )}
                style={{ width: `${videoProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {videoProgress === 100
                ? '모든 영상이 승인되었습니다!'
                : `${videoProgress}% 완료`}
            </p>
          </div>

          {/* 피드백 해결 진행률 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MessageSquare className="h-4 w-4 text-orange-500" />
                <span>피드백 처리</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {resolvedFeedbacks} / {totalFeedbacks}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-white overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  feedbackProgress === 100
                    ? 'bg-green-500'
                    : 'bg-orange-500'
                )}
                style={{ width: `${feedbackProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {openFeedbacks === 0
                ? '모든 피드백이 처리되었습니다!'
                : `${openFeedbacks}개의 피드백 대기 중`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
