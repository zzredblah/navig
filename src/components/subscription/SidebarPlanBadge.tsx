'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Crown, Zap, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SubscriptionWithPlan, UsageSummary } from '@/types/subscription';

interface PlanData {
  subscription: SubscriptionWithPlan | null;
  usage: UsageSummary;
}

export function SidebarPlanBadge() {
  const [data, setData] = useState<PlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/subscriptions/me');
      if (response.ok) {
        const json = await response.json();
        setData(json.data);
      }
    } catch (error) {
      console.error('구독 정보 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // 사용량 업데이트 이벤트 리스너
    const handleUsageUpdate = () => {
      fetchData();
    };

    window.addEventListener('usage-updated', handleUsageUpdate);

    return () => {
      window.removeEventListener('usage-updated', handleUsageUpdate);
    };
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="px-3 py-2">
        <div className="animate-pulse bg-gray-100 rounded-lg h-12" />
      </div>
    );
  }

  if (!data) return null;

  const planName = data.subscription?.plan?.display_name || 'Free';
  const isFreePlan = !data.subscription || data.subscription.plan?.name === 'free';
  const isPro = data.subscription?.plan?.name === 'pro';
  const isTeam = data.subscription?.plan?.name === 'team';

  // 가장 높은 사용률
  const maxUsagePercentage = Math.max(
    data.usage.projects_percentage,
    data.usage.storage_percentage
  );
  const isNearLimit = maxUsagePercentage >= 80;

  const getPlanIcon = () => {
    if (isTeam) return <Crown className="h-3.5 w-3.5" />;
    if (isPro) return <Zap className="h-3.5 w-3.5" />;
    return <Sparkles className="h-3.5 w-3.5" />;
  };

  const getPlanColors = () => {
    if (isTeam) return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
    if (isPro) return 'bg-gradient-to-r from-primary-500 to-purple-500 text-white';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="px-3 py-2">
      <Link
        href="/settings/subscription"
        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-6 h-6 rounded-md flex items-center justify-center shrink-0',
            getPlanColors()
          )}>
            {getPlanIcon()}
          </div>
          <span className="text-sm font-medium text-gray-900">{planName}</span>
          {maxUsagePercentage > 0 && (
            <span className={cn(
              'text-xs',
              isNearLimit ? 'text-orange-600' : 'text-gray-400'
            )}>
              {maxUsagePercentage}%
            </span>
          )}
        </div>

        {isFreePlan && isNearLimit ? (
          <span className="flex items-center gap-1 text-xs font-medium text-primary-600 group-hover:text-primary-700">
            <Zap className="h-3 w-3" />
            업그레이드
          </span>
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
        )}
      </Link>
    </div>
  );
}
