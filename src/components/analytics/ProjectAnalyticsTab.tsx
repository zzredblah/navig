'use client';

import { useEffect, useState } from 'react';
import {
  Loader2,
  FolderOpen,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Video,
  MessageSquare,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  ComposedChart,
  Area,
} from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ProjectAnalyticsData {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  prevTotalProjects: number;
  prevActiveProjects: number;
  prevCompletedProjects: number;
  newProjectsThisPeriod: number;
  projectsByStatus: { status: string; count: number }[];
  projectsOverTime: { date: string; count: number; cumulative: number }[];
  topProjects: {
    id: string;
    title: string;
    status: string;
    feedbackCount: number;
    videoCount: number;
    memberCount: number;
    activityScore: number;
  }[];
  avgVideosPerProject: number;
  avgFeedbacksPerProject: number;
  avgMembersPerProject: number;
  recentActivity: {
    id: string;
    activity_type: string;
    title: string;
    created_at: string;
    user: { name: string; avatar_url?: string } | null;
  }[];
}

const STATUS_LABELS: Record<string, string> = {
  draft: '초안',
  active: '진행 중',
  in_progress: '진행 중',
  planning: '기획',
  production: '제작',
  review: '검토',
  completed: '완료',
  archived: '보관',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#94A3B8',
  active: '#8B5CF6',
  in_progress: '#8B5CF6',
  planning: '#3B82F6',
  production: '#8B5CF6',
  review: '#F59E0B',
  completed: '#22C55E',
  archived: '#6B7280',
};

const COLORS = ['#8B5CF6', '#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#94A3B8'];

interface ProjectAnalyticsTabProps {
  period: string;
}

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
  color?: 'primary' | 'green' | 'blue' | 'orange';
}) {
  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    orange: 'bg-orange-100 text-orange-600',
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

export function ProjectAnalyticsTab({ period }: ProjectAnalyticsTabProps) {
  const [data, setData] = useState<ProjectAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/analytics/projects?period=${period}`);
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

  const statusChartData = data.projectsByStatus.map((item) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    fill: STATUS_COLORS[item.status] || '#8B5CF6',
  }));

  const completionRate =
    data.totalProjects > 0
      ? Math.round((data.completedProjects / data.totalProjects) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* 주요 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <EnhancedStatCard
          title="전체 프로젝트"
          value={data.totalProjects}
          prevValue={data.prevTotalProjects}
          icon={FolderOpen}
          color="primary"
        />
        <EnhancedStatCard
          title="진행 중"
          value={data.activeProjects}
          prevValue={data.prevActiveProjects}
          icon={Clock}
          color="blue"
        />
        <EnhancedStatCard
          title="완료"
          value={data.completedProjects}
          prevValue={data.prevCompletedProjects}
          icon={CheckCircle}
          color="green"
        />
        <EnhancedStatCard
          title="완료율"
          value={`${completionRate}%`}
          icon={TrendingUp}
          color="orange"
        />
        <EnhancedStatCard
          title="평균 피드백"
          value={data.avgFeedbacksPerProject}
          icon={MessageSquare}
          description="프로젝트당"
        />
        <EnhancedStatCard
          title="평균 멤버"
          value={data.avgMembersPerProject}
          icon={Users}
          description="프로젝트당"
        />
      </div>

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 프로젝트 생성 추이 (2칸) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">프로젝트 생성 추이</h3>
            <span className="text-xs text-gray-500">
              기간 내 신규: <span className="font-medium text-primary-600">{data.newProjectsThisPeriod}개</span>
            </span>
          </div>
          {data.projectsOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={data.projectsOverTime}>
                <defs>
                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => value.slice(5)}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  labelFormatter={(value) => `날짜: ${value}`}
                  formatter={(value: number, name: string) => [
                    `${value}개`,
                    name === 'count' ? '신규' : '누적',
                  ]}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#8B5CF6"
                  fill="url(#colorCumulative)"
                  strokeWidth={2}
                />
                <Bar yAxisId="left" dataKey="count" fill="#22C55E" radius={[2, 2, 0, 0]} />
              </ComposedChart>
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

      {/* 하단 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 활동 순위 Top 10 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-4">프로젝트 활동 순위 Top 10</h3>
          {data.topProjects.length > 0 ? (
            <div className="space-y-2">
              {data.topProjects.map((project, index) => (
                <div
                  key={project.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
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
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{project.title}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        {project.videoCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {project.feedbackCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {project.memberCount}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      project.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-primary-100 text-primary-700'
                    }`}
                  >
                    {STATUS_LABELS[project.status] || project.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">데이터가 없습니다</p>
          )}
        </div>

        {/* 최근 활동 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-4">최근 활동</h3>
          {data.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {data.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={activity.user?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {activity.user?.name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user?.name || '알 수 없음'}</span>
                      <span className="text-gray-600"> {activity.title}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">최근 활동이 없습니다</p>
          )}
        </div>
      </div>
    </div>
  );
}
