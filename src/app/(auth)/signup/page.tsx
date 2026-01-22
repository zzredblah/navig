'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SocialLoginButtons } from '@/components/auth';
import { signUpSchema, type SignUpInput } from '@/lib/validations/auth';

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpInput) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[Signup Form] 요청 전송:', { ...data, password: '***' });

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      console.log('[Signup Form] 응답 상태:', response.status);

      const result = await response.json();
      console.log('[Signup Form] 응답 데이터:', result);

      if (!response.ok) {
        const errorMessage = result.error || '회원가입에 실패했습니다';
        console.error('[Signup Form] 에러:', errorMessage);
        setError(errorMessage);
        return;
      }

      console.log('[Signup Form] 회원가입 성공, 이메일 인증 페이지로 이동...');
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (error) {
      console.error('[Signup Form] 예외 발생:', error);
      setError(`서버 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">회원가입</CardTitle>
        <CardDescription className="text-center">
          계정을 생성하여 NAVIG을 시작하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-md bg-error-50 border border-error-200 text-error-700 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              type="text"
              placeholder="홍길동"
              disabled={isLoading}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-error-500">{errors.name.message}</p>
            )}
          </div>
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
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="8자 이상 입력"
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
                가입 중...
              </>
            ) : (
              '회원가입'
            )}
          </Button>
        </form>

        <SocialLoginButtons disabled={isLoading} />
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-600">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-primary-600 hover:text-primary-500 font-medium">
            로그인
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
