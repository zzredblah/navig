'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Zap, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SubscriptionPlan, SubscriptionWithPlan, BillingCycle } from '@/types/subscription';

interface PlanComparisonCardProps {
  currentSubscription: SubscriptionWithPlan | null;
}

export function PlanComparisonCard({ currentSubscription }: PlanComparisonCardProps) {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('monthly');
  const [changingTo, setChangingTo] = useState<string | null>(null);

  const currentPlanName = currentSubscription?.plan?.name || 'free';

  useEffect(() => {
    async function fetchPlans() {
      try {
        const response = await fetch('/api/plans');
        if (response.ok) {
          const json = await response.json();
          // API 응답: { data: { plans: [...] } }
          setPlans(json.data?.plans || []);
        }
      } catch (error) {
        console.error('플랜 목록 조회 실패:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPlans();
  }, []);

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (plan.name === 'free') {
      // Free 플랜으로 변경 (다운그레이드)
      if (currentPlanName !== 'free') {
        // 구독 취소로 처리
        router.push('/settings/subscription');
      }
      return;
    }

    if (plan.name === currentPlanName) {
      // 같은 플랜
      return;
    }

    // 결제 페이지로 이동
    setChangingTo(plan.id);
    router.push(`/payments/checkout?plan_id=${plan.id}&billing_cycle=${selectedCycle}`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const getPlanIcon = (name: string) => {
    switch (name) {
      case 'team':
        return <Crown className="h-5 w-5" />;
      case 'pro':
        return <Zap className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  const getPlanColors = (name: string, isCurrent: boolean) => {
    if (isCurrent) {
      return 'border-primary-500 bg-primary-50/50';
    }
    switch (name) {
      case 'team':
        return 'border-amber-200 hover:border-amber-300';
      case 'pro':
        return 'border-primary-200 hover:border-primary-300';
      default:
        return 'border-gray-200 hover:border-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  const yearlyDiscount = 20; // 20% 할인

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">플랜 변경</h3>
          <p className="text-sm text-gray-500">필요에 맞는 플랜을 선택하세요</p>
        </div>

        {/* 결제 주기 토글 */}
        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setSelectedCycle('monthly')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              selectedCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            월간
          </button>
          <button
            onClick={() => setSelectedCycle('yearly')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1',
              selectedCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            연간
            <Badge className="bg-green-100 text-green-700 text-xs">
              -{yearlyDiscount}%
            </Badge>
          </button>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          플랜 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.
        </div>
      ) : (
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.name === currentPlanName;
          const price = selectedCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
          const monthlyPrice = selectedCycle === 'yearly'
            ? Math.round(plan.price_yearly / 12)
            : plan.price_monthly;

          return (
            <div
              key={plan.id}
              className={cn(
                'relative rounded-xl border-2 p-5 transition-all',
                getPlanColors(plan.name, isCurrent)
              )}
            >
              {isCurrent && (
                <Badge className="absolute -top-2.5 left-4 bg-primary-600">
                  현재 플랜
                </Badge>
              )}

              {plan.name === 'pro' && !isCurrent && (
                <Badge className="absolute -top-2.5 left-4 bg-gradient-to-r from-primary-600 to-purple-600">
                  추천
                </Badge>
              )}

              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center mb-4',
                plan.name === 'team' ? 'bg-amber-100 text-amber-600' :
                plan.name === 'pro' ? 'bg-primary-100 text-primary-600' :
                'bg-gray-100 text-gray-600'
              )}>
                {getPlanIcon(plan.name)}
              </div>

              <h4 className="text-lg font-semibold text-gray-900">
                {plan.display_name}
              </h4>

              <div className="mt-2 mb-4">
                <span className="text-2xl font-bold text-gray-900">
                  ₩{formatPrice(monthlyPrice)}
                </span>
                <span className="text-gray-500">/월</span>
                {selectedCycle === 'yearly' && plan.price_yearly > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    연 ₩{formatPrice(price)} 청구
                  </p>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {plan.description}
              </p>

              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-500" />
                  프로젝트 {plan.limits.max_projects === -1 ? '무제한' : `${plan.limits.max_projects}개`}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-500" />
                  스토리지 {plan.limits.max_storage_gb === -1 ? '무제한' : `${plan.limits.max_storage_gb}GB`}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-500" />
                  프로젝트당 멤버 {plan.limits.max_members_per_project === -1 ? '무제한' : `${plan.limits.max_members_per_project}명`}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-500" />
                  영상 크기 {plan.limits.max_video_size_mb === -1 ? '무제한' : `${plan.limits.max_video_size_mb}MB`}
                </li>
              </ul>

              <Button
                variant={isCurrent ? 'outline' : plan.name === 'pro' ? 'default' : 'outline'}
                className={cn(
                  'w-full',
                  plan.name === 'pro' && !isCurrent && 'bg-primary-600 hover:bg-primary-700'
                )}
                disabled={isCurrent || changingTo === plan.id}
                onClick={() => handleSelectPlan(plan)}
              >
                {changingTo === plan.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    처리 중...
                  </>
                ) : isCurrent ? (
                  '현재 플랜'
                ) : plan.name === 'free' ? (
                  '무료로 시작'
                ) : currentPlanName === 'free' ? (
                  '업그레이드'
                ) : (
                  '변경하기'
                )}
              </Button>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
