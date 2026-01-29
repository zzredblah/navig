/**
 * 프로젝트 영상 버전 API
 * GET  - 영상 목록 조회
 * POST - 새 영상 버전 업로드 시작 (Stream 또는 R2)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  initiateMultipartUpload,
  createPresignedPartUrl,
  generateFileKey,
} from '@/lib/cloudflare/r2';
import {
  createDirectUpload,
  isStreamConfigured,
  toStreamPosition,
} from '@/lib/cloudflare/stream';
import {
  MULTIPART_CHUNK_SIZE,
  SUPPORTED_VIDEO_FORMATS,
  MAX_VIDEO_FILE_SIZE,
} from '@/types/video';
import { z } from 'zod';

// 요청 검증 스키마
const createVideoSchema = z.object({
  original_filename: z.string().min(1, '파일명은 필수입니다'),
  file_size: z
    .number()
    .positive('파일 크기는 양수여야 합니다')
    .max(MAX_VIDEO_FILE_SIZE, '파일 크기가 2GB를 초과합니다'),
  content_type: z.enum(SUPPORTED_VIDEO_FORMATS as unknown as [string, ...string[]], {
    errorMap: () => ({ message: '지원하지 않는 영상 형식입니다 (MP4, MOV, WebM만 가능)' }),
  }),
  change_notes: z.string().min(1, '변경 사항은 필수입니다'),
  version_name: z.string().max(100).optional(),
  watermark_enabled: z.boolean().optional().default(true),
  // Stream 사용 여부 (기본값: true, Stream이 설정된 경우)
  use_stream: z.boolean().optional(),
});

// GET: 영상 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
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

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || undefined;
    const offset = (page - 1) * limit;

    const adminClient = createAdminClient();

    // 프로젝트 멤버 확인 (초대 수락한 멤버만)
    const { data: member } = await adminClient
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .single();

    const { data: project } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', projectId)
      .single();

    if (!member && project?.client_id !== user.id) {
      return NextResponse.json(
        { error: '이 프로젝트에 접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 영상 목록 조회
    let query = adminClient
      .from('video_versions')
      .select(
        `
        *,
        uploader:profiles!uploaded_by(id, name, avatar_url)
      `,
        { count: 'exact' }
      )
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status as 'uploading' | 'encoding' | 'processing' | 'ready' | 'error');
    }

    const { data: videos, error: queryError, count } = await query;

    if (queryError) {
      console.error('[Videos GET] 조회 오류:', queryError);
      return NextResponse.json(
        { error: '영상 목록 조회 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      videos: videos || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('[Videos GET] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// POST: 새 영상 버전 업로드 시작
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
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
    const validationResult = createVideoSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: '유효하지 않은 요청입니다',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      original_filename,
      file_size,
      change_notes,
      version_name,
      watermark_enabled,
      use_stream,
    } = validationResult.data;

    const adminClient = createAdminClient();

    // 프로젝트 멤버 확인 (초대 수락한 멤버만)
    const { data: member } = await adminClient
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .single();

    const { data: project } = await adminClient
      .from('projects')
      .select('client_id, watermark_settings, stream_watermark_profile_id')
      .eq('id', projectId)
      .single();

    if (!member && project?.client_id !== user.id) {
      return NextResponse.json(
        { error: '이 프로젝트에 접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    // Stream 사용 여부 결정
    const shouldUseStream = use_stream !== false && isStreamConfigured();

    if (shouldUseStream) {
      // ============================================
      // Cloudflare Stream 업로드
      // ============================================
      return await handleStreamUpload({
        adminClient,
        projectId,
        userId: user.id,
        originalFilename: original_filename,
        fileSize: file_size,
        changeNotes: change_notes,
        versionName: version_name,
        watermarkEnabled: watermark_enabled,
        watermarkProfileId: project?.stream_watermark_profile_id,
      });
    } else {
      // ============================================
      // R2 멀티파트 업로드 (폴백)
      // ============================================
      return await handleR2Upload({
        adminClient,
        projectId,
        userId: user.id,
        originalFilename: original_filename,
        fileSize: file_size,
        contentType: validationResult.data.content_type,
        changeNotes: change_notes,
        versionName: version_name,
        watermarkEnabled: watermark_enabled,
      });
    }
  } catch (error) {
    console.error('[Videos POST] 예외:', error);
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// Cloudflare Stream 업로드 핸들러
// ============================================
async function handleStreamUpload({
  adminClient,
  projectId,
  userId,
  originalFilename,
  fileSize,
  changeNotes,
  versionName,
  watermarkEnabled,
  watermarkProfileId,
}: {
  adminClient: ReturnType<typeof createAdminClient>;
  projectId: string;
  userId: string;
  originalFilename: string;
  fileSize: number;
  changeNotes: string;
  versionName?: string;
  watermarkEnabled: boolean;
  watermarkProfileId?: string;
}) {
  try {
    // Direct Upload URL 생성
    const uploadOptions: Parameters<typeof createDirectUpload>[0] = {
      maxDurationSeconds: 7200, // 2시간
      meta: {
        projectId,
        uploadedBy: userId,
        originalFilename,
      },
      thumbnailTimestampPct: 0.25, // 25% 지점에서 썸네일 생성
    };

    // 워터마크가 활성화되고 프로필이 있으면 적용
    if (watermarkEnabled && watermarkProfileId) {
      uploadOptions.watermark = { uid: watermarkProfileId };
    }

    const { uploadURL, uid: streamVideoId } = await createDirectUpload(uploadOptions);

    // DB에 영상 레코드 생성
    const { data: video, error: insertError } = await adminClient
      .from('video_versions')
      .insert({
        project_id: projectId,
        original_filename: originalFilename,
        file_size: fileSize,
        change_notes: changeNotes,
        version_name: versionName || null,
        status: 'uploading',
        uploaded_by: userId,
        watermark_enabled: watermarkEnabled,
        stream_video_id: streamVideoId,
        stream_ready: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Videos POST] DB 생성 오류:', insertError);
      return NextResponse.json(
        {
          error: '영상 레코드 생성 중 오류가 발생했습니다',
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        video,
        upload: {
          type: 'stream',
          uploadURL,
          streamVideoId,
        },
      },
      { status: 201 }
    );
  } catch (streamError) {
    console.error('[Videos POST] Stream 업로드 시작 오류:', streamError);
    return NextResponse.json(
      {
        error: 'Stream 업로드 시작 실패',
        details: streamError instanceof Error ? streamError.message : 'Unknown Stream error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// R2 멀티파트 업로드 핸들러 (폴백)
// ============================================
async function handleR2Upload({
  adminClient,
  projectId,
  userId,
  originalFilename,
  fileSize,
  contentType,
  changeNotes,
  versionName,
  watermarkEnabled,
}: {
  adminClient: ReturnType<typeof createAdminClient>;
  projectId: string;
  userId: string;
  originalFilename: string;
  fileSize: number;
  contentType: string;
  changeNotes: string;
  versionName?: string;
  watermarkEnabled: boolean;
}) {
  const fileKey = generateFileKey('videos', originalFilename, projectId);

  let uploadId: string;
  let key: string;

  try {
    const multipartResult = await initiateMultipartUpload(
      'videos',
      fileKey,
      contentType
    );
    uploadId = multipartResult.uploadId;
    key = multipartResult.key;
  } catch (r2Error) {
    console.error('[Videos POST] R2 멀티파트 시작 오류:', r2Error);
    return NextResponse.json(
      {
        error: 'R2 업로드 시작 실패',
        details: r2Error instanceof Error ? r2Error.message : 'Unknown R2 error',
      },
      { status: 500 }
    );
  }

  // 총 파트 수 계산
  const totalParts = Math.ceil(fileSize / MULTIPART_CHUNK_SIZE);

  // 각 파트의 Presigned URL 생성
  const partUrls: string[] = [];
  try {
    for (let i = 1; i <= totalParts; i++) {
      const partUrl = await createPresignedPartUrl('videos', key, uploadId, i);
      partUrls.push(partUrl);
    }
  } catch (urlError) {
    console.error('[Videos POST] Presigned URL 생성 오류:', urlError);
    return NextResponse.json(
      {
        error: 'Presigned URL 생성 실패',
        details: urlError instanceof Error ? urlError.message : 'Unknown URL error',
      },
      { status: 500 }
    );
  }

  // DB에 영상 레코드 생성
  const { data: video, error: insertError } = await adminClient
    .from('video_versions')
    .insert({
      project_id: projectId,
      original_filename: originalFilename,
      file_size: fileSize,
      change_notes: changeNotes,
      version_name: versionName || null,
      status: 'uploading',
      upload_id: uploadId,
      file_key: key,
      uploaded_by: userId,
      watermark_enabled: watermarkEnabled,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[Videos POST] DB 생성 오류:', insertError);
    return NextResponse.json(
      {
        error: '영상 레코드 생성 중 오류가 발생했습니다',
        details: insertError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      video,
      upload: {
        type: 'r2',
        uploadId,
        key,
        partUrls,
        partSize: MULTIPART_CHUNK_SIZE,
        totalParts,
      },
    },
    { status: 201 }
  );
}
