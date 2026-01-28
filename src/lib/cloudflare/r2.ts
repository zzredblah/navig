/**
 * Cloudflare R2 클라이언트 라이브러리
 *
 * Supabase Storage 대신 Cloudflare R2를 사용하여 파일을 관리합니다.
 * S3 호환 API를 사용하므로 AWS SDK v3를 활용합니다.
 *
 * 주요 기능:
 * - 단일 파일 업로드 (10MB 미만)
 * - 멀티파트 업로드 (10MB 이상, 최대 2GB)
 * - 파일 삭제
 * - Presigned URL 생성 (클라이언트 직접 업로드용)
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  type CompletedPart,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 버킷 타입
export type R2Bucket = 'avatars' | 'videos' | 'src';

// 버킷 설정 (이름 + 퍼블릭 URL)
// - avatars: 사용자 아바타 전용
// - videos: 영상 파일 전용
// - src: 기타 모든 파일 (썸네일, 채팅 첨부파일, 문서 등)
const BUCKET_CONFIG: Record<R2Bucket, { name: string; publicUrl: string }> = {
  avatars: {
    name: process.env.R2_BUCKET_AVATARS || 'navig-avatars',
    publicUrl: process.env.R2_PUBLIC_URL_AVATARS || '',
  },
  videos: {
    name: process.env.R2_BUCKET_VIDEOS || 'navig-videos',
    publicUrl: process.env.R2_PUBLIC_URL_VIDEOS || '',
  },
  src: {
    name: process.env.R2_BUCKET_SRC || 'navig-src',
    publicUrl: process.env.R2_PUBLIC_URL_SRC || '',
  },
};

// R2 클라이언트 생성 (싱글톤)
let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (r2Client) return r2Client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2 환경 변수가 설정되지 않았습니다. ' +
        'R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY를 확인하세요.'
    );
  }

  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return r2Client;
}

/**
 * R2 퍼블릭 URL 생성
 * CDN을 통해 파일에 접근할 수 있는 URL을 반환합니다.
 */
export function getPublicUrl(bucket: R2Bucket, key: string): string {
  const config = BUCKET_CONFIG[bucket];
  if (!config.publicUrl) {
    throw new Error(
      `R2_PUBLIC_URL_${bucket.toUpperCase()} 환경 변수가 설정되지 않았습니다.`
    );
  }

  // 버킷별 퍼블릭 URL 사용
  // 예: https://pub-xxx.r2.dev/user-id/avatar.jpg
  return `${config.publicUrl}/${key}`;
}

/**
 * 단일 파일 업로드 (10MB 미만)
 * 서버에서 직접 파일을 R2에 업로드합니다.
 */
export async function uploadFile(
  bucket: R2Bucket,
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<{ url: string; key: string }> {
  const client = getR2Client();
  const bucketName = BUCKET_CONFIG[bucket].name;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await client.send(command);

  return {
    url: getPublicUrl(bucket, key),
    key,
  };
}

/**
 * 파일 삭제
 */
export async function deleteFile(bucket: R2Bucket, key: string): Promise<void> {
  const client = getR2Client();
  const bucketName = BUCKET_CONFIG[bucket].name;

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await client.send(command);
}

/**
 * Presigned URL 생성 (업로드용)
 * 클라이언트가 직접 R2에 업로드할 수 있는 서명된 URL을 생성합니다.
 */
export async function createPresignedUploadUrl(
  bucket: R2Bucket,
  key: string,
  contentType: string,
  expiresIn: number = 3600 // 기본 1시간
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const client = getR2Client();
  const bucketName = BUCKET_CONFIG[bucket].name;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  return {
    uploadUrl,
    publicUrl: getPublicUrl(bucket, key),
    key,
  };
}

// ============================================
// 멀티파트 업로드 (대용량 파일, 10MB 이상)
// ============================================

export interface MultipartUploadInit {
  uploadId: string;
  key: string;
  bucket: R2Bucket;
}

export interface UploadPartResult {
  partNumber: number;
  etag: string;
}

/**
 * 멀티파트 업로드 시작
 * 대용량 파일을 여러 파트로 나누어 업로드할 때 사용합니다.
 */
export async function initiateMultipartUpload(
  bucket: R2Bucket,
  key: string,
  contentType: string
): Promise<MultipartUploadInit> {
  const client = getR2Client();
  const bucketName = BUCKET_CONFIG[bucket].name;

  const command = new CreateMultipartUploadCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const response = await client.send(command);

  if (!response.UploadId) {
    throw new Error('멀티파트 업로드 ID를 받지 못했습니다.');
  }

  return {
    uploadId: response.UploadId,
    key,
    bucket,
  };
}

/**
 * 멀티파트 업로드용 Presigned URL 생성
 * 클라이언트가 각 파트를 직접 업로드할 수 있는 URL을 생성합니다.
 */
export async function createPresignedPartUrl(
  bucket: R2Bucket,
  key: string,
  uploadId: string,
  partNumber: number,
  expiresIn: number = 3600
): Promise<string> {
  const client = getR2Client();
  const bucketName = BUCKET_CONFIG[bucket].name;

  const command = new UploadPartCommand({
    Bucket: bucketName,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * 서버에서 직접 파트 업로드
 */
export async function uploadPart(
  bucket: R2Bucket,
  key: string,
  uploadId: string,
  partNumber: number,
  body: Buffer | Uint8Array
): Promise<UploadPartResult> {
  const client = getR2Client();
  const bucketName = BUCKET_CONFIG[bucket].name;

  const command = new UploadPartCommand({
    Bucket: bucketName,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
    Body: body,
  });

  const response = await client.send(command);

  if (!response.ETag) {
    throw new Error('파트 업로드 ETag를 받지 못했습니다.');
  }

  return {
    partNumber,
    etag: response.ETag,
  };
}

/**
 * 멀티파트 업로드 완료
 * 모든 파트 업로드 후 호출하여 파일을 조합합니다.
 */
export async function completeMultipartUpload(
  bucket: R2Bucket,
  key: string,
  uploadId: string,
  parts: UploadPartResult[]
): Promise<{ url: string; key: string }> {
  const client = getR2Client();
  const bucketName = BUCKET_CONFIG[bucket].name;

  // 파트 번호 순으로 정렬
  const sortedParts: CompletedPart[] = parts
    .sort((a, b) => a.partNumber - b.partNumber)
    .map((part) => ({
      PartNumber: part.partNumber,
      ETag: part.etag,
    }));

  const command = new CompleteMultipartUploadCommand({
    Bucket: bucketName,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: sortedParts,
    },
  });

  await client.send(command);

  return {
    url: getPublicUrl(bucket, key),
    key,
  };
}

/**
 * 멀티파트 업로드 취소
 * 업로드 실패 시 업로드된 파트를 정리합니다.
 */
export async function abortMultipartUpload(
  bucket: R2Bucket,
  key: string,
  uploadId: string
): Promise<void> {
  const client = getR2Client();
  const bucketName = BUCKET_CONFIG[bucket].name;

  const command = new AbortMultipartUploadCommand({
    Bucket: bucketName,
    Key: key,
    UploadId: uploadId,
  });

  await client.send(command);
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 파일 확장자로 Content-Type 추론
 */
export function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  const contentTypes: Record<string, string> = {
    // 이미지
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',

    // 영상
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',

    // 문서
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };

  return contentTypes[ext || ''] || 'application/octet-stream';
}

/**
 * 고유한 파일 키 생성
 */
export function generateFileKey(
  folder: string,
  filename: string,
  userId?: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const safeName = filename
    .replace(/\.[^/.]+$/, '') // 확장자 제거
    .replace(/[^a-zA-Z0-9-_]/g, '_') // 특수문자 대체
    .substring(0, 50); // 길이 제한

  if (userId) {
    return `${folder}/${userId}/${timestamp}-${random}-${safeName}.${ext}`;
  }
  return `${folder}/${timestamp}-${random}-${safeName}.${ext}`;
}

/**
 * 파일 키에서 파일명 추출
 */
export function getFilenameFromKey(key: string): string {
  return key.split('/').pop() || key;
}
