'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// recharts 컴포넌트를 사용하는 차트들을 동적 임포트
const ProjectStatusChartInternal = dynamic(
  () => import('./DashboardCharts').then(mod => ({ default: mod.ProjectStatusChart })),
  {
    loading: () => <ChartSkeleton title="프로젝트 현황" />,
    ssr: false,
  }
);

const DocumentStatusChartInternal = dynamic(
  () => import('./DashboardCharts').then(mod => ({ default: mod.DocumentStatusChart })),
  {
    loading: () => <ChartSkeleton title="문서 현황" />,
    ssr: false,
  }
);

function ChartSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
      </CardContent>
    </Card>
  );
}

interface ProjectStatusChartProps {
  data: { name: string; value: number; color: string }[];
}

interface DocumentStatusChartProps {
  data: { name: string; count: number }[];
}

export function ProjectStatusChart({ data }: ProjectStatusChartProps) {
  return <ProjectStatusChartInternal data={data} />;
}

export function DocumentStatusChart({ data }: DocumentStatusChartProps) {
  return <DocumentStatusChartInternal data={data} />;
}
