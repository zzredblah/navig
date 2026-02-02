'use client';

import { useEffect, useState } from 'react';
import { Loader2, Users, UserCheck, Trophy, Star } from 'lucide-react';
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
} from 'recharts';
import { StatCard } from './StatCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface WorkerAnalyticsData {
  totalMembers: number;
  activeMembers: number;
  membersByRole: { role: string; count: number }[];
  topContributors: {
    userId: string;
    name: string;
    avatarUrl?: string;
    feedbacks: number;
    videos: number;
    total: number;
  }[];
  activityLeaderboard: {
    userId: string;
    name: string;
    avatarUrl?: string;
    feedbacksCreated: number;
    feedbacksResolved: number;
    videosUploaded: number;
    score: number;
  }[];
}

const ROLE_LABELS: Record<string, string> = {
  owner: '소유자',
  approver: '승인자',
  editor: '편집자',
  viewer: '뷰어',
};

const COLORS = ['#8B5CF6', '#22C55E', '#3B82F6', '#F59E0B', '#EF4444'];

interface WorkerAnalyticsTabProps {
  period: string;
}

export function WorkerAnalyticsTab({ period }: WorkerAnalyticsTabProps) {
  const [data, setData] = useState<WorkerAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/analytics/workers?period=${period}`);
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

  const roleChartData = data.membersByRole.map((item) => ({
    name: ROLE_LABELS[item.role] || item.role,
    value: item.count,
  }));

  const participationRate =
    data.totalMembers > 0
      ? Math.round((data.activeMembers / data.totalMembers) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="전체 멤버" value={data.totalMembers} icon={Users} />
        <StatCard
          title="활성 멤버"
          value={data.activeMembers}
          description="기간 내 활동"
          icon={UserCheck}
        />
        <StatCard
          title="참여율"
          value={`${participationRate}%`}
          description="활동 멤버 비율"
          icon={Trophy}
        />
        <StatCard
          title="총 기여"
          value={data.topContributors.reduce((sum, c) => sum + c.total, 0)}
          description="피드백 + 영상"
          icon={Star}
        />
      </div>

      {/* 차트 및 리더보드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 역할별 분포 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-4">역할별 분포</h3>
          {roleChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={roleChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {roleChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}명`, '']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              데이터가 없습니다
            </div>
          )}
        </div>

        {/* 기여자 Top 10 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            기여자 순위 Top 10
          </h3>
          {data.topContributors.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.topContributors.slice(0, 10)}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value}개`,
                    name === 'feedbacks' ? '피드백' : '영상',
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    value === 'feedbacks' ? '피드백' : '영상'
                  }
                />
                <Bar dataKey="feedbacks" fill="#8B5CF6" stackId="a" />
                <Bar dataKey="videos" fill="#22C55E" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              데이터가 없습니다
            </div>
          )}
        </div>
      </div>

      {/* 활동 리더보드 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          활동 리더보드
        </h3>
        {data.activityLeaderboard.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    순위
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    멤버
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    피드백 작성
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    피드백 해결
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    영상 업로드
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    점수
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.activityLeaderboard.map((member, index) => (
                  <tr key={member.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                          index === 0
                            ? 'bg-yellow-100 text-yellow-700'
                            : index === 1
                            ? 'bg-gray-100 text-gray-700'
                            : index === 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-50 text-gray-500'
                        }`}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {member.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-900">
                          {member.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {member.feedbacksCreated}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {member.feedbacksResolved}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {member.videosUploaded}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-primary-600">
                      {member.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-400 py-8">데이터가 없습니다</p>
        )}
      </div>
    </div>
  );
}
