'use client';

/**
 * 피드백 추이 라인 차트
 * 최근 14일간 피드백 생성 추이
 */

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface TrendData {
  date: string;
  total: number;
  resolved: number;
}

interface FeedbackTrendChartProps {
  data: TrendData[];
}

export function FeedbackTrendChart({ data }: FeedbackTrendChartProps) {
  // 날짜 포맷팅 (MM/DD)
  const formattedData = data.map((item) => ({
    ...item,
    displayDate: `${item.date.slice(5, 7)}/${item.date.slice(8, 10)}`,
  }));

  // 데이터가 모두 0인지 확인
  const hasData = data.some((d) => d.total > 0 || d.resolved > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-gray-500" />
            피드백 추이 (최근 14일)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">
            아직 피드백 데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-gray-500" />
          피드백 추이 (최근 14일)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedData}
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 10, fill: '#6B7280' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#6B7280' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#111827', fontWeight: 600 }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                iconSize={10}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="total"
                name="신규"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="resolved"
                name="해결"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
