'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { PlanCard } from '@/components/pricing/PlanCard';
import { Button } from '@/components/ui/button';
import type { SubscriptionPlan, BillingCycle } from '@/types/subscription';

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlanName, setCurrentPlanName] = useState<string | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 플랜 목록 조회
      const plansRes = await fetch('/api/plans');
      if (plansRes.ok) {
        const { data } = await plansRes.json();
        setPlans(data.plans);
      }

      // 현재 구독 조회 (로그인된 경우)
      const subRes = await fetch('/api/subscriptions/me');
      if (subRes.ok) {
        const { data } = await subRes.json();
        if (data.subscription?.plan) {
          setCurrentPlanName(data.subscription.plan.name);
        }
      }
    } catch (error) {
      console.error('데이터 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    // Free 플랜 선택
    if (plan.name === 'free') {
      router.push('/dashboard');
      return;
    }

    setIsProcessing(true);

    try {
      // 결제 요청
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          billing_cycle: billingCycle,
          success_url: `${window.location.origin}/payments/success`,
          fail_url: `${window.location.origin}/payments/fail`,
        }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        alert(error || '결제 요청에 실패했습니다');
        return;
      }

      const { data } = await response.json();

      // 토스페이먼츠 결제창 열기 (토스 SDK 필요)
      // 여기서는 결제 정보를 세션에 저장하고 결제 페이지로 이동
      sessionStorage.setItem('checkout_data', JSON.stringify(data));
      router.push('/payments/checkout');
    } catch (error) {
      console.error('결제 요청 실패:', error);
      alert('결제 요청에 실패했습니다');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50">
      {/* 헤더 */}
      <header className="py-6 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            &larr; 뒤로
          </button>
        </div>
      </header>

      {/* 메인 */}
      <main className="max-w-7xl mx-auto px-4 py-12 sm:py-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            NAVIG 요금제
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            프로젝트 규모에 맞는 플랜을 선택하세요.
            언제든지 업그레이드하거나 다운그레이드할 수 있습니다.
          </p>
        </div>

        {/* 빌링 주기 토글 */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center rounded-full bg-gray-100 p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              월간 결제
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              연간 결제
              <span className="ml-1 text-primary-600">-16%</span>
            </button>
          </div>
        </div>

        {/* 플랜 카드 */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              billingCycle={billingCycle}
              currentPlanName={currentPlanName}
              onSelect={handleSelectPlan}
              isLoading={isProcessing}
            />
          ))}
        </div>

        {/* FAQ 또는 추가 정보 */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm">
            질문이 있으신가요?{' '}
            <a href="mailto:support@navig.io" className="text-primary-600 hover:underline">
              support@navig.io
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
