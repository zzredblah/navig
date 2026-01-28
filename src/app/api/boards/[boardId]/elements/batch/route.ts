import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { batchUpdateElementsSchema } from '@/lib/validations/board';

/**
 * PATCH /api/boards/:boardId/elements/batch
 * 요소 일괄 수정 (이동, 크기 변경 등)
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
    const parseResult = batchUpdateElementsSchema.safeParse(body);

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
      return NextResponse.json({ error: '요소 수정 권한이 없습니다.' }, { status: 403 });
    }

    // 요소 ID 목록
    const elementIds = parseResult.data.elements.map((e) => e.id);

    // 요소들이 해당 보드에 속하는지 확인
    const { data: existingElements, error: fetchError } = await adminClient
      .from('board_elements')
      .select('id, locked')
      .eq('board_id', boardId)
      .in('id', elementIds);

    if (fetchError) {
      console.error('[Batch Update] 요소 조회 실패:', fetchError);
      return NextResponse.json({ error: '요소 조회에 실패했습니다.' }, { status: 500 });
    }

    // 존재하지 않는 요소 확인
    const existingIds = new Set(existingElements?.map((e) => e.id) || []);
    const missingIds = elementIds.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: '일부 요소를 찾을 수 없습니다.', missingIds },
        { status: 404 }
      );
    }

    // 잠긴 요소 확인 (잠금 해제가 아닌 경우)
    const lockedElements = existingElements?.filter((e) => e.locked) || [];
    const updateRequests = parseResult.data.elements;

    for (const locked of lockedElements) {
      const update = updateRequests.find((u) => u.id === locked.id);
      // 잠금 해제 요청이 아닌 경우 에러
      if (update && !('locked' in update)) {
        return NextResponse.json(
          { error: '잠긴 요소는 수정할 수 없습니다.', lockedId: locked.id },
          { status: 403 }
        );
      }
    }

    // 일괄 업데이트 (Promise.all로 병렬 처리)
    const updatePromises = parseResult.data.elements.map(async ({ id, ...changes }) => {
      const { data, error } = await adminClient
        .from('board_elements')
        .update(changes)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`[Batch Update] 요소 ${id} 수정 실패:`, error);
        return null;
      }
      return data;
    });

    const results = await Promise.all(updatePromises);
    const successfulUpdates = results.filter((r) => r !== null);

    if (successfulUpdates.length === 0) {
      return NextResponse.json({ error: '요소 수정에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({
      elements: successfulUpdates,
      updated: successfulUpdates.length,
      total: parseResult.data.elements.length,
    });
  } catch (error) {
    console.error('[Batch Update] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
