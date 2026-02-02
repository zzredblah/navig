import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { boardsQuerySchema, createBoardSchema } from '@/lib/validations/board';
import { ActivityLogger } from '@/lib/activity/logger';

/**
 * GET /api/projects/:projectId/boards
 * 프로젝트의 보드 목록 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const queryResult = boardsQuerySchema.safeParse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: '잘못된 요청입니다.', details: queryResult.error.flatten() },
        { status: 400 }
      );
    }

    const { page, limit } = queryResult.data;
    const offset = (page - 1) * limit;

    const adminClient = createAdminClient();

    // 프로젝트 접근 권한 확인
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('id, client_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 프로젝트 멤버 또는 소유자인지 확인 (초대 수락한 멤버만)
    const isOwner = project.client_id === user.id;
    const { data: member } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null) // 초대 수락한 멤버만
      .single();

    if (!isOwner && !member) {
      return NextResponse.json({ error: '프로젝트 접근 권한이 없습니다.' }, { status: 403 });
    }

    // 보드 목록 조회
    const { data: boards, error: boardsError, count } = await adminClient
      .from('boards')
      .select(`
        *,
        creator:profiles!boards_created_by_fkey(id, name, avatar_url)
      `, { count: 'exact' })
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (boardsError) {
      console.error('[Boards List] 조회 실패:', boardsError);
      return NextResponse.json({ error: '보드 목록을 불러오는데 실패했습니다.' }, { status: 500 });
    }

    // 각 보드의 요소 수와 타입별 개수 조회 + 첫 번째 이미지 미리보기
    const boardsWithStats = await Promise.all(
      (boards || []).map(async (board) => {
        const { data: elements } = await adminClient
          .from('board_elements')
          .select('type, content')
          .eq('board_id', board.id);

        const elementStats = {
          total: elements?.length || 0,
          images: elements?.filter(e => e.type === 'image').length || 0,
          videos: elements?.filter(e => e.type === 'video').length || 0,
          texts: elements?.filter(e => e.type === 'text').length || 0,
          stickies: elements?.filter(e => e.type === 'sticky').length || 0,
          shapes: elements?.filter(e => e.type === 'shape').length || 0,
        };

        // 첫 번째 이미지 요소의 URL을 미리보기로 사용
        const firstImage = elements?.find(e => e.type === 'image');
        const previewImageUrl = firstImage?.content?.url || null;

        return { ...board, elementStats, previewImageUrl };
      })
    );

    return NextResponse.json({
      data: boardsWithStats,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('[Boards List] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * POST /api/projects/:projectId/boards
 * 새 보드 생성
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 요청 본문 파싱
    const body = await request.json();
    const parseResult = createBoardSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: '잘못된 요청입니다.', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 프로젝트 접근 권한 확인
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('id, client_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 프로젝트 멤버 또는 소유자인지 확인 (초대 수락한 멤버만, 편집 권한 필요)
    const isOwner = project.client_id === user.id;
    const { data: member } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null) // 초대 수락한 멤버만
      .single();

    const canEdit = isOwner || (member && ['owner', 'approver', 'editor'].includes(member.role));

    if (!canEdit) {
      return NextResponse.json({ error: '보드 생성 권한이 없습니다.' }, { status: 403 });
    }

    // 보드 생성
    const { data: board, error: createError } = await adminClient
      .from('boards')
      .insert({
        project_id: projectId,
        title: parseResult.data.title,
        description: parseResult.data.description,
        created_by: user.id,
      })
      .select(`
        *,
        creator:profiles!boards_created_by_fkey(id, name, avatar_url)
      `)
      .single();

    if (createError) {
      console.error('[Board Create] 생성 실패:', createError);
      return NextResponse.json({ error: '보드 생성에 실패했습니다.' }, { status: 500 });
    }

    // 활동 로그 기록
    await ActivityLogger.logBoardCreated(
      projectId,
      user.id,
      board.id,
      board.title
    );

    return NextResponse.json({ board }, { status: 201 });
  } catch (error) {
    console.error('[Board Create] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
