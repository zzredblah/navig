/**
 * Cloudflare Stream 클라이언트 라이브러리
 *
 * Cloudflare Stream API를 사용하여 영상을 관리합니다.
 *
 * 주요 기능:
 * - 영상 업로드 (Direct Creator Upload)
 * - 영상 조회/삭제
 * - 워터마크 프로필 관리
 * - 다운로드 URL 생성
 * - 썸네일 URL 생성
 *
 * 참고: https://developers.cloudflare.com/stream/
 */

// ============================================
// 타입 정의
// ============================================

export interface StreamVideo {
  uid: string;
  thumbnail: string;
  thumbnailTimestampPct: number;
  readyToStream: boolean;
  readyToStreamAt: string | null;
  status: {
    state: 'pendingupload' | 'uploading' | 'queued' | 'inprogress' | 'ready' | 'error';
    pctComplete?: string;
    errorReasonCode?: string;
    errorReasonText?: string;
  };
  meta: Record<string, string>;
  created: string;
  modified: string;
  scheduledDeletion: string | null;
  size: number;
  preview: string;
  allowedOrigins: string[];
  requireSignedURLs: boolean;
  uploaded: string;
  uploadExpiry: string | null;
  maxSizeBytes: number | null;
  maxDurationSeconds: number | null;
  duration: number;
  input: {
    width: number;
    height: number;
  };
  playback: {
    hls: string;
    dash: string;
  };
  watermark?: {
    uid: string;
    size: number;
    height: number;
    width: number;
    created: string;
    downloadedFrom: string;
    name: string;
    opacity: number;
    padding: number;
    scale: number;
    position: string;
  };
  clippedFrom?: string;
  publicDetails?: {
    title?: string;
    share_link?: string;
    channel_link?: string;
    logo?: string;
  };
}

export interface StreamWatermarkProfile {
  uid: string;
  size: number;
  height: number;
  width: number;
  created: string;
  downloadedFrom: string;
  name: string;
  opacity: number;
  padding: number;
  scale: number;
  position: string;
}

export interface DirectUploadResponse {
  uploadURL: string;
  uid: string;
}

export interface StreamUploadOptions {
  maxDurationSeconds?: number;
  expiry?: string; // ISO 8601 date string
  requireSignedURLs?: boolean;
  allowedOrigins?: string[];
  thumbnailTimestampPct?: number;
  watermark?: {
    uid: string;
  };
  meta?: Record<string, string>;
  scheduledDeletion?: string;
}

export type WatermarkPosition =
  | 'upperRight'
  | 'upperLeft'
  | 'lowerRight'
  | 'lowerLeft'
  | 'center';

export interface CreateWatermarkOptions {
  url: string; // 워터마크 이미지 URL (PNG/SVG)
  name: string;
  opacity?: number; // 0.0 - 1.0
  padding?: number; // % of video width
  scale?: number; // % of video width
  position?: WatermarkPosition;
}

// ============================================
// 환경 변수 및 설정
// ============================================

function getStreamConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error(
      'Cloudflare Stream 환경 변수가 설정되지 않았습니다. ' +
        'CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN을 확인하세요.'
    );
  }

  return { accountId, apiToken };
}

function getStreamBaseUrl(): string {
  const { accountId } = getStreamConfig();
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`;
}

function getHeaders(): HeadersInit {
  const { apiToken } = getStreamConfig();
  return {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };
}

// ============================================
// 영상 업로드
// ============================================

/**
 * Direct Creator Upload URL 생성
 *
 * 클라이언트가 직접 Stream에 업로드할 수 있는 URL을 생성합니다.
 * TUS 프로토콜을 사용하여 중단/재개가 가능합니다.
 *
 * @param options 업로드 옵션
 * @returns 업로드 URL과 영상 UID
 */
export async function createDirectUpload(
  options: StreamUploadOptions = {}
): Promise<DirectUploadResponse> {
  const baseUrl = getStreamBaseUrl();
  const headers = getHeaders();

  // 기본값 설정
  const body: Record<string, unknown> = {
    maxDurationSeconds: options.maxDurationSeconds || 7200, // 기본 2시간
    requireSignedURLs: options.requireSignedURLs ?? false,
  };

  // 만료 시간 (기본 1시간)
  if (options.expiry) {
    body.expiry = options.expiry;
  } else {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);
    body.expiry = expiry.toISOString();
  }

  // 워터마크 프로필
  if (options.watermark?.uid) {
    body.watermark = { uid: options.watermark.uid };
  }

  // 메타데이터 (프로젝트 ID, 업로더 ID 등)
  if (options.meta) {
    body.meta = options.meta;
  }

  // 허용된 도메인
  if (options.allowedOrigins && options.allowedOrigins.length > 0) {
    body.allowedOrigins = options.allowedOrigins;
  }

  // 썸네일 타임스탬프
  if (options.thumbnailTimestampPct !== undefined) {
    body.thumbnailTimestampPct = options.thumbnailTimestampPct;
  }

  // 예약 삭제
  if (options.scheduledDeletion) {
    body.scheduledDeletion = options.scheduledDeletion;
  }

  const response = await fetch(`${baseUrl}/direct_upload`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Stream 업로드 URL 생성 실패: ${error.errors?.[0]?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.result as DirectUploadResponse;
}

/**
 * 서버에서 URL로 영상 가져오기
 *
 * 외부 URL에서 영상을 가져와 Stream에 업로드합니다.
 * R2에 있는 영상을 Stream으로 마이그레이션할 때 사용합니다.
 */
export async function uploadFromUrl(
  url: string,
  options: StreamUploadOptions = {}
): Promise<StreamVideo> {
  const baseUrl = getStreamBaseUrl();
  const headers = getHeaders();

  const body: Record<string, unknown> = {
    url,
    ...options,
  };

  if (options.watermark?.uid) {
    body.watermark = { uid: options.watermark.uid };
  }

  const response = await fetch(`${baseUrl}/copy`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Stream URL 업로드 실패: ${error.errors?.[0]?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.result as StreamVideo;
}

// ============================================
// 영상 조회/관리
// ============================================

/**
 * 영상 정보 조회
 */
export async function getVideo(videoId: string): Promise<StreamVideo | null> {
  const baseUrl = getStreamBaseUrl();
  const headers = getHeaders();

  const response = await fetch(`${baseUrl}/${videoId}`, {
    method: 'GET',
    headers,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Stream 영상 조회 실패: ${error.errors?.[0]?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.result as StreamVideo;
}

/**
 * 영상 삭제
 */
export async function deleteVideo(videoId: string): Promise<void> {
  const baseUrl = getStreamBaseUrl();
  const headers = getHeaders();

  const response = await fetch(`${baseUrl}/${videoId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.json();
    throw new Error(
      `Stream 영상 삭제 실패: ${error.errors?.[0]?.message || response.statusText}`
    );
  }
}

/**
 * 영상 목록 조회
 */
export async function listVideos(options?: {
  status?: string;
  search?: string;
  limit?: number;
  after?: string;
}): Promise<{ videos: StreamVideo[]; total: number }> {
  const baseUrl = getStreamBaseUrl();
  const headers = getHeaders();

  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.search) params.set('search', options.search);
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.after) params.set('after', options.after);

  const response = await fetch(`${baseUrl}?${params.toString()}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Stream 영상 목록 조회 실패: ${error.errors?.[0]?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return {
    videos: data.result as StreamVideo[],
    total: data.result_info?.total_count || data.result.length,
  };
}

/**
 * 영상 메타데이터 업데이트
 */
export async function updateVideoMeta(
  videoId: string,
  meta: Record<string, string>
): Promise<StreamVideo> {
  const baseUrl = getStreamBaseUrl();
  const headers = getHeaders();

  const response = await fetch(`${baseUrl}/${videoId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ meta }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Stream 메타데이터 업데이트 실패: ${error.errors?.[0]?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.result as StreamVideo;
}

// ============================================
// 워터마크 관리
// ============================================

/**
 * 워터마크 프로필 생성
 *
 * 이미지 URL에서 워터마크 프로필을 생성합니다.
 * 생성된 프로필 UID는 영상 업로드 시 사용됩니다.
 */
export async function createWatermarkProfile(
  options: CreateWatermarkOptions
): Promise<StreamWatermarkProfile> {
  const baseUrl = getStreamBaseUrl();
  const headers = getHeaders();

  const body = {
    url: options.url,
    name: options.name,
    opacity: options.opacity ?? 0.5,
    padding: options.padding ?? 0.05, // 5%
    scale: options.scale ?? 0.1, // 10%
    position: options.position ?? 'lowerRight',
  };

  const response = await fetch(`${baseUrl}/watermarks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `워터마크 프로필 생성 실패: ${error.errors?.[0]?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.result as StreamWatermarkProfile;
}

/**
 * 워터마크 프로필 조회
 */
export async function getWatermarkProfile(
  profileId: string
): Promise<StreamWatermarkProfile | null> {
  const baseUrl = getStreamBaseUrl();
  const headers = getHeaders();

  const response = await fetch(`${baseUrl}/watermarks/${profileId}`, {
    method: 'GET',
    headers,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `워터마크 프로필 조회 실패: ${error.errors?.[0]?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.result as StreamWatermarkProfile;
}

/**
 * 워터마크 프로필 삭제
 */
export async function deleteWatermarkProfile(profileId: string): Promise<void> {
  const baseUrl = getStreamBaseUrl();
  const headers = getHeaders();

  const response = await fetch(`${baseUrl}/watermarks/${profileId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.json();
    throw new Error(
      `워터마크 프로필 삭제 실패: ${error.errors?.[0]?.message || response.statusText}`
    );
  }
}

/**
 * 워터마크 프로필 목록 조회
 */
export async function listWatermarkProfiles(): Promise<StreamWatermarkProfile[]> {
  const baseUrl = getStreamBaseUrl();
  const headers = getHeaders();

  const response = await fetch(`${baseUrl}/watermarks`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `워터마크 프로필 목록 조회 실패: ${error.errors?.[0]?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.result as StreamWatermarkProfile[];
}

// ============================================
// URL 생성 유틸리티
// ============================================

/**
 * HLS 스트리밍 URL 생성
 *
 * 적응형 비트레이트 스트리밍을 위한 HLS URL을 반환합니다.
 */
export function getHlsUrl(videoId: string): string {
  const { accountId } = getStreamConfig();
  return `https://customer-${getCustomerSubdomain()}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
}

/**
 * 대시 스트리밍 URL 생성
 */
export function getDashUrl(videoId: string): string {
  return `https://customer-${getCustomerSubdomain()}.cloudflarestream.com/${videoId}/manifest/video.mpd`;
}

/**
 * iframe 임베드 URL 생성
 */
export function getIframeUrl(videoId: string): string {
  return `https://customer-${getCustomerSubdomain()}.cloudflarestream.com/${videoId}/iframe`;
}

/**
 * 썸네일 URL 생성
 *
 * @param videoId 영상 ID
 * @param options 썸네일 옵션
 */
export function getThumbnailUrl(
  videoId: string,
  options?: {
    time?: string; // 타임스탬프 (예: "1s", "5m10s")
    height?: number;
    width?: number;
    fit?: 'crop' | 'clip' | 'scale' | 'fill';
  }
): string {
  const baseUrl = `https://customer-${getCustomerSubdomain()}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`;

  if (!options) return baseUrl;

  const params = new URLSearchParams();
  if (options.time) params.set('time', options.time);
  if (options.height) params.set('height', options.height.toString());
  if (options.width) params.set('width', options.width.toString());
  if (options.fit) params.set('fit', options.fit);

  return `${baseUrl}?${params.toString()}`;
}

/**
 * 애니메이션 썸네일(GIF) URL 생성
 */
export function getAnimatedThumbnailUrl(
  videoId: string,
  options?: {
    start?: string; // 시작 시간 (예: "5s")
    end?: string; // 끝 시간 (예: "10s")
    height?: number;
    width?: number;
    fps?: number;
  }
): string {
  const baseUrl = `https://customer-${getCustomerSubdomain()}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.gif`;

  if (!options) return baseUrl;

  const params = new URLSearchParams();
  if (options.start) params.set('start', options.start);
  if (options.end) params.set('end', options.end);
  if (options.height) params.set('height', options.height.toString());
  if (options.width) params.set('width', options.width.toString());
  if (options.fps) params.set('fps', options.fps.toString());

  return `${baseUrl}?${params.toString()}`;
}

/**
 * 다운로드 URL 직접 생성 (동기)
 *
 * Stream 다운로드 URL을 직접 생성합니다.
 * enableDownload()로 다운로드가 활성화된 후에 사용 가능합니다.
 */
export function getDownloadUrl(videoId: string): string {
  return `https://customer-${getCustomerSubdomain()}.cloudflarestream.com/${videoId}/downloads/default.mp4`;
}

/**
 * 다운로드 URL 조회 (API 호출)
 *
 * 워터마크가 포함된 영상의 다운로드 URL을 API로 조회합니다.
 * 다운로드가 준비되지 않았으면 null을 반환합니다.
 */
export async function fetchDownloadUrl(videoId: string): Promise<string | null> {
  const baseUrl = getStreamBaseUrl();
  const headers = getHeaders();

  // 다운로드 URL 조회
  const response = await fetch(`${baseUrl}/${videoId}/downloads`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    // 다운로드가 아직 준비되지 않았을 수 있음
    if (response.status === 404) {
      return null;
    }
    const error = await response.json();
    throw new Error(
      `다운로드 URL 조회 실패: ${error.errors?.[0]?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.result?.default?.url || null;
}

/**
 * 다운로드 활성화
 *
 * 영상에 대한 다운로드를 활성화합니다.
 */
export async function enableDownload(videoId: string): Promise<void> {
  const baseUrl = getStreamBaseUrl();
  const headers = getHeaders();

  const response = await fetch(`${baseUrl}/${videoId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      meta: { downloadable: 'true' },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `다운로드 활성화 실패: ${error.errors?.[0]?.message || response.statusText}`
    );
  }
}

// ============================================
// 내부 유틸리티
// ============================================

/**
 * Customer 서브도메인 가져오기
 * Stream URL에 사용되는 고유 서브도메인
 */
function getCustomerSubdomain(): string {
  const subdomain = process.env.CLOUDFLARE_STREAM_SUBDOMAIN;
  if (!subdomain) {
    throw new Error(
      'CLOUDFLARE_STREAM_SUBDOMAIN 환경 변수가 설정되지 않았습니다.'
    );
  }
  return subdomain;
}

/**
 * Stream 설정 확인
 */
export function isStreamConfigured(): boolean {
  return !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_STREAM_API_TOKEN &&
    process.env.CLOUDFLARE_STREAM_SUBDOMAIN
  );
}

// ============================================
// 위치 변환 유틸리티
// ============================================

/**
 * 내부 위치 형식을 Stream 위치 형식으로 변환
 */
export function toStreamPosition(
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
): WatermarkPosition {
  const positionMap: Record<string, WatermarkPosition> = {
    'top-left': 'upperLeft',
    'top-right': 'upperRight',
    'bottom-left': 'lowerLeft',
    'bottom-right': 'lowerRight',
    center: 'center',
  };
  return positionMap[position] || 'lowerRight';
}

/**
 * Stream 위치 형식을 내부 위치 형식으로 변환
 */
export function fromStreamPosition(
  position: WatermarkPosition
): 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' {
  const positionMap: Record<WatermarkPosition, string> = {
    upperLeft: 'top-left',
    upperRight: 'top-right',
    lowerLeft: 'bottom-left',
    lowerRight: 'bottom-right',
    center: 'center',
  };
  return positionMap[position] as
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'center';
}
