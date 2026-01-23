import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createTemplateSchema, templateQuerySchema } from '@/lib/validations/document';
import { NextRequest, NextResponse } from 'next/server';

// 템플릿 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const queryResult = templateQuerySchema.safeParse({
      type: searchParams.get('type') || undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: '잘못된 쿼리 파라미터입니다', details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    let query = adminClient
      .from('document_templates')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (queryResult.data.type) {
      query = query.eq('type', queryResult.data.type);
    }

    const { data: templates, error: queryError } = await query;

    if (queryError) {
      console.error('[Templates API] 조회 실패:', queryError);
      return NextResponse.json({ error: '템플릿 조회에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error('[Templates API] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// 템플릿 생성 (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // admin 권한 확인
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = createTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '입력값이 유효하지 않습니다', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { type, name, description, fields, is_default } = validationResult.data;
    const { data: template, error: createError } = await adminClient
      .from('document_templates')
      .insert({
        type,
        name,
        description,
        fields: fields as import('@/types/database').TemplateField[],
        is_default,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('[Templates API] 생성 실패:', createError);
      return NextResponse.json({ error: '템플릿 생성에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json(
      { message: '템플릿이 생성되었습니다', data: template },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Templates API] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
