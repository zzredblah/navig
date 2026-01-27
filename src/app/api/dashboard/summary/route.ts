import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/dashboard/summary
 * 프로젝트 현황 요약 조회
 */
export async function GET() {
  try {
    // 1. 인증 확인
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 2. Admin 클라이언트로 데이터 조회
    const adminClient = createAdminClient();

    // 소유한 프로젝트 ID
    const { data: ownedProjects, error: ownedError } = await adminClient
      .from('projects')
      .select('id, status')
      .eq('client_id', user.id);

    if (ownedError) {
      console.error('[Dashboard Summary] 소유 프로젝트 조회 실패:', ownedError);
      return NextResponse.json(
        { error: '프로젝트 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    // 멤버로 참여한 프로젝트 ID
    const { data: memberProjects, error: memberError } = await adminClient
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);

    if (memberError) {
      console.error('[Dashboard Summary] 멤버 프로젝트 조회 실패:', memberError);
      return NextResponse.json(
        { error: '프로젝트 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    const ownedIds = ownedProjects?.map(p => p.id) || [];
    const memberIds = memberProjects?.map(m => m.project_id) || [];
    const allProjectIds = [...new Set([...ownedIds, ...memberIds])];

    // 멤버 프로젝트의 상태 조회
    let memberProjectStatuses: { status: string }[] = [];
    if (memberIds.length > 0) {
      const { data, error } = await adminClient
        .from('projects')
        .select('status')
        .in('id', memberIds);

      if (error) {
        console.error('[Dashboard Summary] 멤버 프로젝트 상태 조회 실패:', error);
      } else {
        memberProjectStatuses = data || [];
      }
    }

    // 모든 프로젝트 상태 합치기
    const allStatuses = [
      ...(ownedProjects || []),
      ...memberProjectStatuses
    ];

    // 상태별 카운트
    const summary = {
      total: allProjectIds.length,
      planning: allStatuses.filter(p => p.status === 'planning').length,
      production: allStatuses.filter(p => p.status === 'production').length,
      review: allStatuses.filter(p => p.status === 'review').length,
      completed: allStatuses.filter(p => p.status === 'completed').length,
    };

    return NextResponse.json(summary, { status: 200 });

  } catch (error) {
    console.error('[Dashboard Summary] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
