/**
 * 영상 업로드 완료 API
 * POST - 멀티파트 업로드 완료 처리
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  completeMultipartUpload,
  getPublicUrl,
  uploadFile,
  generateFileKey,
} from '@/lib/cloudflare/r2';
import { z } from 'zod';

// 완료 요청 스키마
const completeUploadSchema = z.object({
  parts: z.array(
    z.object({
      partNumber: z.number().positive(),
      etag: z.string().min(1),
    })
  ),
  metadata: z
    .object({
      duration: z.number().optional(),
      resolution: z.string().optional(),
      codec: z.string().optional(),
    })
    .optional(),
  thumbnailBase64: z.string().optional(),
});

// POST: 업로드 완료 처리
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
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

    // 요청 바디 파싱 및 검증
    const body = await request.json();
    const validationResult = completeUploadSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: '유효하지 않은 요청입니다',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { parts, metadata, thumbnailBase64 } = validationResult.data;

    const adminClient = createAdminClient();

    // 기존 영상 레코드 조회
    const { data: existingVideo, error: queryError } = await adminClient
      .from('video_versions')
      .select('*')
      .eq('id', videoId)
      .single();

    if (queryError || !existingVideo) {
      return NextResponse.json(
        { error: '영상을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 업로더 확인
    if (existingVideo.uploaded_by !== user.id) {
      return NextResponse.json(
        { error: '이 업로드를 완료할 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 이미 완료된 업로드인지 확인
    if (existingVideo.status !== 'uploading') {
      return NextResponse.json(
        { error: '이미 처리된 업로드입니다' },
        { status: 400 }
      );
    }

    // upload_id 확인
    if (!existingVideo.upload_id || !existingVideo.file_key) {
      return NextResponse.json(
        { error: '업로드 정보가 유효하지 않습니다' },
        { status: 400 }
      );
    }

    // R2 멀티파트 업로드 완료
    let fileUrl: string;
    try {
      console.log('[Complete Upload] R2 멀티파트 완료 시작:', {
        key: existingVideo.file_key,
        uploadId: existingVideo.upload_id,
        partsCount: parts.length,
      });
      const result = await completeMultipartUpload(
        'videos',
        existingVideo.file_key,
        existingVideo.upload_id,
        parts.map((p) => ({ partNumber: p.partNumber, etag: p.etag }))
      );
      fileUrl = result.url;
      console.log('[Complete Upload] R2 멀티파트 완료 성공:', fileUrl);
    } catch (r2Error) {
      console.error('[Complete Upload] R2 멀티파트 완료 오류:', r2Error);
      return NextResponse.json(
        {
          error: 'R2 업로드 완료 실패',
          details: r2Error instanceof Error ? r2Error.message : 'Unknown R2 error',
        },
        { status: 500 }
      );
    }

    // 썸네일 업로드 (Base64로 전송된 경우)
    let thumbnailUrl: string | null = null;
    let thumbnailKey: string | null = null;

    if (thumbnailBase64) {
      try {
        // Base64 디코딩
        const base64Data = thumbnailBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // 썸네일 키 생성
        thumbnailKey = generateFileKey(
          'thumbnails',
          `${existingVideo.original_filename}.jpg`,
          existingVideo.project_id
        );

        // R2에 썸네일 업로드
        const { url } = await uploadFile(
          'videos', // 썸네일도 videos 버킷에 저장
          thumbnailKey,
          buffer,
          'image/jpeg'
        );
        thumbnailUrl = url;
      } catch (thumbnailError) {
        console.error('[Complete Upload] 썸네일 업로드 오류:', thumbnailError);
        // 썸네일 실패해도 영상 업로드는 완료 처리
      }
    }

    // DB 업데이트
    const updateData: Record<string, unknown> = {
      status: 'ready',
      file_url: fileUrl,
      upload_id: null, // 업로드 ID 정리
    };

    // 메타데이터 추가
    if (metadata) {
      if (metadata.duration !== undefined) updateData.duration = metadata.duration;
      if (metadata.resolution) updateData.resolution = metadata.resolution;
      if (metadata.codec) updateData.codec = metadata.codec;
    }

    // 썸네일 추가
    if (thumbnailUrl) {
      updateData.thumbnail_url = thumbnailUrl;
      updateData.thumbnail_key = thumbnailKey;
    }

    const { data: video, error: updateError } = await adminClient
      .from('video_versions')
      .update(updateData)
      .eq('id', videoId)
      .select(
        `
        *,
        uploader:profiles!uploaded_by(id, name, avatar_url)
      `
      )
      .single();

    if (updateError) {
      console.error('[Complete Upload] DB 업데이트 오류:', updateError);
      return NextResponse.json(
        { error: '영상 정보 업데이트 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '영상 업로드가 완료되었습니다',
      video,
    });
  } catch (error) {
    console.error('[Complete Upload] 예외:', error);
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
