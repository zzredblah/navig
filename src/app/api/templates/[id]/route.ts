import { createClient, createAdminClient } from '@/lib/supabase/server';
import { updateTemplateSchema } from '@/lib/validations/document';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = { params: Promise<{ id: string }> };

// 템플릿 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: template, error } = await adminClient
      .from('document_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: '템플릿을 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json({ data: template });
  } catch (error) {
    console.error('[Templates API] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// 템플릿 수정 (admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

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
    const validationResult = updateTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '입력값이 유효하지 않습니다', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, unknown> = {};
    if (validationResult.data.type !== undefined) updatePayload.type = validationResult.data.type;
    if (validationResult.data.name !== undefined) updatePayload.name = validationResult.data.name;
    if (validationResult.data.description !== undefined) updatePayload.description = validationResult.data.description;
    if (validationResult.data.fields !== undefined) updatePayload.fields = validationResult.data.fields;
    if (validationResult.data.is_default !== undefined) updatePayload.is_default = validationResult.data.is_default;

    const { data: template, error: updateError } = await adminClient
      .from('document_templates')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Templates API] 수정 실패:', updateError);
      return NextResponse.json({ error: '템플릿 수정에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ message: '템플릿이 수정되었습니다', data: template });
  } catch (error) {
    console.error('[Templates API] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// 템플릿 삭제 (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    const { error: deleteError } = await adminClient
      .from('document_templates')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Templates API] 삭제 실패:', deleteError);
      return NextResponse.json({ error: '템플릿 삭제에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ message: '템플릿이 삭제되었습니다' });
  } catch (error) {
    console.error('[Templates API] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
