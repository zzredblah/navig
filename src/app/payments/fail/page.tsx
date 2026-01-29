'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function PaymentFailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const errorCode = searchParams.get('code');
  const errorMessage = searchParams.get('message') || '결제 처리 중 오류가 발생했습니다';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <XCircle className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          결제에 실패했습니다
        </h1>
        <p className="text-gray-600 mb-2">{errorMessage}</p>
        {errorCode && (
          <p className="text-sm text-gray-400 mb-6">오류 코드: {errorCode}</p>
        )}

        <div className="space-y-3">
          <Button
            className="w-full bg-primary-600 hover:bg-primary-700"
            onClick={() => router.push('/pricing')}
          >
            다시 시도
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/dashboard')}
          >
            대시보드로 이동
          </Button>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          문제가 계속되면{' '}
          <a href="mailto:support@navig.io" className="text-primary-600 hover:underline">
            고객센터
          </a>
          로 문의해주세요.
        </p>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mb-4" />
        </div>
      }
    >
      <PaymentFailContent />
    </Suspense>
  );
}
