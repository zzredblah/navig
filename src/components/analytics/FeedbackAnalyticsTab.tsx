'use client';

import { useEffect, useState } from 'react';
import {
  Loader2,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  FolderOpen,
  User,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

interface FeedbackAnalyticsData {
  totalFeedbacks: number;
  openFeedbacks: number;
  resolvedFeedbacks: number;
  urgentFeedbacks: number;
  prevTotalFeedbacks: number;
  prevResolvedFeedbacks: number;
  avgResolutionTime: number;
  resolutionRate: number;
  feedbacksByStatus: { status: string; count: number }[];
  feedbacksOverTime: { date: string; count: number; resolved: number }[];
  resolutionTimeDistribution: { range: string; count: number }[];
  topAuthors: { userId: string; name: string; avatarUrl?: string; count: number }[];
  projectsWithMostFeedbacks: { projectId: string; title: string; count: number }[];
}

const STATUS_LABELS: Record<string, string> = {
  open: '미해결',
  resolved: '해결됨',
  wontfix: '수정 안함',
};

const STATUS_COLORS: Record<string, string> = {
  open: '#F59E0B',
  resolved: '#22C55E',
  wontfix: '#6B7280',
};

const COLORS = ['#8B5CF6', '#22C55E', '#F59E0B', '#EF4444'];

// 변화율 계산
function calculateChange(current: number, previous: number): { value: number; isPositive: boolean } {
  if (previous === 0) return { value: current > 0 ? 100 : 0, isPositive: current > 0 };
  const change = ((current - previous) / previous) * 100;
  return { value: Math.abs(Math.round(change)), isPositive: change >= 0 };
}

// 통계 카드 컴포넌트
function EnhancedStatCard({
  title,
  value,
  prevValue,
  icon: Icon,
  description,
  color = 'primary',
}: {
  title: string;
  value: number | string;
  prevValue?: number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  color?: 'primary' | 'green' | 'blue' | 'orange' | 'red';
}) {
  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
  };

  const change =
    prevValue !== undefined && typeof value === 'number'
      ? calculateChange(value, prevValue)
      : null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="h-5 w-5" />
        </div>
        {change && change.value > 0 && (
          <div
            className={`flex items-center gap-0.5 text-xs font-medium ${
              change.isPositive ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {change.isPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {change.value}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{title}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

interface FeedbackAnalyticsTabProps {
  period: string;
}

export function FeedbackAnalyticsTab({ period }: FeedbackAnalyticsTabProps) {
  const [data, setData] = useState<FeedbackAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/analytics/feedbacks?period=${period}`);
        if (!response.ok) {
          throw new Error('데이터를 불러오는데 실패했습니다');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [period]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const statusChartData = data.feedbacksByStatus.map((item) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    fill: STATUS_COLORS[item.status] || '#8B5CF6',
  }));

  return (
    <div className="space-y-6">
      {/* 주요 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <EnhancedStatCard
          title="전체 피드백"
          value={data.totalFeedbacks}
          prevValue={data.prevTotalFeedbacks}
          icon={MessageSquare}
          color="primary"
        />
        <EnhancedStatCard
          title="미해결"
          value={data.openFeedbacks}
          icon={Clock}
          color="orange"
        />
        <EnhancedStatCard
          title="해결됨"
          value={data.resolvedFeedbacks}
          prevValue={data.prevResolvedFeedbacks}
          icon={CheckCircle}
          color="green"
        />
        <EnhancedStatCard
          title="긴급"
          value={data.urgentFeedbacks}
          icon={AlertTriangle}
          color="red"
        />
        <EnhancedStatCard
          title="해결률"
          value={`${data.resolutionRate}%`}
          icon={TrendingUp}
          color="blue"
        />
        <EnhancedStatCard
          title="평균 해결"
          value={`${data.avgResolutionTime}h`}
          icon={Clock}
          description="시간"
        />
      </div>

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 피드백 추이 (2칸) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            피드백 생성 및 해결 추이
          </h3>
          {data.feedbacksOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.feedbacksOverTime}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => value.slice(5)}
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  labelFormatter={(value) => `날짜: ${value}`}
                  formatter={(value: number, name: string) => [
                    `${value}개`,
                    name === 'count' ? '생성' : '해결',
                  ]}
                />
                <Legend
                  formatter={(value) => (value === 'count' ? '생성' : '해결')}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#8B5CF6"
                  fill="url(#colorCount)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stroke="#22C55E"
                  fill="url(#colorResolved)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              데이터가 없습니다
            </div>
          )}
        </div>

        {/* 상태별 분포 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-4">상태별 분포</h3>
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}개`, '']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              데이터가 없습니다
            </div>
          )}
        </div>
      </div>

      {/* 해결 시간 분포 + Top 리스트 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 해결 시간 분포 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-4">해결 시간 분포</h3>
          {data.resolutionTimeDistribution.some((d) => d.count > 0) ? (
            <div className="space-y-3">
              {data.resolutionTimeDistribution.map((item, index) => {
                const total = data.resolutionTimeDistribution.reduce((sum, d) => sum + d.count, 0);
                const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.range}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.range}</span>
                      <span className="font-medium text-gray-900">{item.count}개 ({percent}%)</span>
                    </div>
                    <Progress value={percent} className="h-2" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              해결된 피드백이 없습니다
            </div>
          )}
        </div>

        {/* Top 피드백 작성자 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-4">피드백 작성자 Top 5</h3>
          {data.topAuthors.length > 0 ? (
            <div className="space-y-3">
              {data.topAuthors.map((author, index) => (
                <div key={author.userId} className="flex items-center gap-3">
                  <span
                    className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium ${
                      index === 0
                        ? 'bg-yellow-100 text-yellow-700'
                        : index === 1
                        ? 'bg-gray-100 text-gray-700'
                        : index === 2
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={author.avatarUrl} />
                    <AvatarFallback className="text-xs">{author.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm text-gray-900 truncate">{author.name}</span>
                  <span className="text-sm font-medium text-primary-600">{author.count}개</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              데이터가 없습니다
            </div>
          )}
        </div>

        {/* 프로젝트별 피드백 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-4">프로젝트별 피드백 Top 5</h3>
          {data.projectsWithMostFeedbacks.length > 0 ? (
            <div className="space-y-3">
              {data.projectsWithMostFeedbacks.map((project, index) => {
                const maxCount = data.projectsWithMostFeedbacks[0]?.count || 1;
                const percent = Math.round((project.count / maxCount) * 100);
                return (
                  <div key={project.projectId}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 truncate flex-1 mr-2">{project.title}</span>
                      <span className="font-medium text-gray-900 shrink-0">{project.count}개</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              데이터가 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
