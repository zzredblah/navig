import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = Promise<{ memberId: string }>;

/**
 * GET /api/invitations/[memberId]/status
 * 초대 상태 확인 (pending, accepted, rejected)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { memberId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // 멤버 정보 조회
    const { data: member, error: memberError } = await adminClient
      .from('project_members')
      .select('id, user_id, joined_at')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      // 멤버가 존재하지 않음 (거절됨 또는 삭제됨)
      return NextResponse.json(
        { status: 'rejected' },
        { status: 200 }
      );
    }

    // 본인의 초대인지 확인
    if (member.user_id !== user.id) {
      return NextResponse.json(
        { error: '접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 상태 반환
    if (member.joined_at) {
      return NextResponse.json({ status: 'accepted' });
    } else {
      return NextResponse.json({ status: 'pending' });
    }
  } catch (error) {
    console.error('[Invitation Status API] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
