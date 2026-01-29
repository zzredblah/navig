'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SubscriptionPlan, BillingCycle, PlanFeature } from '@/types/subscription';

interface PlanCardProps {
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  currentPlanName?: string;
  onSelect: (planId: string) => void;
  isLoading?: boolean;
}

const featureLabels: Record<PlanFeature, string> = {
  basic_feedback: '기본 피드백',
  basic_chat: '팀 채팅',
  priority_support: '우선 지원',
  advanced_analytics: '고급 분석',
  custom_branding: '커스텀 브랜딩',
  version_compare: '버전 비교',
  sso: 'SSO 로그인',
  audit_log: '감사 로그',
  dedicated_support: '전담 지원',
  api_access: 'API 접근',
};

const limitLabels: Record<string, (value: number) => string> = {
  max_projects: (v) => v === -1 ? '무제한 프로젝트' : `프로젝트 ${v}개`,
  max_storage_gb: (v) => v === -1 ? '무제한 스토리지' : `스토리지 ${v}GB`,
  max_members_per_project: (v) => v === -1 ? '무제한 멤버' : `프로젝트당 멤버 ${v}명`,
  max_video_size_mb: (v) => v === -1 ? '무제한 영상 크기' : `영상당 최대 ${v >= 1000 ? `${v / 1000}GB` : `${v}MB`}`,
  max_videos_per_project: (v) => v === -1 ? '무제한 영상' : `프로젝트당 영상 ${v}개`,
};

export function PlanCard({
  plan,
  billingCycle,
  currentPlanName,
  onSelect,
  isLoading,
}: PlanCardProps) {
  const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
  const monthlyPrice = billingCycle === 'yearly'
    ? Math.round(plan.price_yearly / 12)
    : plan.price_monthly;

  const isCurrentPlan = plan.name === currentPlanName;
  const isFree = plan.name === 'free';

  return (
    <div
      className={cn(
        'relative rounded-2xl border bg-white p-6 sm:p-8',
        plan.is_recommended
          ? 'border-2 border-primary-500 shadow-lg'
          : 'border-gray-200',
        isCurrentPlan && 'ring-2 ring-primary-100'
      )}
    >
      {/* 추천 배지 */}
      {plan.is_recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded-full">
          추천
        </div>
      )}

      {/* 현재 플랜 배지 */}
      {isCurrentPlan && (
        <div className="absolute -top-3 right-4 px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
          현재 플랜
        </div>
      )}

      {/* 플랜 이름 */}
      <div className="text-lg font-semibold text-gray-900">{plan.display_name}</div>

      {/* 가격 */}
      <div className="mt-4">
        <span className="text-4xl font-bold text-gray-900">
          {isFree ? '₩0' : `₩${monthlyPrice.toLocaleString()}`}
        </span>
        <span className="text-gray-500">/월</span>
      </div>

      {/* 연간 결제 할인 안내 */}
      {billingCycle === 'yearly' && !isFree && (
        <div className="mt-1 text-sm text-primary-600">
          연간 ₩{price.toLocaleString()} (2개월 무료)
        </div>
      )}

      {/* 설명 */}
      {plan.description && (
        <p className="mt-3 text-sm text-gray-500">{plan.description}</p>
      )}

      {/* 제한 목록 */}
      <ul className="mt-6 space-y-3">
        {Object.entries(plan.limits).map(([key, value]) => {
          const labelFn = limitLabels[key];
          if (!labelFn) return null;

          return (
            <li key={key} className="flex items-center gap-3 text-sm text-gray-600">
              <Check className="h-4 w-4 text-primary-500 shrink-0" />
              {labelFn(value)}
            </li>
          );
        })}
      </ul>

      {/* 기능 목록 */}
      <ul className="mt-4 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-3 text-sm text-gray-600">
            <Check className="h-4 w-4 text-primary-500 shrink-0" />
            {featureLabels[feature] || feature}
          </li>
        ))}
      </ul>

      {/* 버튼 */}
      <Button
        className={cn(
          'w-full mt-8',
          plan.is_recommended
            ? 'bg-primary-600 hover:bg-primary-700'
            : ''
        )}
        variant={plan.is_recommended ? 'default' : 'outline'}
        onClick={() => onSelect(plan.id)}
        disabled={isCurrentPlan || isLoading}
      >
        {isCurrentPlan
          ? '현재 플랜'
          : isFree
            ? 'Free로 시작'
            : '시작하기'}
      </Button>
    </div>
  );
}
