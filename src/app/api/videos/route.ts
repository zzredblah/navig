/**
 * 전체 영상 목록 API
 * GET - 사용자가 접근 가능한 모든 프로젝트의 영상 목록 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 쿼리 파라미터 스키마
const querySchema = z.object({
  status: z.enum(['uploading', 'processing', 'ready', 'error']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
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

    // 사용자가 접근 가능한 프로젝트 ID 조회
    // 1. 소유한 프로젝트
    const { data: ownedProjects } = await adminClient
      .from('projects')
      .select('id')
      .eq('client_id', user.id);

    // 2. 멤버로 참여한 프로젝트
    const { data: memberProjects } = await adminClient
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);

    const ownedProjectIds = ownedProjects?.map((p) => p.id) || [];
    const memberProjectIds = memberProjects?.map((p) => p.project_id) || [];
    const allProjectIds = [...new Set([...ownedProjectIds, ...memberProjectIds])];

    if (allProjectIds.length === 0) {
      return NextResponse.json({
        videos: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // 영상 목록 쿼리 구성
    let query = adminClient
      .from('video_versions')
      .select(
        `
        *,
        project:projects!project_id(id, title),
        uploader:profiles!uploaded_by(id, name, avatar_url)
      `,
        { count: 'exact' }
      )
      .in('project_id', allProjectIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 상태 필터
    if (status) {
      query = query.eq('status', status);
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
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
