import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { updateElementSchema } from '@/lib/validations/board';

/**
 * PATCH /api/boards/:boardId/elements/:elementId
 * 요소 수정
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; elementId: string }> }
) {
  try {
    const { boardId, elementId } = await params;
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 요청 본문 파싱
    const body = await request.json();
    const parseResult = updateElementSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: '잘못된 요청입니다.', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 요소 및 보드 조회
    const { data: element, error: elementError } = await adminClient
      .from('board_elements')
      .select('id, board_id, locked')
      .eq('id', elementId)
      .eq('board_id', boardId)
      .single();

    if (elementError || !element) {
      return NextResponse.json({ error: '요소를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 잠금 상태 확인 (잠금 해제 요청이 아닌 경우)
    if (element.locked && !('locked' in parseResult.data)) {
      return NextResponse.json({ error: '잠긴 요소는 수정할 수 없습니다.' }, { status: 403 });
    }

    // 보드 조회
    const { data: board } = await adminClient
      .from('boards')
      .select('project_id')
      .eq('id', boardId)
      .single();

    if (!board) {
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
      return NextResponse.json({ error: '요소 수정 권한이 없습니다.' }, { status: 403 });
    }

    // 요소 수정
    const { data: updatedElement, error: updateError } = await adminClient
      .from('board_elements')
      .update(parseResult.data)
      .eq('id', elementId)
      .select()
      .single();

    if (updateError) {
      console.error('[Element Update] 수정 실패:', updateError);
      return NextResponse.json({ error: '요소 수정에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ element: updatedElement });
  } catch (error) {
    console.error('[Element Update] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * DELETE /api/boards/:boardId/elements/:elementId
 * 요소 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; elementId: string }> }
) {
  try {
    const { boardId, elementId } = await params;
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 요소 조회
    const { data: element, error: elementError } = await adminClient
      .from('board_elements')
      .select('id, board_id, locked, created_by')
      .eq('id', elementId)
      .eq('board_id', boardId)
      .single();

    if (elementError || !element) {
      return NextResponse.json({ error: '요소를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 잠금 상태 확인
    if (element.locked) {
      return NextResponse.json({ error: '잠긴 요소는 삭제할 수 없습니다.' }, { status: 403 });
    }

    // 보드 조회
    const { data: board } = await adminClient
      .from('boards')
      .select('project_id')
      .eq('id', boardId)
      .single();

    if (!board) {
      return NextResponse.json({ error: '보드를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 삭제 권한 확인 (생성자 또는 편집 권한)
    const { data: project } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', board.project_id)
      .single();

    const isOwner = project?.client_id === user.id;
    const isCreator = element.created_by === user.id;
    const { data: member } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', board.project_id)
      .eq('user_id', user.id)
      .single();

    const canEdit = isOwner || isCreator || (member && ['owner', 'approver', 'editor'].includes(member.role));

    if (!canEdit) {
      return NextResponse.json({ error: '요소 삭제 권한이 없습니다.' }, { status: 403 });
    }

    // 요소 삭제
    const { error: deleteError } = await adminClient
      .from('board_elements')
      .delete()
      .eq('id', elementId);

    if (deleteError) {
      console.error('[Element Delete] 삭제 실패:', deleteError);
      return NextResponse.json({ error: '요소 삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Element Delete] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
