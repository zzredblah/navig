'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CreditCard } from 'lucide-react';
import { CurrentPlanCard } from '@/components/subscription/CurrentPlanCard';
import { UsageProgress } from '@/components/subscription/UsageProgress';
import { UsageDetailsCard } from '@/components/subscription/UsageDetailsCard';
import { PlanComparisonCard } from '@/components/subscription/PlanComparisonCard';
import { PaymentHistory } from '@/components/subscription/PaymentHistory';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import type {
  SubscriptionWithPlan,
  UsageSummary,
  PlanLimits,
} from '@/types/subscription';

interface SubscriptionData {
  subscription: SubscriptionWithPlan | null;
  usage: UsageSummary;
  limits: PlanLimits;
}

export default function SubscriptionSettingsPage() {
  const router = useRouter();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscriptions/me');
      if (response.ok) {
        const { data } = await response.json();
        setData(data);
      }
    } catch (error) {
      console.error('구독 정보 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = () => {
    router.push('/pricing');
  };

  const handleCancel = async () => {
    setIsCanceling(true);
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancel_immediately: false }),
      });

      if (response.ok) {
        const { message } = await response.json();
        alert(message);
        fetchSubscription();
      } else {
        const { error } = await response.json();
        alert(error || '구독 취소에 실패했습니다');
      }
    } catch (error) {
      console.error('구독 취소 실패:', error);
      alert('구독 취소에 실패했습니다');
    } finally {
      setIsCanceling(false);
      setShowCancelDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">구독 관리</h1>
          <p className="text-sm text-gray-500">플랜, 사용량, 결제 정보를 관리합니다</p>
        </div>
      </div>

      {/* 현재 플랜 요약 */}
      <CurrentPlanCard
        subscription={data?.subscription || null}
        onUpgrade={handleUpgrade}
        onCancel={() => setShowCancelDialog(true)}
      />

      {/* 탭 네비게이션 */}
      <Tabs defaultValue="usage" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="usage">사용량</TabsTrigger>
          <TabsTrigger value="plans">플랜 변경</TabsTrigger>
          <TabsTrigger value="billing">결제 내역</TabsTrigger>
        </TabsList>

        {/* 사용량 탭 */}
        <TabsContent value="usage" className="space-y-6 mt-6">
          {/* 사용량 요약 */}
          {data?.usage && <UsageProgress usage={data.usage} />}

          {/* 상세 사용량 */}
          <UsageDetailsCard />
        </TabsContent>

        {/* 플랜 변경 탭 */}
        <TabsContent value="plans" className="mt-6">
          <PlanComparisonCard currentSubscription={data?.subscription || null} />
        </TabsContent>

        {/* 결제 내역 탭 */}
        <TabsContent value="billing" className="mt-6">
          <PaymentHistory />
        </TabsContent>
      </Tabs>

      {/* 구독 취소 확인 다이얼로그 */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>구독을 취소하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              구독을 취소하면 현재 결제 기간이 끝날 때까지 서비스를 이용할 수 있습니다.
              이후에는 Free 플랜으로 전환됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCanceling}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCanceling}
              className="bg-red-600 hover:bg-red-700"
            >
              {isCanceling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  처리 중...
                </>
              ) : (
                '구독 취소'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
