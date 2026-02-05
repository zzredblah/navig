/**
 * 로깅 유틸리티
 *
 * 프로덕션 환경에서는 debug 로그가 출력되지 않습니다.
 * error 로그는 항상 출력됩니다.
 */

const isDev = process.env.NODE_ENV === 'development';

/**
 * 개발 환경에서만 출력되는 디버그 로그
 */
export function debug(context: string, ...args: unknown[]): void {
  if (isDev) {
    console.log(`[${context}]`, ...args);
  }
}

/**
 * 항상 출력되는 에러 로그
 */
export function error(context: string, ...args: unknown[]): void {
  console.error(`[${context}]`, ...args);
}

/**
 * 항상 출력되는 경고 로그
 */
export function warn(context: string, ...args: unknown[]): void {
  console.warn(`[${context}]`, ...args);
}

/**
 * 항상 출력되는 정보 로그
 */
export function info(context: string, ...args: unknown[]): void {
  console.info(`[${context}]`, ...args);
}

/**
 * 컨텍스트가 바인딩된 로거 생성
 *
 * @example
 * ```ts
 * const log = createLogger('Subtitles API');
 * log.debug('Processing video...'); // [Subtitles API] Processing video...
 * log.error('Failed:', error);
 * ```
 */
export function createLogger(context: string) {
  return {
    debug: (...args: unknown[]) => debug(context, ...args),
    error: (...args: unknown[]) => error(context, ...args),
    warn: (...args: unknown[]) => warn(context, ...args),
    info: (...args: unknown[]) => info(context, ...args),
  };
}

export default { debug, error, warn, info, createLogger };
