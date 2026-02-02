import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ActivityListResponse } from '@/types/activity';

// 쿼리 스키마
const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  activity_type: z.string().optional(),
});

// 활동 목록 조회
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

    const adminClient = createAdminClient();

    // 프로젝트 접근 권한 확인
    const { data: memberData } = await adminClient
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .limit(1);

    const { data: projectData } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', projectId)
      .single();

    const isMember = memberData && memberData.length > 0;
    const isOwner = projectData?.client_id === user.id;

    if (!isMember && !isOwner) {
      return NextResponse.json(
        { error: '프로젝트에 대한 접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const queryResult = querySchema.safeParse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      activity_type: searchParams.get('activity_type') || undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: '잘못된 쿼리 파라미터입니다', details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const { page, limit, activity_type } = queryResult.data;
    const offset = (page - 1) * limit;

    // 활동 로그 조회 쿼리 빌드 (activity_logs 테이블은 아직 타입 정의에 없음)
    let query = (adminClient as any)
      .from('activity_logs')
      .select(
        `
        *,
        user:profiles!user_id(id, name, avatar_url)
      `,
        { count: 'exact' }
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (activity_type) {
      query = query.eq('activity_type', activity_type);
    }

    const { data: activities, error: queryError, count } = await query.range(
      offset,
      offset + limit - 1
    );

    if (queryError) {
      console.error('[Activities API] 조회 실패:', queryError);
      return NextResponse.json(
        { error: '활동 로그 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    const response: ActivityListResponse = {
      data: activities || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Activities API] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
