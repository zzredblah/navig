/**
 * next-intl 서버 사이드 설정
 *
 * 로케일 결정 우선순위:
 * 1. 쿠키 (NEXT_LOCALE)
 * 2. Accept-Language 헤더
 * 3. 기본값 (ko)
 */

import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { locales, defaultLocale, isValidLocale, type Locale } from './config';

export default getRequestConfig(async () => {
  // 1. 쿠키에서 언어 확인
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;

  // 2. Accept-Language 헤더 확인
  const headerStore = await headers();
  const acceptLanguage = headerStore.get('accept-language');
  const headerLocale = acceptLanguage?.split(',')[0]?.split('-')[0];

  // 3. 유효한 로케일 결정
  let locale: Locale = defaultLocale;

  if (cookieLocale && isValidLocale(cookieLocale)) {
    locale = cookieLocale;
  } else if (headerLocale && isValidLocale(headerLocale)) {
    locale = headerLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
