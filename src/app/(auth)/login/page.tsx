'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SocialLoginButtons } from '@/components/auth';
import { signInSchema, type SignInInput } from '@/lib/validations/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const authError = searchParams.get('error');
  const verified = searchParams.get('verified');
  const registered = searchParams.get('registered');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || '로그인에 실패했습니다');
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">로그인</CardTitle>
        <CardDescription className="text-center">
          이메일과 비밀번호를 입력해주세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(verified || registered) && (
          <div className="mb-4 p-3 rounded-md bg-success-50 border border-success-200 text-success-700 text-sm">
            {verified
              ? '이메일 인증이 완료되었습니다. 로그인해주세요.'
              : '회원가입이 완료되었습니다. 로그인해주세요.'}
          </div>
        )}
        {(error || authError) && (
          <div className="mb-4 p-3 rounded-md bg-error-50 border border-error-200 text-error-700 text-sm">
            {error || (authError === 'auth' ? '인증에 실패했습니다' : authError)}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              disabled={isLoading}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-error-500">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">비밀번호</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                비밀번호 찾기
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="********"
              disabled={isLoading}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-error-500">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                로그인 중...
              </>
            ) : (
              '로그인'
            )}
          </Button>
        </form>

        <SocialLoginButtons redirectTo={redirectTo} disabled={isLoading} />
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-600">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="text-primary-600 hover:text-primary-500 font-medium">
            회원가입
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

function LoginFormFallback() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">로그인</CardTitle>
        <CardDescription className="text-center">
          이메일과 비밀번호를 입력해주세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 animate-pulse">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-16" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
