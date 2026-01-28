import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/boards/:boardId/share
 * 공유 링크 생성
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

    const adminClient = createAdminClient();

    // 보드 조회
    const { data: board, error: boardError } = await adminClient
      .from('boards')
      .select('id, project_id, share_token')
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
      return NextResponse.json({ error: '공유 링크 생성 권한이 없습니다.' }, { status: 403 });
    }

    // 이미 공유 토큰이 있으면 반환
    if (board.share_token) {
      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '';
      return NextResponse.json({
        share_url: `${origin}/boards/share/${board.share_token}`,
        share_token: board.share_token,
      });
    }

    // 새 공유 토큰 생성
    const shareToken = crypto.randomUUID();

    const { data: updatedBoard, error: updateError } = await adminClient
      .from('boards')
      .update({
        share_token: shareToken,
        is_public: true,
      })
      .eq('id', boardId)
      .select('share_token')
      .single();

    if (updateError) {
      console.error('[Board Share] 토큰 생성 실패:', updateError);
      return NextResponse.json({ error: '공유 링크 생성에 실패했습니다.' }, { status: 500 });
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '';

    return NextResponse.json({
      share_url: `${origin}/boards/share/${updatedBoard.share_token}`,
      share_token: updatedBoard.share_token,
    });
  } catch (error) {
    console.error('[Board Share] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * DELETE /api/boards/:boardId/share
 * 공유 링크 비활성화
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
      return NextResponse.json({ error: '공유 링크 해제 권한이 없습니다.' }, { status: 403 });
    }

    // 공유 토큰 제거
    const { error: updateError } = await adminClient
      .from('boards')
      .update({
        share_token: null,
        is_public: false,
      })
      .eq('id', boardId);

    if (updateError) {
      console.error('[Board Share] 토큰 삭제 실패:', updateError);
      return NextResponse.json({ error: '공유 링크 해제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Board Share] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
