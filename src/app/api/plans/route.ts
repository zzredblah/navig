/**
 * GET /api/plans
 * 구독 플랜 목록 조회 (공개 API)
 */

import { NextResponse } from 'next/server';
import { createUntypedAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const adminClient = createUntypedAdminClient();

    const { data: plans, error } = await adminClient
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[GET /api/plans] DB 에러:', error);
      return NextResponse.json(
        { error: '플랜 목록을 가져오는데 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { plans } });
  } catch (error) {
    console.error('[GET /api/plans] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
