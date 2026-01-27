/**
 * 팀 멤버 목록 API
 * GET - 현재 사용자와 협업하는 모든 고유 멤버 목록
 */

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
      return NextResponse.json({ members: [] });
    }

    // 해당 프로젝트들의 모든 멤버 조회 (자기 자신 제외)
    const { data: projectMembers, error } = await adminClient
      .from('project_members')
      .select(`
        user_id,
        profiles!project_members_user_id_fkey(id, name, email, avatar_url)
      `)
      .in('project_id', allProjectIds)
      .neq('user_id', user.id);

    if (error) {
      console.error('[Team Members API] 멤버 조회 실패:', error);
      return NextResponse.json({ error: '멤버 조회에 실패했습니다' }, { status: 500 });
    }

    // 고유 멤버만 추출
    const uniqueMembers = new Map<string, {
      id: string;
      name: string | null;
      email: string;
      avatar_url: string | null;
    }>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (projectMembers || []).forEach((pm: any) => {
      const profile = pm.profiles;
      if (profile && !uniqueMembers.has(profile.id)) {
        uniqueMembers.set(profile.id, {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          avatar_url: profile.avatar_url,
        });
      }
    });

    const members = Array.from(uniqueMembers.values());

    return NextResponse.json({ members });
  } catch (error) {
    console.error('[Team Members API] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
