/**
 * i18n 설정
 *
 * 지원 언어: 한국어 (기본), 영어, 일본어
 */

export const locales = ['ko', 'en', 'ja'] as const;
export const defaultLocale = 'ko' as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
};

export const localeFlags: Record<Locale, string> = {
  ko: '🇰🇷',
  en: '🇺🇸',
  ja: '🇯🇵',
};

/**
 * 로케일이 유효한지 확인
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}
