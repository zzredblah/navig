/**
 * 시간 포맷 유틸리티
 * 영상 타임라인, 자막 등에서 사용
 */

/**
 * 초를 mm:ss 또는 mm:ss.cc 포맷으로 변환
 * @param seconds 초 단위 시간
 * @param showMilliseconds 밀리초 표시 여부
 * @returns 포맷된 문자열 (예: "1:05" 또는 "1:05.50")
 */
export function formatTime(seconds: number, showMilliseconds = false): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  if (showMilliseconds) {
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 초를 입력 폼용 포맷으로 변환 (mm:ss.cc)
 * @param seconds 초 단위 시간
 * @returns 포맷된 문자열 (예: "1:05.50")
 */
export function formatTimeForInput(seconds: number): string {
  return formatTime(seconds, true);
}

/**
 * mm:ss.cc 또는 mm:ss 문자열을 초 단위로 파싱
 * @param timeStr 시간 문자열 (예: "1:05.50" 또는 "1:05")
 * @returns 초 단위 숫자 (예: 65.5)
 */
export function parseTimeInput(timeStr: string): number {
  // mm:ss.cc 포맷
  const fullMatch = timeStr.match(/^(\d+):(\d{2})\.(\d{2})$/);
  if (fullMatch) {
    const [, mins, secs, ms] = fullMatch;
    return parseInt(mins, 10) * 60 + parseInt(secs, 10) + parseInt(ms, 10) / 100;
  }

  // mm:ss 포맷
  const shortMatch = timeStr.match(/^(\d+):(\d{2})$/);
  if (shortMatch) {
    const [, mins, secs] = shortMatch;
    return parseInt(mins, 10) * 60 + parseInt(secs, 10);
  }

  // 파싱 실패 시 0 반환
  return 0;
}

/**
 * 초를 HH:MM:SS 포맷으로 변환 (1시간 이상 영상용)
 * @param seconds 초 단위 시간
 * @returns 포맷된 문자열 (예: "1:05:30" 또는 "5:30")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 시간 문자열 유효성 검사 (mm:ss.cc 포맷)
 * @param timeStr 검사할 문자열
 * @returns 유효 여부
 */
export function isValidTimeFormat(timeStr: string): boolean {
  return /^(\d+):(\d{2})(\.(\d{2}))?$/.test(timeStr);
}
