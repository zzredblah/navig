import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = { params: Promise<{ id: string }> };

// 문서 복구 (휴지통에서 복원)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data: existingDoc } = await adminClient
      .from('documents')
      .select('id, project_id, created_by, deleted_at')
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .single();

    if (!existingDoc) {
      return NextResponse.json({ error: '삭제된 문서를 찾을 수 없습니다' }, { status: 404 });
    }

    // 작성자 또는 프로젝트 소유자만 복구 가능
    if (existingDoc.created_by !== user.id) {
      const { data: project } = await adminClient
        .from('projects')
        .select('client_id')
        .eq('id', existingDoc.project_id)
        .single();

      if (project?.client_id !== user.id) {
        return NextResponse.json({ error: '복구 권한이 없습니다' }, { status: 403 });
      }
    }

    const { error: restoreError } = await adminClient
      .from('documents')
      .update({ deleted_at: null })
      .eq('id', id);

    if (restoreError) {
      console.error('[Restore API] 복구 실패:', restoreError);
      return NextResponse.json({ error: '문서 복구에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ message: '문서가 복구되었습니다' });
  } catch (error) {
    console.error('[Restore API] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
