import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { updateBoardSchema } from '@/lib/validations/board';

/**
 * GET /api/boards/:boardId
 * 보드 상세 조회 (요소 포함)
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
      .select(`
        *,
        creator:profiles!boards_created_by_fkey(id, name, avatar_url)
      `)
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

      // 프로젝트 접근 권한 확인
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

    // 보드 요소 조회
    const { data: elements, error: elementsError } = await adminClient
      .from('board_elements')
      .select('*')
      .eq('board_id', boardId)
      .order('z_index', { ascending: true });

    if (elementsError) {
      console.error('[Board Detail] 요소 조회 실패:', elementsError);
    }

    return NextResponse.json({
      board,
      elements: elements || [],
    });
  } catch (error) {
    console.error('[Board Detail] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * PATCH /api/boards/:boardId
 * 보드 수정
 */
export async function PATCH(
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
    const parseResult = updateBoardSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: '잘못된 요청입니다.', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 보드 및 프로젝트 정보 조회
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
      return NextResponse.json({ error: '보드 수정 권한이 없습니다.' }, { status: 403 });
    }

    // 보드 수정
    const { data: updatedBoard, error: updateError } = await adminClient
      .from('boards')
      .update(parseResult.data)
      .eq('id', boardId)
      .select(`
        *,
        creator:profiles!boards_created_by_fkey(id, name, avatar_url)
      `)
      .single();

    if (updateError) {
      console.error('[Board Update] 수정 실패:', updateError);
      return NextResponse.json({ error: '보드 수정에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ board: updatedBoard });
  } catch (error) {
    console.error('[Board Update] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * DELETE /api/boards/:boardId
 * 보드 삭제
 */
export async function DELETE(
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

    const adminClient = createAdminClient();

    // 보드 및 프로젝트 정보 조회
    const { data: board, error: boardError } = await adminClient
      .from('boards')
      .select('id, project_id, created_by')
      .eq('id', boardId)
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: '보드를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 삭제 권한 확인 (생성자 또는 프로젝트 소유자만)
    const { data: project } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', board.project_id)
      .single();

    const isProjectOwner = project?.client_id === user.id;
    const isBoardCreator = board.created_by === user.id;
    const { data: member } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', board.project_id)
      .eq('user_id', user.id)
      .single();

    const isOwnerMember = member?.role === 'owner';

    if (!isProjectOwner && !isBoardCreator && !isOwnerMember) {
      return NextResponse.json({ error: '보드 삭제 권한이 없습니다.' }, { status: 403 });
    }

    // 보드 삭제 (cascade로 요소도 삭제됨)
    const { error: deleteError } = await adminClient
      .from('boards')
      .delete()
      .eq('id', boardId);

    if (deleteError) {
      console.error('[Board Delete] 삭제 실패:', deleteError);
      return NextResponse.json({ error: '보드 삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Board Delete] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
