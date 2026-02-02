import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createProjectSchema, projectQuerySchema } from '@/lib/validations/project';
import { checkUsage } from '@/lib/usage/checker';
import { ActivityLogger } from '@/lib/activity/logger';
import { NextRequest, NextResponse } from 'next/server';

// 프로젝트 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('[Projects API GET] user:', user?.id, 'authError:', authError?.message);

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const queryResult = projectQuerySchema.safeParse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
    });

    if (!queryResult.success) {
      console.error('[Projects API] 쿼리 파라미터 오류:', queryResult.error.errors);
      return NextResponse.json(
        { error: '잘못된 쿼리 파라미터입니다', details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const { page, limit, search, status } = queryResult.data;
    const offset = (page - 1) * limit;

    // Admin 클라이언트 사용 (RLS 우회)
    const adminClient = createAdminClient();

    // 사용자가 참여한 프로젝트 ID 가져오기 (초대 수락한 경우만)
    const { data: memberProjects, error: memberError } = await adminClient
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id)
      .not('joined_at', 'is', null); // 초대 수락한 멤버만

    console.log('[Projects API GET] memberProjects:', memberProjects?.length, 'error:', memberError?.message);

    const memberProjectIds = memberProjects?.map(m => m.project_id) || [];

    // 사용자가 소유한 프로젝트 ID 가져오기 (projects.client_id)
    const { data: ownedProjects, error: ownedError } = await adminClient
      .from('projects')
      .select('id')
      .eq('client_id', user.id);

    console.log('[Projects API GET] ownedProjects:', ownedProjects?.length, 'error:', ownedError?.message);

    const ownedProjectIds = ownedProjects?.map(p => p.id) || [];

    // 두 목록 합치기 (중복 제거)
    const allProjectIds = [...new Set([...memberProjectIds, ...ownedProjectIds])];

    if (allProjectIds.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // 프로젝트 목록 쿼리 빌드 (Admin 클라이언트 사용)
    let query = adminClient
      .from('projects')
      .select('*, project_members(user_id, role)', { count: 'exact' })
      .in('id', allProjectIds)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: projects, error: queryError, count } = await query
      .range(offset, offset + limit - 1);

    if (queryError) {
      console.error('[Projects API] 조회 실패:', queryError);
      return NextResponse.json(
        { error: '프로젝트 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: projects,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    });
  } catch (error) {
    console.error('[Projects API] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 프로젝트 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createProjectSchema.parse(body);

    // 사용량 제한 체크
    const usageCheck = await checkUsage(user.id, 'create_project');
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: usageCheck.message || '프로젝트 생성 제한에 도달했습니다',
          code: 'USAGE_LIMIT_EXCEEDED',
          current: usageCheck.current,
          limit: usageCheck.limit,
          upgrade_required: usageCheck.upgrade_required,
        },
        { status: 403 }
      );
    }

    // Admin 클라이언트 사용 (RLS 우회)
    const adminClient = createAdminClient();

    // 프로젝트 생성
    const { data: project, error: createError } = await adminClient
      .from('projects')
      .insert({
        title: validatedData.title,
        description: validatedData.description || null,
        client_id: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('[Projects API] 프로젝트 생성 실패:', createError);
      return NextResponse.json(
        { error: `프로젝트 생성에 실패했습니다: ${createError.message}` },
        { status: 400 }
      );
    }

    // 생성자를 owner로 project_members에 추가 (즉시 참여 상태)
    const { error: memberError } = await adminClient
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: user.id,
        role: 'owner',
        joined_at: new Date().toISOString(), // 소유자는 즉시 참여 상태
      });

    if (memberError) {
      console.error('[Projects API] 멤버 추가 실패:', memberError);
    }

    // 활동 로그 기록
    await ActivityLogger.logProjectCreated(project.id, user.id, project.title);

    return NextResponse.json({
      message: '프로젝트가 생성되었습니다',
      data: { project },
    }, { status: 201 });
  } catch (error) {
    console.error('[Projects API] 예외 발생:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: '입력값이 유효하지 않습니다' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
