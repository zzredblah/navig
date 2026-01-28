/**
 * 프로젝트 영상 버전 API
 * GET  - 영상 목록 조회
 * POST - 새 영상 버전 업로드 시작 (Presigned URL 발급)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  initiateMultipartUpload,
  createPresignedPartUrl,
  generateFileKey,
} from '@/lib/cloudflare/r2';
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
      .not('joined_at', 'is', null) // 초대 수락한 멤버만
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
      query = query.eq('status', status as 'uploading' | 'processing' | 'ready' | 'error');
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

    const { original_filename, file_size, content_type, change_notes, version_name } =
      validationResult.data;

    const adminClient = createAdminClient();

    // 프로젝트 멤버 확인 (초대 수락한 멤버만)
    const { data: member } = await adminClient
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null) // 초대 수락한 멤버만
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

    // R2에 멀티파트 업로드 시작
    const fileKey = generateFileKey('videos', original_filename, projectId);

    let uploadId: string;
    let key: string;

    try {
      const multipartResult = await initiateMultipartUpload(
        'videos',
        fileKey,
        content_type
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
    const totalParts = Math.ceil(file_size / MULTIPART_CHUNK_SIZE);

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

    // DB에 영상 레코드 생성 (status: uploading)
    const { data: video, error: insertError } = await adminClient
      .from('video_versions')
      .insert({
        project_id: projectId,
        original_filename,
        file_size,
        change_notes,
        version_name: version_name || null,
        status: 'uploading',
        upload_id: uploadId,
        file_key: key,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Videos POST] DB 생성 오류:', insertError);
      return NextResponse.json(
        {
          error: '영상 레코드 생성 중 오류가 발생했습니다',
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        video,
        upload: {
          uploadId,
          key,
          partUrls,
          partSize: MULTIPART_CHUNK_SIZE,
          totalParts,
        },
      },
      { status: 201 }
    );
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
