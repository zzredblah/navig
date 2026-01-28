'use client';

/**
 * 프로젝트 피드백 통계 컨테이너
 * 통계 카드, 추이 차트, 상태별 파이 차트를 함께 표시
 */

import { useState, useEffect } from 'react';
import { Loader2, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FeedbackStatsCards } from './FeedbackStatsCards';
import { FeedbackTrendChart } from './FeedbackTrendChart';
import { FeedbackStatusPieChart } from './FeedbackStatusPieChart';

interface FeedbackStatsData {
  summary: {
    total: number;
    open: number;
    resolved: number;
    wontfix: number;
    urgent: number;
    urgentOpen: number;
    resolutionRate: number;
  };
  trend: {
    date: string;
    total: number;
    resolved: number;
  }[];
  statusDistribution: {
    name: string;
    value: number;
    color: string;
  }[];
}

interface ProjectFeedbackStatsProps {
  projectId: string;
}

export function ProjectFeedbackStats({ projectId }: ProjectFeedbackStatsProps) {
  const [stats, setStats] = useState<FeedbackStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/projects/${projectId}/feedback-stats`);
        if (response.ok) {
          const json = await response.json();
          setStats(json.data);
        } else {
          const json = await response.json();
          setError(json.error || '통계를 불러오는데 실패했습니다.');
        }
      } catch (err) {
        console.error('통계 조회 실패:', err);
        setError('통계를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [projectId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-red-500">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-900">피드백 통계</h2>
      </div>

      {/* 통계 카드 */}
      <FeedbackStatsCards stats={stats.summary} />

      {/* 차트 (데이터가 있을 때만) */}
      {stats.summary.total > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <FeedbackTrendChart data={stats.trend} />
          <FeedbackStatusPieChart data={stats.statusDistribution} />
        </div>
      )}
    </div>
  );
}
