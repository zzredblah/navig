/**
 * 영상 피드백 API
 * GET  - 영상의 피드백 목록 조회
 * POST - 새 피드백 작성
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 쿼리 파라미터 스키마
const querySchema = z.object({
  status: z.enum(['open', 'resolved', 'wontfix', 'all']).optional().default('all'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// 피드백 생성 스키마
const createFeedbackSchema = z.object({
  content: z.string().min(1, '내용을 입력해주세요').max(2000),
  timestamp_seconds: z.number().min(0),
  position_x: z.number().min(0).max(100).optional(),
  position_y: z.number().min(0).max(100).optional(),
  drawing_image: z.string().optional(), // Base64 PNG 이미지
  is_urgent: z.boolean().optional().default(false), // 긴급 여부
});

// GET: 피드백 목록 조회
export async function GET(
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

    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const queryResult = querySchema.safeParse({
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: '유효하지 않은 쿼리 파라미터입니다',
          details: queryResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { status, page, limit } = queryResult.data;
    const offset = (page - 1) * limit;

    const adminClient = createAdminClient();

    // 영상 정보 조회 (권한 확인용)
    const { data: video, error: videoError } = await adminClient
      .from('video_versions')
      .select('id, project_id')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: '영상을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 프로젝트 멤버 확인
    const { data: member } = await adminClient
      .from('project_members')
      .select('id')
      .eq('project_id', video.project_id)
      .eq('user_id', user.id)
      .single();

    const { data: project } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', video.project_id)
      .single();

    const isOwner = project?.client_id === user.id;

    if (!member && !isOwner) {
      return NextResponse.json(
        { error: '이 영상에 접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 피드백 쿼리 구성
    let query = adminClient
      .from('video_feedbacks')
      .select(
        `
        *,
        author:profiles!created_by(id, name, avatar_url),
        resolver:profiles!resolved_by(id, name, avatar_url)
      `,
        { count: 'exact' }
      )
      .eq('video_id', videoId)
      .order('timestamp_seconds', { ascending: true })
      .range(offset, offset + limit - 1);

    // 상태 필터
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: feedbacks, error: queryError, count } = await query;

    if (queryError) {
      console.error('[Feedbacks GET] 조회 오류:', queryError);
      return NextResponse.json(
        { error: '피드백 목록 조회 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      feedbacks: feedbacks || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('[Feedbacks GET] 예외:', error);
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST: 새 피드백 작성
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

    // 요청 바디 파싱
    const body = await request.json();
    const validationResult = createFeedbackSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: '유효하지 않은 요청입니다',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { content, timestamp_seconds, position_x, position_y, drawing_image, is_urgent } = validationResult.data;

    const adminClient = createAdminClient();

    // 영상 정보 조회 (권한 확인용)
    const { data: video, error: videoError } = await adminClient
      .from('video_versions')
      .select('id, project_id')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: '영상을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 프로젝트 멤버 확인
    const { data: member } = await adminClient
      .from('project_members')
      .select('id')
      .eq('project_id', video.project_id)
      .eq('user_id', user.id)
      .single();

    const { data: project } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', video.project_id)
      .single();

    const isOwner = project?.client_id === user.id;

    if (!member && !isOwner) {
      return NextResponse.json(
        { error: '이 영상에 피드백을 작성할 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 피드백 생성
    const { data: feedback, error: insertError } = await adminClient
      .from('video_feedbacks')
      .insert({
        video_id: videoId,
        project_id: video.project_id,
        content,
        timestamp_seconds,
        position_x: position_x || null,
        position_y: position_y || null,
        drawing_image: drawing_image || null,
        is_urgent: is_urgent || false,
        created_by: user.id,
      })
      .select(
        `
        *,
        author:profiles!created_by(id, name, avatar_url)
      `
      )
      .single();

    if (insertError) {
      console.error('[Feedbacks POST] 생성 오류:', insertError);
      return NextResponse.json(
        { error: '피드백 작성 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    console.error('[Feedbacks POST] 예외:', error);
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
