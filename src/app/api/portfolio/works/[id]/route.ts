import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 작품 수정 스키마
const updateWorkSchema = z.object({
  title: z.string().min(1).max(255).optional(),
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

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/portfolio/works/:id - 작품 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data: work, error } = await adminClient
      .from('portfolio_works')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '작품을 찾을 수 없습니다' }, { status: 404 });
      }
      console.error('[PortfolioWorks] 조회 실패:', error);
      return NextResponse.json({ error: '작품 조회 실패' }, { status: 500 });
    }

    return NextResponse.json({ data: work });
  } catch (error) {
    console.error('[PortfolioWorks] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// PATCH /api/portfolio/works/:id - 작품 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = updateWorkSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 작품 소유권 확인 및 수정
    const { data: work, error } = await adminClient
      .from('portfolio_works')
      .update(validationResult.data)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '작품을 찾을 수 없습니다' }, { status: 404 });
      }
      console.error('[PortfolioWorks] 수정 실패:', error);
      return NextResponse.json({ error: '작품 수정 실패' }, { status: 500 });
    }

    return NextResponse.json({ data: work });
  } catch (error) {
    console.error('[PortfolioWorks] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// DELETE /api/portfolio/works/:id - 작품 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 작품 소유권 확인 및 삭제
    const { error } = await adminClient
      .from('portfolio_works')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[PortfolioWorks] 삭제 실패:', error);
      return NextResponse.json({ error: '작품 삭제 실패' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PortfolioWorks] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
