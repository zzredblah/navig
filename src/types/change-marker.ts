/**
 * 영상 변경 마커 타입 정의
 */

// 마커 유형
export type ChangeMarkerType = 'visual' | 'audio' | 'text' | 'effect' | 'other';

// 마커 유형별 색상 코드
export const MARKER_TYPE_COLORS: Record<ChangeMarkerType, string> = {
  visual: '#3B82F6', // 파랑
  audio: '#10B981', // 초록
  text: '#F59E0B', // 노랑
  effect: '#8B5CF6', // 보라
  other: '#6B7280', // 회색
};

// 마커 유형별 라벨
export const MARKER_TYPE_LABELS: Record<ChangeMarkerType, string> = {
  visual: '시각',
  audio: '오디오',
  text: '텍스트',
  effect: '효과',
  other: '기타',
};

// 변경 마커 DB 레코드
export interface ChangeMarker {
  id: string;
  version_id: string;
  compared_version_id: string | null;
  type: ChangeMarkerType;
  start_time: number; // 초 단위
  end_time: number;
  description: string | null;
  created_by: string;
  created_at: string;
}

// 변경 마커 with 작성자 정보
export interface ChangeMarkerWithCreator extends ChangeMarker {
  creator: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
}

// 마커 생성 요청
export interface CreateChangeMarkerRequest {
  type: ChangeMarkerType;
  start_time: number;
  end_time: number;
  description?: string;
  compared_version_id?: string;
}

// 마커 수정 요청
export interface UpdateChangeMarkerRequest {
  type?: ChangeMarkerType;
  start_time?: number;
  end_time?: number;
  description?: string;
}

// 마커 목록 응답
export interface ChangeMarkerListResponse {
  markers: ChangeMarkerWithCreator[];
}

/**
 * 시간(초)를 mm:ss 형식으로 변환
 */
export function formatMarkerTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 마커 길이를 초 단위로 계산
 */
export function getMarkerDuration(marker: ChangeMarker): number {
  return marker.end_time - marker.start_time;
}

/**
 * 마커 위치를 퍼센트로 계산
 */
export function getMarkerPosition(
  marker: ChangeMarker,
  totalDuration: number
): { left: number; width: number } {
  if (totalDuration <= 0) {
    return { left: 0, width: 0 };
  }
  const left = (marker.start_time / totalDuration) * 100;
  const width = ((marker.end_time - marker.start_time) / totalDuration) * 100;
  return { left, width };
}
