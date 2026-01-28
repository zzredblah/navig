import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createElementSchema } from '@/lib/validations/board';

/**
 * GET /api/boards/:boardId/elements
 * 보드 요소 목록 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // 현재 사용자 확인 (공개 보드는 비로그인도 허용)
    const { data: { user } } = await supabase.auth.getUser();

    // 보드 조회
    const { data: board, error: boardError } = await adminClient
      .from('boards')
      .select('id, project_id, is_public')
      .eq('id', boardId)
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: '보드를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 접근 권한 확인
    if (!board.is_public) {
      if (!user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
      }

      const { data: project } = await adminClient
        .from('projects')
        .select('client_id')
        .eq('id', board.project_id)
        .single();

      const isOwner = project?.client_id === user.id;
      const { data: member } = await adminClient
        .from('project_members')
        .select('role')
        .eq('project_id', board.project_id)
        .eq('user_id', user.id)
        .single();

      if (!isOwner && !member) {
        return NextResponse.json({ error: '보드 접근 권한이 없습니다.' }, { status: 403 });
      }
    }

    // 요소 조회
    const { data: elements, error: elementsError } = await adminClient
      .from('board_elements')
      .select('*')
      .eq('board_id', boardId)
      .order('z_index', { ascending: true });

    if (elementsError) {
      console.error('[Board Elements] 조회 실패:', elementsError);
      return NextResponse.json({ error: '요소 목록을 불러오는데 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ elements: elements || [] });
  } catch (error) {
    console.error('[Board Elements] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * POST /api/boards/:boardId/elements
 * 새 요소 추가
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 요청 본문 파싱
    const body = await request.json();
    const parseResult = createElementSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: '잘못된 요청입니다.', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 보드 조회
    const { data: board, error: boardError } = await adminClient
      .from('boards')
      .select('id, project_id')
      .eq('id', boardId)
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: '보드를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 편집 권한 확인
    const { data: project } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', board.project_id)
      .single();

    const isOwner = project?.client_id === user.id;
    const { data: member } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', board.project_id)
      .eq('user_id', user.id)
      .single();

    const canEdit = isOwner || (member && ['owner', 'approver', 'editor'].includes(member.role));

    if (!canEdit) {
      return NextResponse.json({ error: '요소 추가 권한이 없습니다.' }, { status: 403 });
    }

    // 최대 z_index 조회
    const { data: maxZResult } = await adminClient
      .from('board_elements')
      .select('z_index')
      .eq('board_id', boardId)
      .order('z_index', { ascending: false })
      .limit(1)
      .single();

    const nextZIndex = (maxZResult?.z_index || 0) + 1;

    // 요소 생성
    const { data: element, error: createError } = await adminClient
      .from('board_elements')
      .insert({
        board_id: boardId,
        type: parseResult.data.type,
        position_x: parseResult.data.position_x,
        position_y: parseResult.data.position_y,
        width: parseResult.data.width,
        height: parseResult.data.height,
        rotation: parseResult.data.rotation,
        z_index: nextZIndex,
        content: parseResult.data.content,
        style: parseResult.data.style || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('[Element Create] 생성 실패:', createError);
      return NextResponse.json({ error: '요소 생성에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ element }, { status: 201 });
  } catch (error) {
    console.error('[Element Create] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
