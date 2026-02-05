'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { BarChart3, FolderOpen, MessageSquare, Users, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalyticsPeriodSelect } from '@/components/analytics/AnalyticsPeriodSelect';

// recharts를 사용하는 무거운 컴포넌트들은 dynamic import
const ProjectAnalyticsTab = dynamic(
  () => import('@/components/analytics/ProjectAnalyticsTab').then(mod => ({ default: mod.ProjectAnalyticsTab })),
  {
    loading: () => <AnalyticsTabSkeleton />,
    ssr: false,
  }
);

const FeedbackAnalyticsTab = dynamic(
  () => import('@/components/analytics/FeedbackAnalyticsTab').then(mod => ({ default: mod.FeedbackAnalyticsTab })),
  {
    loading: () => <AnalyticsTabSkeleton />,
    ssr: false,
  }
);

const WorkerAnalyticsTab = dynamic(
  () => import('@/components/analytics/WorkerAnalyticsTab').then(mod => ({ default: mod.WorkerAnalyticsTab })),
  {
    loading: () => <AnalyticsTabSkeleton />,
    ssr: false,
  }
);

function AnalyticsTabSkeleton() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('projects');

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <BarChart3 className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">분석 대시보드</h1>
            <p className="text-sm text-gray-500">
              프로젝트와 팀 활동을 분석합니다
            </p>
          </div>
        </div>

        <AnalyticsPeriodSelect value={period} onChange={setPeriod} />
      </div>

      {/* 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="projects" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">프로젝트</span>
          </TabsTrigger>
          <TabsTrigger value="feedbacks" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">피드백</span>
          </TabsTrigger>
          <TabsTrigger value="workers" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">팀 활동</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-6">
          <ProjectAnalyticsTab period={period} />
        </TabsContent>

        <TabsContent value="feedbacks" className="mt-6">
          <FeedbackAnalyticsTab period={period} />
        </TabsContent>

        <TabsContent value="workers" className="mt-6">
          <WorkerAnalyticsTab period={period} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
