'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SocialLoginButtonsProps {
  redirectTo?: string;
  disabled?: boolean;
}

export function SocialLoginButtons({ redirectTo = '/dashboard', disabled = false }: SocialLoginButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleOAuthLogin = async (provider: 'google' | 'kakao') => {
    setLoadingProvider(provider);

    try {
      const response = await fetch('/api/auth/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, redirectTo }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[OAuth] 에러:', result.error);
        return;
      }

      // Supabase OAuth URL로 리다이렉트
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('[OAuth] 오류:', error);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">또는</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuthLogin('google')}
          disabled={disabled || loadingProvider !== null}
          className="w-full"
        >
          {loadingProvider === 'google' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          Google
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuthLogin('kakao')}
          disabled={disabled || loadingProvider !== null}
          className="w-full bg-[#FEE500] hover:bg-[#FDD835] border-[#FEE500] hover:border-[#FDD835] text-[#191919]"
        >
          {loadingProvider === 'kakao' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3zm5.907 8.06l1.47-1.424a.472.472 0 0 0-.656-.678l-1.928 1.866V9.282a.472.472 0 0 0-.944 0v2.557a.471.471 0 0 0 0 .222V13.5a.472.472 0 0 0 .944 0v-1.363l.427-.413 1.428 2.033a.472.472 0 1 0 .773-.543l-1.514-2.155zm-2.958 1.924h-1.46V9.297a.472.472 0 0 0-.943 0v4.159c0 .26.21.472.471.472h1.932a.472.472 0 1 0 0-.944zm-5.857-1.092l.696-1.707.638 1.707H9.092zm2.523.488l.002-.016a.469.469 0 0 0-.127-.32l-1.545-4.287a.59.59 0 0 0-.559-.393.59.59 0 0 0-.559.393l-1.545 4.287a.469.469 0 0 0 .42.605c.154 0 .296-.08.379-.21l.345-.848h2.027l.345.848a.472.472 0 0 0 .817.125l-.002.016zM6.6 13.5a.472.472 0 0 1-.472-.472V9.511l-1.2.005a.472.472 0 1 1 0-.944l3.358-.012a.472.472 0 0 1 0 .944l-1.214.004v3.52a.472.472 0 0 1-.472.472z" />
            </svg>
          )}
          카카오
        </Button>
      </div>
    </div>
  );
}
