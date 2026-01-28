'use client';

/**
 * 피드백 통계 카드 컴포넌트
 */

import {
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FeedbackStats {
  total: number;
  open: number;
  resolved: number;
  wontfix: number;
  urgent: number;
  urgentOpen: number;
  resolutionRate: number;
}

interface FeedbackStatsCardsProps {
  stats: FeedbackStats;
}

export function FeedbackStatsCards({ stats }: FeedbackStatsCardsProps) {
  const cards = [
    {
      label: '전체 피드백',
      value: stats.total,
      icon: MessageSquare,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
    {
      label: '미해결',
      value: stats.open,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      highlight: stats.open > 0,
    },
    {
      label: '해결됨',
      value: stats.resolved,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: '긴급',
      value: stats.urgentOpen,
      subValue: `/ ${stats.urgent}`,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      highlight: stats.urgentOpen > 0,
    },
    {
      label: '해결률',
      value: `${stats.resolutionRate}%`,
      icon: TrendingUp,
      color: stats.resolutionRate >= 70 ? 'text-green-600' : 'text-yellow-600',
      bgColor: stats.resolutionRate >= 70 ? 'bg-green-100' : 'bg-yellow-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.label}
            className={`${card.highlight ? 'ring-2 ring-offset-1 ring-primary-200' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg ${card.bgColor} ${card.color} flex items-center justify-center shrink-0`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900">
                    {card.value}
                    {card.subValue && (
                      <span className="text-sm font-normal text-gray-400">
                        {card.subValue}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
