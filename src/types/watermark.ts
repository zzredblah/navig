/**
 * 워터마크 설정 타입
 */

export type WatermarkType = 'logo' | 'text' | 'timecode' | 'combined';

export type WatermarkPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center';

export interface WatermarkSettings {
  enabled: boolean;
  type: WatermarkType;
  position: WatermarkPosition;
  opacity: number; // 0-1
  text?: string;
  logo_url?: string;
  show_timecode: boolean;
}

// 기본 워터마크 설정
export const DEFAULT_WATERMARK_SETTINGS: WatermarkSettings = {
  enabled: false,
  type: 'text',
  position: 'bottom-right',
  opacity: 0.5,
  text: 'NAVIG Corp',
  show_timecode: false,
};

// 워터마크 위치 옵션
export const WATERMARK_POSITION_OPTIONS: {
  value: WatermarkPosition;
  label: string;
}[] = [
  { value: 'top-left', label: '좌측 상단' },
  { value: 'top-right', label: '우측 상단' },
  { value: 'center', label: '중앙' },
  { value: 'bottom-left', label: '좌측 하단' },
  { value: 'bottom-right', label: '우측 하단' },
];

// 워터마크 타입 옵션
export const WATERMARK_TYPE_OPTIONS: {
  value: WatermarkType;
  label: string;
  description: string;
}[] = [
  { value: 'text', label: '텍스트', description: '텍스트 워터마크만 표시' },
  { value: 'timecode', label: '타임코드', description: '현재 재생 시간만 표시' },
  { value: 'combined', label: '텍스트 + 타임코드', description: '텍스트와 타임코드 함께 표시' },
  { value: 'logo', label: '로고', description: '로고 이미지만 표시' },
];
