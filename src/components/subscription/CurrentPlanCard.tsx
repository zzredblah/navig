'use client';

import { Calendar, CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SubscriptionWithPlan } from '@/types/subscription';

interface CurrentPlanCardProps {
  subscription: SubscriptionWithPlan | null;
  onUpgrade: () => void;
  onCancel: () => void;
}

export function CurrentPlanCard({
  subscription,
  onUpgrade,
  onCancel,
}: CurrentPlanCardProps) {
  const plan = subscription?.plan;
  const isFreePlan = !subscription || plan?.name === 'free';

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = () => {
    if (!subscription) return null;

    switch (subscription.status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">활성</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-700">체험 중</Badge>;
      case 'canceled':
        return <Badge className="bg-gray-100 text-gray-600">취소됨</Badge>;
      case 'past_due':
        return <Badge className="bg-red-100 text-red-700">결제 실패</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {plan?.display_name || 'Free'} 플랜
            </h3>
            {getStatusBadge()}
          </div>

          {isFreePlan ? (
            <p className="mt-1 text-sm text-gray-500">
              무료 플랜을 사용 중입니다
            </p>
          ) : (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>
                  {subscription.billing_cycle === 'yearly' ? '연간' : '월간'} 결제
                </span>
              </div>

              {subscription.current_period_end && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CreditCard className="h-4 w-4" />
                  <span>
                    다음 결제일: {formatDate(subscription.current_period_end)}
                  </span>
                </div>
              )}

              {subscription.cancel_at_period_end && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    {formatDate(subscription.current_period_end)}에 취소 예정
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onUpgrade}>
            {isFreePlan ? '업그레이드' : '플랜 정보'}
          </Button>
          {!isFreePlan && subscription?.status === 'active' && !subscription.cancel_at_period_end && (
            <Button variant="ghost" className="text-gray-500" onClick={onCancel}>
              구독 취소
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
