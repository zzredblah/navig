'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { CreditCard, Loader2, ArrowLeft, CheckCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BillingCycle } from '@/types/subscription';

interface CheckoutData {
  order_id: string;
  order_name: string;
  amount: number;
  customer_key: string;
  customer_name: string;
  customer_email: string;
  success_url: string;
  fail_url: string;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tossLoaded, setTossLoaded] = useState(false);

  const planId = searchParams.get('plan_id');
  const billingCycle = (searchParams.get('billing_cycle') || 'monthly') as BillingCycle;

  useEffect(() => {
    async function initCheckout() {
      // URL 파라미터로 plan_id가 있으면 API 호출
      if (planId) {
        try {
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
            setError(error || '결제 정보 생성에 실패했습니다');
            return;
          }

          const { data } = await response.json();
          setCheckoutData(data);
          // 세션에도 저장 (새로고침 대비)
          sessionStorage.setItem('checkout_data', JSON.stringify(data));
        } catch (err) {
          console.error('결제 초기화 실패:', err);
          setError('결제 정보를 불러오는데 실패했습니다');
        }
      } else {
        // 세션에서 결제 정보 가져오기
        const data = sessionStorage.getItem('checkout_data');
        if (data) {
          setCheckoutData(JSON.parse(data));
        } else {
          setError('결제 정보가 없습니다');
        }
      }
      setIsLoading(false);
    }

    initCheckout();
  }, [planId, billingCycle]);

  const handlePayment = async () => {
    if (!checkoutData) return;

    setIsProcessing(true);

    // 토스페이먼츠 SDK가 있는 경우
    // @ts-expect-error - TossPayments SDK
    if (typeof window !== 'undefined' && window.TossPayments && tossLoaded) {
      try {
        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
        if (!clientKey) {
          throw new Error('토스 클라이언트 키가 설정되지 않았습니다');
        }

        // @ts-expect-error - TossPayments SDK
        const tossPayments = window.TossPayments(clientKey);

        await tossPayments.requestPayment('카드', {
          amount: checkoutData.amount,
          orderId: checkoutData.order_id,
          orderName: checkoutData.order_name,
          customerName: checkoutData.customer_name,
          customerEmail: checkoutData.customer_email,
          successUrl: checkoutData.success_url,
          failUrl: checkoutData.fail_url,
        });
      } catch (error) {
        console.error('결제 요청 실패:', error);
        setIsProcessing(false);
      }
    } else {
      // 테스트 모드 - 토스 SDK 없음
      // 바로 성공 페이지로 이동 (테스트용)
      const testPaymentKey = `test_${Date.now()}`;
      const successUrl = new URL(checkoutData.success_url);
      successUrl.searchParams.set('paymentKey', testPaymentKey);
      successUrl.searchParams.set('orderId', checkoutData.order_id);
      successUrl.searchParams.set('amount', checkoutData.amount.toString());

      sessionStorage.removeItem('checkout_data');
      router.push(successUrl.toString());
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">결제 오류</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push('/pricing')}>
            요금제 페이지로
          </Button>
        </div>
      </div>
    );
  }

  if (!checkoutData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  return (
    <>
      {/* 토스페이먼츠 SDK */}
      <Script
        src="https://js.tosspayments.com/v1/payment"
        onLoad={() => setTossLoaded(true)}
      />

      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              뒤로
            </Button>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-primary-600 to-purple-600 px-8 py-6 text-white">
              <h1 className="text-2xl font-bold">결제하기</h1>
              <p className="text-primary-100 mt-1">안전한 결제를 진행합니다</p>
            </div>

            {/* 주문 정보 */}
            <div className="p-8">
              <div className="space-y-6">
                {/* 상품 정보 */}
                <div>
                  <h2 className="text-sm font-medium text-gray-500 mb-3">주문 상품</h2>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                          <CreditCard className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {checkoutData.order_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {billingCycle === 'yearly' ? '연간 구독' : '월간 구독'}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-primary-100 text-primary-700">
                        구독
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* 결제 금액 */}
                <div>
                  <h2 className="text-sm font-medium text-gray-500 mb-3">결제 금액</h2>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">상품 금액</span>
                      <span className="text-lg font-semibold text-gray-900">
                        ₩{formatPrice(checkoutData.amount)}
                      </span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-green-600">연간 할인 적용</span>
                          <span className="text-green-600 font-medium">-20%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 총 결제 금액 */}
                <div className="bg-primary-50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">총 결제 금액</span>
                    <span className="text-2xl font-bold text-primary-600">
                      ₩{formatPrice(checkoutData.amount)}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className="text-sm text-gray-500 mt-1">
                      월 ₩{formatPrice(Math.round(checkoutData.amount / 12))} 상당
                    </p>
                  )}
                </div>

                {/* 결제자 정보 */}
                {checkoutData.customer_email && (
                  <div>
                    <h2 className="text-sm font-medium text-gray-500 mb-3">결제자 정보</h2>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      {checkoutData.customer_name && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">이름</span>
                          <span className="text-gray-900">{checkoutData.customer_name}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">이메일</span>
                        <span className="text-gray-900">{checkoutData.customer_email}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 혜택 */}
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800">구독 혜택</p>
                      <ul className="text-sm text-green-700 mt-1 space-y-1">
                        <li>• 즉시 플랜 업그레이드</li>
                        <li>• 언제든 구독 취소 가능</li>
                        <li>• 7일 이내 전액 환불 보장</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 결제 버튼 */}
              <div className="mt-8 space-y-3">
                <Button
                  className="w-full bg-primary-600 hover:bg-primary-700 h-14 text-lg"
                  onClick={handlePayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      결제 처리 중...
                    </>
                  ) : (
                    `₩${formatPrice(checkoutData.amount)} 결제하기`
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    sessionStorage.removeItem('checkout_data');
                    router.push('/settings/subscription');
                  }}
                  disabled={isProcessing}
                >
                  취소
                </Button>
              </div>

              {/* 안내 문구 */}
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                <Shield className="h-4 w-4" />
                <span>토스페이먼츠 보안 결제</span>
              </div>
              <p className="mt-2 text-xs text-gray-400 text-center">
                결제 진행 시 서비스 이용약관 및 개인정보 처리방침에 동의하는 것으로 간주됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
