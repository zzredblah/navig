import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 사용자의 모든 프로젝트 ID 조회
    const { data: ownedProjects } = await adminClient
      .from('projects')
      .select('id')
      .eq('client_id', user.id);

    const { data: memberProjects } = await adminClient
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);

    const ownedIds = ownedProjects?.map(p => p.id) || [];
    const memberIds = memberProjects?.map(m => m.project_id) || [];
    const allProjectIds = [...new Set([...ownedIds, ...memberIds])];

    if (allProjectIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 해당 프로젝트들의 모든 멤버 조회 (자기 자신 제외)
    const { data: members, error } = await adminClient
      .from('project_members')
      .select(`
        id,
        user_id,
        role,
        project_id,
        invited_at,
        joined_at,
        profiles!project_members_user_id_fkey(id, name, email, avatar_url),
        projects!project_members_project_id_fkey(id, title)
      `)
      .in('project_id', allProjectIds)
      .neq('user_id', user.id)
      .order('invited_at', { ascending: false });

    if (error) {
      console.error('[Team API] 멤버 조회 실패:', error);
      return NextResponse.json({ error: '멤버 조회에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ data: members || [] });
  } catch (error) {
    console.error('[Team API] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
