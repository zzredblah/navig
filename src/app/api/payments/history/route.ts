/**
 * GET /api/payments/history
 * 결제 내역 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createUntypedAdminClient } from '@/lib/supabase/server';
import { paymentHistoryQuerySchema } from '@/lib/validations/subscription';

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const result = paymentHistoryQuerySchema.safeParse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      status: searchParams.get('status') || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { page, limit, status } = result.data;
    const offset = (page - 1) * limit;

    const adminClient = createUntypedAdminClient();

    // 쿼리 빌드
    let query = adminClient
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    } else {
      // 기본적으로 pending 제외 (실제 완료된 결제만 표시)
      query = query.neq('status', 'pending');
    }

    // 페이지네이션
    query = query.range(offset, offset + limit - 1);

    const { data: payments, error, count } = await query;

    if (error) {
      console.error('[GET /api/payments/history] DB 에러:', error);
      return NextResponse.json(
        { error: '결제 내역을 가져오는데 실패했습니다' },
        { status: 500 }
      );
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      data: {
        payments: payments || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: totalPages,
        },
      },
    });
  } catch (error) {
    console.error('[GET /api/payments/history] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
