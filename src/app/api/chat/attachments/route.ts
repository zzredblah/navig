/**
 * 채팅 첨부 파일 업로드 API
 * POST - 파일 업로드 (R2)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadFile, generateFileKey, getContentType } from '@/lib/cloudflare/r2';

// 허용되는 파일 타입
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/quicktime', 'video/webm'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
};

// 최대 파일 크기 (20MB)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function getAttachmentType(mimeType: string): 'image' | 'video' | 'document' | null {
  if (ALLOWED_TYPES.image.includes(mimeType)) return 'image';
  if (ALLOWED_TYPES.video.includes(mimeType)) return 'video';
  if (ALLOWED_TYPES.document.includes(mimeType)) return 'document';
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // FormData에서 파일 추출
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 필요합니다' },
        { status: 400 }
      );
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '파일 크기는 20MB를 초과할 수 없습니다' },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    const attachmentType = getAttachmentType(file.type);
    if (!attachmentType) {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다' },
        { status: 400 }
      );
    }

    // 파일을 Buffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // R2에 업로드 (videos 버킷의 chat-attachments 폴더 사용)
    const fileKey = generateFileKey('chat-attachments', file.name, user.id);
    const contentType = file.type || getContentType(file.name);

    const { url } = await uploadFile('videos', fileKey, buffer, contentType);

    // 응답
    return NextResponse.json({
      attachment: {
        type: attachmentType,
        url,
        name: file.name,
        size: file.size,
        mimeType: file.type,
      },
    });
  } catch (error) {
    console.error('[Chat Attachments POST] 예외:', error);
    return NextResponse.json(
      { error: '파일 업로드에 실패했습니다', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
