import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// 휴지통 문서 목록 조회 (최근 2주)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 사용자가 접근 가능한 프로젝트 ID 조회
    const { data: memberProjects } = await adminClient
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);

    const { data: ownedProjects } = await adminClient
      .from('projects')
      .select('id')
      .eq('client_id', user.id);

    const memberProjectIds = memberProjects?.map((p) => p.project_id) || [];
    const ownedProjectIds = ownedProjects?.map((p) => p.id) || [];
    const allProjectIds = [...new Set([...memberProjectIds, ...ownedProjectIds])];

    if (allProjectIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 최근 2주 이내 삭제된 문서만 조회
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const { data: documents, error: queryError } = await adminClient
      .from('documents')
      .select(
        '*, document_templates(id, name, type), profiles!documents_created_by_fkey(id, name, email), projects!documents_project_id_fkey(id, title)'
      )
      .in('project_id', allProjectIds)
      .not('deleted_at', 'is', null)
      .gte('deleted_at', twoWeeksAgo.toISOString())
      .order('deleted_at', { ascending: false });

    if (queryError) {
      console.error('[Trash API] 조회 실패:', queryError);
      return NextResponse.json({ error: '휴지통 조회에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ data: documents });
  } catch (error) {
    console.error('[Trash API] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
