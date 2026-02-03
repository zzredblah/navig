import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/p/:slug - 공개 포트폴리오 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const adminClient = createAdminClient();

    // 포트폴리오 조회 (프로필 정보 포함)
    const { data: portfolio, error: portfolioError } = await adminClient
      .from('portfolios')
      .select(`
        *,
        profile:profiles!user_id (
          name,
          avatar_url
        )
      `)
      .eq('slug', slug)
      .eq('is_public', true)
      .single();

    if (portfolioError) {
      if (portfolioError.code === 'PGRST116') {
        return NextResponse.json({ error: '포트폴리오를 찾을 수 없습니다' }, { status: 404 });
      }
      console.error('[PublicPortfolio] 조회 실패:', portfolioError);
      return NextResponse.json({ error: '포트폴리오 조회 실패' }, { status: 500 });
    }

    // 공개 작품 목록 조회
    const { data: works, error: worksError } = await adminClient
      .from('portfolio_works')
      .select('*')
      .eq('user_id', portfolio.user_id)
      .eq('is_public', true)
      .order('is_featured', { ascending: false })
      .order('order_index', { ascending: true });

    if (worksError) {
      console.error('[PublicPortfolio] 작품 조회 실패:', worksError);
      return NextResponse.json({ error: '작품 조회 실패' }, { status: 500 });
    }

    // 조회수 증가 (비동기, 에러 무시)
    void adminClient
      .from('portfolios')
      .update({ view_count: (portfolio.view_count || 0) + 1 })
      .eq('user_id', portfolio.user_id);

    return NextResponse.json({
      data: {
        portfolio,
        works,
      },
    });
  } catch (error) {
    console.error('[PublicPortfolio] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// POST /api/p/:slug - 조회수 증가 (별도 호출용)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const adminClient = createAdminClient();

    // 포트폴리오 조회
    const { data: portfolio, error: portfolioError } = await adminClient
      .from('portfolios')
      .select('user_id, view_count')
      .eq('slug', slug)
      .eq('is_public', true)
      .single();

    if (portfolioError || !portfolio) {
      return NextResponse.json({ error: '포트폴리오를 찾을 수 없습니다' }, { status: 404 });
    }

    // 조회수 증가
    await adminClient
      .from('portfolios')
      .update({ view_count: (portfolio.view_count || 0) + 1 })
      .eq('user_id', portfolio.user_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PublicPortfolio] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
