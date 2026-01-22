'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleResendEmail = async () => {
    if (!email) return;

    setIsResending(true);
    setResendMessage(null);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        setResendMessage('인증 이메일을 다시 발송했습니다.');
      } else {
        setResendMessage(result.error || '이메일 발송에 실패했습니다.');
      }
    } catch {
      setResendMessage('서버 오류가 발생했습니다.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
          <Mail className="h-8 w-8 text-primary-600" />
        </div>
        <CardTitle className="text-2xl font-bold">이메일을 확인해주세요</CardTitle>
        <CardDescription>
          {email ? (
            <>
              <span className="font-medium text-gray-900">{email}</span>
              <br />
              위 이메일로 인증 링크를 발송했습니다.
            </>
          ) : (
            '가입하신 이메일로 인증 링크를 발송했습니다.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          <p className="mb-2 font-medium text-gray-900">다음 단계:</p>
          <ol className="list-inside list-decimal space-y-1">
            <li>이메일 받은편지함을 확인하세요</li>
            <li>NAVIG에서 보낸 인증 이메일을 찾아주세요</li>
            <li>이메일 내 인증 링크를 클릭하세요</li>
            <li>인증이 완료되면 로그인할 수 있습니다</li>
          </ol>
        </div>

        {resendMessage && (
          <div className={`rounded-md p-3 text-sm ${
            resendMessage.includes('실패') || resendMessage.includes('오류')
              ? 'bg-error-50 text-error-700 border border-error-200'
              : 'bg-success-50 text-success-700 border border-success-200'
          }`}>
            {resendMessage}
          </div>
        )}

        <div className="text-center text-sm text-gray-500">
          <p>이메일이 도착하지 않았나요?</p>
          <p>스팸 폴더를 확인하거나, 아래 버튼으로 재발송하세요.</p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        {email && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResendEmail}
            disabled={isResending}
          >
            {isResending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                발송 중...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                인증 이메일 다시 받기
              </>
            )}
          </Button>
        )}
        <Link href="/login" className="w-full">
          <Button variant="ghost" className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            로그인 페이지로 돌아가기
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

function VerifyEmailFallback() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 animate-pulse" />
        <div className="h-8 bg-gray-200 rounded w-48 mx-auto animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-64 mx-auto mt-2 animate-pulse" />
      </CardHeader>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
