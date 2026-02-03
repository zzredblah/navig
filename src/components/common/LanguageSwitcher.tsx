'use client';

/**
 * 언어 전환 컴포넌트
 *
 * 헤더나 설정 페이지에서 사용
 * 쿠키 기반으로 언어 설정 저장
 *
 * Note: Radix UI DropdownMenu hydration 에러 방지를 위해 mounted 패턴 적용
 */

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  variant?: 'icon' | 'full';
  className?: string;
}

export function LanguageSwitcher({
  variant = 'icon',
  className,
}: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Hydration 에러 방지: 클라이언트에서만 DropdownMenu 렌더링
  useEffect(() => {
    setMounted(true);
  }, []);

  const changeLanguage = (newLocale: Locale) => {
    // 쿠키에 언어 설정 저장 (1년)
    Cookies.set('NEXT_LOCALE', newLocale, { expires: 365 });
    // 페이지 새로고침으로 언어 적용
    router.refresh();
  };

  // 서버 렌더링 시에는 단순 버튼만 표시
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size={variant === 'icon' ? 'icon' : 'sm'}
        className={cn(
          'text-gray-600 hover:text-gray-900',
          variant === 'full' && 'gap-2',
          className
        )}
      >
        {variant === 'icon' ? (
          <span className="text-base">{localeFlags[locale]}</span>
        ) : (
          <>
            <Globe className="h-4 w-4" />
            <span>{localeNames[locale]}</span>
          </>
        )}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={variant === 'icon' ? 'icon' : 'sm'}
          className={cn(
            'text-gray-600 hover:text-gray-900',
            variant === 'full' && 'gap-2',
            className
          )}
        >
          {variant === 'icon' ? (
            <span className="text-base">{localeFlags[locale]}</span>
          ) : (
            <>
              <Globe className="h-4 w-4" />
              <span>{localeNames[locale]}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => changeLanguage(loc)}
            className={cn(
              'cursor-pointer',
              locale === loc && 'bg-primary-50 text-primary-700'
            )}
          >
            <span className="mr-2">{localeFlags[loc]}</span>
            <span>{localeNames[loc]}</span>
            {locale === loc && (
              <span className="ml-auto text-primary-600">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
