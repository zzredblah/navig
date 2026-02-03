import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 포트폴리오 업데이트 스키마
const updatePortfolioSchema = z.object({
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/, 'URL은 소문자, 숫자, 하이픈만 사용 가능합니다').optional(),
  display_name: z.string().max(100).optional(),
  bio: z.string().max(2000).optional(),
  skills: z.array(z.string().max(50)).max(20).optional(),
  website_url: z.string().url().optional().nullable(),
  contact_email: z.string().email().optional().nullable(),
  social_links: z.object({
    youtube: z.string().url().optional(),
    instagram: z.string().url().optional(),
    twitter: z.string().url().optional(),
    linkedin: z.string().url().optional(),
    behance: z.string().url().optional(),
    vimeo: z.string().url().optional(),
    github: z.string().url().optional(),
  }).optional(),
  is_public: z.boolean().optional(),
  theme: z.enum(['default', 'dark', 'minimal', 'creative']).optional(),
});

// GET /api/portfolio/me - 내 포트폴리오 조회
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

    // 포트폴리오 조회
    const { data: portfolio, error } = await adminClient
      .from('portfolios')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[Portfolio] 조회 실패:', error);
      return NextResponse.json({ error: '포트폴리오 조회 실패' }, { status: 500 });
    }

    // 포트폴리오가 없으면 null 반환
    return NextResponse.json({ data: portfolio || null });
  } catch (error) {
    console.error('[Portfolio] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// POST /api/portfolio/me - 포트폴리오 생성
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
    const validationResult = updatePortfolioSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 이미 포트폴리오가 있는지 확인
    const { data: existing } = await adminClient
      .from('portfolios')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: '이미 포트폴리오가 존재합니다' }, { status: 409 });
    }

    // slug 중복 확인
    if (validationResult.data.slug) {
      const { data: slugExists } = await adminClient
        .from('portfolios')
        .select('user_id')
        .eq('slug', validationResult.data.slug)
        .single();

      if (slugExists) {
        return NextResponse.json({ error: '이미 사용 중인 URL입니다' }, { status: 409 });
      }
    }

    // 포트폴리오 생성
    const { data: portfolio, error } = await adminClient
      .from('portfolios')
      .insert({
        user_id: user.id,
        ...validationResult.data,
      })
      .select()
      .single();

    if (error) {
      console.error('[Portfolio] 생성 실패:', error);
      return NextResponse.json({ error: '포트폴리오 생성 실패' }, { status: 500 });
    }

    return NextResponse.json({ data: portfolio }, { status: 201 });
  } catch (error) {
    console.error('[Portfolio] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// PATCH /api/portfolio/me - 포트폴리오 수정
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
    const validationResult = updatePortfolioSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // slug 변경 시 중복 확인
    if (validationResult.data.slug) {
      const { data: slugExists } = await adminClient
        .from('portfolios')
        .select('user_id')
        .eq('slug', validationResult.data.slug)
        .neq('user_id', user.id)
        .single();

      if (slugExists) {
        return NextResponse.json({ error: '이미 사용 중인 URL입니다' }, { status: 409 });
      }
    }

    // 포트폴리오가 없으면 생성
    const { data: existing } = await adminClient
      .from('portfolios')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    let portfolio;

    if (!existing) {
      // 생성
      const { data, error } = await adminClient
        .from('portfolios')
        .insert({
          user_id: user.id,
          ...validationResult.data,
        })
        .select()
        .single();

      if (error) {
        console.error('[Portfolio] 생성 실패:', error);
        return NextResponse.json({ error: '포트폴리오 생성 실패' }, { status: 500 });
      }

      portfolio = data;
    } else {
      // 수정
      const { data, error } = await adminClient
        .from('portfolios')
        .update(validationResult.data)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[Portfolio] 수정 실패:', error);
        return NextResponse.json({ error: '포트폴리오 수정 실패' }, { status: 500 });
      }

      portfolio = data;
    }

    return NextResponse.json({ data: portfolio });
  } catch (error) {
    console.error('[Portfolio] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
