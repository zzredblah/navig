/**
 * Google Drive API 클라이언트
 *
 * Google Drive와의 연동을 위한 유틸리티 함수들
 */

import { google, drive_v3 } from 'googleapis';

// 환경 변수 체크
export function isGoogleDriveConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.NEXT_PUBLIC_APP_URL
  );
}

// OAuth2 클라이언트 생성
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-drive/callback`
  );
}

// 인증 URL 생성
export function getAuthUrl(state?: string): string {
  const oauth2Client = createOAuth2Client();

  const scopes = [
    'https://www.googleapis.com/auth/drive.file', // 앱이 생성한 파일만
    'https://www.googleapis.com/auth/drive.readonly', // 읽기 전용 접근
    'https://www.googleapis.com/auth/userinfo.email', // 이메일 정보
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // refresh_token 받기 위해
    scope: scopes,
    prompt: 'consent', // 항상 동의 화면 표시 (refresh_token 받기 위해)
    state,
  });
}

// 인증 코드로 토큰 교환
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);

  // 사용자 정보 조회
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data: userInfo } = await oauth2.userinfo.get();

  return {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token || undefined,
    expiresAt: tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : undefined,
    userId: userInfo.id || undefined,
    email: userInfo.email || undefined,
  };
}

// 토큰 갱신
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  return {
    accessToken: credentials.access_token!,
    expiresAt: credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : undefined,
  };
}

// Google Drive 클라이언트 생성
export function createDriveClient(accessToken: string): drive_v3.Drive {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Google Drive 파일 타입
export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  iconLink?: string;
  modifiedTime?: string;
  isFolder: boolean;
}

// 파일 목록 조회
export async function listFiles(
  accessToken: string,
  folderId?: string,
  pageToken?: string
): Promise<{ files: GoogleDriveFile[]; nextPageToken?: string }> {
  const drive = createDriveClient(accessToken);

  // 쿼리 조건
  let query = 'trashed = false';
  if (folderId) {
    query = `'${folderId}' in parents and trashed = false`;
  }

  const response = await drive.files.list({
    q: query,
    fields:
      'nextPageToken, files(id, name, mimeType, size, thumbnailLink, webViewLink, iconLink, modifiedTime)',
    pageSize: 50,
    pageToken: pageToken || undefined,
    orderBy: 'folder,modifiedTime desc',
  });

  const files: GoogleDriveFile[] = (response.data.files || []).map((file) => ({
    id: file.id!,
    name: file.name!,
    mimeType: file.mimeType!,
    size: file.size || undefined,
    thumbnailLink: file.thumbnailLink || undefined,
    webViewLink: file.webViewLink || undefined,
    iconLink: file.iconLink || undefined,
    modifiedTime: file.modifiedTime || undefined,
    isFolder: file.mimeType === 'application/vnd.google-apps.folder',
  }));

  return {
    files,
    nextPageToken: response.data.nextPageToken || undefined,
  };
}

// 파일 메타데이터 조회
export async function getFileMetadata(accessToken: string, fileId: string) {
  const drive = createDriveClient(accessToken);

  const { data } = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size, webViewLink',
  });

  return {
    id: data.id!,
    name: data.name!,
    mimeType: data.mimeType!,
    size: data.size ? parseInt(data.size, 10) : undefined,
    webViewLink: data.webViewLink || undefined,
  };
}

// 파일 다운로드 스트림 가져오기
export async function downloadFile(accessToken: string, fileId: string) {
  const drive = createDriveClient(accessToken);

  const response = await drive.files.get(
    {
      fileId,
      alt: 'media',
    },
    { responseType: 'stream' }
  );

  return response.data;
}

// 파일 업로드 (내보내기)
export async function uploadFile(
  accessToken: string,
  name: string,
  mimeType: string,
  body: Buffer | NodeJS.ReadableStream,
  folderId?: string
) {
  const drive = createDriveClient(accessToken);

  const { data } = await drive.files.create({
    requestBody: {
      name,
      parents: folderId ? [folderId] : undefined,
    },
    media: {
      mimeType,
      body,
    },
    fields: 'id, webViewLink',
  });

  return {
    fileId: data.id!,
    webViewLink: data.webViewLink || undefined,
  };
}

// 지원되는 비디오 MIME 타입
export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
];

// 지원되는 문서 MIME 타입
export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
];

// 파일이 비디오인지 확인
export function isVideoFile(mimeType: string): boolean {
  return SUPPORTED_VIDEO_TYPES.includes(mimeType);
}

// 파일이 문서인지 확인
export function isDocumentFile(mimeType: string): boolean {
  return SUPPORTED_DOCUMENT_TYPES.includes(mimeType);
}

// 파일 크기 포맷팅
export function formatFileSize(bytes?: string | number): string {
  if (!bytes) return '';

  const size = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
