import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 작품 생성/수정 스키마
const workSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  thumbnail_url: z.string().url().optional().nullable(),
  video_url: z.string().url().optional().nullable(),
  external_url: z.string().url().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  is_featured: z.boolean().optional(),
  is_public: z.boolean().optional(),
  order_index: z.number().int().min(0).optional(),
});

// GET /api/portfolio/works - 내 작품 목록 조회
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 작품 목록 조회 (order_index 순)
    const { data: works, error } = await adminClient
      .from('portfolio_works')
      .select('*')
      .eq('user_id', user.id)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[PortfolioWorks] 조회 실패:', error);
      return NextResponse.json({ error: '작품 조회 실패' }, { status: 500 });
    }

    return NextResponse.json({ data: works });
  } catch (error) {
    console.error('[PortfolioWorks] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// POST /api/portfolio/works - 작품 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = workSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 포트폴리오 존재 확인 (없으면 자동 생성)
    const { data: portfolio } = await adminClient
      .from('portfolios')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (!portfolio) {
      // 포트폴리오 자동 생성
      const { error: createError } = await adminClient
        .from('portfolios')
        .insert({ user_id: user.id });

      if (createError) {
        console.error('[PortfolioWorks] 포트폴리오 자동 생성 실패:', createError);
        return NextResponse.json({ error: '포트폴리오 생성 실패' }, { status: 500 });
      }
    }

    // 현재 최대 order_index 조회
    const { data: maxOrderResult } = await adminClient
      .from('portfolio_works')
      .select('order_index')
      .eq('user_id', user.id)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    const nextOrderIndex = (maxOrderResult?.order_index ?? -1) + 1;

    // 작품 생성
    const { data: work, error } = await adminClient
      .from('portfolio_works')
      .insert({
        user_id: user.id,
        title: validationResult.data.title,
        description: validationResult.data.description,
        category: validationResult.data.category,
        thumbnail_url: validationResult.data.thumbnail_url,
        video_url: validationResult.data.video_url,
        external_url: validationResult.data.external_url,
        project_id: validationResult.data.project_id,
        tags: validationResult.data.tags,
        is_featured: validationResult.data.is_featured,
        is_public: validationResult.data.is_public,
        order_index: validationResult.data.order_index ?? nextOrderIndex,
      })
      .select()
      .single();

    if (error) {
      console.error('[PortfolioWorks] 생성 실패:', error);
      return NextResponse.json({ error: '작품 추가 실패' }, { status: 500 });
    }

    return NextResponse.json({ data: work }, { status: 201 });
  } catch (error) {
    console.error('[PortfolioWorks] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// PATCH /api/portfolio/works - 작품 순서 일괄 변경
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const body = await request.json();
    const reorderSchema = z.object({
      works: z.array(z.object({
        id: z.string().uuid(),
        order_index: z.number().int().min(0),
      })),
    });

    const validationResult = reorderSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 순서 일괄 업데이트
    const updatePromises = validationResult.data.works.map((item) =>
      adminClient
        .from('portfolio_works')
        .update({ order_index: item.order_index })
        .eq('id', item.id)
        .eq('user_id', user.id)
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PortfolioWorks] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
