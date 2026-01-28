import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { boardsQuerySchema } from '@/lib/validations/board';

/**
 * GET /api/boards
 * 사용자가 접근 가능한 모든 프로젝트의 보드 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
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

    // 사용자가 접근 가능한 프로젝트 ID 목록 가져오기
    // 1. 내가 소유한 프로젝트
    const { data: ownedProjects } = await adminClient
      .from('projects')
      .select('id')
      .eq('client_id', user.id);

    // 2. 내가 멤버인 프로젝트
    const { data: memberProjects } = await adminClient
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);

    const ownedProjectIds = ownedProjects?.map(p => p.id) || [];
    const memberProjectIds = memberProjects?.map(p => p.project_id) || [];
    const allProjectIds = [...new Set([...ownedProjectIds, ...memberProjectIds])];

    if (allProjectIds.length === 0) {
      return NextResponse.json({
        data: [],
        total: 0,
        page,
        limit,
      });
    }

    // 보드 목록 조회
    const { data: boards, error: boardsError, count } = await adminClient
      .from('boards')
      .select(`
        *,
        creator:profiles!boards_created_by_fkey(id, name, avatar_url),
        project:projects!boards_project_id_fkey(id, title)
      `, { count: 'exact' })
      .in('project_id', allProjectIds)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (boardsError) {
      console.error('[All Boards List] 조회 실패:', boardsError);
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
    console.error('[All Boards List] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
